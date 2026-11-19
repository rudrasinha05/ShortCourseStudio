// Faculty sign-up on a site with no verification email and no faculty OAuth configured: the
// administrator verifies the account, and the faculty member reaches the teaching workspace.
import {scopedFetch} from "./helpers/scoped-fetch.mjs";
import {Miniflare} from "miniflare";
import {readFile,readdir} from "node:fs/promises";
import assert from "node:assert/strict";

const O="https://site.test",root="dist/server";
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=="index.js")].map(p=>({type:"ESModule",path:root+"/"+p}));
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],
 bindings:{SITE_ADMIN_EMAIL:"owner@example.invalid"}});
const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
const form={"content-type":"application/x-www-form-urlencoded",origin:O};
const cookieOf=(r)=>r.headers.getSetCookie().find(x=>x.startsWith("__Host-scs-faculty="))?.split(";")[0];
const facultyPost=(path,fields,cookie="")=>mf.dispatchFetch(O+path,{method:"POST",redirect:"manual",headers:{...form,...(cookie?{cookie}:{})},body:new URLSearchParams(fields)});
const facultyPage=async(path,cookie)=>(await (await mf.dispatchFetch(O+path,{redirect:"manual",headers:{cookie}})).text()).replace(/<!--.*?-->/g,"");
const adminPost=(path,fields)=>scopedFetch(mf,O+path,{method:"POST",redirect:"manual",headers:{...admin,...form},body:new URLSearchParams(fields).toString()});
const adminPage=async(path)=>(await (await scopedFetch(mf,O+path,{headers:admin})).text()).replace(/<!--.*?-->/g,"");
try{
 const db=await mf.getD1Database("DB");
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort())
  for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();

 // No faculty Google sign-in without its own credentials; the sign-up page says accounts stay locked.
 const signupPage=await (await mf.dispatchFetch(O+"/faculty/login?mode=signup")).text();
 assert.doesNotMatch(signupPage,/Sign in with Google/);
 assert.match(signupPage,/Verification emails are not available yet/);

 const fields={first_name:"Asha",last_name:"Rao",username:"asha.rao",phone:"+91 98765 43210",email:"Asha.Rao@Example.invalid",password:"correct horse battery",view:""};
 const signup=await facultyPost("/faculty/auth/signup",fields);
 assert.equal(signup.headers.get("location"),"/faculty?auth=email-unconfigured");
 let cookie=cookieOf(signup);
 assert.ok(cookie);
 // Locked, with the details the organiser needs.
 let locked=await facultyPage("/faculty",cookie);
 assert.match(locked,/Verify your faculty email/);
 assert.match(locked,/course organiser verifies faculty accounts/);
 assert.match(locked,/<strong>asha\.rao<\/strong>/);
 assert.match(locked,/<strong>asha\.rao@example\.invalid<\/strong>/);

 // Signing in again with the password works, but stays locked until verified.
 const signin=await facultyPost("/faculty/auth/signin",{username:"asha.rao",password:"correct horse battery",view:""});
 assert.equal(signin.headers.get("location"),"/faculty");
 cookie=cookieOf(signin);
 assert.match(await facultyPage("/faculty",cookie),/Verify your faculty email/);

 // The administrator sees the waiting sign-up, and that no faculty profile matches yet.
 const directoryPath="/admin?section=faculty&view=directory";
 let directory=await adminPage(directoryPath);
 assert.match(directory,/Faculty sign-ups waiting for verification/);
 assert.match(directory,/Verification emails are not configured/);
 assert.match(directory,/asha\.rao@example\.invalid · \+919876543210/);
 assert.match(directory,/No active faculty profile uses this email/);
 const id=(await db.prepare("SELECT id FROM faculty_accounts WHERE username='asha.rao'").first()).id;

 // Only an administrator can verify.
 const outsider=await facultyPost("/forms/admin/faculty-account",{id,decision:"verify"},cookie);
 assert.notEqual(outsider.status,303);
 assert.equal((await db.prepare("SELECT verified_at FROM faculty_accounts WHERE id=?").bind(id).first()).verified_at,null);
 assert.match((await adminPost("/forms/admin/faculty-account",{id:"not-a-uuid",decision:"verify"})).headers.get("location"),/portalMessage=invalid/);

 // Add the faculty profile, then verify the account.
 assert.match((await adminPost("/forms/admin/faculty",{name:"Asha Rao",email:"asha.rao@example.invalid",department:"Computer Science",designation:"Assistant Professor",qualification:"M.Tech",bio:"Teaches applied analytics through practical labs."})).headers.get("location"),/portalMessage=faculty-added/);
 assert.match(await adminPage(directoryPath),/Matches an active faculty profile/);
 const verified=await adminPost("/forms/admin/faculty-account",{id,decision:"verify"});
 assert.match(verified.headers.get("location"),/portalMessage=account-verified/);
 assert.match(verified.headers.get("location"),/#faculty-accounts$/);
 assert.match(await adminPage(verified.headers.get("location")),/Faculty account verified\. They can now sign in to the Faculty Portal\./);
 assert.ok(await db.prepare("SELECT 1 FROM admin_audit WHERE action='verify faculty account' AND target=?").bind(id).first());
 assert.match(await adminPage(directoryPath),/No faculty sign-ups are waiting/);
 // Verifying twice is rejected rather than silently repeated.
 assert.match((await adminPost("/forms/admin/faculty-account",{id,decision:"verify"})).headers.get("location"),/portalMessage=invalid/);

 // The same session now opens the teaching workspace.
 const workspace=await facultyPage("/faculty",cookie);
 assert.doesNotMatch(workspace,/Verify your faculty email/);
 assert.match(workspace,/Asha Rao · Assistant Professor/);

 // An unwanted sign-up can be removed; a verified account cannot.
 const spam=await facultyPost("/faculty/auth/signup",{...fields,username:"spam.user",email:"spam@example.invalid"});
 const spamId=(await db.prepare("SELECT id FROM faculty_accounts WHERE username='spam.user'").first()).id;
 assert.match((await adminPost("/forms/admin/faculty-account",{id:spamId,decision:"remove"})).headers.get("location"),/portalMessage=account-removed/);
 assert.equal(await db.prepare("SELECT 1 FROM faculty_accounts WHERE id=?").bind(spamId).first(),null);
 assert.equal(await db.prepare("SELECT 1 FROM faculty_auth_sessions WHERE account_id=?").bind(spamId).first(),null);
 assert.match(await facultyPage("/faculty",cookieOf(spam)),/Sign in \/ Sign up/);
 assert.match((await adminPost("/forms/admin/faculty-account",{id,decision:"remove"})).headers.get("location"),/portalMessage=invalid/);
 assert.ok(await db.prepare("SELECT 1 FROM faculty_accounts WHERE id=?").bind(id).first());
 console.log("faculty admin verification: ok");
}finally{await mf.dispose();}
