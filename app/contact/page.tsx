import {Frame} from "@/app/ui";
import {getSiteContent} from "@/lib/admin-controls";
import {DEPARTMENT,INSTITUTE,SITE_NAME} from "@/lib/programme";

export const dynamic="force-dynamic";
export const metadata={title:"Contact us"};
export default async function Contact(){
 const {contact,phone,address}=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">CONTACT US</span><h1>Contact the organiser</h1>
  <p>{SITE_NAME} runs short courses at {INSTITUTE}, Greater Noida, with the {DEPARTMENT}.</p>
  <section className="panel formpanel" aria-labelledby="contact-details"><h2 id="contact-details">Organiser details</h2>
   <dl className="contact-details">
    <div><dt>Email</dt><dd>{contact?<a className="textlink" href={"mailto:"+contact}>{contact}</a>:"Use Student Support in the Student Portal."}</dd></div>
    {phone&&<div><dt>Phone</dt><dd><a className="textlink" href={"tel:"+phone.replace(/[^+0-9]/g,"")}>{phone}</a></dd></div>}
    <div><dt>Address</dt><dd className="contact-address">{address||INSTITUTE+", Greater Noida, Uttar Pradesh, India"}</dd></div>
   </dl>
  </section>
  <section className="panel formpanel" aria-labelledby="contact-applications"><h2 id="contact-applications">Applications and payments</h2>
   <p>For a correction, a payment question or a refund request, open Student Support and pick the application. Replies appear in your portal.</p>
   <p>Share your application reference when you contact us. Never send your tracking code, card details, bank password or UPI PIN.</p>
   <div className="actions"><a className="btn primary" href="/student?view=support">Open Student Support</a><a className="btn secondary" href="/application-status">Check an application</a></div>
  </section>
  <div className="portal-links"><a className="btn secondary" href="/help">Help &amp; support</a><a className="btn secondary" href="/refund-policy">Cancellation &amp; refunds</a><a className="btn secondary" href="/terms">Terms &amp; conditions</a></div>
 </section></Frame>;
}
