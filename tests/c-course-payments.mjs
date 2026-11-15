import { Miniflare, createFetchMock } from "miniflare";
import { createHmac } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";

const root="dist/server",slug="c-by-horesh-sir",batch="batch-1",total=250000;
const order="order_Synthetic01",payment="pay_Synthetic01",secret="synthetic-key",webhookSecret="synthetic-webhook";
const replay="https://recordings.example.invalid/c-course";
const hmac=(value,key)=>createHmac("sha256",key).update(value).digest("hex");
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=="index.js")].map(x=>({type:"ESModule",path:root+"/"+x}));
const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
for(const mode of ["test","live"]){
 const fetchMock=createFetchMock();
 fetchMock.disableNetConnect();
 const provider=fetchMock.get("https://api.razorpay.com");
 const json={"content-type":"application/json"};
 const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],fetchMock,bindings:{SITE_ADMIN_EMAIL:"owner@example.invalid",PAYMENTS_MODE:mode,RAZORPAY_KEY_ID:"rzp_"+mode+"_synthetic",RAZORPAY_KEY_SECRET:secret,RAZORPAY_WEBHOOK_SECRET:webhookSecret}});
 try{
  const db=await mf.getD1Database("DB");
  for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort()){
   for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
  }
  await db.prepare("INSERT INTO course_settings (slug, batch, status, schedule, mode) VALUES (?,?,?,?,?)").bind(slug,batch,"open","26 November 2026, 8 pm IST","Online").run();
  await db.prepare("INSERT INTO class_sessions (slug,batch,day,replay_url) VALUES (?,?,1,?)").bind(slug,batch,replay).run();
  const request=(path,options={})=>mf.dispatchFetch("https://site.test"+path,{redirect:"manual",...options});
  const post=(path,body)=>request(path,{method:"POST",headers:json,body:JSON.stringify(body)});
  const created=await post("/api/applications",{slug:"c-arrays-and-strings",name:"Synthetic Student",email:"c-pay@example.invalid",college:"Test College",consent:true});
  assert.equal(created.status,201);
  const {id,token,paymentMode}=await created.json(),ref={id,token};
  assert.equal(paymentMode,mode);
  const application=()=>db.prepare("SELECT slug,amount,order_id,payment_state,review_state,class_access FROM applications WHERE id=?").bind(id).first();
  assert.equal((await application()).amount,total);
  // Verify a legacy zero-amount C pre-application can use the same reference.
  if(mode==="live")await db.prepare("UPDATE applications SET amount=0 WHERE id=?").bind(id).run();
  const cookie="scs_application="+id+"."+token,billingPath="/apply/billing?ref="+id,paymentPath="/apply/payment?ref="+id;
  const hasCookie={headers:{Cookie:cookie}};
  const form={ref:id,name:"Synthetic Student",addressLine:"123 Test Street",addressExtra:"",city:"Greater Noida",state:"Uttar Pradesh",pin:"201310"};
  const bill=(values,auth=hasCookie.headers)=>request("/apply/billing/save",{method:"POST",headers:{...auth,"Content-Type":"application/x-www-form-urlencoded",Origin:"https://site.test"},body:new URLSearchParams(values)});
  assert.equal((await request(paymentPath,hasCookie)).headers.get("Location"),billingPath);
  assert.equal((await request(paymentPath)).headers.get("Location"),"/application-status?ref="+id);
  assert.equal((await post("/api/payments/order",ref)).status,409);
  assert.equal((await post("/api/payments/reconcile",{id,token:"0".repeat(64)})).status,404);
  assert.equal((await (await post("/api/payments/reconcile",ref)).json()).paymentState,"unpaid");
  assert.equal((await bill(form,{})).headers.get("Location"),"/application-status?ref="+id);
  assert.equal((await bill({...form,pin:"0123"})).headers.get("Location"),billingPath+"&error=invalid");
  assert.equal((await bill(form)).headers.get("Location"),paymentPath);
  const paymentPage=await request(paymentPath,hasCookie);
  assert.equal(paymentPage.status,200);
  assert.equal(paymentPage.headers.get("Cache-Control"),"private, no-store");
  const methods=await paymentPage.text();
  for(const method of ["upi","card","netbanking","wallet"])assert.ok(methods.includes('value="'+method+'"'));
  assert.ok(methods.includes("123 Test Street")&&methods.includes("₹2,500"));
  assert.ok(!(await (await request("/apply?ref="+id,hasCookie)).text()).includes("123 Test Street"));
  assert.equal((await bill({...form,addressLine:"456 Edited Test Street"})).headers.get("Location"),paymentPath);
  assert.ok((await (await request(paymentPath,hasCookie)).text()).includes("456 Edited Test Street"));
  provider.intercept({path:"/v1/orders",method:"POST"}).reply(200,{id:order,amount:total,currency:"INR",status:"created"},{headers:json});
  const ordered=await post("/api/payments/order",{...ref,amount:1});
  assert.equal(ordered.status,200,await ordered.clone().text());
  assert.equal((await ordered.json()).amount,total);
  assert.equal((await application()).amount,total);
  assert.equal((await(await post("/api/payments/order",ref)).json()).orderId,order);
  const check={...ref,razorpay_order_id:order,razorpay_payment_id:payment,razorpay_signature:hmac(order+"|"+payment,secret)};
  assert.equal((await post("/api/payments/verify",{...check,razorpay_signature:"0".repeat(64)})).status,400);
  const details={id:payment,order_id:order,amount:total,currency:"INR"};
  provider.intercept({path:"/v1/payments/"+payment,method:"GET"}).reply(200,{...details,amount:1,status:"captured"},{headers:json});
  assert.equal((await post("/api/payments/verify",check)).status,400);
  provider.intercept({path:"/v1/payments/"+payment,method:"GET"}).reply(200,{...details,status:"authorized"},{headers:json});
  assert.equal((await post("/api/payments/verify",check)).status,202);
  assert.equal((await application()).class_access,0);
  const paymentsList="/v1/orders/"+order+"/payments";
  provider.intercept({path:paymentsList,method:"GET"}).reply(200,{items:[{...details,status:"failed"}]},{headers:json});
  assert.equal((await (await post("/api/payments/reconcile",ref)).json()).paymentState,"unpaid");
  assert.equal((await application()).class_access,0);
  const orderMode=()=>db.prepare("SELECT payment_order_mode FROM applications WHERE id=?").bind(id).first("payment_order_mode");
  assert.equal(await orderMode(),mode);
  await db.prepare("UPDATE applications SET payment_order_mode=? WHERE id=?").bind(mode==="live"?"test":"live",id).run();
  assert.equal((await post("/api/payments/reconcile",ref)).status,409);
  assert.equal((await post("/api/payments/order",ref)).status,409);
  await db.prepare("UPDATE applications SET payment_order_mode=? WHERE id=?").bind(mode,id).run();
  provider.intercept({path:paymentsList,method:"GET"}).reply(200,{items:[{...details,amount:1,status:"captured"},{...details,status:"authorized"}]},{headers:json});
  assert.equal((await (await post("/api/payments/reconcile",ref)).json()).paymentState,"pending");
  assert.equal((await application()).class_access,0);
  const webhook=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{...details,status:"captured"}}}});
  const pushCapture=(sig=hmac(webhook,webhookSecret))=>request("/api/payments/webhook",{method:"POST",headers:{...json,"x-razorpay-signature":sig},body:webhook});
  assert.equal((await pushCapture("0".repeat(64))).status,401);
  if(mode==="test"){
   provider.intercept({path:"/v1/payments/"+payment,method:"GET"}).reply(200,{...details,status:"captured"},{headers:json});
   assert.equal((await post("/api/payments/verify",check)).status,200);
  }else{
   provider.intercept({path:paymentsList,method:"GET"}).reply(200,{items:[{...details,status:"captured"}]},{headers:json});
   assert.equal((await (await post("/api/payments/reconcile",ref)).json()).paymentState,"paid");
   assert.equal((await pushCapture()).status,200);
  }
  assert.equal((await request(paymentPath,hasCookie)).headers.get("Location"),"/apply?ref="+id);
  assert.equal((await bill({...form,addressLine:"Should not overwrite"})).headers.get("Location"),"/apply?ref="+id);
  assert.equal((await db.prepare("SELECT address_line FROM application_billing WHERE application_id=?").bind(id).first()).address_line,"456 Edited Test Street");
  const row=await application(),live=mode==="live";
  assert.equal(row.slug,slug);
  assert.equal(row.payment_state,live?"paid":"test_paid");
  assert.equal(row.review_state,live?"accepted":"submitted");
  assert.equal(row.class_access,live?1:0);
  const status=await(await post("/api/applications/status",ref)).json();
  assert.equal(status.enrolled,live);
  const receipt=await(await request("/apply?ref="+id,{headers:{Cookie:"scs_application="+id+"."+token}})).text();
  assert.equal(receipt.includes("Enrollment confirmed"),live);
  assert.equal(receipt.includes(replay),live);
  if(live){
   const revoke=await request("/forms/admin/class-access",{method:"POST",headers:{...admin,"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({id,slug,grant:"no"})});
   assert.match(revoke.headers.get("Location"),/access-saved/);
   assert.equal((await pushCapture()).status,200);
   assert.equal((await application()).class_access,0);
  }
 }finally{await mf.dispose();await fetchMock.close();}
}
console.log("PASS: mocked Razorpay order, fixed amount, wrong signature/amount, failed payment, pending capture, verified enrollment, replay access, duplicate capture after revocation, status recovery and test/live isolation.");
