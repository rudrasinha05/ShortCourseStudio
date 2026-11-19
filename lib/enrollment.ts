import {portalRoleHeader,studentContactHeader} from "./portal-session";
import { env } from "cloudflare:workers";
import { COURSES, cDayNumber, CRASH_SLUG, CRASH_TITLE, C_LAUNCH_MODE, C_LAUNCH_SCHEDULE, PAISE, type Course, type Day } from "./courses";
import { z } from "zod";
import {learningPreferencesSchema} from "./learning-preferences";
export const cfg=env as Cloudflare.Env;
export const validStatus=z.enum(["soon","open","closed"]);
const day=z.tuple([z.string().trim().min(2).max(140),z.string().trim().min(2).max(320)]);
export const editSchema=z.object({title:z.string().trim().min(3).max(100),blurb:z.string().trim().min(4).max(450),outcome:z.string().trim().min(4).max(300),days:z.array(day).length(5),schedule:z.string().trim().max(150),mode:z.string().trim().max(100),batch:z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,29}$/),status:validStatus});
export const applicationDetailsSchema=z.object({
 phone:z.string().trim().max(24).refine(v=>!v||/^[+0-9 ()-]+$/.test(v)&&v.replace(/\D/g,"").length>=7&&v.replace(/\D/g,"").length<=15).default(""),
 programme:z.string().trim().min(2).max(100),
 year:z.enum(["1","2","3","4","5+","graduate","other"]),
 preferences:learningPreferencesSchema.optional(),
 whatsappReminders:z.boolean().optional(),
}).refine(data=>!data.whatsappReminders||!!data.phone&&/^(?:\+[1-9]\d{6,14}|[6-9]\d{9})$/.test(data.phone.replace(/[ ()-]/g,"")),{path:["phone"]});
export const applicationSchema=z.object({slug:z.string().max(90),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(160).transform(x=>x.toLowerCase()),college:z.string().trim().min(2).max(140),consent:z.literal(true),details:applicationDetailsSchema.optional(),batch:z.string().regex(/^[a-z0-9][a-z0-9-]{0,29}$/).optional(),formVersion:z.number().int().min(0).optional(),answers:z.record(z.string().regex(/^field[1-5]$/),z.string().max(500)).optional()});
export const applicationsStatus = (status:string) => status==="paused"?"Applications paused":status==="open"?"Applications open":status==="closed"?"Applications closed":"Batch announcement soon";
export const applicationsOpen=(course:{status:string;schedule:string;mode:string}|null|undefined)=>
 !!(course?.status==="open"&&course.schedule.trim()&&course.mode.trim());
export const canApply=(course:({status:string;schedule:string;mode:string;intakePaused?:boolean;visibility?:string;intakeConstraint?:string|null})|null|undefined)=>applicationsOpen(course)&&!course?.intakePaused&&(!course?.visibility||course.visibility==="published")&&!course?.intakeConstraint;
export const intakeStatus=(course:{status:string;intakePaused?:boolean;intakeConstraint?:string|null})=>course.status==="open"?(course.intakePaused?"paused":course.intakeConstraint?"closed":"open"):course.status;
export const enrollmentUnavailable=(status:string|undefined)=>status==="paused"?"New applications are temporarily paused.":status==="closed"
 ?"This batch is no longer accepting applications."
 :"Applications open once the batch is announced.";
