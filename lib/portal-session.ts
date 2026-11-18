const portalCookie="__Host-scs-active-portal";
const facultyCookie="__Host-scs-faculty";
const oauthCookie="__Host-scs-faculty-oauth";
export const adminGoogleCookie="__Host-scs-admin-google";
export const portalRoleHeader="scs-active-portal";
export const studentContactHeader="scs-unverified-student-contact";
export const ownerAuthHeader="scs-owner-auth-method";
export const roles=["student","faculty","admin","staff"] as const;
export type PortalRoleSession=typeof roles[number];
export const roleNames={student:"Student",faculty:"Faculty",admin:"Admin",staff:"Staff"} as const;
type GetHeaders=Pick<Headers,"get">;
const timeToLive=8*60*60;
const sessionPattern=/^[a-f0-9]{64}$/;
const hex=(bytes:Uint8Array)=>Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
const digest=async (value:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
function valueOf(h:GetHeaders,name:string){
 const value=h.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(name+"="))?.slice(name.length+1)??"";
 return sessionPattern.test(value)?value:"";
}
function cookie(name:string,value:string,maxAge:number){
 return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
export const clearPortalCookie=()=>cookie(portalCookie,"",0);
export async function portalSessionFingerprint(h:GetHeaders){const raw=valueOf(h,portalCookie);return raw?digest(raw):"";}
const isAt=(path:string,root:string)=>path===root||path.startsWith(root+"/");
function platformAccount(h:GetHeaders){
 const id=h.get("oai-authenticated-user-id"),email=h.get("oai-authenticated-user-email")?.trim().toLowerCase();
 return id&&email?JSON.stringify([id,email]):"";
}
export function portalRoleOf(path:string):PortalRoleSession{
 return isAt(path,"/faculty")?"faculty":isAt(path,"/admin")?"admin":isAt(path,"/staff")?"staff":"student";
}
export function safePortalTarget(value:string){
 if(!value.startsWith("/")||value.startsWith("//")||value.length>700)return "/student";
 try{
  const url=new URL(value,"https://portal.invalid");
  if(url.origin!=="https://portal.invalid"||!["/student","/faculty","/admin","/staff","/profile","/apply"].includes(url.pathname))return "/student";
  return url.pathname+url.search+url.hash;
 }catch{return "/student";}
}
export async function deactivatePortal(h:GetHeaders,db:D1Database){
 const raw=valueOf(h,portalCookie);
 if(raw)await db.prepare("DELETE FROM portal_sessions WHERE key=?").bind(await digest(raw)).run();
}
async function deactivateFaculty(h:GetHeaders,db:D1Database){
 const raw=valueOf(h,facultyCookie),state=valueOf(h,oauthCookie),updates=[];
 if(raw)updates.push(db.prepare("DELETE FROM faculty_auth_sessions WHERE key=?").bind(await digest(raw)));
 if(state)updates.push(db.prepare("DELETE FROM faculty_oauth_attempts WHERE key=?").bind(await digest(state)));
 if(updates.length)await db.batch(updates);
}
function move(path:string,cookies:string[]=[]){
 const h=new Headers({location:path,"cache-control":"private, no-store"});
 for(const entry of cookies)h.append("set-cookie",entry);
 return new Response(null,{status:303,headers:h});
}
export function adminAccountForDialog(req:Request,ownerEmail:string|undefined){
 const headers={"cache-control":"private, no-store","x-content-type-options":"nosniff","cross-origin-resource-policy":"same-origin"};
 if(req.method!=="GET")return new Response(null,{status:405,headers:{...headers,allow:"GET"}});
 const url=new URL(req.url),origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if((origin&&origin!==url.origin)||site==="cross-site")return new Response(null,{status:403,headers});
 const email=req.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
 if(!email||!platformAccount(req.headers))return Response.json({kind:"guest"},{headers});
 if(email!==ownerEmail?.trim().toLowerCase())return Response.json({kind:"denied"},{headers});
 return Response.json({kind:"owner",email},{headers});
}

export function isPortalSessionAction(path:string){
 return path==="/session/enter"||path==="/session/logout";
}
export async function portalSessionAction(req:Request,db:D1Database,configuredOwner?:string){
 const url=new URL(req.url),origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if(req.method!=="POST")return new Response(null,{status:405,headers:{allow:"POST","cache-control":"no-store"}});
 if((origin!==url.origin&&(origin!==null||site!=="same-origin"))||site==="cross-site")return new Response("Open the portal and submit the form there.",{status:403,headers:{"cache-control":"no-store"}});
 const facultyExpiry=[cookie(facultyCookie,"",0),cookie(oauthCookie,"",0)];
 if(url.pathname==="/session/logout"){
  const google=valueOf(req.headers,adminGoogleCookie);
  await Promise.all([deactivatePortal(req.headers,db),deactivateFaculty(req.headers,db),
   google?db.prepare("DELETE FROM owner_admin_google_attempts WHERE key=?").bind(await digest(google)).run():null]);
  return move("/",[clearPortalCookie(),...facultyExpiry,cookie(adminGoogleCookie,"",0)]);
 }
 if(req.headers.get("content-type")?.split(";")[0]!=="application/x-www-form-urlencoded")return new Response(null,{status:415});
 // Read only a small, normal form body even when Content-Length is absent.
 const reader=req.body?.getReader();if(!reader)return new Response(null,{status:400});
 let body="",size=0;
 const decoder=new TextDecoder();
 try{
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();return new Response(null,{status:413});}body+=decoder.decode(part.value,{stream:true});}
  body+=decoder.decode();
 }finally{reader.releaseLock();}
 const path=safePortalTarget(new URLSearchParams(body).get("return_to")??"/student");
 const account=platformAccount(req.headers);
 const owner=configuredOwner?.trim().toLowerCase();
 // Only first-time owner password setup may start a legacy session.
 if(path!=="/admin"||!account||!owner||req.headers.get("oai-authenticated-user-email")?.trim().toLowerCase()!==owner
  ||await db.prepare("SELECT 1 FROM owner_admin_credentials WHERE email=? AND password IS NOT NULL").bind(owner).first()){
  return new Response(null,{status:403,headers:{"cache-control":"no-store"}});
 }
 const role="admin";
 const raw=hex(crypto.getRandomValues(new Uint8Array(32)));
 const now=Date.now();
 await Promise.all([deactivatePortal(req.headers,db),deactivateFaculty(req.headers,db)]);
 await db.batch([
  db.prepare("DELETE FROM portal_sessions WHERE expires_at<=?").bind(now),
  db.prepare("INSERT INTO portal_sessions (key,role,account,expires_at) VALUES (?,?,?,?)").bind(await digest(raw),role,await digest(account),now+timeToLive*1000),
 ]);
 return move("/admin/security",[cookie(portalCookie,raw,timeToLive),...facultyExpiry]);
}

