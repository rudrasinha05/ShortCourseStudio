import {headers} from "next/headers";
import {z} from "zod";
import {db} from "@/lib/enrollment";
import {authenticateFaculty,rateFaculty,username} from "@/lib/faculty-auth";
import {passwordHash,passwordMatches} from "@/lib/passwords";
import {nativePortalSession,portalRoleOf,safePortalTarget} from "@/lib/portal-session";

export const dynamic="force-dynamic";
const credentials=z.object({username,password:z.string().min(1).max(128)});
const signup=credentials.extend({password:z.string().min(12).max(128),full_name:z.string().trim().min(2).max(100).refine(v=>!/[\x00-\x1f\x7f]/.test(v)),email:z.string().trim().max(160).email().toLowerCase()});
function failure(path:string,mode:string,error:string){
 return new Response(null,{status:303,headers:{location:"/login?"+new URLSearchParams({return_to:path,mode,error}),"cache-control":"private, no-store"}});
}
async function body(req:Request){
 if(!req.body||req.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded")return null;
 const reader=req.body.getReader(),decode=new TextDecoder();
 let size=0,text="";
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return null;}text+=decode.decode(value,{stream:true});}return Object.fromEntries(new URLSearchParams(text+decode.decode()));}
 finally{reader.releaseLock();}
}
export async function POST(req:Request,{params}:{params:Promise<{action:string}>}){
 const host=new URL(req.url).origin,origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if((origin!==host&&(origin!==null||site!=="same-origin"))||site==="cross-site")return new Response(null,{status:403,headers:{"cache-control":"no-store"}});
 const action=(await params).action;
 if(!["signup","signin","staff"].includes(action))return new Response(null,{status:404});
 const fields=await body(req);if(!fields)return new Response(null,{status:400});
 const requested=safePortalTarget(fields.return_to??"/student");
 const target=action==="staff"?"/staff":portalRoleOf(new URL(requested,host).pathname)==="student"?requested:"/student";
 const mode=action==="signup"?"signup":"signin";
 try{
  const form=(action==="signup"?signup:credentials).safeParse(fields);
  if(!form.success)return failure(target,mode,"invalid");
  const name=form.data.username;
  if(!await rateFaculty(await headers(),"site-account-"+action,name,action==="signup"?4:8))return failure(target,mode,"rate");
  const d=db();
  if(action==="signup"){
   const values=signup.parse(fields);
   const id=crypto.randomUUID(),password=await passwordHash(values.password);
   const result=await d.prepare("INSERT INTO student_accounts(id,username,email,full_name,password,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(username) DO NOTHING").bind(id,name,values.email,values.full_name,password,Date.now()).run();
   return result.meta.changes?nativePortalSession(req,d,"student",id,target):failure(target,mode,"username-taken");
  }
  if(action==="staff"){
   const account=await authenticateFaculty(form.data);
   if(!account?.verified_at||!await d.prepare("SELECT 1 FROM admin_staff WHERE email=? AND active=1").bind(account.email).first())return failure(target,mode,"staff-denied");
   return nativePortalSession(req,d,"staff",account.id,target);
  }
  const account=await d.prepare("SELECT id,password FROM student_accounts WHERE username=?").bind(name).first<{id:string;password:string}>();
  if(!await passwordMatches(form.data.password,account?.password)||!account)return failure(target,mode,"invalid-login");
  return nativePortalSession(req,d,"student",account.id,target);
 }catch{return failure(target,mode,"unavailable");}
}
