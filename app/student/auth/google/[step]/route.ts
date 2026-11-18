import {db} from "@/lib/enrollment";
import {rateFaculty} from "@/lib/faculty-auth";
import {requestIdentity} from "@/lib/portals";
import {nativePortalSession,portalRoleHeader,portalSessionFingerprint} from "@/lib/portal-session";
import {beginStudentGoogle,expireStudentGoogle,findOrCreateGoogleStudent,googleStudentIdentity,linkGoogleStudent,studentGoogleConfigured,studentGooglePath,takeStudentGoogle} from "@/lib/student-google";

export const dynamic="force-dynamic";
type Context={params:Promise<{step:string}>};
function move(location:string,expires=false,cookie?:string){
 const h=new Headers({location,"cache-control":"private, no-store","referrer-policy":"no-referrer"});
 if(expires)h.append("set-cookie",expireStudentGoogle());
 if(cookie)h.append("set-cookie",cookie);
 return new Response(null,{status:303,headers:h});
}
const login=(target:string,error:string)=>"/login?"+new URLSearchParams({return_to:studentGooglePath(target),error});
const profile=(error:string)=>"/profile?google="+encodeURIComponent(error);
function studentId(req:Request){
 const identity=requestIdentity(req.headers);
 return req.headers.get(portalRoleHeader)==="student"&&identity?.id.startsWith("student:")?identity.id.slice(8):"";
}
function approvedOrigin(req:Request){
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 return site!=="cross-site"&&(origin===new URL(req.url).origin||(origin===null&&site==="same-origin"));
}
export async function POST(req:Request,{params}:Context){
 if((await params).step!=="start")return new Response(null,{status:404});
 if(!approvedOrigin(req))return new Response(null,{status:403});
 if(req.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded"||!req.body)return new Response(null,{status:415});
 const reader=req.body.getReader(),decoder=new TextDecoder();let raw="",size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();return new Response(null,{status:413});}raw+=decoder.decode(part.value,{stream:true});}}finally{reader.releaseLock();}
 const f=new URLSearchParams(raw+decoder.decode()),link=f.get("intent")==="link",target=studentGooglePath(f.get("return_to")??"/student");
 const error=(status:string)=>move(link?profile(status):login(target,status));
 if(!studentGoogleConfigured())return error("google-unavailable");
 try{
  const id=link?studentId(req):"",session=id?await portalSessionFingerprint(req.headers):"";
  if(link&&(!id||!session))return error("google-login-required");
  if(!await rateFaculty(req.headers,"student-google-start"))return error("rate");
  const result=await beginStudentGoogle(new URL(req.url).origin,target,link?{id,session}:undefined);
  return result?move(result.url,false,result.cookie):error("google-unavailable");
 }catch{return error("google-failed");}
}
export async function GET(req:Request,{params}:Context){
 if((await params).step!=="callback")return new Response(null,{status:404});
 const url=new URL(req.url);
 let target="/student",link=false;
 try{
  const attempt=await takeStudentGoogle(req,url.searchParams.get("state")??"");
  if(!attempt)return move(login(target,"google-expired"),true);
  target=studentGooglePath(attempt.return_to);link=!!attempt.link_student_id;
  const fail=(status:string)=>move(link?profile(status):login(target,status),true);
  if(url.searchParams.has("error"))return fail("google-cancelled");
  if(link&&(studentId(req)!==attempt.link_student_id||await portalSessionFingerprint(req.headers)!==attempt.link_session))return fail("google-login-required");
  const identity=await googleStudentIdentity(url.origin,url.searchParams.get("code")??"",attempt);
  if(!identity)return fail("google-denied");
  if(attempt.link_student_id)return await linkGoogleStudent(attempt.link_student_id,identity)?move(profile("linked"),true):fail("google-link-conflict");
  const id=await findOrCreateGoogleStudent(identity);
  if(!id)return fail("google-failed");
  const response=await nativePortalSession(req,db(),"student",id,target);
  response.headers.append("set-cookie",expireStudentGoogle());
  return response;
 }catch{return move(link?profile("google-failed"):login(target,"google-failed"),true);}
}
