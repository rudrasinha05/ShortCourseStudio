import {adminTarget} from "@/lib/admin-navigation";
import {getSiteContent,priceText} from "@/lib/admin-controls";
import {reminderChannels} from "@/lib/class-reminders";
import {getClassSessions} from "@/lib/class-sessions";
import {canApply,cfg,getCourses,paymentMode} from "@/lib/enrollment";
import {cDayNumber} from "@/lib/courses";
import {readBatchStart,readDeliveryMode} from "@/lib/batch-schedule";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
export async function LaunchReadiness({courses}:{courses:Course[]}){
 const content=await getSiteContent(),mode=paymentMode(),channels=reminderChannels();
 const open=courses.filter(c=>!cDayNumber(c.slug)&&canApply(c));
 const batches=await Promise.all(open.map(async c=>({course:c,sessions:await getClassSessions(c.slug,c.batch)})));
 const rows=[
  {title:"Razorpay checkout",state:mode==="live"?"Live keys configured":mode==="test"?"Test keys configured":"Not configured",detail:"Confirm a successful and a failed provider test before accepting real fees."},
  {title:"Webhook delivery",state:"Verify with Razorpay",detail:"Send a test event to /api/payments/webhook. A private site can block the provider. Applicants can also check payment status directly."},
  {title:"Open admissions",state:open.length+" open",detail:"The launch batch table below shows saved schedule, fee and joining-link availability. Confirm these with the instructor before launch.",link:adminTarget("enrollment-controls")},
  {title:"Support contact",state:content.contact?"Configured":"Not configured",detail:"Use a monitored organiser email for payment questions and corrections.",link:adminTarget("website-content")},
  {title:"Refund and cancellation",state:content.refund?"Published":"Not published",detail:"Write the approved refund and cancellation terms. They appear at /refund-policy and are linked from checkout.",link:adminTarget("website-content")},
  {title:"Terms and contact page",state:content.terms&&content.contact&&(content.phone||content.address)?"Published":"Incomplete",detail:"Razorpay reviews the Terms, Contact us and Refund pages before activating live payments. Add terms, a support email and a phone number or address.",link:adminTarget("website-content")},
  {title:"Class reminders",state:channels.email&&channels.whatsapp&&cfg.REMINDER_JOB_SECRET?"Senders and job secret configured":"Not fully configured",detail:"Email "+(channels.email?"configured":"not connected")+" · WhatsApp "+(channels.whatsapp?"configured":"not connected")+". Verify scheduled execution and actual delivery separately."},
 ];
 return <section className="portal-section" id="launch-readiness"><h2>Launch readiness</h2>
  <p>Use these checks before inviting students or collecting real payments. Configuration alone does not verify provider delivery.</p>
  <div className="panel student-table-wrap" role="region" tabIndex={0} aria-label="Launch checklist">
   <table className="student-table"><thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">Next step</th></tr></thead><tbody>
   {rows.map(r=><tr key={r.title}><th scope="row">{r.title}</th><td><strong>{r.state}</strong></td><td>{r.detail}{r.link&&<small><a className="textlink" href={r.link}>Open settings</a></small>}</td></tr>)}
   <tr><th scope="row">Student access</th><td><strong>Check site sharing</strong></td><td>Verify that a non-owner can apply and see only their own records. Admin stays owner-only.</td></tr>
   </tbody></table>
  </div>
  <h3>Open batch setup</h3>
  <p>Link counts show configuration only. Check that your video provider lets enrolled students join and keeps links private. Add recordings as they become available.</p>
  {batches.length===0?<p>No batches are currently accepting applications.</p>:<div className="panel student-table-wrap" role="region" tabIndex={0} aria-label="Open batch setup">
   <table className="student-table"><thead><tr><th scope="col">Course &amp; batch</th><th scope="col">Published details</th><th scope="col">Timetable &amp; links</th><th scope="col">Settings</th></tr></thead><tbody>
   {batches.map(({course:c,sessions})=>{
    const timed=sessions.filter(s=>s.starts_at&&s.ends_at&&s.starts_at<s.ends_at).length;
    const live=sessions.filter(s=>s.live_url).length;
    const replay=sessions.filter(s=>s.replay_url).length;
    const announced=readBatchStart(c.schedule), first=sessions[0]?.starts_at;
    const needsLive=readDeliveryMode(c.mode).delivery!=="offline";
    return <tr key={c.slug}><th scope="row">{c.title}<small>{c.batch}</small></th>
     <td>{c.instructor||"Instructor not configured"}<small>{c.schedule} · {c.mode}</small><small>{priceText(c.feePaise)}</small></td>
     <td>{`${timed}/${sessions.length} sessions scheduled`}<small>{needsLive?live+"/"+sessions.length+" live links":"Live links optional for offline delivery"}</small><small>{`${replay}/${sessions.length} recordings added`}</small>
      {announced&&first&&announced!==first&&<small>Day 1 time differs from the published batch start.</small>}</td>
     <td><a className="textlink" href={adminTarget("class-schedule",{course:c.slug})}>Edit timetable</a><small><a className="textlink" href={adminTarget("batch-rules",{course:c.slug})}>Edit batch fee</a></small></td></tr>;
   })}
   </tbody></table>
  </div>}
 </section>;
}
