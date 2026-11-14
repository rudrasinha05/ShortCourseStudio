import {authorizedAdmin,getApplication} from "@/lib/enrollment";
import {CRASH_SLUG,saveBanner} from "@/lib/course-banners";
import {saveClassSessions,setClassAccess} from "@/lib/class-sessions";
import {getCourse} from "@/lib/courses";
import {accessCookie,codePattern,refPattern,createApplication,csv,csvHeader,listApplications,saveCourse,updateReview} from "@/lib/form-workflows";

export const dynamic="force-dynamic";
const common={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const move=(path:string,cookie?:string)=>new Response(null,{status:303,headers:{...common,Location:path,...(cookie?{"Set-Cookie":cookie}:{})}});
const text=(value:string,status:number)=>new Response(value,{status,headers:{...common,"Content-Type":"text/plain; charset=utf-8"}});
const current=(req:Request)=>new URL(req.url);
const redirectTo=(path:string,values:Record<string,string>)=>path+"?"+new URLSearchParams(values);
function receipt(req:Request,id:string,token:string){
 const secure=current(req).protocol==="https:"||req.headers.get("x-forwarded-proto")==="https";
 const cookie=accessCookie+"="+id+"."+token+"; Path=/apply; HttpOnly; SameSite=Lax; Max-Age=604800"+(secure?"; Secure":"");
 return move(redirectTo("/apply",{ref:id}),cookie);
}
async function readForm(req:Request){
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded"))return null;
 const reader=req.body?.getReader();if(!reader)return null;
 const decoder=new TextDecoder();let content="",length=0;
 try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>18000){await reader.cancel();return null;}content+=decoder.decode(part.value,{stream:true});}return new URLSearchParams(content+decoder.decode());}
 finally{reader.releaseLock();}
}
export async function POST(req:Request){
 const url=current(req),path=url.pathname;
 const origin=req.headers.get("origin"), site=req.headers.get("sec-fetch-site");
 if(site==="cross-site"||(origin&&origin!==url.origin&&site!=="same-origin"))return text("This form must be submitted from Short Course Studio.",403);
 const f=await readForm(req);if(!f)return text("Invalid form. Go back and try again.",400);
 const val=(key:string)=>f.get(key)||"";
 const slug=getCourse(val("slug"))?.slug??"";
 const apply=(error:string)=>move(redirectTo("/apply",{course:slug,error}));
 const admin=(message:string)=>move(redirectTo("/admin",{course:slug,message}));
 try{
  if(path==="/forms/apply"){
   const r=await createApplication({slug,batch:val("batch")||undefined,name:val("name"),email:val("email"),college:val("college"),consent:val("consent")==="yes"});
   return r.id&&r.token?receipt(req,r.id,r.token):apply(r.error??"retry");
  }
  if(path==="/forms/status"){
   const id=val("id").trim().toUpperCase(),code=val("code").trim().toLowerCase();
   if(!refPattern.test(id)||!codePattern.test(code)||!await getApplication(id,code))return move("/apply?error=notfound#track");
   return receipt(req,id,code);
  }
  if(!["/forms/admin/course","/forms/admin/review","/forms/admin/sessions","/forms/admin/class-access","/forms/admin/banner"].includes(path))return text("Not found.",404);
  if(!await authorizedAdmin(req))return text("Administrator sign-in is required.",403);
  if(path.endsWith("/course")){
   const error=await saveCourse(slug,{title:val("title"),blurb:val("blurb"),outcome:val("outcome"),days:Array.from({length:5},(_,i)=>[val("topic"+i),val("practical"+i)]),schedule:val("schedule"),mode:val("mode"),batch:val("batch"),status:val("status")});
   return admin(error??"saved");
  }
  if(path.endsWith("/banner")){
   const target=val("slug")===CRASH_SLUG?CRASH_SLUG:slug;
   const saved=await saveBanner(target,val("batch"),val);
   return move(redirectTo("/admin",{course:target===CRASH_SLUG?"":target,message:saved?"banner-saved":"banner-invalid"})+"#"+(target===CRASH_SLUG?"crash-banner":"course-banner"));
  }
  if(path.endsWith("/sessions"))return move(redirectTo("/admin",{course:slug,message:await saveClassSessions(slug,val("batch"),val)?"classes-saved":"classes-invalid"})+"#class-schedule");
  const isAccess=path.endsWith("/class-access");
  const done=isAccess?await setClassAccess(val("id"),val("grant")):await updateReview(val("id"),val("review"));
  const filter=getCourse(val("filter"))?.slug??"";
  const page=/^[1-9][0-9]{0,4}$/.test(val("page"))?val("page"):"1";
  return move(redirectTo("/admin",{course:slug,filter,page,message:done?(isAccess?"access-saved":"reviewed"):(isAccess?"access-invalid":"invalid")})+"#applications");
 }catch(e){
  console.error("Form request failed",path,e instanceof Error?e.name:"Unknown");
  if(path==="/forms/apply")return apply("retry");
  if(path==="/forms/status")return move("/apply?error=retry#track");
  return admin("retry");
 }
}

export async function GET(req:Request){
 const url=current(req);
 if(url.pathname!=="/forms/admin/export")return text("Not found.",404);
 if(!await authorizedAdmin(req))return text("Administrator sign-in is required.",403);
 const slug=getCourse(url.searchParams.get("filter")??"")?.slug??"";
 const p=Number(url.searchParams.get("page")??1);
 const page=Number.isSafeInteger(p)&&p>0&&p<=100000?p:1;
 const {rows}=await listApplications(slug,page);
 return new Response("\ufeff"+csvHeader+"\r\n"+csv(rows),{headers:{...common,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="short-course-applications-page-'+page+'.csv"'}});
}
