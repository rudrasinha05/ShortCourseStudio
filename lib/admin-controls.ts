import {z} from "zod";
import {db,enrolledSql,getCourses,lookup,paidStatesSql,paymentAmount,type Application} from "./enrollment";
import {PAISE,registrationSlug} from "./courses";

export type Reader=(key:string)=>string;
const auditKey=/^[a-z0-9-]{1,90}$/;
const ref=/^SCS-[A-F0-9]{20}$/;
const https=z.string().trim().max(1200).refine(s=>!s||/^https:\/\/[^\s]+$/i.test(s)&&(()=>{try{const u=new URL(s);return !!u.hostname&&!u.username&&!u.password;}catch{return false;}})());
export const contentSchema=z.object({
 headline:z.string().trim().max(90),intro:z.string().trim().max(450),catalogue:z.string().trim().max(90),
 brochure:https,faq:z.string().trim().max(1800),contact:z.union([z.literal(""),z.string().trim().email().max(150)]),
 slides:z.array(z.string().regex(auditKey)).max(6),recommendations:z.array(z.string().regex(auditKey)).max(12),
 tagline:z.string().trim().max(90),studioLogo:https,instituteLogo:https,cta:z.string().trim().max(40),
 // Added later: defaults keep previously saved content valid.
 phone:z.string().trim().max(30).refine(s=>!s||/^\+?[0-9][0-9 -]{6,28}$/.test(s)).default(""),
 address:z.string().trim().max(300).default(""),
 terms:z.string().trim().max(5000).default(""),
 refund:z.string().trim().max(5000).default(""),
});
const emptyContent={headline:"",intro:"",catalogue:"",brochure:"",faq:"",contact:"",slides:[],recommendations:[],tagline:"",studioLogo:"",instituteLogo:"",cta:"",phone:"",address:"",terms:"",refund:""};
const noticesSchema=z.object({receipt:z.string().trim().max(500),accepted:z.string().trim().max(500),declined:z.string().trim().max(500),classReminder:z.string().trim().max(500)});
const emptyNotices={receipt:"",accepted:"",declined:"",classReminder:""};
export type FormField={key:string;label:string;required:boolean};
export type BatchRules={application_limit:number;closes_at:string;payment_paused:number;fee_paise:number|null;form_fields:string;form_version:number};
export const formFields=(rules:BatchRules):FormField[]=>JSON.parse(rules.form_fields);
export const priceText=(paise=PAISE)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:paise%100?2:0,minimumFractionDigits:paise%100?2:0}).format(paise/100);
export type Note={id:number;application_id:string;note:string;actor:string;created_at:string};
export type Learning={application_id:string;attendance:string;score:number|null;result:string;certificate_id:string|null;issued_at:string|null;issued_name:string|null;issued_course:string|null};
export type Audit={id:number;actor:string;action:string;target:string;created_at:string;previous:string|null;next:string|null};
const iso=()=>new Date().toISOString();
const fallback:BatchRules={application_limit:0,closes_at:"",payment_paused:0,fee_paise:null,form_fields:"[]",form_version:0};
async function config<T>(key:string,schema:z.ZodType<T>,defaults:T){
 const value=await db().prepare("SELECT value FROM admin_settings WHERE key=?").bind(key).first<string>("value");
 if(!value)return defaults;
 try{return schema.parse(JSON.parse(value));}catch{return defaults;}
}
export const getSiteContent=()=>config("content",contentSchema,emptyContent);
export const getNoticeTemplates=()=>config("notices",noticesSchema,emptyNotices);
export async function getBatchRules(slug:string,batch:string){
 return await db().prepare("SELECT application_limit,closes_at,payment_paused,fee_paise,form_fields,form_version FROM batch_rules WHERE slug=? AND batch=?").bind(slug,batch).first<BatchRules>()??fallback;
}
export const actorFor=(req:Request)=>req.headers.get("oai-authenticated-user-email")?.toLowerCase()||"owner API";
function auditStmt(actor:string,action:string,target:string,previous:string|null=null,next:string|null=null){
 return db().prepare("INSERT INTO admin_audit(actor,action,target,created_at,previous,next) VALUES(?,?,?,?,?,?)").bind(actor,action,target,iso(),previous,next);
}
export async function audit(actor:string,action:string,target:string){await auditStmt(actor,action,target).run();}
export async function getAudit(limit=40){return (await db().prepare("SELECT * FROM admin_audit ORDER BY id DESC LIMIT ?").bind(limit).all<Audit>()).results;}
async function saveConfig(actor:string,key:"content"|"notices",value:string){
 const d=db(),now=iso();
 await d.batch([
  d.prepare("INSERT INTO admin_audit(actor,action,target,created_at,previous,next) VALUES(?,?,?,?,(SELECT value FROM admin_settings WHERE key=?),?)").bind(actor,"save "+key,key,now,key,value),
  d.prepare("INSERT INTO admin_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value,now)
 ]);
}
export async function saveWebsite(actor:string,val:Reader){
 const readList=(name:string)=>[...new Set(val(name).split(/[,\n]/).map(s=>s.trim()).filter(Boolean))];
 const data=contentSchema.safeParse(Object.fromEntries(Object.keys(emptyContent).map(key=>[key,key==="slides"||key==="recommendations"?readList(key):val(key)])));
 if(!data.success)return false;
 const allowed=new Set((await getCourses()).filter(c=>registrationSlug(c.slug)===c.slug).map(c=>c.slug));
 if([...data.data.slides,...data.data.recommendations].some(s=>!allowed.has(s)))return false;
 await saveConfig(actor,"content",JSON.stringify(data.data));return true;
}
export async function saveNotices(actor:string,val:Reader){
 const data=noticesSchema.safeParse(Object.fromEntries(Object.keys(emptyNotices).map(k=>[k,val(k)])));
 if(!data.success)return false;
 await saveConfig(actor,"notices",JSON.stringify(data.data));return true;
}
export async function restoreSettings(actor:string,id:string){
 if(!/^\d{1,10}$/.test(id))return false;
 const row=await db().prepare("SELECT target,previous FROM admin_audit WHERE id=? AND action IN ('save content','save notices')").bind(Number(id)).first<{target:"content"|"notices";previous:string|null}>();
 if(!row)return false;
 await saveConfig(actor,row.target,row.previous??JSON.stringify(row.target==="content"?emptyContent:emptyNotices));return true;
}
export async function saveBatchRules(actor:string,val:Reader){
 const slug=val("slug"),batch=val("batch"),c=await lookup(slug);
 if(!c||c.batch!==batch||registrationSlug(slug)!==slug)return false;
 const limit=val("applicationLimit"),closed=val("closesAt"),paused=val("paymentPaused");
 if(!/^\d{1,6}$/.test(limit)||Number(limit)>100000||!["yes","no"].includes(paused))return false;
 let close="";
 if(closed){
  if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(closed))return false;
  const d=new Date(closed+"+05:30"), wall=new Date(closed+"Z");
  if(!Number.isFinite(d.valueOf())||wall.toISOString().slice(0,16)!==closed)return false;
  close=d.toISOString();
 }
 const rawFee=val("fee").trim(),fee=rawFee?Number(rawFee):null;
 if(rawFee&&(!/^\d{1,6}(\.\d{1,2})?$/.test(rawFee)||fee===null||fee<1))return false;
 const lines=val("customFields").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.length>5||lines.some(x=>x.length>81||x==="*"))return false;
 const fields=JSON.stringify(lines.map((line,i)=>({key:"field"+(i+1),label:line.startsWith("*")?line.slice(1).trim():line,required:line.startsWith("*")})));
 const d=db();await d.batch([
  d.prepare("INSERT INTO batch_rules(slug,batch,application_limit,closes_at,payment_paused,fee_paise,form_fields,form_version) VALUES(?,?,?,?,?,?,?,CASE WHEN ?='[]' THEN 0 ELSE 1 END) ON CONFLICT(slug,batch) DO UPDATE SET application_limit=excluded.application_limit,closes_at=excluded.closes_at,payment_paused=excluded.payment_paused,fee_paise=excluded.fee_paise,form_version=batch_rules.form_version+CASE WHEN batch_rules.form_fields<>excluded.form_fields THEN 1 ELSE 0 END,form_fields=excluded.form_fields").bind(slug,batch,Number(limit),close,paused==="yes"?1:0,fee===null?null:Math.round(fee*100),fields,fields),
  auditStmt(actor,"save batch rules",slug+"/"+batch)
 ]);return true;
}
export async function addApplicantNote(actor:string,id:string,raw:string){
 const note=raw.trim();
 if(!ref.test(id)||note.length<2||note.length>1000)return false;
 const d=db();const r=await d.prepare("INSERT INTO applicant_notes(application_id,note,actor,created_at) SELECT id,?,?,? FROM applications WHERE id=?").bind(note,actor,iso(),id).run();
 if(r.meta.changes)await audit(actor,"add applicant note",id);
 return !!r.meta.changes;
}
export async function recordLearning(actor:string,val:Reader){
 const id=val("id"),raw=val("score"),result=val("result"),attendance=[1,2,3,4,5].filter(i=>val("present"+i)==="yes");
 if(!ref.test(id)||!["pending","passed","not_passed"].includes(result)||raw&&!/^\d{1,3}$/.test(raw)||Number(raw)>100)return false;
 const d=db();const r=await d.prepare("INSERT INTO learning_records(application_id,attendance,score,result) SELECT id,?,?,? FROM applications WHERE id=? AND "+enrolledSql()+" ON CONFLICT(application_id) DO UPDATE SET attendance=excluded.attendance,score=excluded.score,result=excluded.result WHERE learning_records.certificate_id IS NULL OR excluded.result='passed'").bind(JSON.stringify(attendance),raw?Number(raw):null,result,id).run();
 if(r.meta.changes)await audit(actor,"record attendance and result",id);
 return !!r.meta.changes;
}
export async function certificateAction(actor:string,id:string,action:string){
 if(!ref.test(id)||!["issue","revoke"].includes(action))return false;
 const d=db();
 const a=await d.prepare("SELECT slug,name FROM applications WHERE id=? AND "+enrolledSql()).bind(id).first<{slug:string;name:string}>();
 let r;
 if(action==="revoke")r=await d.prepare("UPDATE learning_records SET certificate_id=NULL,issued_at=NULL,issued_name=NULL,issued_course=NULL WHERE application_id=? AND certificate_id IS NOT NULL").bind(id).run();
 else{
  if(!a)return false;
  const c=await lookup(a.slug);
  const cert="CERT-"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();
  r=await d.prepare("UPDATE learning_records SET certificate_id=?,issued_at=?,issued_name=?,issued_course=? WHERE application_id=? AND result='passed' AND certificate_id IS NULL AND EXISTS (SELECT 1 FROM applications a WHERE a.id=? AND "+enrolledSql("a.")+")").bind(cert,iso(),a.name,c?.title??a.slug,id,id).run();
 }
 if(r.meta.changes)await audit(actor,action+" certificate",id);
 return !!r.meta.changes;
}
export async function learningFor(ids:string[]){
 if(!ids.length)return [];
 return (await db().prepare("SELECT * FROM learning_records WHERE application_id IN ("+ids.map(()=>"?").join(",")+")").bind(...ids).all<Learning>()).results;
}
export async function notesFor(ids:string[]){
 if(!ids.length)return [];
 return (await db().prepare("SELECT id,application_id,note,actor,created_at FROM (SELECT *,ROW_NUMBER() OVER (PARTITION BY application_id ORDER BY id DESC) AS rn FROM applicant_notes WHERE application_id IN ("+ids.map(()=>"?").join(",")+")) WHERE rn<=8 ORDER BY id DESC").bind(...ids).all<Note>()).results;
}
export async function verifyCertificate(id:string){
 if(!/^CERT-[A-F0-9]{24}$/.test(id))return null;
 return await db().prepare("SELECT issued_at,issued_name,issued_course FROM learning_records WHERE certificate_id=?").bind(id).first<Pick<Learning,"issued_at"|"issued_name"|"issued_course">>();
}

