import {Miniflare,createFetchMock} from "miniflare";
import {createHash} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import assert from "node:assert/strict";

const origin="https://site.test",root="dist/server",json={headers:{"content-type":"application/json"}};
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=="index.js")].map(p=>({type:"ESModule",path:root+"/"+p}));
const fetchMock=createFetchMock();
fetchMock.disableNetConnect();
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],
 d1Databases:["DB"],r2Buckets:["BUCKET"],fetchMock,bindings:{
 SITE_ADMIN_EMAIL:"owner@example.invalid",FACULTY_GOOGLE_CLIENT_ID:"google-test-id",FACULTY_GOOGLE_CLIENT_SECRET:"google-test-secret",
 FACULTY_GITHUB_CLIENT_ID:"github-test-id",FACULTY_GITHUB_CLIENT_SECRET:"github-test-secret",RESEND_API_KEY:"resend-test-secret",FACULTY_EMAIL_FROM:"Test <test@example.invalid>",
 }});
const loc=(r)=>r.headers.get("location");
const cookie=(r,name="__Host-scs-faculty")=>r.headers.getSetCookie().find(x=>x.startsWith(name+"="))?.split(";")[0];
const view=(body)=>body.replace(/<!--.*?-->/g,"");
const req=(p,init={})=>mf.dispatchFetch(origin+p,{redirect:"manual",...init});
const get=(p,c="",extra={})=>req(p,{headers:{...(c?{cookie:c}:{}),...extra}});
const post=(p,fields,c="",override={})=>req(p,{method:"POST",headers:{origin,"content-type":"application/x-www-form-urlencoded",...(c?{cookie:c}:{}),...override},body:new URLSearchParams(fields)});
const page=async(...args)=>view(await(await get(...args)).text());
const cap=(value)=>createHash("sha256").update(value).digest("base64url");

