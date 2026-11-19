import {facultyIdentity} from "@/lib/faculty-auth";
import {checkoutStatus,getBillingAddress} from "@/lib/billing";
import {audit,actorFor} from "@/lib/admin-controls";
import {proposalDocument,requestIdentity} from "@/lib/portals";
import { z } from "zod";
import { cDayNumber,CRASH_SLUG } from "@/lib/courses";
import {cfg,db,getCourses,paymentMode,razorpay,authorizedAdmin,secureEqual,signature,getApplication,getOwnedApplication,gateway,markPaid,markRefunded,type Application} from "@/lib/enrollment";
import { createApplication,saveCourse } from "@/lib/form-workflows";
export const dynamic = "force-dynamic";
const ref=z.object({id:z.string().max(30),token:z.string().max(80).optional()});
const orderPattern=/^order_[A-Za-z0-9]{5,40}$/,paymentPattern=/^pay_[A-Za-z0-9]{5,40}$/;
// Shape of a Razorpay webhook body. Every field is checked at runtime before use.
type RazorpayEntity={id?:unknown;status?:unknown;currency?:unknown;order_id?:unknown;payment_id?:unknown;amount?:unknown};
type PaymentWebhook={event?:unknown;payload?:{payment?:{entity?:RazorpayEntity};refund?:{entity?:RazorpayEntity}}};
type OrderPayments={items?:{id:string;order_id:string;amount:number;currency:string;status:string}[]};
const verify=ref.extend({razorpay_order_id:z.string().regex(orderPattern),razorpay_payment_id:z.string().regex(paymentPattern),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/)});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const fail=(error:string,status:number)=>reply({error},status);
async function rawBody(req:Request){
 const reader=req.body?.getReader();if(!reader)return "";
 const decoder=new TextDecoder();let s="",size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>40000){await reader.cancel();throw new Error("body");}s+=decoder.decode(part.value,{stream:true});}return s+decoder.decode();}
 finally{reader.releaseLock();}
}
export async function GET(req:Request){
 const url=new URL(req.url),path=url.pathname;
 if(path==="/api/faculty-syllabus"){
  const file=await proposalDocument(url.searchParams.get("id")??"",await facultyIdentity(req.headers),await authorizedAdmin(req));
  if(!file)return fail("Syllabus not found.",404);
  return new Response(file.body,{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=syllabus.pdf","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }
 if(path!=="/api/admin")return fail("Not found.",404);
 if(!await authorizedAdmin(req))return fail(cfg.ADMIN_PASSWORD?"Admin access denied.":"Admin password has not been configured.",401);
 try{
  const records=(await db().prepare("SELECT id, slug, batch, name, email, college, created_at, payment_state, payment_id FROM applications ORDER BY created_at DESC LIMIT 500").all()).results;
  return reply({courses:await getCourses(),records,paymentMode:paymentMode()});
 }catch{return fail("The admin data is temporarily unavailable.",503);}
}
export async function POST(req:Request){
 const url=new URL(req.url), path=url.pathname;
 const webhook=path==="/api/payments/webhook";
 if(!webhook && req.headers.get("origin") && req.headers.get("origin")!==url.origin && req.headers.get("sec-fetch-site")!=="same-origin")return fail("Invalid request origin.",403);
 if(!req.headers.get("content-type")?.toLowerCase().includes("application/json"))return fail("Expected JSON.",415);
 let raw:string,data:unknown;
 try{raw=await rawBody(req);data=JSON.parse(raw);}catch{return fail("Invalid or oversized request.",400);}
 try{
 if(webhook){
   const mode=paymentMode(),provided=req.headers.get("x-razorpay-signature")||"";
   const secret=razorpay().webhookSecret;
   if(!mode||!secret||!secureEqual(await signature(secret,raw),provided))return fail("Invalid webhook signature.",401);
   const event=data as PaymentWebhook|null;
   if(event?.event==="refund.processed"){
     const r=event.payload?.refund?.entity;
     if(typeof r?.payment_id!=="string"||!paymentPattern.test(r.payment_id)||typeof r.amount!=="number"||!Number.isSafeInteger(r.amount)||r.amount<=0)return fail("Invalid refund.",400);
     const row=await db().prepare("SELECT * FROM applications WHERE payment_id = ?").bind(r.payment_id).first<Application>();
     if(!row)await audit("razorpay webhook","refund for unknown payment "+r.payment_id,"payments");
     else if(r.amount>=row.amount){if(await markRefunded(row,r.payment_id))await audit("razorpay webhook","full refund recorded; class access removed",row.id);}
     else await audit("razorpay webhook","partial refund of "+r.amount+" paise; access unchanged",row.id);
     return reply({received:true});
   }
   if(event?.event!=="payment.captured")return reply({received:true});
   const p=event.payload?.payment?.entity;
   if(p?.status!=="captured"||p?.currency!=="INR"||typeof p?.id!=="string"||!paymentPattern.test(p.id)||typeof p?.order_id!=="string"||!orderPattern.test(p.order_id)||typeof p?.amount!=="number"||!Number.isSafeInteger(p.amount)||p.amount<=0)return fail("Invalid payment.",400);
   const row=await db().prepare("SELECT * FROM applications WHERE order_id = ?").bind(p.order_id).first<Application>();
   // A captured payment that matches no application must not disappear silently.
   if(!row||row.amount!==p.amount||row.payment_order_mode!==mode){await audit("razorpay webhook","unmatched captured payment "+p.id+" for order "+p.order_id,row?.id??"payments");return reply({received:true});}
   if(!await markPaid(row,p.id)){
     if(row.payment_id!==p.id)await audit("razorpay webhook","captured payment "+p.id+" could not be applied; refund or reconcile",row.id);
     return fail("Payment needs reconciliation.",409);
   }
   return reply({received:true});
 }
 if(path==="/api/admin/course"){
   if(!await authorizedAdmin(req))return fail("Admin access denied.",401);
   const slug=data&&typeof data==="object"&&"slug" in data&&typeof data.slug==="string"?data.slug:"";
   const error=await saveCourse(slug,data);
   if(!error)await audit(actorFor(req),"edit course",slug);
   return error?fail(error==="schedule"?"Add a schedule and delivery mode before opening applications.":error==="instructor"?"Assign one instructor before opening this exclusive batch.":error==="parent-course"?"Open applications on the full C course, not on a day plan.":"Check the five day entries and batch fields.",400):reply({ok:true});
 }
 if(path==="/api/applications"){
   const student=requestIdentity(req.headers);
   if(!student)return fail("Student sign-in is required to apply.",401);
   const r=await createApplication(data,student);
   if(!r.id)return fail(r.error==="paused"?"New applications are temporarily paused.":r.error==="form-changed"?"The application form or fee changed. Reload the batch before submitting.":r.error==="duplicate"?"An application already exists for this email and batch.":(r.error==="closed"||r.error==="not-open")?"Applications are not open for this batch.":"Check your contact and academic details, then confirm your consent.",r.status);
   return reply({id:r.id,token:r.token,paymentMode:paymentMode()},201);
 }
 if(path==="/api/payments/order"||path==="/api/payments/verify"||path==="/api/payments/reconcile"||path==="/api/applications/status"){
   const parsed=(path.endsWith("/verify")?verify:ref).safeParse(data);
   if(!parsed.success)return fail("Invalid application or payment details.",400);
   const identity=requestIdentity(req.headers);
   const row=parsed.data.token?await getApplication(parsed.data.id,parsed.data.token):identity?await getOwnedApplication(parsed.data.id,identity.id):null;
   if(!row)return fail("Application not found.",404);
   const day=!!cDayNumber(row.slug);
   const mode=day?null:paymentMode();
   if(path==="/api/applications/status")return reply({id:row.id,paymentState:day?"not_required":row.payment_state,paymentMode:mode,slug:row.slug,...(row.slug===CRASH_SLUG?{enrolled:row.payment_state==="paid"&&row.review_state==="accepted"&&row.class_access===1}:{})});
   if(day)return fail("Use the application for the complete five-day course.",409);
   if(!mode)return fail("Online payment is not enabled.",503);
   if(row.payment_state==="paid"||row.payment_state==="test_paid")return reply({paymentState:row.payment_state});
   if(row.order_id&&row.payment_order_mode!==mode)return fail("This order belongs to a different payment environment or needs review. Contact the organiser before paying.",409);
   if(path.endsWith("/reconcile")){
     if(!row.order_id||!orderPattern.test(row.order_id))return reply({paymentState:"unpaid"});
     const result=await gateway<OrderPayments>("orders/"+row.order_id+"/payments");
     if(!Array.isArray(result.items))throw new Error("Unexpected payment list");
     const matching=result.items.filter(p=>p.order_id===row.order_id&&p.amount===row.amount&&p.currency==="INR"&&paymentPattern.test(p.id));
     const captured=matching.find(p=>p.status==="captured");
     if(!captured)return reply({paymentState:matching.some(p=>p.status==="authorized")?"pending":"unpaid"});
     if(!await markPaid(row,captured.id))return fail("Payment needs reconciliation. Contact the organiser.",409);
     return reply({paymentState:mode==="test"?"test_paid":"paid"});
   }
   if(path.endsWith("/order")){
     const checkout=await checkoutStatus(row);
     if(!checkout.available||!checkout.course)return fail(checkout.message,409);
     if(!await getBillingAddress(row.id))return fail("Add a billing address before continuing to payment.",409);
     let order=row.order_id;
     const amount=checkout.amount;
     if(!order){
       // Pre-applications made when the C course was free have a zero amount.
       // Quote the current full-course fee on checkout without replacing their reference.
       if(!Number.isSafeInteger(amount)||amount<=0)return fail("The fee for this application could not be confirmed.",409);
       const created=await gateway("orders",{amount,currency:"INR",receipt:row.id,notes:{application_id:row.id}});
       if(!orderPattern.test(created.id)||created.amount!==amount||created.currency!=="INR")throw new Error("Unexpected order total");
       await db().prepare("UPDATE applications SET order_id=?,amount=?,payment_order_mode=? WHERE id=? AND order_id IS NULL AND payment_state='unpaid' AND review_state<>'declined'").bind(created.id,amount,mode,row.id).run();
       const saved=await db().prepare("SELECT order_id,amount,payment_order_mode,payment_state FROM applications WHERE id=?").bind(row.id).first<Pick<Application,"order_id"|"amount"|"payment_order_mode"|"payment_state">>();
       if(saved?.payment_state==="paid"||saved?.payment_state==="test_paid")return reply({paymentState:saved.payment_state});
       if(!saved?.order_id||saved.payment_order_mode!==mode||saved.amount!==amount)return fail("The order could not be confirmed. Open application status before retrying.",409);
       order=saved.order_id;
     }
     return reply({orderId:order,key:razorpay().keyId,amount,course:checkout.course.title,mode});
   }
   const p=verify.parse(data);
   if(!row.order_id||p.razorpay_order_id!==row.order_id||!razorpay().keySecret||!secureEqual(await signature(razorpay().keySecret,row.order_id+"|"+p.razorpay_payment_id),p.razorpay_signature))return fail("Payment signature could not be verified.",400);
   const payment=await gateway("payments/"+p.razorpay_payment_id);
   if(payment.id!==p.razorpay_payment_id||payment.order_id!==row.order_id||payment.amount!==row.amount||payment.currency!=="INR")return fail("Payment details do not match this application.",400);
   if(payment.status!=="captured")return reply({paymentState:"pending"},202);
   if(!await markPaid(row,p.razorpay_payment_id))return fail("Payment is being reconciled. Check status before trying again.",409);
   return reply({paymentState:mode==="test"?"test_paid":"paid"});
 }
 return fail("Not found.",404);
 }catch(e){console.error("Course request failed",path,e instanceof Error?e.name:"Unknown");return fail("Temporarily unavailable. Please try again shortly.",503);}
}
