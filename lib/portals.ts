import {z} from "zod";
import {cfg,db,getCourses} from "./enrollment";
import {TRACKS,cDayNumber,CRASH_SLUG} from "./courses";
import {codePattern,refPattern} from "./form-workflows";
import {getApplication} from "./enrollment";

export type Identity={id:string;email:string};
export function requestIdentity(h:Pick<Headers,"get">):Identity|null{
 const id=h.get("oai-authenticated-user-id"),email=h.get("oai-authenticated-user-email")?.trim().toLowerCase();
 return id&&email?{id,email}:null;
}

export type Faculty={id:string;email:string;name:string;department:string;designation:string;qualification:string;bio:string;active:number};
export type Proposal={id:string;faculty_id:string;title:string;track:string;format:string;summary:string;outcome:string;level:string;tools:string;syllabus_url:string;days:string;status:string;created_at:string;revision_note?:string};
export type Assignment={slug:string;batch:string;faculty_id:string;earned:number;paid:number};
export type Progress={slug:string;batch:string;day:number};
type StudentRow={id:string;slug:string;batch:string;review_state:string;payment_state:string;class_access:number};
export const teachingDays=[1,2,3,4,5] as const;
export const proposalSlug=(id:string)=>"faculty-"+id;
export const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(paise/100);
const field=(max:number)=>z.string().trim().min(2).max(max);
const safeLink=z.string().trim().max(700).refine(s=>{
 if(!s)return true;
 try{const u=new URL(s);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}
});
const facultySchema=z.object({name:field(100),email:z.string().trim().email().max(160).transform(s=>s.toLowerCase()),department:field(100),designation:field(100),qualification:z.string().trim().max(150),bio:z.string().trim().max(300)});
const proposalSchema=z.object({title:field(100),track:z.enum(TRACKS),format:z.enum(["regular","exclusive"]),summary:field(450),outcome:field(300),level:field(80),tools:field(250),syllabusUrl:safeLink,days:z.array(z.tuple([field(140),field(320)])).length(5)});
const uuid=z.string().uuid();

export async function facultyFor(user:Identity){
 return db().prepare("SELECT id,email,name,department,designation,qualification,bio,active FROM faculty_profiles WHERE email=? AND active=1").bind(user.email).first<Faculty>();
}