try{
 const db=await mf.getD1Database("DB");
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort())
  for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();

 const centre=await page("/faculty");
 assert.match(centre,/<a class="btn primary" href="\/faculty\/login">Sign in \/ Sign up/);
 assert.match(await page("/faculty/login"),/name="username".*name="password"/s);
 const signupPage=await page("/faculty/login?mode=signup");
 for(const key of ["first_name","last_name","username","phone","email","password"])assert.match(signupPage,new RegExp('name="'+key+'"'));
 assert.equal((await get("/faculty/login")).headers.get("cache-control"),"private, no-store");

 let magicLink, mailBody;
 fetchMock.get("https://api.resend.com").intercept({path:"/emails",method:"POST"}).reply((opts)=>{
  mailBody=new Response(opts.body).text();
  return {statusCode:200,data:{id:"synthetic-email"},responseOptions:json};
 });
 const data={first_name:"Test",last_name:"Faculty",username:"Faculty.Test",email:"Owner@Example.Invalid",phone:"+91 9876543210",password:"test-password-for-local"};
 assert.equal((await post("/faculty/auth/signup",data,"",{origin:"https://unrelated.test"})).status,403);
 assert.match(loc(await post("/faculty/auth/signup",{...data,username:"invalid space"})),/invalid-signup/);
 const creation=await post("/faculty/auth/signup",data);
 assert.match(loc(creation),/^\/faculty\?auth=email-sent$/);
 const delivery=JSON.parse(await mailBody);
 assert.deepEqual(delivery.to,["owner@example.invalid"]);
 magicLink=new URL(delivery.text.match(/https:\/\/\S+/)[0]);
 const firstCookie=cookie(creation);
 assert.ok(firstCookie);
 assert.match(creation.headers.getSetCookie()[0],/Path=\/; Secure; HttpOnly; SameSite=Lax/);
 const row=await db.prepare("SELECT id,username,password,email,phone,verified_at FROM faculty_accounts").first();
 assert.equal(row.username,"faculty.test");
 assert.equal(row.phone,"+919876543210");
 assert.match(row.password,/^pbkdf2-sha256:[a-f0-9]{32}:[a-f0-9]{64}$/);
 assert.equal(row.verified_at,null);
 assert.match(loc(await post("/faculty/auth/signup",{...data,email:"other@example.invalid",username:"FACULTY.TEST"})),/username-taken/);
 assert.match(loc(await post("/faculty/auth/signin",{username:"faculty.test",password:"incorrect password"})),/invalid-login/);
 assert.match(loc(await post("/faculty/auth/signin",{username:"unknown",password:"incorrect password"})),/invalid-login/);

 const administrator={"oai-authenticated-user-id":"site-owner","oai-authenticated-user-email":row.email};
 await db.prepare("INSERT INTO faculty_profiles (id,email,name,department,designation,created_at) VALUES (?,?,?,?,?,?)").bind("teaching-faculty",row.email,"Faculty Test Profile","Computing","Instructor",new Date().toISOString()).run();
 assert.match(await page("/faculty",firstCookie,administrator),/Verify your faculty email/);
 assert.equal((await post("/forms/faculty/progress",{},firstCookie,administrator)).status,403);
 assert.match(await page("/student",firstCookie),/Sign in \/ Sign up/);
 assert.match(await page("/admin",firstCookie),/Admin sign in/);
 assert.match(await page(magicLink.pathname+magicLink.search,firstCookie),/Confirm email/);
 assert.match(loc(await post("/faculty/auth/verify",{token:magicLink.searchParams.get("token")},firstCookie)),/email-verified/);
 assert.match(await page("/faculty?view=teaching",firstCookie),/My assigned batches/);
 assert.equal(await db.prepare("SELECT count(*) AS n FROM faculty_email_verifications").first("n"),0);

 const signIn=await post("/faculty/auth/signin",{username:"FACULTY.TEST",password:data.password,view:"income"},firstCookie);
 assert.equal(loc(signIn),"/faculty?view=income");
 const secondCookie=cookie(signIn);
 assert.notEqual(firstCookie,secondCookie);
 assert.match(await page("/faculty",firstCookie),/Sign in \/ Sign up/);
 assert.match(await page("/faculty",secondCookie),/Faculty Test Profile/);
 assert.equal((await post("/forms/faculty/reminder-contact",{enabled:"no"},secondCookie)).status,303);
 assert.equal(loc(await post("/session/logout",{},secondCookie)),"/");
 assert.match(await page("/faculty",secondCookie),/Sign in \/ Sign up/);

 const googleToken=fetchMock.get("https://oauth2.googleapis.com");
 const googleInfo=fetchMock.get("https://openidconnect.googleapis.com");
 const githubToken=fetchMock.get("https://github.com");
 const githubInfo=fetchMock.get("https://api.github.com");
 async function start(provider){
  const r=await get("/faculty/auth/"+provider+"/start?view=proposals"),u=new URL(loc(r));
  const state=u.searchParams.get("state"),oauthCookie=cookie(r,"__Host-scs-faculty-oauth");
  assert.equal(u.searchParams.get("redirect_uri"),origin+"/faculty/auth/"+provider+"/callback");
  assert.equal(u.searchParams.get("code_challenge_method"),"S256");
  return {url:u,oauthCookie,urlPath:"/faculty/auth/"+provider+"/callback?state="+state+"&code=mock-code"};
 }
 let googleBody;
 const google=await start("google");
 assert.match(loc(await get(google.urlPath)),/oauth-expired/);
 googleToken.intercept({path:"/token",method:"POST"}).reply(opts=>{
  googleBody=new Response(opts.body).text();
  return {statusCode:200,data:{access_token:"mock-google"},responseOptions:json};
 });
 googleInfo.intercept({path:"/v1/userinfo",method:"GET"}).reply(200,{sub:"mock-google-user",email:"faculty.test@gmail.com",email_verified:true,given_name:"Google",family_name:"Faculty"},json);
 const oauthLogin=await get(google.urlPath,google.oauthCookie);
 assert.equal(cap(new URLSearchParams(await googleBody).get("code_verifier")),google.url.searchParams.get("code_challenge"));
 assert.equal(loc(oauthLogin),"/faculty?view=proposals");
 assert.match(await page("/faculty",cookie(oauthLogin)),/faculty.test_2/);
 assert.equal(await db.prepare("SELECT username FROM faculty_accounts WHERE provider='google'").first("username"),"faculty.test_2");
 assert.match(loc(await get(google.urlPath,google.oauthCookie)),/oauth-expired/);

 const github=await start("github");
 githubToken.intercept({path:"/login/oauth/access_token",method:"POST"}).reply(200,{access_token:"mock-github"},json);
 githubInfo.intercept({path:"/user",method:"GET"}).reply(200,{id:42,name:"Git Hub",login:"github-login-is-not-the-username"},json);
 githubInfo.intercept({path:"/user/emails",method:"GET"}).reply(200,[{primary:false,verified:true,email:"wrong@example.invalid"},{primary:true,verified:true,email:"another.faculty@example.invalid"}],json);
 assert.equal(loc(await get(github.urlPath,github.oauthCookie)),"/faculty?view=proposals");
 assert.equal(await db.prepare("SELECT username FROM faculty_accounts WHERE provider='github'").first("username"),"another.faculty");
 console.log("PASS: faculty signup, unique case-insensitive username, email proof, role isolation, password sign-in, logout, Google and GitHub OAuth callbacks and username collision.");
}finally{await mf.dispose();await fetchMock.close();}
