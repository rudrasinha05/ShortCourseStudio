import {cookies} from "next/headers";
import {accessCookie,refPattern} from "@/lib/form-workflows";
import {billingSchema,checkoutApplication,checkoutUrl,saveBillingAddress} from "@/lib/billing";
import {requestIdentity} from "@/lib/portals";
import {cDayNumber} from "@/lib/courses";

export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const move=(path:string)=>new Response(null,{status:303,headers:{...headers,Location:path}});

export async function POST(req:Request){
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if(site==="cross-site"||(origin&&origin!==new URL(req.url).origin&&site!=="same-origin"))
  return new Response("Submit this form from Short Course Studio.",{status:403,headers});
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded"))
  return new Response("Invalid billing form.",{status:415,headers});
 const reader=req.body?.getReader();
 if(!reader)return new Response("Missing billing form.",{status:400,headers});
 const decoder=new TextDecoder();
 let raw="",total=0;
 try{
  for(;;){
   const part=await reader.read();
   if(part.done)break;
   total+=part.value.length;
   if(total>8192){await reader.cancel();return new Response("Billing form is too large.",{status:413,headers});}
   raw+=decoder.decode(part.value,{stream:true});
  }
  raw+=decoder.decode();
 }finally{reader.releaseLock();}
 const form=new URLSearchParams(raw),id=form.get("ref")??"";
 if(!refPattern.test(id))return move("/application-status");
 const user=requestIdentity(req.headers);
 const {row}=await checkoutApplication(id,(await cookies()).get(accessCookie)?.value,user?.id);
 if(!row)return move("/application-status?ref="+encodeURIComponent(id));
 if(row.payment_state!=="unpaid"||row.review_state==="declined"||cDayNumber(row.slug))return move(checkoutUrl("receipt",id));
 const parsed=billingSchema.safeParse({name:form.get("name"),addressLine:form.get("addressLine"),addressExtra:form.get("addressExtra")??"",city:form.get("city"),state:form.get("state"),pin:form.get("pin")});
 if(!parsed.success)return move(checkoutUrl("billing",id)+"&error=invalid");
 try{
  return move(await saveBillingAddress(row.id,parsed.data)?checkoutUrl("payment",id):checkoutUrl("receipt",id));
 }catch{
  return move(checkoutUrl("billing",id)+"&error=retry");
 }
}
