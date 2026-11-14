import {formFields,getBatchRules} from "./admin-controls";
import {PAISE,registrationSlug} from "./courses";
import {applicationSchema,applicationsOpen,canApply,createRef,db,digest,editSchema,lookup,newToken} from "./enrollment";

export const REVIEW_STATES=["submitted","under_review","accepted","declined"] as const;
export const reviewLabels:Record<string,string>={submitted:"Submitted",under_review:"Under review",accepted:"Accepted",declined:"Declined"};
export type RecordRow={id:string;slug:string;batch:string;name:string;email:string;college:string;created_at:string;review_state:string;payment_state:string;payment_id:string|null;class_access:number;amount:number;form_answers:string;order_id:string|null};
export const accessCookie="scs_application";
export const refPattern=/^SCS-[A-F0-9]{20}$/;
export const codePattern=/^[a-f0-9]{64}$/;

export async function createApplication(input:unknown,owner?:{id:string;email:string}|null) {
 const p=applicationSchema.safeParse(input);
 if(!p.success)return {error:"invalid" as const,status:400};
 const a={...p.data,slug:registrationSlug(p.data.slug)};
 // A matching email links the student dashboard. The authenticated submitter can also finish checkout.
 const studentUserId=owner?.email===a.email?owner.id:null;
 const c=await lookup(a.slug);
 if(c?.intakePaused)return {error:"paused" as const,status:409};
 if(!c||!canApply(c)|| (a.batch&&a.batch!==c.batch))return {error:c?.status==="closed"?"closed" as const:"not-open" as const,status:409};
 const rules=await getBatchRules(a.slug,c.batch);
 const fields=formFields(rules);
 if((fields.length||p.data.formVersion!==undefined)&&(p.data.formVersion??-1)!==rules.form_version)return {error:"form-changed" as const,status:409};
 const answers=fields.map(f=>({label:f.label,value:(p.data.answers?.[f.key]??"").trim()}));
 if(answers.some((answer,i)=>fields[i].required&&!answer.value))return {error:"invalid" as const,status:400};
 const id=createRef(),token=newToken(),needsInstructor=c.needsInstructor?1:0,now=new Date().toISOString();
 const r=await db().prepare("INSERT INTO applications (id,token_hash,slug,batch,name,email,college,created_at,amount,student_user_id,submitted_by_user_id,form_answers) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT form_version FROM batch_rules WHERE slug=? AND batch=?),0)=? AND COALESCE((SELECT fee_paise FROM batch_rules WHERE slug=? AND batch=?),?)=? AND NOT EXISTS (SELECT 1 FROM site_controls WHERE id=1 AND intake_paused=1) AND NOT EXISTS (SELECT 1 FROM course_catalogue WHERE slug=? AND visibility<>'published') AND NOT EXISTS (SELECT 1 FROM batch_rules r WHERE r.slug=? AND r.batch=? AND ((r.closes_at<>'' AND r.closes_at<=?) OR (r.application_limit>0 AND (SELECT COUNT(*) FROM applications a WHERE a.slug=r.slug AND a.batch=r.batch AND a.review_state<>'declined')>=r.application_limit))) AND EXISTS (SELECT 1 FROM course_settings WHERE slug=? AND batch=? AND status='open' AND trim(schedule)<>'' AND trim(mode)<>'' AND (?=0 OR EXISTS (SELECT 1 FROM course_banners AS banner WHERE banner.slug=course_settings.slug AND banner.batch=course_settings.batch AND trim(banner.faculty)<>''))) ON CONFLICT(slug,batch,email) DO NOTHING").bind(id,await digest(token),a.slug,c.batch,a.name,a.email,a.college,now,rules.fee_paise??PAISE,studentUserId,owner?.id??null,JSON.stringify({version:rules.form_version,answers,...(p.data.details?{details:p.data.details}:{})}),a.slug,c.batch,rules.form_version,a.slug,c.batch,PAISE,rules.fee_paise??PAISE,a.slug,a.slug,c.batch,now,a.slug,c.batch,needsInstructor).run();
 if(!r.meta.changes){const current=await lookup(a.slug);if(current?.intakePaused)return {error:"paused" as const,status:409};if(!canApply(current)||current?.batch!==c.batch)return {error:current?.status==="closed"?"closed" as const:"not-open" as const,status:409};const latest=await getBatchRules(a.slug,c.batch);if(latest.form_version!==rules.form_version||latest.fee_paise!==rules.fee_paise)return {error:"form-changed" as const,status:409};return {error:"duplicate" as const,status:409};}
 return {id,token,status:201};
}

export async function saveCourse(slug:string,input:unknown,expectedBatch?:string){
 const p=editSchema.safeParse(input);
 if(!p.success)return "invalid";
 const course=await lookup(slug);
 if(!course)return "invalid";
 const a=p.data;
 if(expectedBatch&&course.batch!==expectedBatch)return "course-batch-stale";
 if(a.status==="open"&&course.visibility!=="published")return "invalid";
 if(a.status==="open"&&registrationSlug(slug)!==slug)return "parent-course";
 if(a.status==="open"&&!applicationsOpen(a))return "schedule";
 if(a.status==="open"&&course.needsInstructor){
  const faculty=await db().prepare("SELECT faculty FROM course_banners WHERE slug=? AND batch=?").bind(slug,a.batch).first<string>("faculty");
  if(!faculty?.trim())return "instructor";
 }
 const result=await db().prepare("INSERT INTO course_settings (slug,title,blurb,outcome,days,schedule,mode,batch,status) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,blurb=excluded.blurb,outcome=excluded.outcome,days=excluded.days,schedule=excluded.schedule,mode=excluded.mode,batch=excluded.batch,status=excluded.status WHERE ?='' OR course_settings.batch=?").bind(slug,a.title,a.blurb,a.outcome,JSON.stringify(a.days),a.schedule,a.mode,a.batch,a.status,expectedBatch??"",expectedBatch??"").run();
 return result.meta.changes?null:"course-batch-stale";
}

export type AppFilters={q?:string;review?:string;payment?:string;batch?:string};
export async function listApplications(slug="",page=1,filters:AppFilters={}){
 const match=slug,q=(filters.q??"").trim().slice(0,120).toLowerCase(),review=(filters.review==="pending"||REVIEW_STATES.some(x=>x===filters.review))?filters.review!:"",payment=["paid","unpaid","test_paid"].includes(filters.payment??"")?filters.payment!:"",batch=/^[a-z0-9-]{1,30}$/.test(filters.batch??"")?filters.batch!:"";
 const result=await db().prepare("SELECT id,slug,batch,name,email,college,created_at,review_state,payment_state,payment_id,class_access,amount,form_answers,order_id FROM applications WHERE (?='' OR slug=?) AND (?='' OR instr(lower(id||' '||name||' '||email||' '||college),?)>0) AND (?='' OR review_state=? OR (?='pending' AND review_state IN ('submitted','under_review'))) AND (?='' OR payment_state=?) AND (?='' OR batch=?) ORDER BY created_at DESC,id DESC LIMIT 51 OFFSET ?").bind(match,match,q,q,review,review,review,payment,payment,batch,batch,(page-1)*50).all<RecordRow>();
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
