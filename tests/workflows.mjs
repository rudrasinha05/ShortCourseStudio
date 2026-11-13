import { Miniflare } from "miniflare";
import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
const root="dist/server";
const mods=(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=="index.js");
const mf=new Miniflare({modulesRoot:root,modules:["index.js",...mods].map(x=>({type:"ESModule",path:root+"/"+x})),compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],bindings:{SITE_ADMIN_EMAIL:"owner@example.invalid"}});
try{
 const db=await mf.getD1Database("DB");
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort()){
   for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
 }
 const req=(path,body,headers={})=>mf.dispatchFetch("https://site.test"+path,{method:body?"POST":"GET",headers:{...(body?{"Content-Type":"application/x-www-form-urlencoded","Origin":"https://site.test"}:{}),...headers},body:body?new URLSearchParams(body).toString():undefined,redirect:"manual"});
 const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
 assert.equal((await req("/api/admin")).status,401);
 const catalog=await(await req("/")).text();
 const state=await(await req("/api/admin",null,admin)).json();
 assert.equal(state.courses.length,25);
 assert.match(catalog,/<h1>Short Course Studio<\/h1>/);
 assert.match(catalog,/class="institution-mark" aria-label="Powered by GL Bajaj"/);
 assert.doesNotMatch(catalog,/founders-heading|class="wrap founders"/i);
 assert.equal((catalog.match(/aria-label="Course summary"/g)||[]).length,25);
 assert.equal((catalog.match(/<li>5 days<\/li><li>₹2,500<\/li>/g)||[]).length,25);
 assert.match(catalog,/<li>Department of Computer Science and Engineering \(Artificial Intelligence\)<\/li><li>Career Development Center<\/li>/);
 assert.match(catalog,/GL Bajaj Institute of Technology/);
 for(const track of ["Data Analytics","Database Management Systems","Computer Networks","Computer Organisation & Architecture","Theory of Computation"]){
  assert.equal(state.courses.filter(c=>c.track===track).length,5);
 }
 assert.equal((catalog.match(/class="course" href="\/courses\//g)||[]).length,25);
 for(const c of state.courses){
  assert.match(catalog,new RegExp('href="/courses/'+c.slug+'"'));
  assert.equal(c.days.length,5);
  const detail=await req("/courses/"+c.slug);
  assert.equal(detail.status,200);
  const html=await detail.text();
  assert.equal((html.match(/class="day-no"/g)||[]).length,5);
  assert.match(html,/₹2,500/);
  assert.match(html,/Batch announcement soon/);
  assert.match(html,/Pre-apply for this course/);
  assert.match(html,/Learning objectives/);
  assert.match(html,/Prerequisites/);
  assert.match(html,/Registration details/);
 }
 assert.equal((await req("/courses/does-not-exist")).status,404);
 const c=state.courses[0],form={slug:c.slug,name:"Synthetic Applicant",email:"sample@example.invalid",college:"Example College",consent:"yes"};
 assert.match(await(await req("/apply?course="+c.slug)).text(),/action="\/forms\/apply"/);
 assert.equal((await req("/forms/apply",form,{Origin:"https://elsewhere.invalid","Sec-Fetch-Site":"cross-site"})).status,403);
 assert.match((await req("/forms/apply",{...form,consent:""})).headers.get("Location"),/error=invalid/);
 const result=await req("/forms/apply",form);
 assert.equal(result.status,303);
 const path=result.headers.get("Location"),set=result.headers.get("Set-Cookie");
 assert.match(set,/HttpOnly/);assert.match(set,/; Secure/);
 const cookie=set.split(";")[0], [id,code]=cookie.split("=")[1].split(".");
 assert.match(path,new RegExp(id));assert.ok(!path.includes(code));
 assert.match(await(await req(path,null,{Cookie:cookie})).text(),/Application received/);
 assert.doesNotMatch(await(await req(path)).text(),/Application received/);
 assert.match((await req("/forms/apply",form)).headers.get("Location"),/error=duplicate/);
 assert.match((await req("/forms/status",{id,code:"0".repeat(64)})).headers.get("Location"),/error=notfound/);
 assert.equal((await req("/forms/status",{id,code})).headers.get("Location"),path);
 const change={id,slug:c.slug,review:"accepted",page:"1"};
 assert.equal((await req("/forms/admin/review",change)).status,403);
 assert.doesNotMatch(await(await req("/admin")).text(),/Synthetic Applicant/);
 assert.match(await(await req("/admin",null,admin)).text(),/Synthetic Applicant/);
 assert.match((await req("/forms/admin/review",change,admin)).headers.get("Location"),/message=reviewed/);
 const checked=await(await req(path,null,{Cookie:cookie})).text();
 assert.match(checked,/Accepted/);assert.match(checked,/Not paid/);assert.doesNotMatch(checked,/Pay course fee/);
 const csvPath="/forms/admin/export?filter="+c.slug;
 assert.equal((await req(csvPath)).status,403);
 const csv=await req(csvPath,null,admin);
 assert.match(csv.headers.get("Content-Type"),/text\/csv/);
 assert.match(await csv.text(),/Synthetic Applicant.*accepted.*unpaid/);
 const edit={slug:c.slug,title:c.title,blurb:c.blurb,outcome:c.outcome,batch:c.batch,status:"open",...Object.fromEntries(c.days.flatMap(([topic,practical],i)=>[["topic"+i,topic],["practical"+i,practical]]))};
 assert.match((await req("/forms/admin/course",edit,admin)).headers.get("Location"),/message=schedule/);
 assert.match((await req("/forms/admin/course",{...edit,schedule:"1–5 December",mode:"Online"},admin)).headers.get("Location"),/message=saved/);
 const announced=await(await req("/courses/"+c.slug)).text();
 assert.match(announced,/Applications open/);assert.match(announced,/1–5 December/);
 assert.match((await req("/forms/admin/course",{...edit,status:"closed"},admin)).headers.get("Location"),/message=saved/);
 assert.match((await req("/forms/apply",{...form,email:"other@example.invalid"})).headers.get("Location"),/error=closed/);
 console.log("PASS: 25 native course links across five tracks, 5-day syllabi, form validation, stored pre-application, private receipt, duplicate prevention, recovered status, protected admin review and CSV, saved batch edits, and disabled payment.");
}finally{await mf.dispose();}
