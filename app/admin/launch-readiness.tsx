import {adminTarget} from "@/lib/admin-navigation";
import {getSiteContent} from "@/lib/admin-controls";
import {reminderChannels} from "@/lib/class-reminders";
import {canApply,cfg,getCourses,paymentMode} from "@/lib/enrollment";
import {cDayNumber} from "@/lib/courses";
import {readBatchStart} from "@/lib/batch-schedule";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
export async function LaunchReadiness({courses}:{courses:Course[]}){
 const content=await getSiteContent(),mode=paymentMode(),channels=reminderChannels();
 const open=courses.filter(c=>!cDayNumber(c.slug)&&canApply(c));
 const rows=[
  {title:"Razorpay checkout",state:mode==="live"?"Live keys configured":mode==="test"?"Test keys configured":"Not configured",detail:"Confirm a successful and a failed provider test before accepting real fees."},
  {title:"Webhook delivery",state:"Verify with Razorpay",detail:"Send a test event to /api/payments/webhook. A private site can block the provider. Applicants can also check payment status directly."},
  {title:"Open admissions",state:open.length+" open",detail:open.length&&open.every(c=>readBatchStart(c.schedule))?"Check the launch batch and its class timetable.":"Confirm a dated start, delivery mode and timetable for the launch batch.",link:adminTarget("enrollment-controls")},
  {title:"Support contact",state:content.contact?"Configured":"Not configured",detail:"Use a monitored organiser email for payment questions and corrections.",link:adminTarget("website-content")},
  {title:"Refund and cancellation",state:"Needs owner confirmation",detail:"Approve and publish the student-facing refund, cancellation and delivery terms before accepting fees."},
  {title:"Class reminders",state:channels.email&&channels.whatsapp&&cfg.REMINDER_JOB_SECRET?"Configuration present":"Not fully configured",detail:"Optional for payment launch. Test provider delivery and the scheduled job before relying on reminders."},
 ];
 return <section className="portal-section" id="launch-readiness"><h2>Launch readiness</h2>
  <p>Use these checks before inviting students or collecting real payments. Configuration alone does not verify provider delivery.</p>
  <div className="panel student-table-wrap" role="region" tabIndex={0} aria-label="Launch checklist">
   <table className="student-table"><thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">Next step</th></tr></thead><tbody>
   {rows.map(r=><tr key={r.title}><th scope="row">{r.title}</th><td><strong>{r.state}</strong></td><td>{r.detail}{r.link&&<small><a className="textlink" href={r.link}>Open settings</a></small>}</td></tr>)}
   <tr><th scope="row">Student access</th><td><strong>Check site sharing</strong></td><td>Verify that a non-owner can apply and see only their own records. Admin stays owner-only.</td></tr>
   </tbody></table>
  </div>
 </section>;
}
