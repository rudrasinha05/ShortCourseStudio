import {ArrowRight} from "lucide-react";
import {Frame} from "@/app/ui";
import {priceText} from "@/lib/admin-controls";
import {checkoutUrl,getBillingAddress,checkoutStatus} from "@/lib/billing";
import {CheckoutProgress,CheckoutSummary,requireCheckout} from "../checkout-ui";

export const dynamic="force-dynamic";
export const metadata={title:"Billing address",referrer:"no-referrer",robots:{index:false,follow:false}};

export default async function BillingPage({searchParams}:{searchParams:Promise<{ref?:string;error?:string}>}){
 const p=await searchParams;
 const {row,id}=await requireCheckout(p.ref);
 const [billing,status]=await Promise.all([getBillingAddress(id),checkoutStatus(row)]);
 return <Frame><section className="wrap narrow prose checkout-page"><span className="eyebrow">COURSE ENROLLMENT</span><h1>Billing address</h1>
  <CheckoutProgress step={2}/>
  <p>Your application is saved. Add the address for your payment record, then continue to payment.</p>
  <CheckoutSummary course={status.course?.title??"Short course"} batch={row.batch} fee={priceText(status.amount)} id={id}/>
  {!status.available&&<p className="mutedbox">{status.message}</p>}
  <form className="panel formpanel" action="/apply/billing/save" method="post" aria-label="Billing address">
   <h2>Billing details</h2>
   {p.error==="invalid"&&<p className="error" role="alert">Check the billing details and enter a valid 6-digit Indian PIN code.</p>}
   {p.error==="retry"&&<p className="error" role="alert">We couldn’t save the address. Please try again.</p>}
   <input type="hidden" name="ref" value={id}/>
   <label>Billing name<input name="name" autoComplete="billing name" required minLength={2} maxLength={100} defaultValue={billing?.name??row.name}/></label>
   <label>Address line 1<input name="addressLine" autoComplete="billing address-line1" required minLength={4} maxLength={180} defaultValue={billing?.addressLine}/></label>
   <label>Address line 2 <span className="apply-optional">Optional</span><input name="addressExtra" autoComplete="billing address-line2" maxLength={150} defaultValue={billing?.addressExtra}/></label>
   <div className="portal-fields">
    <label>City<input name="city" autoComplete="billing address-level2" required minLength={2} maxLength={80} defaultValue={billing?.city}/></label>
    <label>State or union territory<input name="state" autoComplete="billing address-level1" required minLength={2} maxLength={80} defaultValue={billing?.state}/></label>
    <label>PIN code<input name="pin" autoComplete="billing postal-code" inputMode="numeric" pattern="[1-9][0-9]{5}" required maxLength={6} defaultValue={billing?.pin}/></label>
    <label>Country<input value="India" autoComplete="billing country-name" readOnly/></label>
   </div>
   <div className="actions"><button className="btn primary">Continue to payment <ArrowRight size={16} aria-hidden="true"/></button><a className="btn secondary" href={checkoutUrl("receipt",id)}>View application status</a></div>
  </form>
 </section></Frame>;
}
