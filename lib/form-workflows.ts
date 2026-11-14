import {getCourse,PAISE,registrationSlug} from "./courses";
import {applicationSchema,applicationsOpen,createRef,db,digest,editSchema,lookup,newToken} from "./enrollment";

export const REVIEW_STATES=["submitted","under_review","accepted","declined"] as const;
export const reviewLabels:Record<string,string>={submitted:"Submitted",under_review:"Under review",accepted:"Accepted",declined:"Declined"};
export type RecordRow={id:string;slug:string;batch:string;name:string;email:string;college:string;created_at:string;review_state:string;payment_state:string;payment_id:string|null;class_access:number};
export const accessCookie="scs_application";
export const refPattern=/^SCS-[A-F0-9]{20}$/;
export const codePattern=/^[a-f0-9]{64}$/;

export async function createApplication(input:unknown) {
 const p=applicationSchema.safeParse(input);
 if(!p.success)return {error:"invalid" as const,status:400};
 const a={...p.data,slug:registrationSlug(p.data.slug)};
 const c=await lookup(a.slug);
 if(!c||!applicationsOpen(c)|| (a.batch&&a.batch!==c.batch))return {error:c?.status==="closed"?"closed" as const:"not-open" as const,status:409};
 const id=createRef(),token=newToken(),needsInstructor=c.exclusive&&!getCourse(a.slug)?.instructor?1:0;
 const r=await db().prepare("INSERT INTO applications (id,token_hash,slug,batch,name,email,college,created_at,amount) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM course_settings WHERE slug=? AND batch=? AND status='open' AND trim(schedule)<>'' AND trim(mode)<>'' AND (?=0 OR EXISTS (SELECT 1 FROM course_banners AS banner WHERE banner.slug=course_settings.slug AND banner.batch=course_settings.batch AND trim(banner.faculty)<>''))) ON CONFLICT(slug,batch,email) DO NOTHING").bind(id,await digest(token),a.slug,c.batch,a.name,a.email,a.college,new Date().toISOString(),PAISE,a.slug,c.batch,needsInstructor).run();
 if(!r.meta.changes){const current=await lookup(a.slug);if(!applicationsOpen(current)||current?.batch!==c.batch)return {error:current?.status==="closed"?"closed" as const:"not-open" as const,status:409};return {error:"duplicate" as const,status:409};}
 return {id,token,status:201};
}

export async function saveCourse(slug:string,input:unknown){
 const p=editSchema.safeParse(input);
 const course=getCourse(slug);
 if(!course||!p.success)return "invalid";
 const a=p.data;
 if(a.status==="open"&&registrationSlug(slug)!==slug)return "parent-course";
 if(a.status==="open"&&!applicationsOpen(a))return "schedule";
 if(a.status==="open"&&course.exclusive&&!course.instructor){
  const faculty=await db().prepare("SELECT faculty FROM course_banners WHERE slug=? AND batch=?").bind(slug,a.batch).first<string>("faculty");
  if(!faculty?.trim())return "instructor";
 }
 await db().prepare("INSERT INTO course_settings (slug,title,blurb,outcome,days,schedule,mode,batch,status) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,blurb=excluded.blurb,outcome=excluded.outcome,days=excluded.days,schedule=excluded.schedule,mode=excluded.mode,batch=excluded.batch,status=excluded.status").bind(slug,a.title,a.blurb,a.outcome,JSON.stringify(a.days),a.schedule,a.mode,a.batch,a.status).run();
 return null;
}

export async function listApplications(slug="",page=1){
 const match=slug&&getCourse(slug)?slug:"";
 const result=await db().prepare("SELECT id,slug,batch,name,email,college,created_at,review_state,payment_state,payment_id,class_access FROM applications WHERE (?='' OR slug=?) ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?").bind(match,match,(page-1)*50).all<RecordRow>();
 return {rows:result.results.slice(0,50),next:result.results.length>50};
}

export async function updateReview(id:string,status:string){
 if(!refPattern.test(id)||!REVIEW_STATES.some(x=>x===status))return false;
 const r=await db().prepare("UPDATE applications SET review_state=?,class_access=CASE WHEN ?='accepted' THEN class_access ELSE 0 END WHERE id=?").bind(status,status,id).run();
 return r.meta.changes===1;
}

const columns=["id","slug","batch","name","email","college","created_at","review_state","payment_state","payment_id"] as const;
function cell(value:unknown){
 let s=String(value??"");
 if(/^\s*[=+\-@]/.test(s)||/^[\r\t\n]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
export function csv(rows:RecordRow[]){return rows.map(row=>columns.map(k=>cell(row[k])).join(",")).join("\r\n");}
export const csvHeader=columns.join(",");