export async function addFaculty(val:(name:string)=>string){
 const p=facultySchema.safeParse({name:val("name"),email:val("email"),department:val("department"),designation:val("designation"),qualification:val("qualification"),bio:val("bio")});
 if(!p.success)return "invalid";
 const f=p.data;
 const result=await db().prepare("INSERT INTO faculty_profiles (id,email,name,department,designation,qualification,bio,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(),f.email,f.name,f.department,f.designation,f.qualification,f.bio,new Date().toISOString()).run();
 return result.meta.changes?"faculty-added":"duplicate-email";
}

export async function setFacultyActive(id:string,active:string){
 if(!uuid.safeParse(id).success||!["yes","no"].includes(active))return false;
 return !!(await db().prepare("UPDATE faculty_profiles SET active=? WHERE id=?").bind(active==="yes"?1:0,id).run()).meta.changes;
}

export async function claimApplication(user:Identity,reference:string,trackingCode:string){
 const id=reference.trim().toUpperCase(),token=trackingCode.trim().toLowerCase();
 if(!refPattern.test(id)||!codePattern.test(token))return false;
 const row=await getApplication(id,token);
 if(!row||row.email.toLowerCase()!==user.email)return false;
 return !!(await db().prepare("UPDATE applications SET student_user_id=? WHERE id=? AND lower(email)=? AND (student_user_id IS NULL OR student_user_id=?)").bind(user.id,id,user.email,user.id).run()).meta.changes;
}

export async function studentApplications(user:Identity){
 return (await db().prepare("SELECT id,slug,batch,review_state,payment_state,class_access FROM applications WHERE student_user_id=? ORDER BY created_at DESC").bind(user.id).all<StudentRow>()).results;
}

export const maxSyllabusBytes=2*1024*1024;
export const syllabusKey=(id:string)=>"faculty-syllabi/"+id+".pdf";
export async function submitProposal(faculty:Faculty,val:(name:string)=>string,syllabus?:File){
 const p=proposalSchema.safeParse({title:val("title"),track:val("track"),format:val("format"),summary:val("summary"),outcome:val("outcome"),level:val("level"),tools:val("tools"),syllabusUrl:val("syllabusUrl"),days:teachingDays.map(d=>[val("topic"+d),val("practical"+d)])});
 if(!p.success)return false;
 const id=crypto.randomUUID(),x=p.data,key=syllabusKey(id);
 const bucket=cfg.BUCKET;
 if(syllabus){
  if(!bucket||syllabus.size<5||syllabus.size>maxSyllabusBytes||syllabus.type!=="application/pdf")return false;
  if(await syllabus.slice(0,5).text()!=="%PDF-")return false;
  await bucket.put(key,await syllabus.arrayBuffer(),{httpMetadata:{contentType:"application/pdf"}});
 }
 try{
 const r=await db().prepare("INSERT INTO faculty_proposals (id,faculty_id,title,track,format,summary,outcome,level,tools,syllabus_url,days,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM faculty_profiles WHERE id=? AND active=1)").bind(id,faculty.id,x.title,x.track,x.format,x.summary,x.outcome,x.level,x.tools,syllabus?"/api/faculty-syllabus?id="+id:x.syllabusUrl,JSON.stringify(x.days),new Date().toISOString(),faculty.id).run();
 if(!r.meta.changes&&syllabus&&bucket)await bucket.delete(key);
 return !!r.meta.changes;
 }catch(error){
  if(syllabus&&bucket)await bucket.delete(key);
  throw error;
 }
}

export async function proposalDocument(id:string,user:Identity|null,admin:boolean){
 if(!uuid.safeParse(id).success||(!user&&!admin)||!cfg.BUCKET)return null;
 const row=await db().prepare("SELECT p.syllabus_url,f.email,f.active FROM faculty_proposals p JOIN faculty_profiles f ON f.id=p.faculty_id WHERE p.id=?").bind(id).first<{syllabus_url:string;email:string;active:number}>();
 if(!row||row.syllabus_url!=="/api/faculty-syllabus?id="+id||(!admin&&(!row.active||row.email!==user?.email)))return null;
 return cfg.BUCKET.get(syllabusKey(id));
}

export async function reviewProposal(id:string,decision:string){
 if(!uuid.safeParse(id).success||!["approved","declined"].includes(decision))return false;
 const d=db(), slug=proposalSlug(id);
 const guard="status='submitted' AND EXISTS (SELECT 1 FROM faculty_profiles f WHERE f.id=faculty_proposals.faculty_id AND f.active=1)";
 if(decision==="declined")return !!(await d.prepare("UPDATE faculty_proposals SET status='declined' WHERE id=? AND status='submitted'").bind(id).run()).meta.changes;
 const results=await d.batch([
  d.prepare("INSERT INTO faculty_assignments (slug,batch,faculty_id) SELECT ?,'batch-1',faculty_id FROM faculty_proposals WHERE id=? AND "+guard).bind(slug,id),
  d.prepare("UPDATE faculty_proposals SET status='approved' WHERE id=? AND "+guard).bind(id)
 ]);
 return !!results[1].meta.changes;
}

function paise(value:string){
 if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(value.trim()))return null;
 const [whole,fraction=""]=value.trim().split(".");
 return Number(whole)*100+Number(fraction.padEnd(2,"0"));
}

export async function recordAssignment(val:(name:string)=>string,actor="owner API"){
 const slug=val("slug"),batch=val("batch"),faculty=val("faculty"),earned=paise(val("earned")),paid=paise(val("paid"));
 if(!uuid.safeParse(faculty).success||earned===null||paid===null||paid>earned||cDayNumber(slug))return false;
 const course=(await getCourses()).find(c=>c.slug===slug&&c.batch===batch);
 if(!course)return false;
 const d=db();
 const write=d.prepare(`INSERT INTO faculty_assignments (slug,batch,faculty_id,earned,paid)
   SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM faculty_profiles WHERE id=? AND active=1)
   AND COALESCE((SELECT batch FROM course_settings WHERE slug=?),'batch-1')=?
   ON CONFLICT(slug,batch) DO UPDATE SET faculty_id=excluded.faculty_id,earned=excluded.earned,paid=excluded.paid
   WHERE faculty_assignments.faculty_id=excluded.faculty_id OR (
     faculty_assignments.earned=0 AND faculty_assignments.paid=0 AND NOT EXISTS
       (SELECT 1 FROM faculty_progress p WHERE p.slug=excluded.slug AND p.batch=excluded.batch)
   )`).bind(slug,batch,faculty,earned,paid,faculty,slug,batch);
 const log=d.prepare(`INSERT INTO faculty_payout_log(slug,batch,faculty_id,actor,created_at,earned_before,earned_after,paid_before,paid_after)
 SELECT ?,?,?,?,?,COALESCE(a.earned,0),?,COALESCE(a.paid,0),?
 FROM (SELECT 1) seed LEFT JOIN faculty_assignments a ON a.slug=? AND a.batch=?
 WHERE (COALESCE(a.earned,0)<>? OR COALESCE(a.paid,0)<>?)
 AND EXISTS (SELECT 1 FROM faculty_profiles WHERE id=? AND active=1)
 AND COALESCE((SELECT batch FROM course_settings WHERE slug=?),'batch-1')=?
 AND (a.faculty_id IS NULL OR a.faculty_id=? OR (a.earned=0 AND a.paid=0 AND NOT EXISTS
 (SELECT 1 FROM faculty_progress p WHERE p.slug=? AND p.batch=?)))`).bind(slug,batch,faculty,actor,new Date().toISOString(),earned,paid,slug,batch,earned,paid,faculty,slug,batch,faculty,slug,batch);
 const [,r]=await d.batch([log,write]);
 return !!r.meta.changes;
}