export async function saveCatalogueCourse(actor:string,val:Reader){
 const slug=val("slug"),state=val("visibility");
 if(!auditKey.test(slug)||!["draft","published","archived"].includes(state)||registrationSlug(slug)!==slug)return false;
 const d=db(),now=iso();
 if(val("create")==="yes"){
  const {TRACK_DETAILS}=await import("./courses");
  const title=val("title").trim(),track=val("track"),summary=val("summary").trim(),outcome=val("outcome").trim(),format=val("format"),instructor=val("instructor").trim(),tools=val("tools").trim();
  const days=Array.from({length:5},(_,i)=>[val("topic"+i).trim(),val("practical"+i).trim()]);
  if(!slug.startsWith("studio-")||state!=="draft"||title.length<3||title.length>100||!Object.hasOwn(TRACK_DETAILS,track)||!["regular","exclusive"].includes(format)||summary.length<4||summary.length>450||outcome.length<4||outcome.length>300||instructor.length>100||tools.length>150||days.some(([a,b])=>a.length<2||a.length>140||b.length<2||b.length>320))return false;
  const r=await d.prepare("INSERT INTO course_catalogue(slug,visibility,definition) VALUES(?,'draft',?) ON CONFLICT(slug) DO NOTHING").bind(slug,JSON.stringify({slug,title,track,blurb:summary,outcome,days,level:"All levels",tools:tools||"To be announced",instructor:instructor||undefined,exclusive:format==="exclusive"||undefined})).run();
  if(r.meta.changes)await audit(actor,"create course",slug);
  return !!r.meta.changes;
 }
 if(!await lookup(slug))return false;
 // Unpublishing locks intake atomically without modifying existing registrations.
 await d.batch([
  d.prepare("INSERT INTO course_catalogue(slug,visibility) VALUES(?,?) ON CONFLICT(slug) DO UPDATE SET visibility=excluded.visibility").bind(slug,state),
  d.prepare("UPDATE course_settings SET status='closed' WHERE slug=? AND ?<>'published' AND status='open'").bind(slug,state),
  d.prepare("INSERT INTO admin_audit(actor,action,target,created_at,next) VALUES(?,?,?,?,?)").bind(actor,"set catalogue visibility",slug,now,state)
 ]);
 return true;
}
export async function switchBatch(actor:string,val:Reader){
 const slug=val("slug"),from=val("batch"),to=val("nextBatch").trim(),mode=val("batchAction");
 if(!auditKey.test(slug)||registrationSlug(slug)!==slug||!(/^[a-z0-9][a-z0-9-]{0,29}$/).test(to)||to===from||!["new","restore"].includes(mode))return false;
 const c=await lookup(slug);if(!c||c.batch!==from||c.status==="open")return false;
 const d=db();
 const old=await d.prepare("SELECT schedule,mode FROM batch_archive WHERE slug=? AND batch=?").bind(slug,to).first<{schedule:string;mode:string}>();
 const seen=await d.prepare("SELECT 1 FROM applications WHERE slug=? AND batch=? LIMIT 1").bind(slug,to).first();
 if(mode==="new"&&(old||seen)||mode==="restore"&&!old)return false;
 const r=await d.batch([
  d.prepare("INSERT INTO batch_archive(slug,batch,schedule,mode,status) VALUES(?,?,?,?,?) ON CONFLICT(slug,batch) DO UPDATE SET schedule=excluded.schedule,mode=excluded.mode,status=excluded.status").bind(slug,from,c.schedule,c.mode,c.status),
  d.prepare("INSERT INTO course_settings(slug,batch,schedule,mode,status) VALUES(?,?,?,?,'soon') ON CONFLICT(slug) DO UPDATE SET batch=excluded.batch,schedule=excluded.schedule,mode=excluded.mode,status='soon' WHERE course_settings.batch=? AND course_settings.status<>'open'").bind(slug,to,old?.schedule??"",old?.mode??"",from)
 ]);
 if(r[1].meta.changes)await audit(actor,mode+" batch",slug+"/"+to);
 return !!r[1].meta.changes;
}
export async function batchHistory(slug:string){
 return (await db().prepare("SELECT batch,schedule,mode,status FROM batch_archive WHERE slug=? ORDER BY batch").bind(slug).all<{batch:string;schedule:string;mode:string;status:string}>()).results;
}

