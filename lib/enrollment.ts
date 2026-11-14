import { env } from "cloudflare:workers";
import { COURSES, CRASH_SLUG, getCourse, PAISE, type Day } from "./courses";
import { z } from "zod";
export const cfg=env as Cloudflare.Env;
export const validStatus=z.enum(["soon","open","closed"]);
const day=z.tuple([z.string().trim().min(2).max(140),z.string().trim().min(2).max(320)]);
export const editSchema=z.object({title:z.string().trim().min(3).max(100),blurb:z.string().trim().min(4).max(450),outcome:z.string().trim().min(4).max(300),days:z.array(day).length(5),schedule:z.string().trim().max(150),mode:z.string().trim().max(100),batch:z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,29}$/),status:validStatus});
export const applicationSchema=z.object({slug:z.string().max(90),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(160).transform(x=>x.toLowerCase()),college:z.string().trim().min(2).max(140),consent:z.literal(true),batch:z.string().regex(/^[a-z0-9][a-z0-9-]{0,29}$/).optional()});
export const applicationsStatus = (status:string) => status==="open"?"Applications open":status==="closed"?"Applications closed":"Batch announcement soon";
export const applicationsOpen=(course:{status:string;schedule:string;mode:string}|null|undefined)=>
 !!(course?.status==="open"&&course.schedule.trim()&&course.mode.trim());
export const enrollmentUnavailable=(status:string|undefined)=>status==="closed"
 ?"This batch is no longer accepting applications."
 :"Applications open once the batch is announced.";
type Overrides = {slug:string;title:string|null;blurb:string|null;outcome:string|null;days:string|null;schedule:string;mode:string;batch:string;status:string};
export type Application={id:string;token_hash:string;slug:string;batch:string;name:string;email:string;college:string;created_at:string;amount:number;order_id:string|null;payment_id:string|null;payment_state:string;review_state:string;class_access:number};
export function db(){if(!cfg.DB)throw new Error("Missing data binding");return cfg.DB}
export function paymentMode(){const m=cfg.PAYMENTS_MODE;return (m==="test"||m==="live")&&cfg.RAZORPAY_KEY_ID?.startsWith("rzp_"+m+"_")&&cfg.RAZORPAY_KEY_SECRET&&cfg.RAZORPAY_WEBHOOK_SECRET?m:null}
export async function getCourses(){
 let rows:Overrides[]=[], faculty:{slug:string;batch:string;faculty:string}[]=[];
 if(cfg.DB){
  const [settings,banners]=await db().batch([
   db().prepare("SELECT * FROM course_settings"),
   db().prepare("SELECT slug,batch,faculty FROM course_banners WHERE faculty<>''"),
  ]);
  rows=settings.results as Overrides[];
  faculty=banners.results as typeof faculty;
 }
 return COURSES.map(course=>{
  const o=rows.find(x=>x.slug===course.slug);
  const batch=o?.batch||"batch-1";
  const instructor=faculty.find(x=>x.slug===course.slug&&x.batch===(course.slug===CRASH_SLUG?"launch":batch))?.faculty.trim()||course.instructor;
  const savedStatus=validStatus.safeParse(o?.status).data??"soon";
  const status=savedStatus==="open"&&(!applicationsOpen({status:savedStatus,schedule:o?.schedule??"",mode:o?.mode??""})||(course.exclusive&&!instructor))?"soon":savedStatus;
  return {...course,instructor,title:o?.title??course.title,blurb:o?.blurb??course.blurb,outcome:o?.outcome??course.outcome,days:o?.days?JSON.parse(o.days) as Day[]:course.days,schedule:o?.schedule||"",mode:o?.mode||"",batch,status};
 });
}
export const lookup=async(slug:string)=>getCourse(slug)?(await getCourses()).find(c=>c.slug===slug):undefined;
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
export const isAdminIdentity=(headers: Pick<Headers,"get">)=>!!(headers.get("oai-authenticated-user-id")&&cfg.SITE_ADMIN_EMAIL&&headers.get("oai-authenticated-user-email")?.toLowerCase()===cfg.SITE_ADMIN_EMAIL.toLowerCase());
export const authorizedAdmin=async(req:Request)=>{
 if(isAdminIdentity(req.headers))return true;
 const auth=req.headers.get("authorization")??"";
 return !!cfg.ADMIN_PASSWORD && cfg.ADMIN_PASSWORD.length>=16 && auth.startsWith("Bearer ") && secureEqual(await digest(auth.slice(7)),await digest(cfg.ADMIN_PASSWORD));
};
export const newToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
export async function getApplication(id:string,token:string){
 if(!/^SCS-[A-F0-9]{20}$/.test(id)||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await db().prepare("SELECT * FROM applications WHERE id = ?").bind(id).first<Application>();
 return row&&secureEqual(row.token_hash,await digest(token))?row:null;
}
export const createRef=()=>"SCS-"+crypto.randomUUID().replace(/-/g,"").slice(0,20).toUpperCase();
export async function gateway(path:string,body?:Record<string,unknown>){
 const resp=await fetch("https://api.razorpay.com/v1/"+path,{method:body?"POST":"GET",headers:{Authorization:"Basic "+btoa(cfg.RAZORPAY_KEY_ID+":"+cfg.RAZORPAY_KEY_SECRET),"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});
 if(!resp.ok)throw new Error("Gateway temporarily unavailable");
 return await resp.json() as {id:string;order_id?:string;amount:number;currency:string;status:string};
}
export async function markPaid(row:Application,paymentId:string){
 const mode=paymentMode();
 if(!mode||!row.order_id||row.amount!==PAISE)return false;
 const next=mode==="test"?"test_paid":"paid";
 // Grant access only on the first verified live capture. Repeated callbacks
 // must not undo a later administrator revocation.
 const enroll=row.slug===CRASH_SLUG&&mode==="live"?1:0;
 const result=await db().prepare("UPDATE applications SET review_state=CASE WHEN ?=1 AND payment_state='unpaid' THEN 'accepted' ELSE review_state END, class_access=CASE WHEN ?=1 AND payment_state='unpaid' THEN 1 ELSE class_access END, payment_id=?, payment_state=? WHERE id=? AND order_id=? AND amount=? AND ((payment_state='unpaid' AND payment_id IS NULL) OR (payment_state=? AND payment_id=?))").bind(enroll,enroll,paymentId,next,row.id,row.order_id,PAISE,next,paymentId).run();
 return result.meta.changes===1;
}
