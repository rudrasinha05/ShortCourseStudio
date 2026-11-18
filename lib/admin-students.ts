import {db} from "./enrollment";
import {CRASH_SLUG} from "./courses";
import {refPattern,type RecordRow} from "./form-workflows";
import {readLearningPreferences} from "./learning-preferences";

export const directoryPageSize=25;
const enrolled=`review_state='accepted' AND class_access=1 AND (slug<>? OR payment_state='paid')`;
type IdentityRow={id:string;name:string;email:string;college:string;created_at:string;form_answers:string;student_user_id:string|null};
type DirectoryRow=IdentityRow&{applications:number;enrollments:number;course_title_slugs:string};
type HistoryRow=RecordRow&{student_user_id:string|null};
export function contactDetails(raw:string){
 try{
  const details=JSON.parse(raw)?.details;
  const get=(value:unknown)=>typeof value==="string"?value.trim():"";
  return {phone:get(details?.phone),programme:get(details?.programme),year:get(details?.year)};
 }catch{return {phone:"",programme:"",year:""};}
}
export async function listStudents({search,course,status,page}:{search:string;course:string;status:string;page:number}){
 // The application email is the contact identity. A matching name is never used to merge applicants.
 const sql=`WITH ranked AS (
  SELECT id,name,email,college,created_at,form_answers,student_user_id,lower(trim(email)) AS contact,
   ROW_NUMBER() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at DESC,id DESC) AS idx
  FROM applications
 ), groups AS (
  SELECT lower(trim(email)) AS contact,COUNT(*) AS applications,
   SUM(CASE WHEN ${enrolled} THEN 1 ELSE 0 END) AS enrollments,
   GROUP_CONCAT(DISTINCT CASE WHEN ${enrolled} THEN slug END) AS course_title_slugs
  FROM applications GROUP BY lower(trim(email))
 ), matching AS (
  SELECT DISTINCT lower(trim(email)) AS contact FROM applications WHERE (?='' OR slug=?)
   AND (?='' OR instr(lower(id||' '||name||' '||email||' '||college||' '||
    CASE WHEN json_valid(form_answers) THEN COALESCE(json_extract(form_answers,'$.details.phone'),'') ELSE '' END),?)>0)
 ), filtered AS (
  SELECT r.*,g.applications,g.enrollments,COALESCE(g.course_title_slugs,'') AS course_title_slugs
  FROM ranked r JOIN groups g ON g.contact=r.contact JOIN matching m ON m.contact=r.contact
  WHERE r.idx=1 AND (?='' OR (?='enrolled' AND g.enrollments>0) OR (?='not-enrolled' AND g.enrollments=0))
 )
 SELECT *,COUNT(*) OVER () AS total FROM filtered ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`;
 const term=search.trim().toLowerCase();
 const result=await db().prepare(sql).bind(CRASH_SLUG,CRASH_SLUG,course,course,term,term,status,status,status,directoryPageSize,(page-1)*directoryPageSize).all<DirectoryRow&{total:number}>();
 return {rows:result.results,total:result.results[0]?.total??0};
}

export async function getStudentHistory(reference:string){
 if(!refPattern.test(reference))return null;
 const d=db();
 const rows=(await d.prepare(`SELECT id,slug,batch,name,email,college,created_at,review_state,payment_state,payment_id,class_access,amount,form_answers,order_id,student_user_id
  FROM applications WHERE lower(trim(email))=(SELECT lower(trim(email)) FROM applications WHERE id=?)
  ORDER BY created_at DESC,id DESC`).bind(reference).all<HistoryRow>()).results;
 if(!rows.length)return null;
 const accountId=rows.find(r=>r.student_user_id)?.student_user_id;
 const stored=accountId?await d.prepare("SELECT preferences FROM student_learning_profiles WHERE user_id=?").bind(accountId).first<string>("preferences"):null;
 const preferences=readLearningPreferences(stored)??rows.map(r=>readLearningPreferences(r.form_answers,true)).find(p=>p!==null)??null;
 const contact=rows.map(r=>contactDetails(r.form_answers));
 return {
  student:rows[0],rows,preferences,
  phone:contact.find(d=>d.phone)?.phone??"",
  programme:contact[0].programme||contact.find(d=>d.programme)?.programme||"",
  year:contact[0].year||contact.find(d=>d.year)?.year||"",
 };
}
