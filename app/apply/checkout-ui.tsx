import {cookies,headers} from "next/headers";
import {redirect} from "next/navigation";
import {accessCookie,refPattern} from "@/lib/form-workflows";
import {checkoutApplication,checkoutUrl} from "@/lib/billing";
import {cDayNumber} from "@/lib/courses";
import {requestIdentity} from "@/lib/portals";
import {Check} from "lucide-react";

export async function requireCheckout(ref?:string){
 const id=typeof ref==="string"&&refPattern.test(ref)?ref:"";
 if(!id)redirect("/apply");
 const [cookie,requestHeaders]=await Promise.all([cookies(),headers()]);
 const {row,token}=await checkoutApplication(id,cookie.get(accessCookie)?.value,requestIdentity(requestHeaders)?.id);
 if(!row)redirect("/application-status?ref="+encodeURIComponent(id));
 if(row.payment_state!=="unpaid"||row.review_state==="declined"||cDayNumber(row.slug))redirect(checkoutUrl("receipt",id));
 return {row,token,id};
}
export function CheckoutProgress({step}:{step:2|3}){
 return <ol className="checkout-steps" aria-label="Enrollment steps">
  {["Application","Billing address","Payment"].map((label,i)=><li key={label} data-done={i+1<step||undefined} aria-current={i+1===step?"step":undefined}>
   <span className="checkout-step-number" aria-hidden="true">{i+1<step?<Check size={15}/>:i+1}</span><span>{label}</span>
  </li>)}
 </ol>;
}
export function CheckoutSummary({course,batch,fee,id}:{course:string;batch:string;fee:string;id:string}){
 return <aside className="panel checkout-summary" aria-label="Order summary">
  <span className="eyebrow">ORDER SUMMARY</span><h2>{course}</h2>
  <p>Batch {batch}</p><dl><div><dt>Course fee</dt><dd>{fee}</dd></div><div><dt>Application reference</dt><dd>{id}</dd></div></dl>
 </aside>;
}
