import {Frame} from "@/app/ui";
import {PolicyText} from "@/app/policy-text";
import {getSiteContent} from "@/lib/admin-controls";

export const dynamic="force-dynamic";
export const metadata={title:"Cancellation and refund policy"};
export default async function RefundPolicy(){
 const {refund}=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">POLICIES</span><h1>Cancellation &amp; refund policy</h1>
  {refund?<PolicyText text={refund}/>:<p className="mutedbox" role="status">The organiser has not published the refund terms for the current batch yet. Please <a className="textlink" href="/contact">contact the organiser</a> before paying.</p>}
  <h2>How refunds are paid</h2>
  <p>An approved refund is returned to the original payment method through Razorpay. After the refund is started, banks usually take 5–7 working days to show it in your account.</p>
  <p>When a full refund is processed, the application shows <strong>Refunded</strong> and class access for that batch ends.</p>
  <h2>Requesting a refund</h2>
  <p>Open <a className="textlink" href="/student?view=support">Student Support</a>, pick the application and choose a payment question. Include your application reference, not your tracking code.</p>
 </section></Frame>;
}
