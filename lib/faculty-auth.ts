import {passwordHash,passwordMatches} from "./passwords";
import {z} from "zod";
import {cfg,db} from "./enrollment";
import {requestIdentity} from "./portals";

type HeaderReader=Pick<Headers,"get">;
type Bindings=Partial<Record<"FACULTY_GOOGLE_CLIENT_ID"|"FACULTY_GOOGLE_CLIENT_SECRET"|"FACULTY_GITHUB_CLIENT_ID"|"FACULTY_GITHUB_CLIENT_SECRET"|"FACULTY_EMAIL_FROM"|"RESEND_API_KEY",string>>;
const env=cfg as Bindings;
export type Provider="google"|"github";
export const providers=["google","github"] as const;
export const sessionName="__Host-scs-faculty";
export const oauthName="__Host-scs-faculty-oauth";
const tokenPattern=/^[a-f0-9]{64}$/;
const day=86_400_000, sessionMs=7*day, oauthMs=10*60_000;
const hex=(bytes:Uint8Array)=>Array.from(bytes,i=>i.toString(16).padStart(2,"0")).join("");
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const sha=async (s:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
const hash=async(s:string)=>hex(await sha(s));

export const username=z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/);
const email=z.string().trim().max(254).email().toLowerCase();
const personName=z.string().trim().min(1).max(80).refine(v=>!/[\u0000-\u001f\u007f]/.test(v));
const phone=z.string().trim().max(28).regex(/^\+?[\d ()-]+$/).transform(s=>s.replace(/[ ()-]/g,"")).refine(v=>/^\+?\d{7,15}$/.test(v));
const password=z.string().min(12).max(128);
export const signupFields=z.object({first_name:personName,last_name:personName,username,phone,email,password});
export const loginFields=z.object({username,password:z.string().min(1).max(128)});
type Account={id:string;email:string;username:string;first_name:string;last_name:string;verified_at:number|null};
type LoginAccount=Account&{password:string|null};
const columns="a.id,a.email,a.username,a.first_name,a.last_name,a.verified_at";
export function readCookie(h:HeaderReader,name:string){
 const entry=h.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="));
 const value=entry?.slice(name.length+1)??"";
 return tokenPattern.test(value)?value:"";
}
export function makeCookie(name:string,value:string,seconds:number){
 return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
}
export function facultyView(v:unknown){
 return typeof v==="string"&&["teaching","proposals","income","profile"].includes(v)?v:"";
}
export const facultyPath=(v:unknown)=>facultyView(v)?"/faculty?view="+facultyView(v):"/faculty";