export async function recordOfflinePayment(actor:string,id:string,reference:string,raw:string){
 if(!ref.test(id)||!(/^[A-Za-z0-9._/-]{3,64}$/).test(reference)||!/^\d{1,6}(\.\d{1,2})?$/.test(raw))return false;
 const d=db(),payment="offline:"+reference,amount=Math.round(Number(raw)*100);
 if(amount<100)return false;
 const row=await d.prepare("SELECT * FROM applications WHERE id=?").bind(id).first<Application>();
 // The fee owed may differ from the stored amount for C pre-applications made while the course was free.
 if(!row||paymentAmount(row)!==amount)return false;
 // An unused Razorpay order does not block a verified offline payment. A later online capture
 // for that order cannot mark it paid again, and the webhook logs it for a refund.
 // A verified fee enrolls the student, the same as a verified online capture.
 const r=await d.prepare("UPDATE applications SET payment_state='paid',payment_id=?,amount=?,review_state='accepted',class_access=1 WHERE id=? AND payment_state='unpaid' AND payment_id IS NULL AND review_state<>'declined' AND amount=? AND NOT EXISTS (SELECT 1 FROM applications WHERE payment_id=?)").bind(payment,amount,id,row.amount,payment).run();
 if(r.meta.changes)await audit(actor,row.order_id?"record verified offline payment (online order "+row.order_id+" left unused)":"record verified offline payment",id);
 return !!r.meta.changes;
}

