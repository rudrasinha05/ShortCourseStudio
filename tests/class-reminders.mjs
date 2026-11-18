import {scopedFetch} from "./helpers/scoped-fetch.mjs";
import {Miniflare} from "miniflare";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";

const root="dist/server";
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=="index.js")].map(x=>({type:"ESModule",path:root+"/"+x}));
const cfg={SITE_ADMIN_EMAIL:"owner@example.invalid",RESEND_API_KEY:"synthetic-email-key",REMINDER_EMAIL_FROM:"Studio <studio@example.invalid>",WHATSAPP_ACCESS_TOKEN:"synthetic-wa-key",WHATSAPP_PHONE_NUMBER_ID:"123456",WHATSAPP_API_VERSION:"v23.0",WHATSAPP_TEMPLATE_NAME:"class_reminder",WHATSAPP_TEMPLATE_LANGUAGE:"en",REMINDER_JOB_SECRET:"synthetic-job-key-for-testing-only-12345"};
const mails=[],messages=[];
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],bindings:cfg,d1Databases:["DB"],
 outboundService:async request=>{
  const url=new URL(request.url);
  if(request.method!=="POST")return new Response(null,{status:405});
  if(url.href==="https://api.resend.com/emails"){
   mails.push(await request.json());
   return Response.json({id:"fake-email"});
  }
  if(url.href==="https://graph.facebook.com/v23.0/123456/messages"){
   messages.push(await request.json());
   return Response.json({messages:[{id:"fake-message"}]});
  }
  return new Response(null,{status:403});
 }});
try{
 const db=await mf.getD1Database("DB"),run=(sql,...args)=>db.prepare(sql).bind(...args).run();
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort()){
  for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await run(s.trim());
 }
 const req=(path,headers={},method="GET")=>scopedFetch(mf,"https://site.test"+path,{method,headers,redirect:"manual"});
 const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
 const {courses}=await (await req("/api/admin",admin)).json();
 const slug=courses.find(c=>!c.exclusive&&c.track==="C Programming")?.slug??courses[0].slug;
 const c="c-by-horesh-sir",batch="batch-1",now=new Date().toISOString();
 const start=new Date(Date.now()+3*3600000+19800000).toISOString().slice(0,16);
 await run("INSERT INTO course_settings (slug,batch,status,schedule,mode) VALUES (?,?,?,?,?)", c,batch,"open","Test schedule","Online");
 await run("INSERT INTO class_sessions (slug,batch,day,starts_at) VALUES (?,?,?,?)",c,batch,1,start);
 await run("INSERT INTO class_sessions (slug,batch,day,starts_at) VALUES (?,?,?,?)",slug,batch,2,start);
 await run("INSERT INTO faculty_profiles (id,email,name,department,designation,created_at) VALUES (?,?,?,?,?,?)","teacher","teacher@example.invalid","Test Teacher","Test Department","Teacher",now);
 await run("INSERT INTO faculty_assignments (slug,batch,faculty_id) VALUES (?,?,?)",c,batch,"teacher");
 await run("INSERT INTO reminder_contacts (user_id,whatsapp,enabled) VALUES (?,?,1)","faculty:teacher","919000000003");
 await run("INSERT INTO reminder_contacts (user_id,whatsapp,enabled) VALUES (?,?,0)","u-optedout","");
 const insert=(id,course,b,review,access,pay,opt,phone)=>run("INSERT INTO applications (id,token_hash,slug,batch,name,email,college,created_at,amount,payment_state,review_state,class_access,form_answers,student_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",id,"hash",course,b,id,id+"@example.invalid","Test College",now,250000,pay,review,access,JSON.stringify({details:{whatsappReminders:opt,phone}}),"u-"+id);
 await insert("student",c,batch,"accepted",1,"paid",true,"9000000001");
 await insert("unpaid",c,batch,"accepted",1,"unpaid",true,"9000000002");
 await insert("applicant",c,batch,"submitted",0,"unpaid",true,"9000000004");
 await insert("noaccess",c,batch,"accepted",0,"paid",true,"9000000005");
 await insert("otherbatch",c,"batch-2","accepted",1,"paid",true,"9000000006");
 await insert("optedout",slug,batch,"accepted",1,"unpaid",true,"9000000007");
 const home=await (await req("/")).text();
 assert.match(home,/Countdown to class start/);
 assert.match(home,new RegExp(start.replace("+","\\+")+"\\+05:30"));
 await run("UPDATE course_settings SET status='closed' WHERE slug=?",c);
 assert.doesNotMatch(await (await req("/")).text(),/Countdown to class start/);
 assert.equal((await req("/jobs/class-reminders",{},"POST")).status,404);
 assert.equal((await req("/jobs/class-reminders",{Authorization:"Bearer "+cfg.REMINDER_JOB_SECRET+"wrong"},"POST")).status,404);
 const dispatch=async()=>{
  const r=await req("/jobs/class-reminders",{Authorization:"Bearer "+cfg.REMINDER_JOB_SECRET},"POST");
  assert.equal(r.status,200,await r.clone().text());
  return r.json();
 };
 assert.deepEqual(await dispatch(),{channels:{email:true,whatsapp:true},accepted:5,failed:0,skipped:0,more:false});
 assert.deepEqual(mails.flatMap(m=>m.to).sort(),["optedout@example.invalid","student@example.invalid","teacher@example.invalid"]);
 assert.match(mails.find(m=>m.to[0].startsWith("teacher@")).text,/\/faculty\?view=teaching/);
 assert.match(mails.find(m=>m.to[0].startsWith("student@")).text,/\/student\?view=courses/);
 assert.deepEqual(messages.map(m=>m.to).sort(),["919000000001","919000000003"]);
 for(const msg of messages){
  assert.equal(msg.template.name,"class_reminder");
  assert.equal(msg.template.components[0].parameters.length,3);
  assert.match(msg.template.components[0].parameters[1].text,/IST$/);
 }
 assert.deepEqual(await dispatch(),{channels:{email:true,whatsapp:true},accepted:0,failed:0,skipped:5,more:false});
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM class_reminder_dispatch WHERE status='accepted'").first()).n,5);
 const schedule=await (await req("/admin?section=classes&view=schedule&course="+c,admin)).text();
 assert.ok(schedule.replaceAll("<!-- -->","").includes("4 accepted by providers"));
}finally{await mf.dispose();}
console.log("PASS: gated job, countdown open/closed, scoped email/WhatsApp, opt-out, duplicate suppression and admin reporting.");
