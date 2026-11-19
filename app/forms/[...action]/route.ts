import {facultyIdentity} from "@/lib/faculty-auth";
import {readAdminSchedule} from "@/lib/batch-schedule";
import {checkoutUrl} from "@/lib/billing";
import {saveReminderContact} from "@/lib/class-reminders";
import {preferencesFromForm} from "@/lib/learning-preferences";
import {writeLearningProfile} from "@/lib/student-learning-profile";
import {adminTarget} from "@/lib/admin-navigation";
import {isAllowed,openSupport,respondSupport,saveStaff,type StaffRole} from "@/lib/staff";
import {actorFor,addApplicantNote,audit,certificateAction,markProposalRevision,recordLearning,recordOfflinePayment,restoreSettings,saveBatchRules,saveCatalogueCourse,saveMaterials,saveNotices,saveWebsite,switchBatch,updateFacultyProfile} from "@/lib/admin-controls";
import {setBatchIntake,setSiteControls} from "@/lib/intake-admin";
import {authorizedAdmin,db,getApplication,lookup} from "@/lib/enrollment";
import {CRASH_SLUG,saveBanner} from "@/lib/course-banners";
import {saveClassSessions,setClassAccess} from "@/lib/class-sessions";
import {addFaculty,claimApplication,facultyFor,maxSyllabusBytes,recordAssignment,requestIdentity,reviewProposal,setFacultyActive,setProgress,submitProposal} from "@/lib/portals";
import {portalLoginPath} from "@/app/site-auth";
import {accessCookie,codePattern,refPattern,createApplication,csv,csvHeader,listApplications,saveCourse,updateReview} from "@/lib/form-workflows";