export async function updateFacultyProfile(actor:string,val:Reader){
 const id=val("id"),name=val("name").trim(),department=val("department").trim(),designation=val("designation").trim(),qualification=val("qualification").trim(),bio=val("bio").trim();
 if(!z.string().uuid().safeParse(id).success||[name,department,designation].some(s=>s.length<2||s.length>100)||qualification.length>150||bio.length>300)return false;
 const r=await db().prepare("UPDATE faculty_profiles SET name=?,department=?,designation=?,qualification=?,bio=? WHERE id=?").bind(name,department,designation,qualification,bio,id).run();
 if(r.meta.changes)await audit(actor,"edit faculty profile",id);
 return !!r.meta.changes;
}
export async function batchReports(){
 return (await db().prepare(`SELECT slug,batch,COUNT(*) AS applications,
 SUM(CASE WHEN review_state='accepted' THEN 1 ELSE 0 END) AS accepted,
 SUM(CASE WHEN payment_state IN (${paidStatesSql()}) THEN amount ELSE 0 END) AS verified,
 SUM(CASE WHEN ${enrolledSql()} THEN 1 ELSE 0 END) AS enrolled
 FROM applications GROUP BY slug,batch ORDER BY slug,batch LIMIT 200`).all<{slug:string;batch:string;applications:number;accepted:number;verified:number;enrolled:number}>()).results;
}
export async function markProposalRevision(actor:string,id:string,raw:string){
 const note=raw.trim();if(!z.string().uuid().safeParse(id).success||note.length<3||note.length>1000)return false;
 const d=db(),now=iso();const r=await d.batch([
  d.prepare("INSERT INTO faculty_proposal_review(proposal_id,note,updated_at) SELECT id,?,? FROM faculty_proposals WHERE id=? AND status='submitted' ON CONFLICT(proposal_id) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at").bind(note,now,id),
  d.prepare("UPDATE faculty_proposals SET status='revision_requested' WHERE id=? AND status='submitted'").bind(id)
 ]);
 if(r[1].meta.changes)await audit(actor,"request proposal revision",id);
 return !!r[1].meta.changes;
}