export async function authenticateFaculty(values:z.infer<typeof loginFields>){
 const account=await db().prepare("SELECT "+columns+",a.password FROM faculty_accounts a WHERE a.username=?").bind(values.username).first<LoginAccount>();
 return await passwordMatches(values.password,account?.password)?account:null;
}
export async function registerFaculty(values:z.infer<typeof signupFields>){
 const id=crypto.randomUUID(),created=Date.now(),secret=await passwordHash(values.password);
 const r=await db().prepare("INSERT INTO faculty_accounts (id,username,email,first_name,last_name,phone,password,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(id,values.username,values.email,values.first_name,values.last_name,values.phone,secret,created).run();
 if(!r.meta.changes){
  const duplicate=await db().prepare("SELECT 1 AS taken FROM faculty_accounts WHERE username=?").bind(values.username).first();
  return duplicate?"username-taken":"account-unavailable";
 }
 return {id,email:values.email,username:values.username,first_name:values.first_name,last_name:values.last_name,verified_at:null} satisfies Account;
}
export async function newFacultySession(account:Account,previous=""){
 const raw=token(),d=db();
 if(previous)await revokeFacultySession(previous);
 await d.prepare("INSERT INTO faculty_auth_sessions (key,account_id,expires_at) VALUES (?,?,?)").bind(await hash(raw),account.id,Date.now()+sessionMs).run();
 return makeCookie(sessionName,raw,sessionMs/1000);
}
export async function revokeFacultySession(raw:string){
 if(raw)await db().prepare("DELETE FROM faculty_auth_sessions WHERE key=?").bind(await hash(raw)).run();
}
export async function getFacultySession(h:HeaderReader){
 const raw=readCookie(h,sessionName);
 if(!raw)return null;
 return db().prepare("SELECT "+columns+" FROM faculty_auth_sessions s JOIN faculty_accounts a ON a.id=s.account_id WHERE s.key=? AND s.expires_at>?").bind(await hash(raw),Date.now()).first<Account>();
}
export async function facultyAccess(h:HeaderReader){
 const account=await getFacultySession(h);
 const identity=account?(account.verified_at?{id:"faculty:"+account.id,email:account.email}:null):requestIdentity(h);
 return {account,identity};
}
export const facultyIdentity=async(h:HeaderReader)=>(await facultyAccess(h)).identity;

export async function rateFaculty(h:HeaderReader,action:string,subject="",limit=8){
 const d=db(),now=Date.now(),window=Math.floor(now/900_000);
 const ip=h.get("cf-connecting-ip")?.slice(0,64)??"unknown";
 const hit=async(scope:string)=>{
  const key=await hash("faculty:"+action+":"+scope);
  return (await d.prepare("INSERT INTO faculty_auth_rate (key,window,hits) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN window=excluded.window THEN hits+1 ELSE 1 END,window=excluded.window RETURNING hits").bind(key,window).first<{hits:number}>())?.hits??Number.MAX_SAFE_INTEGER;
 };
 if(crypto.getRandomValues(new Uint8Array(1))[0]===0){
  await d.batch([
   d.prepare("DELETE FROM faculty_auth_rate WHERE window<?").bind(window-4),
   d.prepare("DELETE FROM faculty_auth_sessions WHERE expires_at<=?").bind(now),
   d.prepare("DELETE FROM faculty_email_verifications WHERE expires_at<=?").bind(now),
   d.prepare("DELETE FROM faculty_oauth_attempts WHERE expires_at<=?").bind(now),
  ]);
 }
 if(await hit("ip:"+ip)>(ip==="unknown"?120:30))return false;
 return !subject||await hit("subject:"+subject)<=limit;
}

// Accounts that signed up with a password and have not verified their email. An administrator can
// confirm the person directly (for example by phone) and verify them, so faculty are not stuck when
// no email provider is configured. Matching a faculty profile email alone never grants access.
export type PendingFacultyAccount={id:string;username:string;email:string;first_name:string;last_name:string;phone:string|null;created_at:number;has_profile:number};
export async function pendingFacultyAccounts(){
 return (await db().prepare("SELECT a.id,a.username,a.email,a.first_name,a.last_name,a.phone,a.created_at,EXISTS (SELECT 1 FROM faculty_profiles f WHERE lower(f.email)=a.email AND f.active=1) AS has_profile FROM faculty_accounts a WHERE a.verified_at IS NULL ORDER BY a.created_at DESC LIMIT 100").all<PendingFacultyAccount>()).results;
}
export async function adminFacultyAccount(id:string,decision:string){
 if(!/^[0-9a-f-]{36}$/.test(id))return "invalid";
 const d=db();
 if(decision==="verify"){
  const [r]=await d.batch([
   d.prepare("UPDATE faculty_accounts SET verified_at=? WHERE id=? AND verified_at IS NULL").bind(Date.now(),id),
   d.prepare("DELETE FROM faculty_email_verifications WHERE account_id=?").bind(id),
  ]);
  return r.meta.changes?"account-verified":"invalid";
 }
 // Only an unverified sign-up can be removed; its sessions go with it (ON DELETE CASCADE).
 if(decision==="remove")return (await d.prepare("DELETE FROM faculty_accounts WHERE id=? AND verified_at IS NULL").bind(id).run()).meta.changes?"account-removed":"invalid";
 return "invalid";
}
export const verificationEmailAvailable=()=>Boolean(env.RESEND_API_KEY&&env.FACULTY_EMAIL_FROM);
export async function sendFacultyVerification(account:Account,origin:string){
 if(!verificationEmailAvailable())return "email-unconfigured";
 const raw=token(),key=await hash(raw);
 const link=new URL("/faculty/login",origin);
 link.search=new URLSearchParams({mode:"verify",token:raw}).toString();
 await db().prepare("INSERT INTO faculty_email_verifications (key,account_id,expires_at) VALUES (?,?,?) ON CONFLICT(account_id) DO UPDATE SET key=excluded.key,expires_at=excluded.expires_at").bind(key,account.id,Date.now()+day).run();
 try{
  const r=await fetch("https://api.resend.com/emails",{method:"POST",redirect:"manual",signal:AbortSignal.timeout(8000),
   headers:{authorization:"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},
   body:JSON.stringify({from:env.FACULTY_EMAIL_FROM,to:[account.email],subject:"Verify your Short Course Studio faculty email",text:"You requested a faculty account. While signed in to that account, confirm your email at "+link.href+" within 24 hours. If you did not make this request, ignore this message."})});
  if(r.ok)return "email-sent";
 }catch{ /* A live account can retry without exposing provider errors. */ }
 await db().prepare("DELETE FROM faculty_email_verifications WHERE key=?").bind(key).run();
 return "email-failed";
}
export async function verifyFacultyEmail(account:Account,raw:string){
 if(!tokenPattern.test(raw))return false;
 const d=db(),key=await hash(raw),now=Date.now();
 const [updated]=await d.batch([
  d.prepare("UPDATE faculty_accounts SET verified_at=? WHERE id=? AND verified_at IS NULL AND EXISTS (SELECT 1 FROM faculty_email_verifications WHERE key=? AND account_id=? AND expires_at>?)").bind(now,account.id,key,account.id,now),
  d.prepare("DELETE FROM faculty_email_verifications WHERE key=? AND account_id=?").bind(key,account.id),
 ]);
 return !!updated.meta.changes||!!account.verified_at;
}

const oauthConfig={
 google:{authorize:"https://accounts.google.com/o/oauth2/v2/auth",exchange:"https://oauth2.googleapis.com/token",scope:"openid email profile"},
 github:{authorize:"https://github.com/login/oauth/authorize",exchange:"https://github.com/login/oauth/access_token",scope:"read:user user:email"},
};
const oauthCredentials=(p:Provider)=>p==="google"?
 {id:env.FACULTY_GOOGLE_CLIENT_ID,secret:env.FACULTY_GOOGLE_CLIENT_SECRET}:
 {id:env.FACULTY_GITHUB_CLIENT_ID,secret:env.FACULTY_GITHUB_CLIENT_SECRET};
export function providerAvailable(p:Provider){
 const {id,secret}=oauthCredentials(p);return Boolean(id&&secret);
}
const callbackUrl=(p:Provider,origin:string)=>new URL("/faculty/auth/"+p+"/callback",origin).href;
export async function beginFacultyOAuth(p:Provider,origin:string,view:unknown){
 const client=oauthCredentials(p);
 if(!client.id||!client.secret)return null;
 const state=token(),verifier=token(),challenge=btoa(String.fromCharCode(...await sha(verifier))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 await db().prepare("INSERT INTO faculty_oauth_attempts (key,provider,verifier,return_view,expires_at) VALUES (?,?,?,?,?)").bind(await hash(state),p,verifier,facultyView(view),Date.now()+oauthMs).run();
 const url=new URL(oauthConfig[p].authorize);
 url.search=new URLSearchParams({client_id:client.id,redirect_uri:callbackUrl(p,origin),response_type:"code",scope:oauthConfig[p].scope,state,code_challenge:challenge,code_challenge_method:"S256"}).toString();
 return {url:url.href,cookie:makeCookie(oauthName,state,oauthMs/1000)};
}
export async function takeFacultyOAuth(p:Provider,state:string,h:HeaderReader){
 if(!tokenPattern.test(state)||state!==readCookie(h,oauthName))return null;
 return db().prepare("DELETE FROM faculty_oauth_attempts WHERE key=? AND provider=? AND expires_at>? RETURNING verifier,return_view").bind(await hash(state),p,Date.now()).first<{verifier:string;return_view:string}>();
}
type ProviderProfile={email:string;subject:string;first_name:string;last_name:string;verified:boolean};
async function providerJson(url:string,init:RequestInit){
 const r=await fetch(url,{...init,redirect:"manual",signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("Faculty identity provider request failed");
 return r.json();
}
export async function facultyProviderProfile(p:Provider,origin:string,code:string,verifier:string):Promise<ProviderProfile|null>{
 const client=oauthCredentials(p);
 if(!client.id||!client.secret||!code||code.length>2048)return null;
 const tokens=await providerJson(oauthConfig[p].exchange,{method:"POST",headers:{accept:"application/json","content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:client.id,client_secret:client.secret,code,code_verifier:verifier,redirect_uri:callbackUrl(p,origin)})}) as {access_token?:unknown};
 if(typeof tokens.access_token!=="string"||!tokens.access_token)return null;
 const init={headers:{accept:"application/json",authorization:"Bearer "+tokens.access_token,"user-agent":"Short-Course-Studio/1"}};
 const extractName=(x:unknown)=>typeof x==="string"?x.replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,80):"";
 if(p==="google"){
  const profile=await providerJson("https://openidconnect.googleapis.com/v1/userinfo",init) as Record<string,unknown>;
  const parsed=email.safeParse(profile.email);
  if(!parsed.success||profile.email_verified!==true||typeof profile.sub!=="string"||!profile.sub||profile.sub.length>255)return null;
  const domain=parsed.data.split("@")[1];
  const verified=domain==="gmail.com"||(typeof profile.hd==="string"&&profile.hd.toLowerCase()===domain);
  return {email:parsed.data,subject:profile.sub,first_name:extractName(profile.given_name),last_name:extractName(profile.family_name),verified};
 }
 const [profile,addresses]=await Promise.all([providerJson("https://api.github.com/user",init),providerJson("https://api.github.com/user/emails",init)]) as [Record<string,unknown>,{primary?:unknown;verified?:unknown;email?:unknown}[]];
 const parsed=email.safeParse(Array.isArray(addresses)?addresses.find(x=>x.primary===true&&x.verified===true)?.email:undefined);
 if(!parsed.success||typeof profile.id!=="number"||!Number.isSafeInteger(profile.id)||profile.id<=0)return null;
 const [first="",...last]=extractName(profile.name).split(/\s+/);
 return {email:parsed.data,subject:String(profile.id),first_name:first,last_name:last.join(" "),verified:true};
}
export async function facultyOAuthAccount(p:Provider,profile:ProviderProfile){
 const d=db();
 const existing=()=>d.prepare("SELECT "+columns+" FROM faculty_accounts a WHERE a.provider=? AND a.subject=?").bind(p,profile.subject).first<Account>();
 const match=await existing();
 if(match)return match.email===profile.email?match:null;
 const local=profile.email.split("@")[0];
 const base=local.replace(/[^a-z0-9._-]+/g,"_").replace(/^[^a-z0-9]+/,"");
 const seed=base.length>=3?base:"user_"+(base||"faculty");
 const id=crypto.randomUUID(),now=Date.now(),verified=profile.verified?now:null;
 const emailUsed=()=>d.prepare("SELECT 1 AS taken FROM faculty_accounts WHERE email=?").bind(profile.email).first();
 if(await emailUsed())return null;
 for(let n=1;n<=30;n++){
  const suffix=n===1?"":"_"+n, candidate=seed.slice(0,32-suffix.length)+suffix;
  const r=await d.prepare("INSERT INTO faculty_accounts (id,username,email,first_name,last_name,verified_at,provider,subject,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(id,candidate,profile.email,profile.first_name,profile.last_name,verified,p,profile.subject,now).run();
  if(r.meta.changes)return {id,email:profile.email,username:candidate,first_name:profile.first_name,last_name:profile.last_name,verified_at:verified};
  if(await emailUsed()){
   const retry=await existing();return retry?.email===profile.email?retry:null;
  }
 }
 return null;
}
