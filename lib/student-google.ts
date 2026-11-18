import {z} from "zod";
import {cfg,db,digest,newToken} from "./enrollment";
import {googleJson,verifiedClaims} from "./google-identity";
import {portalRoleOf,safePortalTarget} from "./portal-session";

const env=cfg as typeof cfg&{STUDENT_GOOGLE_CLIENT_ID?:string;STUDENT_GOOGLE_CLIENT_SECRET?:string};
const client=()=>({id:env.STUDENT_GOOGLE_CLIENT_ID?.trim(),secret:env.STUDENT_GOOGLE_CLIENT_SECRET?.trim()});
export const studentGoogleConfigured=()=>{const c=client();return !!(c.id&&c.secret);};
const cookieName="__Host-scs-student-google";
const cookie=(value:string,age:number)=>cookieName+"="+value+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age="+age;
export const expireStudentGoogle=()=>cookie("",0);
export const studentGooglePath=(requested:string)=>{
 const path=safePortalTarget(requested);
 return portalRoleOf(new URL(path,"https://portal.invalid").pathname)==="student"?path:"/student";
};
const callback=(origin:string)=>new URL("/student/auth/google/callback",origin).href;
type Attempt={verifier:string;nonce:string;return_to:string;link_student_id:string|null;link_session:string|null};
type GoogleIdentity={subject:string;email:string;name:string};
export async function beginStudentGoogle(origin:string,returnTo:string,link?:{id:string;session:string}){
 const c=client();if(!c.id||!c.secret)return null;
 const state=newToken(), verifier=newToken(), nonce=newToken(), now=Date.now(), ttl=600, d=db();
 await d.batch([
  d.prepare("DELETE FROM student_google_attempts WHERE expires_at<=?").bind(now),
  d.prepare("INSERT INTO student_google_attempts(key,verifier,nonce,return_to,link_student_id,link_session,expires_at) VALUES (?,?,?,?,?,?,?)").bind(await digest(state),verifier,nonce,studentGooglePath(returnTo),link?.id??null,link?.session??null,now+ttl*1000),
 ]);
 const challenge=Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier))).toString("base64url");
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 url.search=new URLSearchParams({client_id:c.id,redirect_uri:callback(origin),response_type:"code",scope:"openid email profile",state,nonce,code_challenge:challenge,code_challenge_method:"S256",prompt:"select_account"}).toString();
 return {url:url.href,cookie:cookie(state,ttl)};
}
export async function takeStudentGoogle(req:Request,state:string){
 const browser=req.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(cookieName+"="))?.slice(cookieName.length+1);
 if(!/^[a-f0-9]{64}$/.test(state)||state!==browser)return null;
 return db().prepare("DELETE FROM student_google_attempts WHERE key=? AND expires_at>? RETURNING verifier,nonce,return_to,link_student_id,link_session").bind(await digest(state),Date.now()).first<Attempt>();
}
export async function googleStudentIdentity(origin:string,code:string,attempt:Attempt):Promise<GoogleIdentity|null>{
 const c=client();if(!c.id||!c.secret||!code||code.length>2048)return null;
 const body=new URLSearchParams({client_id:c.id,client_secret:c.secret,redirect_uri:callback(origin),grant_type:"authorization_code",code,code_verifier:attempt.verifier});
 const response=await googleJson("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body}) as {id_token?:unknown};
 if(typeof response.id_token!=="string")return null;
 const claims=await verifiedClaims(response.id_token,c.id,attempt.nonce);
 if(!claims||claims.email_verified!==true||typeof claims.sub!=="string"||!claims.sub||claims.sub.length>255)return null;
 const email=z.string().trim().toLowerCase().email().max(160).safeParse(claims.email);
 if(!email.success)return null;
 const name=typeof claims.name==="string"?Array.from(claims.name.replace(/[\x00-\x1f\x7f]/g," ").trim()).slice(0,100).join(""):"";
 return {subject:claims.sub,email:email.data,name:name||"Student"};
}
export async function findOrCreateGoogleStudent(profile:GoogleIdentity){
 const d=db(),id=crypto.randomUUID(),now=Date.now();
 // The stable provider subject is the only automatic account lookup. An email address
 // entered into a password-only account must never act as proof of account ownership.
 await d.batch([
  d.prepare("INSERT INTO student_accounts(id,username,email,full_name,password,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM student_google_identities WHERE subject=?)").bind(id,"g-"+id.replaceAll("-","").slice(0,24),profile.email,profile.name,"google-only",now,profile.subject),
  d.prepare("INSERT INTO student_google_identities(subject,student_id,created_at) SELECT ?,id,? FROM student_accounts WHERE id=? ON CONFLICT DO NOTHING").bind(profile.subject,now,id),
 ]);
 return d.prepare("SELECT student_id FROM student_google_identities WHERE subject=?").bind(profile.subject).first<string>("student_id");
}
export async function linkGoogleStudent(id:string,profile:GoogleIdentity){
 const d=db(),now=Date.now();
 await d.prepare("INSERT INTO student_google_identities(subject,student_id,created_at) SELECT ?,id,? FROM student_accounts WHERE id=? AND email=? ON CONFLICT DO NOTHING").bind(profile.subject,now,id,profile.email).run();
 return await d.prepare("SELECT student_id FROM student_google_identities WHERE subject=?").bind(profile.subject).first<string>("student_id")===id;
}
export const hasStudentGoogle=(id:string)=>db().prepare("SELECT 1 FROM student_google_identities WHERE student_id=?").bind(id).first().then(Boolean);
