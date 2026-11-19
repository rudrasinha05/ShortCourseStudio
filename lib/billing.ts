import {z} from "zod";
import {applicationsOpen,db,getApplication,getOwnedApplication,lookup,paymentAmount,paymentMode,type Application} from "./enrollment";
import {getBatchRules} from "./admin-controls";
import {cDayNumber} from "./courses";

export const billingSchema=z.object({
 name:z.string().trim().min(2).max(100),
 addressLine:z.string().trim().min(4).max(180),
 addressExtra:z.string().trim().max(150),
 city:z.string().trim().min(2).max(80),
 state:z.string().trim().min(2).max(80),
 pin:z.string().trim().regex(/^[1-9]\d{5}$/),
});
export type BillingAddress=z.infer<typeof billingSchema>;

export const checkoutUrl=(step:"billing"|"payment"|"receipt",id:string)=>"/apply"+(step==="receipt"?"":"/"+step)+"?ref="+encodeURIComponent(id);

export async function checkoutApplication(id:string,cookie?:string,userId?:string){
 const [cookieId,token]=(cookie??"").split(".");
 const byCode=cookieId===id&&token?await getApplication(id,token):null;
 return {row:byCode??(userId?await getOwnedApplication(id,userId):null),token:byCode?token:undefined};
}

export {paymentAmount};

export async function checkoutStatus(row:Application){
 const course=await lookup(row.slug);
 const amount=paymentAmount(row),mode=paymentMode();
 if(cDayNumber(row.slug))return {course,amount,mode,available:false,message:"Use the application for the complete five-day course."};
 if(row.payment_state!=="unpaid")return {course,amount,mode,available:false,message:"This application already has a payment record."};
 if(!course||!applicationsOpen(course)||course.batch!==row.batch||row.review_state==="declined"||(await getBatchRules(row.slug,row.batch)).payment_paused)return {course,amount,mode,available:false,message:"This batch is not accepting online payments right now."};
 if(!Number.isSafeInteger(amount)||amount<=0)return {course,amount,mode,available:false,message:"The fee for this application could not be confirmed."};
 if(!mode)return {course,amount,mode,available:false,message:"Online payments are not yet enabled. Your application is saved, and you can return to pay once checkout opens."};
 return {course,amount,mode,available:true,message:""};
}

export function getBillingAddress(id:string){
 return db().prepare("SELECT name,address_line AS addressLine,address_extra AS addressExtra,city,state,pin FROM application_billing WHERE application_id=?").bind(id).first<BillingAddress>();
}

export async function saveBillingAddress(id:string,address:BillingAddress){
 const {name,addressLine,addressExtra,city,state,pin}=address;
 const result=await db().prepare(`INSERT INTO application_billing (application_id,name,address_line,address_extra,city,state,pin,updated_at)
 SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM applications WHERE id=? AND payment_state='unpaid' AND review_state<>'declined')
 ON CONFLICT(application_id) DO UPDATE SET name=excluded.name,address_line=excluded.address_line,address_extra=excluded.address_extra,
 city=excluded.city,state=excluded.state,pin=excluded.pin,updated_at=excluded.updated_at`)
 .bind(id,name,addressLine,addressExtra,city,state,pin,new Date().toISOString(),id).run();
 return result.meta.changes===1;
}