export const dynamic="force-dynamic";
const paidApplication=async(id:string)=>!!(await db().prepare("SELECT 1 FROM applications WHERE id=? AND payment_state IN ('paid','test_paid')").bind(id).first());
const common={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const move=(path:string,cookie?:string)=>new Response(null,{status:303,headers:{...common,Location:path,...(cookie?{"Set-Cookie":cookie}:{})}});
const text=(value:string,status:number)=>new Response(value,{status,headers:{...common,"Content-Type":"text/plain; charset=utf-8"}});
const current=(req:Request)=>new URL(req.url);
const redirectTo=(path:string,values:Record<string,string>)=>path+"?"+new URLSearchParams(values);
function receipt(req:Request,id:string,token:string,step:"billing"|"receipt"="receipt"){
 const secure=current(req).protocol==="https:"||req.headers.get("x-forwarded-proto")==="https";
 const cookie=accessCookie+"="+id+"."+token+"; Path=/apply; HttpOnly; Max-Age=604800"+(secure?"; SameSite=None; Secure; Partitioned":"; SameSite=Lax");
 return move(checkoutUrl(step,id),cookie);
}
async function readForm(req:Request,allowFile:boolean){
 const type=req.headers.get("content-type")??"",encoded=type.toLowerCase().startsWith("application/x-www-form-urlencoded");
 const multipart=allowFile&&type.toLowerCase().startsWith("multipart/form-data;");
 if(!encoded&&!multipart)return null;
 const reader=req.body?.getReader();if(!reader)return null;
 const chunks:Uint8Array[]=[];let length=0;
 try{
  for(;;){
   const part=await reader.read();if(part.done)break;
   length+=part.value.length;
   if(length>(multipart?maxSyllabusBytes+24000:18000)){await reader.cancel();return null;}
   chunks.push(part.value);
  }
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(encoded)return new URLSearchParams(new TextDecoder().decode(bytes));
  try{return await new Response(bytes,{headers:{"Content-Type":type}}).formData();}catch{return null;}
 }finally{reader.releaseLock();}
}
export async function POST(req:Request){
 const url=current(req),path=url.pathname;
 const origin=req.headers.get("origin"), site=req.headers.get("sec-fetch-site");
 if(site==="cross-site"||(origin&&origin!==url.origin&&site!=="same-origin"))return text("This form must be submitted from Short Course Studio.",403);
 const facultyAction=path==="/forms/faculty/proposal"||path==="/forms/faculty/progress"||path==="/forms/faculty/reminder-contact";
 const user=facultyAction?await facultyIdentity(req.headers):requestIdentity(req.headers);
 const faculty=facultyAction&&user?await facultyFor(user):null;
 if(facultyAction&&!faculty)return text("Active faculty access is required.",403);
 const f=await readForm(req,path==="/forms/faculty/proposal");if(!f)return text("Invalid or oversized form. Go back and try again.",400);
 const val=(key:string)=>{const v=f.get(key);return typeof v==="string"?v:"";};
 const validSlug=(s:string)=>/^[a-z0-9-]{1,90}$/.test(s)?s:"";
 const slug=validSlug(val("slug"));
 const applicantReturn={
  filter:validSlug(val("filter")),page:/^[1-9][0-9]{0,4}$/.test(val("page"))?val("page"):"1",
  q:val("returnQ").slice(0,120),batch:val("returnBatch").slice(0,30),
  review:val("returnReview").slice(0,30),payment:val("returnPayment").slice(0,30),
 };
 const apply=(error:string)=>move(redirectTo("/apply",{course:slug,error}));
 const admin=(message:string)=>move(adminTarget(path.startsWith("/forms/admin/")?({
  "/forms/admin/course":"course-management","/forms/admin/review":"applications","/forms/admin/class-access":"applications",
  "/forms/admin/faculty":"faculty-directory","/forms/admin/faculty-active":"faculty-directory","/forms/admin/assignment":"assignments","/forms/admin/proposal":"faculty-proposals",
  "/forms/admin/control/faculty-profile":"faculty-directory","/forms/admin/control/proposal-revision":"faculty-proposals",
  "/forms/admin/sessions":"class-schedule","/forms/admin/banner":slug===CRASH_SLUG?"crash-banner":"course-banner",
  "/forms/admin/intake":"enrollment-controls","/forms/admin/site-controls":"site-controls",
  "/forms/admin/control/batch-rules":"batch-rules","/forms/admin/control/batch-switch":"batch-rules","/forms/admin/control/catalogue":"catalogue-controls",
  "/forms/admin/control/content":"website-content","/forms/admin/control/notices":"notice-templates","/forms/admin/control/materials":"learning-materials",
  "/forms/admin/control/staff":"staff-access","/forms/admin/control/support":"support-requests","/forms/admin/control/restore":"change-history",
  "/forms/admin/control/note":"applications","/forms/admin/control/learning":"applications","/forms/admin/control/certificate":"applications",
  "/forms/admin/control/offline-payment":"applications",
 } as Record<string,string>)[path]??"":"",{course:slug,message}));
 try{
  if(path==="/forms/student/reminder-contact"){
   if(!user)return text("Student sign-in is required.",403);
   const saved=await saveReminderContact(user.id,val("enabled")==="yes",val("whatsapp"));
   return move("/student?view=support&message="+(saved?"reminders-saved":"reminders-invalid"));
  }
  if(path==="/forms/faculty/reminder-contact"){
   const member=faculty;
   if(!member)return text("Active faculty access is required.",403);
   const saved=await saveReminderContact("faculty:"+member.id,val("enabled")==="yes",val("whatsapp"));
   return move("/faculty?view=profile&message="+(saved?"reminders-saved":"reminders-invalid"));
  }
  if(path==="/forms/student/learning-profile"){
   if(!user)return text("Student sign-in is required.",403);
   const saved=await writeLearningProfile(user.id,preferencesFromForm(f));
   return move("/student?view=explore&message="+(saved?"preferences-saved":"preferences-invalid"));
  }
  if(path==="/forms/student/support"){
   if(!user)return text("Student sign-in is required.",403);
   return move("/student?view=support&message="+(await openSupport(user.id,val("id"),val("type"),val("message"))?"support-saved":"support-invalid")+"#support");
  }
  if(path==="/forms/student/claim"){
   if(!user)return text("Student sign-in is required.",403);
   return move("/student?view=applications&message="+(await claimApplication(user,val("id"),val("code"))?"linked":"not-linked")+"#applications");
  }
  if(faculty){
   const proposal=path.endsWith("/proposal");
   const file=f.get("syllabus");
   const ok=proposal?await submitProposal(faculty,val,typeof file==="object"&&file?.size?file:undefined):await setProgress(faculty,slug,val("batch"),val("day"),val("done"));
   return move("/faculty?message="+(ok?(proposal?"submitted":"progress-saved"):"invalid")+(proposal?"&view=proposals#proposals":"&view=teaching#assigned"));
  }
  if(path.startsWith("/forms/admin/control/")){
   const actor=actorFor(req),op=path.slice("/forms/admin/control/".length);
   const scopes:StaffRole[]=op==="offline-payment"?["finance"]:op==="learning"?["academic"]:op==="support"?["admissions"]:[];
   if(!await isAllowed(req,scopes))return text("Administrator sign-in is required.",403);
   const outcome=op==="staff"?[await saveStaff(actor,val("email"),val("role"),val("active")),"staff-access"]:
    op==="support"?[await respondSupport(actor,val("id"),val("response"),val("status")),"support-requests"]:
    op==="batch-rules"?[await saveBatchRules(actor,val),"batch-rules"]:
    op==="batch-switch"?[await switchBatch(actor,val),"batch-rules"]:
    op==="catalogue"?[await saveCatalogueCourse(actor,val),"catalogue-controls"]:
    op==="content"?[await saveWebsite(actor,val),"website-content"]:
    op==="notices"?[await saveNotices(actor,val),"notice-templates"]:
    op==="restore"?[await restoreSettings(actor,val("event")),"change-history"]:
    op==="note"?[await addApplicantNote(actor,val("id"),val("note")),"applications"]:
    op==="learning"?[await recordLearning(actor,val),"applications"]:
    op==="faculty-profile"?[await updateFacultyProfile(actor,val),"faculty-directory"]:
    op==="proposal-revision"?[await markProposalRevision(actor,val("id"),val("note")),"faculty-proposals"]:
    op==="materials"?[await saveMaterials(actor,val),"learning-materials"]:
    op==="offline-payment"?[await recordOfflinePayment(actor,val("id"),val("reference"),val("amount")),"applications"]:
    op==="certificate"?[await certificateAction(actor,val("id"),val("operation")),"applications"]:null;
   if(!outcome)return text("Not found.",404);
   if(scopes.length&&val("staff")==="yes")return move("/staff?message="+(outcome[0]?"saved":"invalid")+"#"+outcome[1]);
   return move(adminTarget(String(outcome[1]),{course:slug,controlMessage:outcome[0]?"saved":"invalid",...(outcome[1]==="applications"?applicantReturn:{})}));
  }
  if(["/forms/admin/faculty","/forms/admin/faculty-active","/forms/admin/assignment","/forms/admin/proposal"].includes(path)){
   if(!await authorizedAdmin(req))return text("Administrator sign-in is required.",403);
   const message=path.endsWith("/faculty")?await addFaculty(val):
    path.endsWith("/faculty-active")?(await setFacultyActive(val("id"),val("active"))?"faculty-updated":"invalid"):
    path.endsWith("/assignment")?(await recordAssignment(val,actorFor(req))?"assignment-saved":"assignment-invalid"):
    (await reviewProposal(val("id"),val("decision"))?"proposal-reviewed":"invalid");
   if(["faculty-added","faculty-updated","assignment-saved","proposal-reviewed"].includes(message))await audit(actorFor(req),path.split("/").at(-1)??"faculty",val("id")||slug);
   const anchor=path.endsWith("/assignment")?"assignments":path.endsWith("/proposal")?"faculty-proposals":"faculty-directory";
   return move(adminTarget(anchor,{course:slug,portalMessage:message}));
  }
  if(path==="/forms/admin/intake"||path==="/forms/admin/site-controls"){
   if(!await authorizedAdmin(req))return text("Administrator sign-in is required.",403);
   const isIntake=path.endsWith("/intake");
   const structured=isIntake&&val("structuredSchedule")==="1";
   const existing=structured?await lookup(slug):null;
   const schedule=isIntake?readAdminSchedule(val,existing??{schedule:"",mode:""},structured):null;
   const intakeMessage=isIntake?(schedule?await setBatchIntake(slug,{batch:val("batch"),...schedule,status:val("status")}):"schedule-invalid"):(await setSiteControls(val("paused"),val("announcement"))?"site-saved":"site-invalid");
   if(["intake-saved","site-saved"].includes(intakeMessage))await audit(actorFor(req),path.split("/").at(-1)??"intake",path.endsWith("/intake")?slug+"/"+val("batch"):"site");
   return move(adminTarget(path.endsWith("/intake")?"enrollment-controls":"site-controls",{course:slug,intakeMessage}));
  }
  if(path==="/forms/apply"){
   if(!user)return move(portalLoginPath("/apply"+(slug?"?course="+encodeURIComponent(slug):"")));
   const r=await createApplication({slug,batch:val("batch")||undefined,name:val("name"),email:val("email"),college:val("college"),consent:val("consent")==="yes",details:["detailed","phone","programme","year","interests","skills","skillLevel"].some(key=>f.has(key))?{phone:val("phone"),programme:val("programme"),year:val("year"),whatsappReminders:val("whatsappReminders")==="yes",...(f.has("interests")||f.has("skills")||f.has("skillLevel")?{preferences:preferencesFromForm(f)}:{})}:undefined,formVersion:val("formVersion")?Number(val("formVersion")):undefined,answers:Object.fromEntries([1,2,3,4,5].map(i=>["field"+i,val("field"+i)]))},user);
   return r.id&&r.token?receipt(req,r.id,r.token,"billing"):apply(r.error??"retry");
  }
  if(path==="/forms/status"){
   const id=val("id").trim().toUpperCase(),code=val("code").trim().toLowerCase();
   if(!refPattern.test(id)||!codePattern.test(code)||!await getApplication(id,code))return move("/application-status?error=notfound");
   return receipt(req,id,code);
  }
  if(!["/forms/admin/course","/forms/admin/review","/forms/admin/sessions","/forms/admin/class-access","/forms/admin/banner"].includes(path))return text("Not found.",404);
  if(!await isAllowed(req,path.endsWith("/review")?["admissions"]:[]))return text("Administrator sign-in is required.",403);
  if(path.endsWith("/course")){
   const structured=val("structuredSchedule")==="1";
   const existing=structured?await lookup(slug):null;
   if(structured&&existing?.batch!==val("batch"))return admin("course-batch-stale");
   const schedule=readAdminSchedule(val,existing??{schedule:"",mode:""},structured);
   if(!schedule)return admin("schedule-invalid");
   const error=await saveCourse(slug,{title:val("title"),blurb:val("blurb"),outcome:val("outcome"),days:Array.from({length:5},(_,i)=>[val("topic"+i),val("practical"+i)]),...schedule,batch:val("batch"),status:val("status")},structured?val("batch"):undefined);
   if(!error)await audit(actorFor(req),"edit course",slug);
   return admin(error??"saved");
  }
  if(path.endsWith("/banner")){
   const target=val("slug")===CRASH_SLUG?CRASH_SLUG:slug;
   const saved=await saveBanner(target,val("batch"),val);
   if(saved)await audit(actorFor(req),"edit banner",target+"/"+val("batch"));
   return move(adminTarget(target===CRASH_SLUG?"crash-banner":"course-banner",{course:target,message:saved?"banner-saved":"banner-invalid"}));
  }
  if(path.endsWith("/sessions")){const saved=await saveClassSessions(slug,val("batch"),val);if(saved)await audit(actorFor(req),"edit class schedule",slug+"/"+val("batch"));return move(adminTarget("class-schedule",{course:slug,message:saved?"classes-saved":"classes-invalid"}));}
  const isAccess=path.endsWith("/class-access");
  const done=isAccess?await setClassAccess(val("id"),val("grant")):await updateReview(val("id"),val("review"));
  if(done)await audit(actorFor(req),isAccess?"class access "+val("grant"):"review "+val("review"),val("id"));
  // Declining an application whose fee was collected leaves money to return; say so instead of failing silently.
  const refundDue=done&&!isAccess&&val("review")==="declined"&&await paidApplication(val("id"));
  if(refundDue)await audit(actorFor(req),"declined after payment: issue the refund in Razorpay",val("id"));
  if(!isAccess&&val("staff")==="yes")return move("/staff?message="+(done?"saved":"invalid"));
  return move(adminTarget("applications",{course:slug,...applicantReturn,message:done?(isAccess?"access-saved":refundDue?"reviewed-refund":"reviewed"):(isAccess?"access-invalid":"invalid")}));
 }catch(e){
  console.error("Form request failed",path,e instanceof Error?e.name:"Unknown");
  if(path==="/forms/apply")return apply("retry");
  if(path==="/forms/status")return move("/application-status?error=retry");
  if(path.startsWith("/forms/student/"))return move("/student?message=retry&view="+(path.endsWith("/learning-profile")?"explore":path.endsWith("/support")?"support":"applications"));
  if(path.startsWith("/forms/faculty/"))return move("/faculty?message=retry&view="+(path.endsWith("/proposal")?"proposals":"teaching"));
  return admin("retry");
 }
}

export async function GET(req:Request){
 const url=current(req);
 if(url.pathname!=="/forms/admin/export")return text("Not found.",404);
 if(!await authorizedAdmin(req))return text("Administrator sign-in is required.",403);
 const input=url.searchParams.get("filter")??"";
 const slug=/^[a-z0-9-]{1,90}$/.test(input)&&(await lookup(input))?input:"";
 const p=Number(url.searchParams.get("page")??1);
 const page=Number.isSafeInteger(p)&&p>0&&p<=100000?p:1;
 const params=url.searchParams;
 const {rows}=await listApplications(slug,page,{q:params.get("q")??"",review:params.get("review")??"",payment:params.get("payment")??"",batch:params.get("batch")??""});
 return new Response("\ufeff"+csvHeader+"\r\n"+csv(rows),{headers:{...common,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="short-course-applications-page-'+page+'.csv"'}});
}
