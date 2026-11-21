import {Miniflare} from "miniflare";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
const root="dist/server";
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)&&p!=="index.js")].map(p=>({type:"ESModule",path:root+"/"+p}));
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],bindings:{SITE_ADMIN_EMAIL:"admin@example.invalid"}});
const actor=(id,email)=>({"oai-authenticated-user-id":id,"oai-authenticated-user-email":email});
const admin=actor("admin","admin@example.invalid"), student=actor("student","roster@example.invalid");
const req=(path,headers=admin)=>mf.dispatchFetch("https://site.test"+path,{headers,redirect:"manual"});
const get=async(path,headers)=> (await req(path,headers)).text();
const list="/admin?section=students";
const ref=(n)=>"SCS-"+n.toString(16).toUpperCase().padStart(20,"0");
try{
 const db=await mf.getD1Database("DB");
 for(const file of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort()){
  for(const s of (await readFile("drizzle/"+file,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
 }
 const record=(n,email,slug,status,paid,access,extras={})=>db.prepare(`INSERT INTO applications(id,token_hash,slug,batch,name,email,college,created_at,amount,review_state,payment_state,class_access,form_answers,student_user_id)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(ref(n),"private-hash",slug,"batch-1",extras.name??"Asha Example",email,"Sample College",new Date(Date.UTC(2026,10,1)+n*86400000).toISOString(),250000,status,paid,access,JSON.stringify(extras.form??{}),extras.account??null).run();
 await record(1,"roster@example.invalid","c-by-horesh-sir","accepted","unpaid",1,{form:{details:{phone:"+91 90000 00000",programme:"B.Tech CSE",year:"3",preferences:{interests:["Data Analytics"],skills:"Python",level:"foundations"}}}});
 await record(2,"ROSTER@example.invalid","computer-networks","accepted","paid",1,{account:"student"});
 await record(3,"roster@example.invalid","dbms","under_review","unpaid",0);
 await record(4,"other@example.invalid","coa","declined","unpaid",0);
 const page=await req(list);
 assert.equal(page.headers.get("Cache-Control"),"private, no-store");
 const table=await page.text();
 assert.match(table,/Student directory table/);
 assert.equal((table.match(/>Asha Example<svg/g)??[]).length,2);
 assert.match(table,/Networking Fundamentals/);
 const url=list+"&view=roster&student="+ref(3);
 const profile=await get(url);
 assert.match(profile,/Student course history/);
 assert.match(profile,/B.Tech CSE/);
 assert.match(profile,/\+91 90000 00000/);
 assert.match(profile,/Suggested courses to share/);
 assert.match(profile,/Interest: Data Analytics/);
 assert.match(profile,/Connects with your skills: Python/);
 const courseHistory=profile.split('aria-label="Student course history"')[1].split("</table>")[0];
 assert.match(courseHistory,/C Programming[\s\S]*?Not paid[\s\S]*?Not confirmed/);
 assert.match(courseHistory,/Networking Fundamentals[\s\S]*?Paid[\s\S]*?>Enrolled</);
 assert.match(courseHistory,/Under review/);
 assert.doesNotMatch(profile,/other@example\.invalid|private-hash/);
 assert.match(await get(list+"&studentQ=90000"),/roster@example\.invalid/);
 assert.doesNotMatch(await get(list+"&studentStatus=enrolled"),/other@example\.invalid/);
 assert.match(await get(list+"&studentCourse=dbms"),/roster@example\.invalid/);
 assert.match(await get(list+"&view=applications&q="+ref(1)),/Application details, notes, payments/);
 assert.doesNotMatch(await get(url,student),/\+91 90000 00000|Student course history/);
 assert.match(await get(url,student),/Admin Portal is restricted/);
 assert.match(await get(list+"&view=roster&student="+ref(999)),/Student profile not found/);
 for(let n=10;n<37;n++)await record(n,"test"+n+"@example.invalid","coa","submitted","unpaid",0,{name:"Student "+n});
 const first=await get(list),second=await get(list+"&studentPage=2");
 assert.match(first,/Next page/);assert.match(second,/Previous page/);assert.match(second,/roster@example\.invalid/);
 console.log("PASS: grouped directory, profile and history, guarded access, accurate enrollment, suggestions, filters and pagination.");
}finally{await mf.dispose();}