function allowedRoles(path:string):PortalRoleSession[]{
 if(isAt(path,"/faculty")||isAt(path,"/forms/faculty"))return ["faculty"];
 if(path==="/api/faculty-syllabus")return ["faculty","admin"];
 if(isAt(path,"/staff"))return ["staff"];
 if(["/forms/admin/review","/forms/admin/control/learning","/forms/admin/control/support","/forms/admin/control/offline-payment"].includes(path))return ["admin","staff"];
 if(isAt(path,"/admin")||isAt(path,"/forms/admin")||isAt(path,"/api/admin"))return ["admin"];
 if(isAt(path,"/profile"))return [...roles];
 // The catalogue and its wishlist controls must see the same student session.
 if(path==="/"||isAt(path,"/courses"))return ["student"];
 if(isAt(path,"/student")||isAt(path,"/forms/student")||isAt(path,"/apply")||path==="/forms/apply"||isAt(path,"/api/applications")||isAt(path,"/api/payments"))return ["student"];
 return [];
}
const ownerRecord=async(email:string,method:"password"|"google")=>"owner-admin:"+method+":"+await digest(email);
export async function nativeAdminSession(req:Request,db:D1Database,email:string,method:"password"|"google",extraCookies:string[]=[]){
 const raw=hex(crypto.getRandomValues(new Uint8Array(32))),now=Date.now();
 await Promise.all([deactivatePortal(req.headers,db),deactivateFaculty(req.headers,db)]);
 await db.batch([
  db.prepare("DELETE FROM portal_sessions WHERE expires_at<=?").bind(now),
  db.prepare("INSERT INTO portal_sessions (key,role,account,expires_at) VALUES (?,'admin',?,?)").bind(await digest(raw),await ownerRecord(email,method),now+timeToLive*1000),
 ]);
 return move("/admin",[cookie(portalCookie,raw,timeToLive),cookie(facultyCookie,"",0),cookie(oauthCookie,"",0),...extraCookies]);
}
export async function nativePortalSession(req:Request,db:D1Database,role:"student"|"staff",id:string,target:string){
 const raw=hex(crypto.getRandomValues(new Uint8Array(32))),now=Date.now();
 await Promise.all([deactivatePortal(req.headers,db),deactivateFaculty(req.headers,db)]);
 await db.batch([
  db.prepare("DELETE FROM portal_sessions WHERE expires_at<=?").bind(now),
  db.prepare("INSERT INTO portal_sessions (key,role,account,expires_at) VALUES (?,?,?,?)").bind(await digest(raw),role,role+"-account:"+id,now+timeToLive*1000),
 ]);
 return move(target,[cookie(portalCookie,raw,timeToLive),cookie(facultyCookie,"",0),cookie(oauthCookie,"",0)]);
}

