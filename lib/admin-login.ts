import {googleJson,verifiedClaims} from "./google-identity";
import {cfg,db,digest} from "./enrollment";
import {adminGoogleCookie as stateCookie} from "./portal-session";
import {passwordHash,passwordMatches} from "./passwords";

const runtime=cfg as typeof cfg&{ADMIN_GOOGLE_CLIENT_ID?:string;ADMIN_GOOGLE_CLIENT_SECRET?:string};
export const ownerEmail=()=>cfg.SITE_ADMIN_EMAIL?.trim().toLowerCase()??"";
const googleClient=()=>({id:runtime.ADMIN_GOOGLE_CLIENT_ID,secret:runtime.ADMIN_GOOGLE_CLIENT_SECRET});
export const adminGoogleConfigured=()=>{const c=googleClient();return !!(ownerEmail()&&c.id&&c.secret);};

export async function adminPassword(email=ownerEmail()){
 return email?await db().prepare("SELECT password FROM owner_admin_credentials WHERE email=?").bind(email).first<string>("password"):null;
}
export async function matchAdminPassword(email:string,value:string){
 const owner=ownerEmail(),expected=owner&&email===owner?await adminPassword(owner):null;
 const ok=await passwordMatches(value,expected);
 return !!(owner&&email===owner&&ok);
}
export async function setAdminPassword(email:string,value:string,expected:string|null){
 const now=Date.now(),encoded=await passwordHash(value);
 const result=await db().prepare("INSERT INTO owner_admin_credentials (email,password,updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET password=excluded.password,updated_at=excluded.updated_at WHERE owner_admin_credentials.password IS ?").bind(email,encoded,now,expected).run();
 return !!result.meta.changes;
}
export {passwordMatches};

const token=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");
const base64url=(value:Uint8Array)=>Buffer.from(value).toString("base64url");
const ttl=600;
const statePattern=/^[a-f0-9]{64}$/;
const cookie=(value:string,age:number)=>`${stateCookie}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
export const clearAdminGoogleState=()=>cookie("",0);
const googleCallback=(origin:string)=>new URL("/admin/auth/google/callback",origin).href;
const utf8=new TextEncoder();

export async function makeGoogleAdminRequest(origin:string){
 const c=googleClient();
 if(!c.id||!c.secret||!ownerEmail())return null;
 const state=token(),verifier=token(),nonce=token(),now=Date.now(),d=db();
 await d.batch([
  d.prepare("DELETE FROM owner_admin_google_attempts WHERE expires_at<=?").bind(now),
  d.prepare("INSERT INTO owner_admin_google_attempts (key,verifier,nonce,expires_at) VALUES (?,?,?,?)").bind(await digest(state),verifier,nonce,now+ttl*1000)
 ]);
 const challenge=base64url(new Uint8Array(await crypto.subtle.digest("SHA-256",utf8.encode(verifier))));
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 url.search=new URLSearchParams({client_id:c.id,redirect_uri:googleCallback(origin),response_type:"code",scope:"openid email",state,nonce,prompt:"select_account",code_challenge:challenge,code_challenge_method:"S256"}).toString();
 return {url:url.href,cookie:cookie(state,ttl)};
}
export async function takeGoogleAdminRequest(req:Request,state:string){
 const browser=req.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(stateCookie+"="))?.slice(stateCookie.length+1);
 if(!statePattern.test(state)||browser!==state)return null;
 return db().prepare("DELETE FROM owner_admin_google_attempts WHERE key=? AND expires_at>? RETURNING verifier,nonce").bind(await digest(state),Date.now()).first<{verifier:string;nonce:string}>();
}

export async function googleAdminOwner(origin:string,code:string,attempt:{verifier:string;nonce:string}){
 const c=googleClient(),owner=ownerEmail();
 if(!c.id||!c.secret||!owner||!code||code.length>2048)return null;
 const body=new URLSearchParams({client_id:c.id,client_secret:c.secret,redirect_uri:googleCallback(origin),grant_type:"authorization_code",code,code_verifier:attempt.verifier});
 const result=await googleJson("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body}) as {id_token?:unknown};
 if(typeof result.id_token!=="string")return null;
 const profile=await verifiedClaims(result.id_token,c.id,attempt.nonce);
 if(!profile||profile.email_verified!==true||typeof profile.email!=="string"||profile.email.toLowerCase()!==owner||typeof profile.sub!=="string"||!profile.sub||profile.sub.length>255)return null;
 const domain=owner.split("@")[1];
 if(domain!=="gmail.com"&&(!domain||typeof profile.hd!=="string"||profile.hd.toLowerCase()!==domain))return null;
 const record=await db().prepare("INSERT INTO owner_admin_credentials (email,google_subject,updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET google_subject=COALESCE(owner_admin_credentials.google_subject,excluded.google_subject),updated_at=excluded.updated_at RETURNING google_subject").bind(owner,profile.sub,Date.now()).first<string>("google_subject");
 return record===profile.sub?owner:null;
}
