// Webhook audit, refunds, offline payments, trimmed Razorpay settings and policy pages.
import {scopedFetch} from "./helpers/scoped-fetch.mjs";
import {Miniflare} from "miniflare";
import {createHash,createHmac} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import assert from "node:assert/strict";

const root="dist/server",webhookSecret="synthetic-webhook";
const modules=["index.js",...(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=="index.js")].map(x=>({type:"ESModule",path:root+"/"+x}));
const sha=(s)=>createHash("sha256").update(s).digest("hex");
const hmac=(value)=>createHmac("sha256",webhookSecret).update(value).digest("hex");
const admin={"oai-authenticated-user-id":"test-owner","oai-authenticated-user-email":"owner@example.invalid"};
// Values pasted with stray whitespace must still enable test mode.
const mf=new Miniflare({modulesRoot:root,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],
 bindings:{SITE_ADMIN_EMAIL:"owner@example.invalid",PAYMENTS_MODE:"test\n",RAZORPAY_KEY_ID:" rzp_test_synthetic\n",RAZORPAY_KEY_SECRET:"synthetic-key \n",RAZORPAY_WEBHOOK_SECRET:webhookSecret+"\n"}});
try{
 const db=await mf.getD1Database("DB");
 for(const f of (await readdir("drizzle")).filter(x=>x.endsWith(".sql")).sort())
  for(const s of (await readFile("drizzle/"+f,"utf8")).split("--> statement-breakpoint"))if(s.trim())await db.prepare(s.trim()).run();
 const O="https://site.test",json={"content-type":"application/json"};
 const token="ab".repeat(32);
 const insert=(id,slug,amount,extra={})=>{
  const cols={id,token_hash:sha(token),slug,batch:"batch-1",name:"Gap Tester",email:id.toLowerCase()+"@example.invalid",college:"Test College",created_at:new Date().toISOString(),amount,...extra};
  return db.prepare(`INSERT INTO applications (${Object.keys(cols).join(",")}) VALUES (${Object.keys(cols).map(()=>"?").join(",")})`).bind(...Object.values(cols)).run();
 };
 const row=(id)=>db.prepare("SELECT amount,payment_state,payment_id,class_access FROM applications WHERE id=?").bind(id).first();
 const audits=async()=>(await db.prepare("SELECT action,target FROM admin_audit ORDER BY id").all()).results;
 const hook=(body,sig)=>{const raw=JSON.stringify(body);return mf.dispatchFetch(O+"/api/payments/webhook",{method:"POST",headers:{...json,"x-razorpay-signature":sig??hmac(raw)},body:raw});};
 const op=(action,data)=>scopedFetch(mf,O+"/forms/admin/control/"+action,{method:"POST",redirect:"manual",headers:{...admin,"Content-Type":"application/x-www-form-urlencoded",Origin:O},body:new URLSearchParams(data).toString()});

 // Trimmed settings: payment mode is detected and the webhook secret still verifies.
 const paid="SCS-AAAAAAAAAAAAAAAAAAA1";
 await insert(paid,"python-for-data-analytics",175050,{order_id:"order_GapPaid01",payment_order_mode:"test"});
 const status=await mf.dispatchFetch(O+"/api/applications/status",{method:"POST",headers:json,body:JSON.stringify({id:paid,token})});
 assert.equal((await status.json()).paymentMode,"test");
 assert.equal((await hook({event:"payment.captured"},"0".repeat(64))).status,401);

 // A captured payment that matches no application is logged, not silently dropped.
 const unknown={event:"payment.captured",payload:{payment:{entity:{id:"pay_GapUnknown1",order_id:"order_GapMissing1",amount:175050,currency:"INR",status:"captured"}}}};
 assert.equal((await hook(unknown)).status,200);
 assert.ok((await audits()).some(a=>a.action.includes("unmatched captured payment pay_GapUnknown1")));
 // So is an amount mismatch on a known order.
 const wrongAmount={event:"payment.captured",payload:{payment:{entity:{id:"pay_GapWrong01",order_id:"order_GapPaid01",amount:100,currency:"INR",status:"captured"}}}};
 assert.equal((await hook(wrongAmount)).status,200);
 assert.equal((await row(paid)).payment_state,"unpaid");
 assert.ok((await audits()).some(a=>a.action.includes("pay_GapWrong01")&&a.target===paid));

 // A matching capture marks it paid; a partial refund is only logged; a full refund ends access.
 const capture={event:"payment.captured",payload:{payment:{entity:{id:"pay_GapPaid001",order_id:"order_GapPaid01",amount:175050,currency:"INR",status:"captured"}}}};
 assert.equal((await hook(capture)).status,200);
 assert.equal((await row(paid)).payment_state,"test_paid");
 await db.prepare("UPDATE applications SET class_access=1,review_state='accepted' WHERE id=?").bind(paid).run();
 const refund=(amount)=>({event:"refund.processed",payload:{refund:{entity:{id:"rfnd_Gap"+amount,payment_id:"pay_GapPaid001",amount,currency:"INR",status:"processed"}}}});
 assert.equal((await hook(refund(5000))).status,200);
 assert.equal((await row(paid)).payment_state,"test_paid");
 assert.ok((await audits()).some(a=>a.action.startsWith("partial refund")&&a.target===paid));
 assert.equal((await hook(refund(175050))).status,200);
 const refunded=await row(paid);
 assert.equal(refunded.payment_state,"refunded");
 assert.equal(refunded.class_access,0);
 // Repeated refund callbacks change nothing more.
 assert.equal((await hook(refund(175050))).status,200);
 assert.equal((await audits()).filter(a=>a.action.startsWith("full refund")).length,1);
 const receipt=await (await mf.dispatchFetch(O+"/apply?ref="+paid,{headers:{cookie:"scs_application="+paid+"."+token}})).text();
 assert.match(receipt,/refunded to the original payment method/);

 // Offline payment after an unused Razorpay order.
 const ordered="SCS-AAAAAAAAAAAAAAAAAAA2";
 await insert(ordered,"python-for-data-analytics",175050,{order_id:"order_GapUnused1",payment_order_mode:"test"});
 assert.match((await op("offline-payment",{slug:"python-for-data-analytics",id:ordered,reference:"CASH-0001",amount:"1750.50"})).headers.get("location"),/controlMessage=saved/);
 assert.equal((await row(ordered)).payment_state,"paid");
 assert.ok((await audits()).some(a=>a.action.includes("online order order_GapUnused1 left unused")));
 // A later online capture for that order is logged for a refund, not applied.
 const late={event:"payment.captured",payload:{payment:{entity:{id:"pay_GapLate001",order_id:"order_GapUnused1",amount:175050,currency:"INR",status:"captured"}}}};
 assert.equal((await hook(late)).status,409);
 assert.equal((await row(ordered)).payment_id,"offline:CASH-0001");
 assert.ok((await audits()).some(a=>a.action.includes("pay_GapLate001 could not be applied")));

 // Offline payment for a legacy zero-amount C pre-application uses the current full fee.
 const legacy="SCS-AAAAAAAAAAAAAAAAAAA3";
 await insert(legacy,"c-by-horesh-sir",0);
 assert.match((await op("offline-payment",{slug:"c-by-horesh-sir",id:legacy,reference:"CASH-0002",amount:"0.50"})).headers.get("location"),/controlMessage=invalid/);
 assert.match((await op("offline-payment",{slug:"c-by-horesh-sir",id:legacy,reference:"CASH-0002",amount:"2500"})).headers.get("location"),/controlMessage=saved/);
 const legacyRow=await row(legacy);
 assert.equal(legacyRow.payment_state,"paid");
 assert.equal(legacyRow.amount,250000);

 // Policy pages exist, are linked from the footer and use admin-written text.
 const page=async(path)=>{const r=await mf.dispatchFetch(O+path);assert.equal(r.status,200,path);return r.text();};
 const footer=await page("/about");
 for(const link of ["/terms","/refund-policy","/contact","/privacy"])assert.match(footer,new RegExp('href="'+link+'"'));
 assert.match(await page("/refund-policy"),/has not published the refund terms/);
 assert.match(await page("/terms"),/processed by Razorpay/);
 const content={headline:"",intro:"",catalogue:"",brochure:"",faq:"",contact:"support@example.invalid",slides:"",recommendations:"",tagline:"",studioLogo:"",instituteLogo:"",cta:"",
  phone:"+91 98765 43210",address:"Plot 2, Knowledge Park III\nGreater Noida",terms:"Custom term one.\n\nCustom term two.",refund:"Full refund before Day 1."};
 assert.match((await op("content",content)).headers.get("location"),/controlMessage=saved/);
 assert.match(await page("/refund-policy"),/Full refund before Day 1\./);
 const terms=await page("/terms");
 assert.match(terms,/<p class="policy-paragraph">Custom term one\.<\/p><p class="policy-paragraph">Custom term two\.<\/p>/);
 const contact=await page("/contact");
 assert.match(contact,/mailto:support@example.invalid/);
 assert.match(contact,/href="tel:\+919876543210"/);
 assert.match(contact,/Knowledge Park III/);
 assert.match((await op("content",{...content,phone:"call me"})).headers.get("location"),/controlMessage=invalid/);
 // Content saved before these fields existed must still load.
 await db.prepare("UPDATE admin_settings SET value=? WHERE key='content'").bind(JSON.stringify({headline:"",intro:"",catalogue:"",brochure:"",faq:"",contact:"old@example.invalid",slides:[],recommendations:[],tagline:"",studioLogo:"",instituteLogo:"",cta:""})).run();
 assert.match(await page("/contact"),/old@example.invalid/);
 console.log("payment gaps and policy pages: ok");
}finally{await mf.dispose();}
