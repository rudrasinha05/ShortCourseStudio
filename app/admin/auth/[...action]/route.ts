import {adminGoogleConfigured,adminPassword,clearAdminGoogleState,googleAdminOwner,makeGoogleAdminRequest,matchAdminPassword,ownerEmail,passwordMatches,setAdminPassword,takeGoogleAdminRequest} from "@/lib/admin-login";
import {nativeAdminSession,ownerAuthHeader,portalRoleHeader,revokeNativeAdminSessions} from "@/lib/portal-session";
import {db,isAdminIdentity} from "@/lib/enrollment";
import {rateFaculty} from "@/lib/faculty-auth";

export const dynamic="force-dynamic";
type Context={params:Promise<{action:string[]}>};
const errorUrl=(error:string)=>"/admin/login?error="+error;
function move(url:string,value?:string){
 const headers=new Headers({location:url,"cache-control":"private, no-store","referrer-policy":"no-referrer"});
 if(value)headers.append("set-cookie",value);
 return new Response(null,{status:303,headers});
}
const deny=(status:number)=>new Response(null,{status,headers:{"cache-control":"private, no-store"}});
async function adminForm(req:Request){
 if(req.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded"||!req.body)return null;
 const reader=req.body.getReader(),decoder=new TextDecoder();
 let len=0,body="";
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;len+=value.length;if(len>4096){await reader.cancel();return null;}body+=decoder.decode(value,{stream:true});}
  return new URLSearchParams(body+decoder.decode());
 }finally{reader.releaseLock();}
}
export async function POST(req:Request,{params}:Context){
 const url=new URL(req.url),origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if((origin!==url.origin&&(origin!==null||site!=="same-origin"))||site==="cross-site")return deny(403);
 const action=(await params).action.join("/");
 if(action!=="password"&&action!=="set-password")return deny(404);
 const form=await adminForm(req);if(!form)return deny(400);
 if(!await rateFaculty(req.headers,"owner-admin-"+action))return move(action==="password"?errorUrl("rate"):"/admin/security?status=rate");
 try{
  if(action==="password"){
   const email=(form.get("email")??"").trim().toLowerCase(),password=form.get("password")??"";
   if(email.length>254||!password||password.length>128||!await matchAdminPassword(email,password))return move(errorUrl("invalid"));
   return nativeAdminSession(req,db(),email,"password");
  }
  if(req.headers.get(portalRoleHeader)!=="admin"||!isAdminIdentity(req.headers))return deny(403);
  const email=ownerEmail(),current=await adminPassword(email),next=form.get("password")??"";
  if(next.length<14||next.length>128||next!==form.get("confirm"))return move("/admin/security?status=invalid");
  if(current&&req.headers.get(ownerAuthHeader)==="password"&&!await passwordMatches((form.get("current")??"").slice(0,128),current))return move("/admin/security?status=wrong");
  if(!await setAdminPassword(email,next,current))return move("/admin/security?status=retry");
  await revokeNativeAdminSessions(db(),email);
  // Keep this authorising browser signed in, while invalidating other native admin sessions.
  const response=await nativeAdminSession(req,db(),email,"password");
  response.headers.set("location","/admin/security?status=saved");
  return response;
 }catch{return move(action==="password"?errorUrl("unavailable"):"/admin/security?status=retry");}
}
export async function GET(req:Request,{params}:Context){
 const url=new URL(req.url),action=(await params).action.join("/");
 if(action!=="google/start"&&action!=="google/callback")return deny(404);
 if(!adminGoogleConfigured())return move(errorUrl("google-unavailable"));
 try{
  if(action==="google/start"){
   if(!await rateFaculty(req.headers,"owner-admin-google"))return move(errorUrl("rate"));
   const flow=await makeGoogleAdminRequest(url.origin);
   return flow?move(flow.url,flow.cookie):move(errorUrl("google-unavailable"));
  }
  const flow=await takeGoogleAdminRequest(req,url.searchParams.get("state")??"");
  if(!flow)return move(errorUrl("google-session"),clearAdminGoogleState());
  if(url.searchParams.has("error"))return move(errorUrl("google-cancelled"),clearAdminGoogleState());
  const email=await googleAdminOwner(url.origin,url.searchParams.get("code")??"",flow);
  return email?nativeAdminSession(req,db(),email,"google",[clearAdminGoogleState()]):move(errorUrl("google-denied"),clearAdminGoogleState());
 }catch{return move(errorUrl("unavailable"),clearAdminGoogleState());}
}
