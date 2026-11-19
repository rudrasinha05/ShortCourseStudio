import {redirect} from "next/navigation";
import {LockKeyhole} from "lucide-react";
import {Frame} from "@/app/ui";
import {priceText} from "@/lib/admin-controls";
import {checkoutStatus,checkoutUrl,getBillingAddress} from "@/lib/billing";
import {CheckoutProgress,CheckoutSummary,requireCheckout} from "../checkout-ui";
import PaymentCheckout from "../payment-checkout";

export const dynamic="force-dynamic";
export const metadata={title:"Course payment",referrer:"no-referrer",robots:{index:false,follow:false}};

export default async function PaymentPage({searchParams}:{searchParams:Promise<{ref?:string}>}){
 const {row,id,token}=await requireCheckout((await searchParams).ref);
 const [billing,status]=await Promise.all([getBillingAddress(id),checkoutStatus(row)]);
 if(!billing)redirect(checkoutUrl("billing",id));
 const receipt=checkoutUrl("receipt",id),fee=priceText(status.amount);
 return <Frame><section className="wrap narrow prose checkout-page"><span className="eyebrow">COURSE ENROLLMENT</span><h1>Course payment</h1>
  <CheckoutProgress step={3}/><p>Review your fee and continue with your preferred payment method.</p>
  <CheckoutSummary course={status.course?.title??"Short course"} batch={row.batch} fee={fee} id={id}/>
  <section className="panel formpanel" aria-labelledby="billing-summary"><h2 id="billing-summary">Bill to</h2><p>{billing.name}<br/>{billing.addressLine}{billing.addressExtra&&<><br/>{billing.addressExtra}</>}<br/>{billing.city}, {billing.state} {billing.pin}, India</p><a className="textlink" href={checkoutUrl("billing",id)}>Edit billing address</a></section>
  <section className="panel formpanel" aria-labelledby="checkout-heading"><h2 id="checkout-heading">Payment options</h2>
   {status.available&&status.mode?<PaymentCheckout id={id} token={token} mode={status.mode} fee={fee} receipt={receipt}/>:<>
    <p role="status" className="mutedbox">{status.message}</p>
    <ul className="checkout-method-list" aria-label="Supported methods when checkout is enabled"><li>UPI</li><li>Debit and credit cards</li><li>Net banking</li><li>Wallets</li></ul>
   </>}
   <p className="checkout-safety"><LockKeyhole size={15} aria-hidden="true"/> Payment details are entered only in Razorpay checkout.</p>
   <p className="checkout-terms">By paying, you agree to the <a className="textlink" href="/terms">Terms &amp; conditions</a> and the <a className="textlink" href="/refund-policy">Cancellation &amp; refund policy</a>.</p>
   <div className="actions"><a className="btn secondary" href={receipt}>View application status</a></div>
  </section>
 </section></Frame>;
}