export async function revokeNativeAdminSessions(db:D1Database,email:string){
 await db.prepare("DELETE FROM portal_sessions WHERE role='admin' AND account IN (?,?)").bind(await ownerRecord(email,"password"),await ownerRecord(email,"google")).run();
}

export async function scopePortalRequest(req:Request,db:D1Database|undefined,configuredOwner?:string){
 const path=new URL(req.url).pathname;
 const account=platformAccount(req.headers),raw=valueOf(req.headers,portalCookie);
 const owner=configuredOwner?.trim().toLowerCase();
 const allowed=allowedRoles(path);
 let role:PortalRoleSession|undefined,native:"password"|"google"|undefined;
 let websiteUser:{id:string;email:string;full_name:string}|null=null;
 if(db&&allowed.length&&raw){
  const result=await db.prepare("SELECT role,account FROM portal_sessions WHERE key=? AND expires_at>?").bind(await digest(raw),Date.now()).first<{role:PortalRoleSession;account:string}>();
  if(result&&allowed.includes(result.role)){
   const [kind,id]=result.account.split(":");
   if(kind==="student-account"&&result.role==="student"){
    websiteUser=await db.prepare("SELECT id,email,full_name FROM student_accounts WHERE id=?").bind(id).first();
    if(websiteUser)role="student";
   }else if(kind==="staff-account"&&result.role==="staff"){
    websiteUser=await db.prepare("SELECT a.id,a.email,a.first_name||' '||a.last_name AS full_name FROM faculty_accounts a JOIN admin_staff s ON s.email=a.email AND s.active=1 WHERE a.id=? AND a.verified_at IS NOT NULL").bind(id).first();
    if(websiteUser)role="staff";
   }else if(account&&result.account===await digest(account))role=result.role;
   else if(result.role==="admin"&&owner&&result.account.startsWith("owner-admin:")){
    for(const method of ["password","google"] as const)if(result.account===await ownerRecord(owner,method)){role="admin";native=method;break;}
   }
  }
 }
 const h=new Headers(req.headers);
 h.delete(portalRoleHeader);h.delete(ownerAuthHeader);h.delete(studentContactHeader);
 if(!role||native||websiteUser)for(const key of Array.from(h.keys()))if(key.startsWith("oai-authenticated-user-"))h.delete(key);
 if(role)h.set(portalRoleHeader,role);
 if(websiteUser&&role){
  h.set("oai-authenticated-user-id",role+":"+websiteUser.id);
  h.set("oai-authenticated-user-email",websiteUser.email);
  h.set("oai-authenticated-user-full-name",encodeURIComponent(websiteUser.full_name));
  h.set("oai-authenticated-user-full-name-encoding","percent-encoded-utf-8");
  if(role==="student")h.set(studentContactHeader,"1");
 }
 if(native&&owner){
  h.set(ownerAuthHeader,native);
  h.set("oai-authenticated-user-id","site-owner:"+await digest(owner));
  h.set("oai-authenticated-user-email",owner);
 }
 return new Request(req,{headers:h});
}
