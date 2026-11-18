import {Frame} from "@/app/ui";
import {getSiteContent} from "@/lib/admin-controls";

export const dynamic="force-dynamic";
export const metadata={title:"Help and support"};
export default async function Help(){
 const {contact}=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">STUDENT SUPPORT</span><h1>Help &amp; support</h1><p>Find your application, resolve sign-in problems or contact the organiser.</p>
 <section className="panel formpanel"><h2>Questions about an application</h2><p>In the Student Portal, pick your application and request a correction, ask about payment or send another question. Replies appear in the portal.</p><a className="btn primary" href="/student?view=support">Open Student Support</a><a className="textlink" href="/application-status">Recover an unlinked application</a></section>
 <section className="panel formpanel" id="sign-in"><h2>Sign-in help</h2><p>Students should use the email they applied with. Faculty and staff should use the email registered by the administrator. If the wrong account is shown, sign out inside the portal and sign in again.</p><div className="actions"><a className="textlink" href="/student">Student Portal</a><a className="textlink" href="/faculty">Faculty Portal</a><a className="textlink" href="/staff">Staff Portal</a></div></section>
 <section className="panel formpanel"><h2>Contact the organiser</h2>{contact?<a className="textlink" href={"mailto:"+contact}>{contact}</a>:<p>For a batch-specific issue, use the organiser’s contact details in the batch announcement, or send a request through Student Support.</p>}<p>Share your application reference when needed. Do not send your tracking code, bank credentials or UPI PIN.</p></section>
 <div className="portal-links"><a className="btn secondary" href="/faq">Read the FAQ</a><a className="btn secondary" href="/privacy">Privacy notice</a></div>
 </section></Frame>;
}