export type Material={day:number;resource_title:string;resource_url:string;assignment_title:string;assignment_url:string};
export async function getMaterials(slug:string,batch:string){
 return (await db().prepare("SELECT day,resource_title,resource_url,assignment_title,assignment_url FROM batch_learning_material WHERE slug=? AND batch=? ORDER BY day").bind(slug,batch).all<Material>()).results;
}
export async function saveMaterials(actor:string,val:Reader){
 const slug=val("slug"),batch=val("batch"),c=await lookup(slug);
 if(!c||registrationSlug(slug)!==slug||c.batch!==batch)return false;
 const entries=[1,2,3,4,5].map(i=>({i,rt:val("resourceTitle"+i).trim(),ru:val("resourceUrl"+i).trim(),at:val("assignmentTitle"+i).trim(),au:val("assignmentUrl"+i).trim()}));
 if(entries.some(x=>x.rt.length>120||x.at.length>120||!https.safeParse(x.ru).success||!https.safeParse(x.au).success||Boolean(x.rt)!==Boolean(x.ru)||Boolean(x.at)!==Boolean(x.au)))return false;
 const d=db();await d.batch([...entries.map(x=>d.prepare("INSERT INTO batch_learning_material(slug,batch,day,resource_title,resource_url,assignment_title,assignment_url) VALUES(?,?,?,?,?,?,?) ON CONFLICT(slug,batch,day) DO UPDATE SET resource_title=excluded.resource_title,resource_url=excluded.resource_url,assignment_title=excluded.assignment_title,assignment_url=excluded.assignment_url").bind(slug,batch,x.i,x.rt,x.ru,x.at,x.au)),auditStmt(actor,"save learning materials",slug+"/"+batch)]);
 return true;
}
