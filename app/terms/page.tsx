import {Frame} from "@/app/ui";
import {PolicyText} from "@/app/policy-text";
import {getSiteContent} from "@/lib/admin-controls";
import {INSTITUTE,SITE_NAME} from "@/lib/programme";

export const dynamic="force-dynamic";
export const metadata={title:"Terms and conditions"};
export default async function Terms(){
 const {terms}=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">POLICIES</span><h1>Terms &amp; conditions</h1>
  {terms?<PolicyText text={terms}/>:<>
   <p>These terms apply when you apply for, pay for or attend a course offered by {SITE_NAME} at {INSTITUTE}.</p>
   <h2>Applications</h2>
   <p>Give accurate details in your application. One application is accepted per email address for each batch. The organiser reviews applications and may decline an application that is incomplete or does not meet the course prerequisites.</p>
   <h2>Fees and payment</h2>
   <p>The course fee is shown in Indian rupees before you pay. Online payments are processed by Razorpay. This website does not receive or store your card, bank or UPI details. For the C Programming course, your seat is confirmed after the payment is verified. For other courses, enrollment is confirmed when the organiser accepts your application and grants class access.</p>
   <h2>Classes and schedule</h2>
   <p>The batch schedule and delivery mode are shown on the course page. If the organiser changes a class time or delivery mode, the update is posted in the Student Portal. Class and recording links are for enrolled students only and must not be shared.</p>
   <h2>Certificates</h2>
   <p>Certificates are issued according to each course&rsquo;s attendance and assessment records. Anyone can check a certificate on the certificate verification page.</p>
   <h2>Conduct</h2>
   <p>Treat instructors and other students with respect. The organiser may remove class access for misuse of class links, recordings or the portal.</p>
  </>}
  <h2>Cancellations and refunds</h2>
  <p>See the <a className="textlink" href="/refund-policy">Cancellation &amp; refund policy</a>.</p>
  <h2>Contact</h2>
  <p>Questions about these terms can be sent to the organiser through the <a className="textlink" href="/contact">Contact us</a> page.</p>
 </section></Frame>;
}
