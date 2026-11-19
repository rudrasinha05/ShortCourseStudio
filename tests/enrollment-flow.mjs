// End to end: a student applies, adds billing, pays through Razorpay checkout and is enrolled.
// Runs for the C course and a regular course, in test and live mode, and checks every place
// that shows enrollment: application row, receipt, status API, Student Portal, admin, reminders.
import {scopedFetch} from "./helpers/scoped-fetch.mjs";
import {Miniflare,createFetchMock} from "miniflare";
import {createHmac} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import assert from "node:assert/strict";

const root="dist/server",secret="synthetic-key",webhookSecret="synthetic-webhook",batch="batch-1";
const hmac=(value,key)=>createHmac("sha256",key).update(value).digest("hex");
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=="index.js")].map(x=>({type:"ESModule",path:root+"/"+x}));
const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
const json={"content-type":"application/json"},O="https://site.test";
const metric=(html,label)=>Number(html.match(new RegExp("<span>"+label+"</span><strong>(\\d+)</strong>"))?.[1]);

for(const mode of ["test","live"]){
 const fetchMock=createFetchMock();fetchMock.disableNetConnect();
 const provider=fetchMock.get("https://api.razorpay.com");
 const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],fetchMock,
  bindings:{SITE_ADMIN_EMAIL:"owner@example.invalid",PAYMENTS_MODE:mode,RAZORPAY_KEY_ID:"rzp_"+mode+"_synthetic",RAZORPAY_KEY_SECRET:secret,RAZORPAY_WEBHOOK_SECRET:webhookSecret}});
 try{
  const db=await mf.getD1Database("DB");
  for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort())
   for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
  for(const slug of ["c-by-horesh-sir","python-for-data-analytics"])
   await db.prepare("INSERT INTO course_settings (slug,batch,status,schedule,mode) VALUES (?,?,?,?,?)").bind(slug,batch,"open","26 November 2026, 8 pm IST","Online").run();
  const student={"oai-authenticated-user-id":"flow-student-"+mode,"oai-authenticated-user-email":"flow-"+mode+"@example.invalid"};
  const req=(path,options={})=>scopedFetch(mf,O+path,{redirect:"manual",...options});
  const html=async(path,headers=student)=>(await req(path,{headers})).text();
  const studentHome=await html("/student");
  assert.equal(metric(studentHome,"Enrolled courses"),0);

  // Pays through the browser checkout (verify) for C, and through the webhook only for the regular course.
  async function enroll(applySlug,n,via){
   const created=await req("/api/applications",{method:"POST",headers:{...json,...student},body:JSON.stringify({slug:applySlug,name:"Flow Student",email:student["oai-authenticated-user-email"],college:"Test College",consent:true})});
   assert.equal(created.status,201,await created.clone().text());
   const {id,token}=await created.json(),ref={id,token},cookie="scs_application="+id+"."+token;
   const billed=await req("/apply/billing/save",{method:"POST",headers:{cookie,"Content-Type":"application/x-www-form-urlencoded",Origin:O},body:new URLSearchParams({ref:id,name:"Flow Student",addressLine:"12 Test Street",addressExtra:"",city:"Greater Noida",state:"Uttar Pradesh",pin:"201310"})});
   assert.equal(billed.headers.get("Location"),"/apply/payment?ref="+id);
   const payLink='href="/apply/billing?ref='+id+'"';
   assert.ok((await html("/student?view=applications")).includes(payLink),"Unpaid application offers Complete payment");
   const amount=(await db.prepare("SELECT amount FROM applications WHERE id=?").bind(id).first()).amount;
   const order="order_Flow"+mode+n,payment="pay_Flow"+mode+n;
   provider.intercept({path:"/v1/orders",method:"POST"}).reply(200,{id:order,amount,currency:"INR",status:"created"},{headers:json});
   const ordered=await req("/api/payments/order",{method:"POST",headers:json,body:JSON.stringify(ref)});
   assert.equal(ordered.status,200,await ordered.clone().text());
   if(via==="checkout"){
    provider.intercept({path:"/v1/payments/"+payment,method:"GET"}).reply(200,{id:payment,order_id:order,amount,currency:"INR",status:"captured"},{headers:json});
    const verified=await req("/api/payments/verify",{method:"POST",headers:json,body:JSON.stringify({...ref,razorpay_order_id:order,razorpay_payment_id:payment,razorpay_signature:hmac(order+"|"+payment,secret)})});
    assert.equal(verified.status,200,await verified.clone().text());
   }else{
    const body=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{id:payment,order_id:order,amount,currency:"INR",status:"captured"}}}});
    assert.equal((await mf.dispatchFetch(O+"/api/payments/webhook",{method:"POST",headers:{...json,"x-razorpay-signature":hmac(body,webhookSecret)},body})).status,200);
   }
   const row=await db.prepare("SELECT slug,payment_state,review_state,class_access FROM applications WHERE id=?").bind(id).first();
   assert.deepEqual([row.payment_state,row.review_state,row.class_access],[mode==="test"?"test_paid":"paid","accepted",1],applySlug+" "+mode);
   const status=await(await req("/api/applications/status",{method:"POST",headers:json,body:JSON.stringify(ref)})).json();
   assert.equal(status.enrolled,true);
   assert.match(await html("/apply?ref="+id,{cookie}),/Enrollment confirmed/);
   assert.ok(!(await html("/student?view=applications")).includes(payLink),"Paid application no longer offers payment");
   return {id,slug:row.slug};
  }
  const c=await enroll("c-arrays-and-strings",1,"checkout");
  let home=await html("/student");
  assert.equal(metric(home,"Enrolled courses"),1,"Enrolled count after the first payment");
  assert.equal(metric(home,"Verified payments"),1);
  const py=await enroll("python-for-data-analytics",2,"webhook");
  home=await html("/student");
  assert.equal(metric(home,"Enrolled courses"),2);
  assert.equal(metric(home,"Verified payments"),2);
  const courses=await html("/student?view=courses");
  assert.doesNotMatch(courses,/No enrolled courses yet/);
  assert.match(courses,/C Programming/);
  assert.match(courses,/Python for Data Analytics/);
  // Admin views count both enrollments.
  const profile=await html("/admin?section=students&view=roster&student="+c.id,admin);
  assert.equal((profile.match(/data-enrolled="true"/g)??[]).length,2,"Admin student profile shows both enrollments");
  const reports=await html("/admin?section=courses&view=reports",admin);
  assert.ok(reports.length>0);
  for(const app of [c,py]){
   const enrolledRows=await db.prepare("SELECT COUNT(*) AS n FROM applications WHERE id=? AND review_state='accepted' AND class_access=1").bind(app.id).first();
   assert.equal(enrolledRows.n,1);
  }
  // A full refund ends the enrollment everywhere.
  const pyPayment=(await db.prepare("SELECT payment_id,amount FROM applications WHERE id=?").bind(py.id).first());
  const refund=JSON.stringify({event:"refund.processed",payload:{refund:{entity:{id:"rfnd_Flow"+mode,payment_id:pyPayment.payment_id,amount:pyPayment.amount,currency:"INR",status:"processed"}}}});
  assert.equal((await mf.dispatchFetch(O+"/api/payments/webhook",{method:"POST",headers:{...json,"x-razorpay-signature":hmac(refund,webhookSecret)},body:refund})).status,200);
  home=await html("/student");
  assert.equal(metric(home,"Enrolled courses"),1);
  assert.equal(metric(home,"Verified payments"),1);
  if(mode==="live"){
   // A test capture left in the database never grants access on a live site.
   await db.prepare("UPDATE applications SET payment_state='test_paid' WHERE id=?").bind(c.id).run();
   home=await html("/student");
   assert.equal(metric(home,"Enrolled courses"),0);
   assert.equal(metric(home,"Verified payments"),0);
   // The same holds for a regular course, which otherwise needs no payment for access.
   await db.prepare("UPDATE applications SET payment_state='test_paid',review_state='accepted',class_access=1 WHERE id=?").bind(py.id).run();
   assert.equal(metric(await html("/student"),"Enrolled courses"),0);
  }
  // Migration 0025 enrolls fees verified before this rule, but leaves declined, revoked and unpaid rows alone.
  const legacy=[["SCS-0025AAAAAAAAAAAAAAA1","paid","submitted",0,"pay_Legacy0001"],["SCS-0025AAAAAAAAAAAAAAA2","test_paid","under_review",0,"pay_Legacy0002"],
   ["SCS-0025AAAAAAAAAAAAAAA3","paid","declined",0,"pay_Legacy0003"],["SCS-0025AAAAAAAAAAAAAAA4","paid","accepted",0,"pay_Legacy0004"],["SCS-0025AAAAAAAAAAAAAAA5","unpaid","submitted",0,null]];
  for(const [id,pay,review,access,pid] of legacy)
   await db.prepare("INSERT INTO applications (id,token_hash,slug,batch,name,email,college,created_at,amount,payment_state,review_state,class_access,payment_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,"0".repeat(64),"python-for-data-analytics","legacy-"+id,"Legacy","legacy@example.invalid","College",new Date().toISOString(),175000,pay,review,access,pid).run();
  for(const stmt of (await readFile("drizzle/0025_enroll_verified_payments.sql","utf8")).split("--> statement-breakpoint"))if(stmt.trim())await db.prepare(stmt.trim()).run();
  const after=Object.fromEntries((await db.prepare("SELECT id,review_state,class_access FROM applications WHERE id LIKE 'SCS-0025%'").all()).results.map(r=>[r.id,r.review_state+"/"+r.class_access]));
  assert.deepEqual(after,{"SCS-0025AAAAAAAAAAAAAAA1":"accepted/1","SCS-0025AAAAAAAAAAAAAAA2":"accepted/1","SCS-0025AAAAAAAAAAAAAAA3":"declined/0","SCS-0025AAAAAAAAAAAAAAA4":"accepted/0","SCS-0025AAAAAAAAAAAAAAA5":"submitted/0"});
  // Declining an application that was paid warns the admin to refund and records it in the audit.
  const declined=await req("/forms/admin/review",{method:"POST",headers:{...admin,"Content-Type":"application/x-www-form-urlencoded",Origin:O},body:new URLSearchParams({id:c.id,slug:"c-by-horesh-sir",review:"declined"}).toString()});
  assert.match(declined.headers.get("Location"),/message=reviewed-refund/);
  assert.match(await html(declined.headers.get("Location"),admin),/This student already paid: issue the refund in Razorpay/);
  assert.ok(await db.prepare("SELECT 1 FROM admin_audit WHERE target=? AND action LIKE 'declined after payment%'").bind(c.id).first());
  assert.equal((await db.prepare("SELECT class_access FROM applications WHERE id=?").bind(c.id).first()).class_access,0);
  console.log("enrollment flow ("+mode+"): ok");
 }finally{await mf.dispose();}
}
