import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {Miniflare,createFetchMock} from "miniflare";

const origin="https://site.test",root="dist/server",client="synthetic-student-google";
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=="index.js")].map(p=>({type:"ESModule",path:root+"/"+p}));
const mock=createFetchMock();mock.disableNetConnect();
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],fetchMock:mock,bindings:{STUDENT_GOOGLE_CLIENT_ID:client,STUDENT_GOOGLE_CLIENT_SECRET:"synthetic-test-secret"}});
const get=(p,cookie="")=>mf.dispatchFetch(origin+p,{redirect:"manual",headers:{cookie}});
const post=(p,data,cookie="",from=origin)=>mf.dispatchFetch(origin+p,{redirect:"manual",method:"POST",headers:{cookie,origin:from,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(data)});
const loc=r=>r.headers.get("location");
const cookie=(r,name="__Host-scs-active-portal")=>r.headers.getSetCookie().find(v=>v.startsWith(name+"="))?.split(";")[0]??"";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const key={...publicKey.export({format:"jwk"}),kid:"test-key",alg:"RS256",use:"sig"};
const jsonHeaders={headers:{"content-type":"application/json"}};
const auth="/student/auth/google",target="/student?view=wishlist";
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
async function start(data={},session=""){
 const response=await post(auth+"/start",{return_to:target,...data},session);
 assert.equal(response.status,303);
 const u=new URL(loc(response));
 assert.equal(u.origin,"https://accounts.google.com");
 assert.equal(u.searchParams.get("redirect_uri"),origin+auth+"/callback");
 assert.equal(u.searchParams.get("scope"),"openid email profile");
 assert.equal(u.searchParams.get("code_challenge_method"),"S256");
 assert.match(u.searchParams.get("code_challenge"),/^[A-Za-z0-9_-]{43}$/);
 assert.equal(u.searchParams.get("prompt"),"select_account");
 const stateCookie=cookie(response,"__Host-scs-student-google");
 assert.match(response.headers.getSetCookie()[0],/Secure; HttpOnly; SameSite=Lax/);
 const path=auth+"/callback?code=synthetic-code&state="+u.searchParams.get("state");
 return {u,stateCookie,path};
}
async function complete(a,claims={},session=""){
 const now=Math.floor(Date.now()/1000);
 const payload=b64({iss:"https://accounts.google.com",aud:client,nonce:a.u.searchParams.get("nonce"),exp:now+600,iat:now,sub:"test-signin-subject",email:"google-student@example.invalid",email_verified:true,name:"Synthetic Google Student",...claims});
 const input=b64({alg:"RS256",kid:"test-key"})+"."+payload;
 const id_token=input+"."+sign("RSA-SHA256",Buffer.from(input),privateKey).toString("base64url");
 mock.get("https://oauth2.googleapis.com").intercept({path:"/token",method:"POST"}).reply(200,{id_token},jsonHeaders);
 mock.get("https://www.googleapis.com").intercept({path:"/oauth2/v3/certs",method:"GET"}).reply(200,{keys:[key]},jsonHeaders);
 return get(a.path,[a.stateCookie,session].filter(Boolean).join("; "));
}

try{
 const db=await mf.getD1Database("DB");
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort())
  for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
 const login=await (await get("/login")).text();
 assert.match(login,/action="\/student\/auth\/google\/start"/);
 assert.match(login,/Sign in with Google/);
 const faculty=await(await get("/faculty/login")).text();
 assert.match(faculty,/Faculty sign in/);
 assert.doesNotMatch(faculty,/Continue with GitHub|Not configured/);
 assert.equal((await post(auth+"/start",{},"","https://outside.invalid")).status,403);
 const missing=await start();
 assert.match(loc(await get(missing.path)),/google-expired/);
 for(const claims of [{email_verified:false},{aud:"other"},{nonce:"wrong"}]){
   assert.match(loc(await complete(await start(),claims)),/google-denied/);
 }
 const a=await start();
 const signed=await complete(a);
 assert.equal(loc(signed),target);
 assert.match(await(await get("/student",cookie(signed))).text(),/aria-label="Student sections"/);
 assert.equal((await get("/api/admin",cookie(signed))).status,401);
 assert.match(loc(await get(a.path,a.stateCookie)),/google-expired/);
 const again=await complete(await start({return_to:"/admin"}));
 assert.equal(loc(again),"/student");
 assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM student_accounts WHERE email=?").bind("google-student@example.invalid").first("n"),1);
 const generated=await db.prepare("SELECT username,password FROM student_accounts WHERE email=?").bind("google-student@example.invalid").first();
 assert.equal(generated.password,"google-only");
 assert.match(loc(await post("/student/auth/signin",{username:generated.username,password:"google-only"})),/invalid-login/);
 const password="synthetic-local-student-password",email="existing@example.invalid",username="scs.existing";
 const native=await post("/student/auth/signup",{full_name:"Existing Student",username,email,password});
 assert.equal(loc(native),"/student");
 const session=cookie(native);
 assert.ok(session);
 const existingId=await db.prepare("SELECT id FROM student_accounts WHERE username=?").bind(username).first("id");
 assert.match(loc(await get((await start({intent:"link"},session)).path)),/google-expired/);
 const unmatched=await complete(await start({intent:"link"},session),{sub:"link-subject"},session);
 assert.equal(loc(unmatched),"/profile?google=google-link-conflict");
 const linked=await complete(await start({intent:"link"},session),{sub:"link-subject",email},session);
 assert.equal(loc(linked),"/profile?google=linked");
 assert.equal(await db.prepare("SELECT student_id FROM student_google_identities WHERE subject=?").bind("link-subject").first("student_id"),existingId);
 const sameEmailOtherSubject=await complete(await start(),{sub:"new-not-linked-subject",email});
 assert.equal(loc(sameEmailOtherSubject),target);
 assert.notEqual(await db.prepare("SELECT student_id FROM student_google_identities WHERE subject=?").bind("new-not-linked-subject").first("student_id"),existingId);
 console.log("PASS: Student Google OIDC, secure PKCE and single-use state, role isolation, verified linking, and Faculty GitHub removal.");
}finally{await mf.dispose();await mock.close();}
