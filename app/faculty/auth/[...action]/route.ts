import {clearPortalCookie,deactivatePortal} from "@/lib/portal-session";
import {db} from "@/lib/enrollment";
import {
 authenticateFaculty,beginFacultyOAuth,facultyOAuthAccount,facultyPath,facultyProviderProfile,facultyView,
 getFacultySession,loginFields,makeCookie,newFacultySession,oauthName,providerAvailable,rateFaculty,
 readCookie,registerFaculty,revokeFacultySession,sendFacultyVerification,sessionName,signupFields,
 takeFacultyOAuth,verifyFacultyEmail,type Provider,
} from "@/lib/faculty-auth";

export const dynamic="force-dynamic";
type Context={params:Promise<{action:string[]}>};
function move(location:string,cookies:string[]=[]){
 const headers=new Headers({location,"cache-control":"private, no-store","referrer-policy":"no-referrer"});
 for(const value of cookies)headers.append("set-cookie",value);
 return new Response(null,{status:303,headers});
}
function formLink(mode:string,message:string,view:unknown="",token=""){
 const params=new URLSearchParams({mode,message});
 if(facultyView(view))params.set("view",facultyView(view));
 if(token)params.set("token",token);
 return "/faculty/login?"+params;
}
function status(code:number){
 return new Response(code===403?"Submit this form from the Faculty Portal.":"Faculty account action not found.",{status:code,headers:{"cache-control":"private, no-store"}});
}
async function readForm(req:Request){
 if(req.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded"||!req.body)return null;
 const reader=req.body.getReader(), parts:Uint8Array[]=[];
 let length=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   length+=value.length;if(length>8192){await reader.cancel();return null;}
   parts.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 return new URLSearchParams(new TextDecoder().decode(bytes));
}
export async function POST(req:Request,{params}:Context){
 const url=new URL(req.url),origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if((origin!==url.origin&&(origin!==null||site!=="same-origin"))||site==="cross-site")return status(403);
 const actions=(await params).action;
 if(actions.length!==1)return status(404);
 const action=actions[0],previous=readCookie(req.headers,sessionName);
 const expire=[makeCookie(sessionName,"",0),makeCookie(oauthName,"",0)];
 if(action==="logout"){
  await revokeFacultySession(previous);
  const state=readCookie(req.headers,oauthName);
  if(state)for(const provider of ["google","github"] as const)if(await takeFacultyOAuth(provider,state,req.headers))break;
  await deactivatePortal(req.headers,db());
  return move("/",[...expire,clearPortalCookie()]);
 }
 const f=await readForm(req);if(!f)return status(403);
 const view=facultyView(f.get("view")), values=Object.fromEntries(f),target=facultyPath(view);
 try{
  if(action==="signin"){
   const parsed=loginFields.safeParse(values);
   if(!parsed.success)return move(formLink("signin","invalid-login",view));
   if(!await rateFaculty(req.headers,"signin",parsed.data.username))return move(formLink("signin","rate",view));
   const account=await authenticateFaculty(parsed.data);
   if(!account)return move(formLink("signin","invalid-login",view));
   await deactivatePortal(req.headers,db());
   return move(target,[await newFacultySession(account,previous),clearPortalCookie()]);
  }
  if(action==="signup"){
   const parsed=signupFields.safeParse(values);
   if(!parsed.success)return move(formLink("signup","invalid-signup",view));
   if(!await rateFaculty(req.headers,"signup",parsed.data.email,3))return move(formLink("signup","rate",view));
   const account=await registerFaculty(parsed.data);
   if(typeof account==="string")return move(formLink("signup",account,view));
   const cookie=await newFacultySession(account,previous);
   const message=await sendFacultyVerification(account,url.origin);
   await deactivatePortal(req.headers,db());
   return move(target+(view?"&":"?")+"auth="+message,[cookie,clearPortalCookie()]);
  }
  if(action==="verify"||action==="resend"){
   const raw=f.get("token")??"";
   const account=await getFacultySession(req.headers);
   if(!account)return move(action==="verify"&&/^[a-f0-9]{64}$/.test(raw)?formLink("verify","verify-signin","",raw):formLink("signin","verify-signin"));
   if(account.verified_at)return move(target);
   if(action==="resend"){
    const message=await rateFaculty(req.headers,"email",account.id,3)?await sendFacultyVerification(account,url.origin):"rate";
    return move(target+(view?"&":"?")+"auth="+message);
   }
   return await verifyFacultyEmail(account,raw)?move("/faculty?auth=email-verified"):move(formLink("verify","verify-invalid"));
  }
  return status(404);
 }catch{
  return move(formLink(action==="signup"?"signup":"signin","unavailable",view));
 }
}
export async function GET(req:Request,{params}:Context){
 const url=new URL(req.url),[p,step,...rest]=(await params).action;
 if((p!=="google"&&p!=="github")||rest.length||!["start","callback"].includes(step))return status(404);
 const provider:Provider=p, view=facultyView(url.searchParams.get("view"));
 const expiry=makeCookie(oauthName,"",0);
 if(!providerAvailable(provider))return move(formLink("signin","provider-unconfigured",view));
 try{
  if(step==="start"){
   if(!await rateFaculty(req.headers,"oauth"))return move(formLink("signin","rate",view));
   const launch=await beginFacultyOAuth(provider,url.origin,view);
   return launch?move(launch.url,[launch.cookie]):move(formLink("signin","provider-unconfigured",view));
  }
  const attempt=await takeFacultyOAuth(provider,url.searchParams.get("state")??"",req.headers);
  const errorLink=(message:string)=>move(formLink("signin",message,attempt?.return_view),[expiry]);
  if(!attempt)return move(formLink("signin","oauth-expired"));
  const code=url.searchParams.get("code");
  if(!code||url.searchParams.has("error"))return errorLink("oauth-cancelled");
  const profile=await facultyProviderProfile(provider,url.origin,code,attempt.verifier);
  if(!profile)return errorLink("oauth-email");
  const account=await facultyOAuthAccount(provider,profile);
  if(!account)return errorLink("oauth-account");
  await deactivatePortal(req.headers,db());
  return move(facultyPath(attempt.return_view),[expiry,await newFacultySession(account,readCookie(req.headers,sessionName)),clearPortalCookie()]);
 }catch{
  return move(formLink("signin","unavailable",view),step==="callback"?[expiry]:[]);
 }
}