type Overrides = {slug:string;title:string|null;blurb:string|null;outcome:string|null;days:string|null;schedule:string;mode:string;batch:string;status:string};
export type Application={id:string;token_hash:string;slug:string;batch:string;name:string;email:string;college:string;created_at:string;amount:number;order_id:string|null;payment_order_mode:string|null;payment_id:string|null;payment_state:string;review_state:string;class_access:number};
export function db(){if(!cfg.DB)throw new Error("Missing data binding");return cfg.DB}
// Server settings are often pasted with a stray space or newline, which makes Razorpay reject Basic Auth.
export const razorpay=()=>({keyId:cfg.RAZORPAY_KEY_ID?.trim()??"",keySecret:cfg.RAZORPAY_KEY_SECRET?.trim()??"",webhookSecret:cfg.RAZORPAY_WEBHOOK_SECRET?.trim()??""});
export function paymentMode():"test"|"live"|null{const m=cfg.PAYMENTS_MODE?.trim(),k=razorpay();return (m==="test"||m==="live")&&k.keyId.startsWith("rzp_"+m+"_")&&k.keySecret&&k.webhookSecret?m:null}
export async function getSiteControls(){
 return cfg.DB?(await db().prepare("SELECT intake_paused,announcement FROM site_controls WHERE id=1").first<{intake_paused:number;announcement:string}>()??{intake_paused:0,announcement:""}):{intake_paused:0,announcement:""};
}
export async function getCourses(){
 let intakePaused=false, uploaded:Course[]=[], rows:Overrides[]=[], catalogue:{slug:string;visibility:string;definition:string|null}[]=[], limits:{slug:string;batch:string;application_limit:number;closes_at:string;applications:number;fee_paise:number|null}[]=[], faculty:{slug:string;batch:string;faculty:string}[]=[];
 if(cfg.DB){
  const [settings,banners,proposals,controls,catalogueRows,limitRows]=await db().batch([
   db().prepare("SELECT * FROM course_settings"),
   db().prepare("SELECT slug,batch,faculty FROM course_banners WHERE faculty<>''"),
   db().prepare("SELECT p.id,p.title,p.track,p.format,p.summary,p.outcome,p.level,p.tools,p.days,f.name AS instructor FROM faculty_proposals p JOIN faculty_profiles f ON p.faculty_id=f.id WHERE p.status='approved' ORDER BY p.created_at"),
   db().prepare("SELECT intake_paused FROM site_controls WHERE id=1"),
   db().prepare("SELECT * FROM course_catalogue"),
   db().prepare("SELECT r.slug,r.batch,r.application_limit,r.closes_at,r.fee_paise,(SELECT COUNT(*) FROM applications a WHERE a.slug=r.slug AND a.batch=r.batch AND a.review_state<>'declined') AS applications FROM batch_rules r"),
  ]);
  rows=settings.results as Overrides[]; catalogue=catalogueRows.results as typeof catalogue; limits=limitRows.results as typeof limits;
  intakePaused=!!(controls.results[0] as {intake_paused:number}|undefined)?.intake_paused;
  // Explicit hosted launch only. A saved admin decision always wins, including close.
  if(cfg.SCS_INITIAL_C_BATCH_OPEN==="1"&&!rows.some(row=>row.slug===CRASH_SLUG)){
   await db().prepare("INSERT INTO course_settings (slug,batch,status,schedule,mode) VALUES (?,'batch-1','open',?,?) ON CONFLICT(slug) DO NOTHING").bind(CRASH_SLUG,C_LAUNCH_SCHEDULE,C_LAUNCH_MODE).run();
   const launch=await db().prepare("SELECT * FROM course_settings WHERE slug=?").bind(CRASH_SLUG).first<Overrides>();
   if(launch)rows.push(launch);
  }
  faculty=banners.results as typeof faculty;
  uploaded=(proposals.results as {id:string;title:string;track:Course["track"];format:string;summary:string;outcome:string;level:string;tools:string;days:string;instructor:string}[]).map(p=>({
   slug:"faculty-"+p.id,title:p.title,track:p.track,blurb:p.summary,outcome:p.outcome,level:p.level,tools:p.tools,days:JSON.parse(p.days) as Day[],instructor:p.instructor,...(p.format==="exclusive"?{exclusive:true as const}:{}),
  }));
 }
 const custom=catalogue.flatMap(r=>r.definition?[JSON.parse(r.definition) as Course]:[]);
 const now=new Date().toISOString();
 return [...COURSES,...uploaded,...custom].map(course=>{
  const o=rows.find(x=>x.slug===course.slug);
  const batch=o?.batch||"batch-1";
  const instructor=faculty.find(x=>x.slug===course.slug&&x.batch===(course.slug===CRASH_SLUG?"launch":batch))?.faculty.trim()||course.instructor;
  const savedStatus=validStatus.safeParse(o?.status).data??"soon";
  const status=savedStatus==="open"&&(!applicationsOpen({status:savedStatus,schedule:o?.schedule??"",mode:o?.mode??""})||(course.exclusive&&!instructor))?"soon":savedStatus;
  const rules=limits.find(r=>r.slug===course.slug&&r.batch===batch);
  const constraint=rules?.closes_at&&rules.closes_at<=now?"deadline":rules?.application_limit&&rules.applications>=rules.application_limit?"full":null;
  // Older saved batches may still use the original display title. Keep other custom titles.
  const title=course.slug===CRASH_SLUG&&o?.title?.trim().toLowerCase()==="c by horesh sir"?CRASH_TITLE:o?.title??course.title;
  const visibility=catalogue.find(x=>x.slug===course.slug)?.visibility??"published";
  return {...course,instructor,intakePaused,visibility,intakeConstraint:constraint,feePaise:rules?.fee_paise??PAISE,needsInstructor:!!course.exclusive&&!course.instructor,title,blurb:o?.blurb??course.blurb,outcome:o?.outcome??course.outcome,days:o?.days?JSON.parse(o.days) as Day[]:course.days,schedule:o?.schedule||"",mode:o?.mode||"",batch,status};
 });
}
export function publicCatalogue<T extends {slug:string;visibility?:string}>(courses:T[]){const bySlug=new Map(courses.map(c=>[c.slug,c]));return courses.filter(c=>c.visibility!=="draft"&&c.visibility!=="archived"&&(!cDayNumber(c.slug)||bySlug.get(CRASH_SLUG)?.visibility==="published"));}
export const lookup=async(slug:string)=>(await getCourses()).find(c=>c.slug===slug);
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
export const digest=async(s:string)=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(s)));
export async function signature(secret:string,body:string){
 const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return hex(await crypto.subtle.sign("HMAC",key,encoder.encode(body)));
}
export function secureEqual(a:string,b:string){
 if(a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
export const isAdminIdentity=(headers: Pick<Headers,"get">)=>!!(!headers.get(studentContactHeader)&&headers.get("oai-authenticated-user-id")&&cfg.SITE_ADMIN_EMAIL&&headers.get("oai-authenticated-user-email")?.toLowerCase()===cfg.SITE_ADMIN_EMAIL.toLowerCase());
export const authorizedAdmin=async(req:Request)=>{
 if(req.headers.get(portalRoleHeader)==="admin"&&isAdminIdentity(req.headers))return true;
 const auth=req.headers.get("authorization")??"";
 return !!cfg.ADMIN_PASSWORD && cfg.ADMIN_PASSWORD.length>=16 && auth.startsWith("Bearer ") && secureEqual(await digest(auth.slice(7)),await digest(cfg.ADMIN_PASSWORD));
};
export const newToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export async function getApplication(id:string,token:string){
 if(!/^SCS-[A-F0-9]{20}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await db().prepare("SELECT * FROM applications WHERE id = ?").bind(id).first<Application>();
 return row&&secureEqual(row.token_hash,await digest(token))?row:null;
}
export async function getOwnedApplication(id:string,userId:string){
 if(!/^SCS-[A-F0-9]{20}$/.test(id)||!userId)return null;
 return db().prepare("SELECT * FROM applications WHERE id=? AND (student_user_id=? OR (student_user_id IS NULL AND submitted_by_user_id=?))").bind(id,userId,userId).first<Application>();
}
// Pre-applications made when the C course was free have a zero amount; they owe the current full-course fee.
export const paymentAmount=(row:Pick<Application,"amount"|"slug">)=>row.amount===0&&row.slug===CRASH_SLUG?PAISE:row.amount;
export const createRef=()=>"SCS-"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase();
export async function gateway<T={id:string;order_id?:string;amount:number;currency:string;status:string}>(path:string,body?:Record<string,unknown>){
 const resp=await fetch("https://api.razorpay.com/v1/"+path,{method:body?"POST":"GET",redirect:"manual",headers:{Authorization:"Basic "+btoa(razorpay().keyId+":"+razorpay().keySecret),"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
 if(!resp.ok)throw new Error("Gateway temporarily unavailable");
 return await resp.json() as T;
}
export async function markPaid(row:Application,paymentId:string){
 const mode=paymentMode();
 if(!mode||!row.order_id||row.payment_order_mode!==mode||!Number.isSafeInteger(row.amount)||row.amount<=0)return false;
 const next=mode==="test"?"test_paid":"paid";
 // Grant access only on the first verified live capture. Repeated callbacks
 // must not undo a later administrator revocation.
 const enroll=row.slug===CRASH_SLUG&&mode==="live"?1:0;
 const result=await db().prepare("UPDATE applications SET review_state=CASE WHEN ?=1 AND payment_state='unpaid' AND review_state<>'declined' THEN 'accepted' ELSE review_state END, class_access=CASE WHEN ?=1 AND payment_state='unpaid' AND review_state<>'declined' THEN 1 ELSE class_access END, payment_id=?, payment_state=? WHERE id=? AND order_id=? AND amount=? AND payment_order_mode=? AND ((payment_state='unpaid' AND payment_id IS NULL) OR (payment_state=? AND payment_id=?))").bind(enroll,enroll,paymentId,next,row.id,row.order_id,row.amount,mode,next,paymentId).run();
 return result.meta.changes===1;
}
// A full refund processed in Razorpay ends the paid enrollment. Partial refunds are only logged.
export async function markRefunded(row:Application,paymentId:string){
 if(row.payment_id!==paymentId||(row.payment_state!=="paid"&&row.payment_state!=="test_paid"))return false;
 const result=await db().prepare("UPDATE applications SET payment_state='refunded',class_access=0 WHERE id=? AND payment_id=? AND payment_state IN ('paid','test_paid')").bind(row.id,paymentId).run();
 return result.meta.changes===1;
}