export async function setProgress(faculty:Faculty,slug:string,batch:string,day:string,done:string){
 if(!/^[1-5]$/.test(day)||!["yes","no"].includes(done)||slug.length>90||batch.length>30)return false;
 const args=[slug,batch,Number(day)] as const;
 const owns="EXISTS (SELECT 1 FROM faculty_assignments a JOIN faculty_profiles f ON f.id=a.faculty_id WHERE a.slug=? AND a.batch=? AND a.faculty_id=? AND f.active=1)";
 const d=db();
 if(done==="no")return !!(await d.prepare("DELETE FROM faculty_progress WHERE slug=? AND batch=? AND day=? AND "+owns).bind(...args,slug,batch,faculty.id).run()).meta.changes;
 return !!(await d.prepare("INSERT INTO faculty_progress (slug,batch,day,completed_at) SELECT ?,?,?,? WHERE "+owns+" ON CONFLICT(slug,batch,day) DO NOTHING").bind(...args,new Date().toISOString(),slug,batch,faculty.id).run()).meta.changes;
}

export async function facultyDashboard(faculty:Faculty){
 const d=db();
 const [assignments,proposals,progress,payouts]=await d.batch([
  d.prepare("SELECT slug,batch,faculty_id,earned,paid FROM faculty_assignments WHERE faculty_id=? ORDER BY slug,batch").bind(faculty.id),
  d.prepare("SELECT p.*, r.note AS revision_note FROM faculty_proposals p LEFT JOIN faculty_proposal_review r ON r.proposal_id=p.id WHERE p.faculty_id=? ORDER BY p.created_at DESC").bind(faculty.id),
  d.prepare("SELECT p.slug,p.batch,p.day FROM faculty_progress p JOIN faculty_assignments a ON p.slug=a.slug AND p.batch=a.batch WHERE a.faculty_id=? ORDER BY p.day").bind(faculty.id),
  d.prepare("SELECT slug,batch,created_at,earned_before,earned_after,paid_before,paid_after FROM faculty_payout_log WHERE faculty_id=? ORDER BY id DESC LIMIT 50").bind(faculty.id)
 ]);
 return {assignments:assignments.results as Assignment[],proposals:proposals.results as Proposal[],progress:progress.results as Progress[],payouts:payouts.results as Payout[]};
}

export type Payout={slug:string;batch:string;created_at:string;earned_before:number;earned_after:number;paid_before:number;paid_after:number};
export async function adminDashboard(){
 const d=db();
 const [faculty,assignments,proposals,students,progress]=await d.batch([
  d.prepare("SELECT id,email,name,department,designation,qualification,bio,active FROM faculty_profiles ORDER BY active DESC,name,email"),
  d.prepare("SELECT slug,batch,faculty_id,earned,paid FROM faculty_assignments ORDER BY slug,batch"),
  d.prepare("SELECT * FROM faculty_proposals ORDER BY CASE WHEN status='submitted' THEN 0 ELSE 1 END,created_at DESC"),
  d.prepare("SELECT COUNT(DISTINCT COALESCE(student_user_id,lower(email))) AS students,COUNT(*) AS applications,COALESCE(SUM(CASE WHEN review_state='accepted' AND class_access=1 AND (slug<>? OR payment_state='paid') THEN 1 ELSE 0 END),0) AS enrolled FROM applications").bind(CRASH_SLUG),
  d.prepare("SELECT slug,batch,day FROM faculty_progress ORDER BY day")
 ]);
 return {faculty:faculty.results as Faculty[],assignments:assignments.results as Assignment[],proposals:proposals.results as Proposal[],students:students.results[0] as {students:number;applications:number;enrolled:number},progress:progress.results as Progress[]};
}
