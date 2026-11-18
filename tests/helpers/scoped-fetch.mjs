import {createHash,randomBytes} from "node:crypto";
const digest=(s)=>createHash("sha256").update(s).digest("hex");
const origin="https://site.test";
const sessions=new WeakMap();
function roleFor(path,h){
 const id=h.get("oai-authenticated-user-id")??"";
 if(/^(?:\/faculty(?:\/|$)|\/forms\/faculty\/)/.test(path))return "faculty";
 if(path==="/api/faculty-syllabus")return /admin|owner/.test(id)?"admin":"faculty";
 if(/^\/(?:staff\/|staff$)/.test(path))return "staff";
 if(/^\/(?:forms\/|api\/)?admin(?:\/|$)/.test(path))return id==="admissions"?"staff":"admin";
 return "student";
}
export async function activatePortal(mf,headers,target){
 const h=new Headers(headers),db=await mf.getD1Database("DB");
 const account=JSON.stringify([h.get("oai-authenticated-user-id"),h.get("oai-authenticated-user-email").trim().toLowerCase()]);
 const role=/^\/(faculty|admin|staff)(?:[/?]|$)/.exec(target)?.[1]??"student";
 const previous=/__Host-scs-active-portal=([a-f0-9]{64})/.exec(h.get("cookie")??"")?.[1];
 if(previous)await db.prepare("DELETE FROM portal_sessions WHERE key=?").bind(digest(previous)).run();
 const raw=randomBytes(32).toString("hex"),cookie="__Host-scs-active-portal="+raw;
 await db.prepare("INSERT INTO portal_sessions(key,role,account,expires_at) VALUES (?,?,?,?)").bind(digest(raw),role,digest(account),Date.now()+3600000).run();
 const response=new Response(null,{status:303,headers:{location:target,"set-cookie":cookie+"; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600"}});
 return {response,cookie};
}
// Business-workflow tests use an already-issued legacy session fixture. Native
// credentials and new session issuance are separately exercised by auth tests.
export async function scopedFetch(mf,input,init={}){
 const h=new Headers(init.headers),id=h.get("oai-authenticated-user-id"),email=h.get("oai-authenticated-user-email");
 if(id&&email){
  const role=roleFor(new URL(input).pathname,h),key=JSON.stringify([role,id,email]);
  if(!sessions.has(mf))sessions.set(mf,new Map());
  const cache=sessions.get(mf);
  if(!cache.has(key))cache.set(key,(async()=>{
   const {cookie}=await activatePortal(mf,{"oai-authenticated-user-id":id,"oai-authenticated-user-email":email},"/"+role);
   if(!cookie)throw Error("Test portal session not started for "+role);
   return cookie;
  })());
  const cookie=await cache.get(key);
  h.set("cookie",[h.get("cookie"),cookie].filter(Boolean).join("; "));
 }
 return mf.dispatchFetch(input,{...init,headers:h});
}
