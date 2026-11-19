import Link from "next/link";
import {getSiteUser,portalLoginPath} from "../site-auth";
import {PaymentStatusCheck} from "./payment-status-check";
import {checkoutStatus,checkoutUrl,getBillingAddress} from "@/lib/billing";
import {formFields,getBatchRules,getNoticeTemplates,priceText} from "@/lib/admin-controls";
import {formatClassTime,getClassSessions,hasClassAccess} from "@/lib/class-sessions";
import {requestIdentity} from "@/lib/portals";
import { cookies,headers } from "next/headers";
import { CheckCircle2,LogIn } from "lucide-react";
import { Frame } from "@/app/ui";
import { cDayNumber,CRASH_SLUG,registrationSlug } from "@/lib/courses";
import { canApply,enrollmentUnavailable,getApplication,getOwnedApplication,getCourses,getSiteControls,intakeStatus,paymentMode,publicCatalogue } from "@/lib/enrollment";
import { accessCookie,refPattern,reviewLabels } from "@/lib/form-workflows";
import ApplicationForm from "./application-form";

export const dynamic="force-dynamic";
export const metadata={title:"Applications",referrer:"same-origin"};
const errors:Record<string,string>={
 "form-changed":"The form or course fee changed. Review the current form and try again.",
 invalid:"Check your contact and academic details, then confirm your consent.",
 duplicate:"This email already has an application for this batch. Use your tracking details below, or contact the organiser.",
 closed:"This batch is no longer accepting applications.",
 paused:"New applications are temporarily paused.",
 "not-open":"Applications are not open for this batch.",
 notfound:"That reference and tracking code did not match. Check both and try again.",
 retry:"The request could not be completed. Please try again."
};
export default async function Apply({searchParams}:{searchParams:Promise<{course?:string;ref?:string;error?:string}>}){
 const [p,allCourses,controls]=await Promise.all([searchParams,getCourses(),getSiteControls()]);
 const courses=publicCatalogue(allCourses);
 const selectedSlug=registrationSlug(typeof p.course==="string"?p.course:"");
 const value=(await cookies()).get(accessCookie)?.value??"";
 const [storedId,token]=value.split(".");
 const id=typeof p.ref==="string"&&refPattern.test(p.ref)?p.ref:"";
 const account=await getSiteUser();
 const user=requestIdentity(await headers());
 const signInHref=portalLoginPath("/apply"+(selectedSlug?"?course="+encodeURIComponent(selectedSlug):""));
 const receiptToken=id&&id===storedId&&token?token:undefined;
 const tokenRow=receiptToken?await getApplication(id,receiptToken):null;
 const row=tokenRow??(id&&user?await getOwnedApplication(id,user.id):null);
 const selected=row?allCourses.find(c=>c.slug===row.slug):null;
 const sessions=row&&hasClassAccess(row)?await getClassSessions(row.slug,row.batch):null;
 const legacyDay=!!row&&!!cDayNumber(row.slug);
 const cCourse=row?.slug===CRASH_SLUG;
 const enrolled=!!row&&cCourse&&hasClassAccess(row);
 const mode=legacyDay?null:paymentMode();
 const [notices,billing,checkout]=row?await Promise.all([getNoticeTemplates(),legacyDay?null:getBillingAddress(row.id),legacyDay?null:checkoutStatus(row)]):[null,null,null];
 const notice=row&&(row.review_state==="accepted"?notices?.accepted:row.review_state==="declined"?notices?.declined:notices?.receipt);
 const canContinue=!!row&&!legacyDay&&row.payment_state==="unpaid"&&row.review_state!=="declined";
 const options=row||!user?[]:await Promise.all(courses.filter(c=>!cDayNumber(c.slug)).map(async c=>{
  const open=canApply(c),batchRules=open?await getBatchRules(c.slug,c.batch):null;
  return {slug:c.slug,title:c.title,status:intakeStatus(c),batch:c.batch,schedule:c.schedule,venue:c.mode,open,fee:priceText(c.feePaise),
   unavailable:c.intakeConstraint==="full"?"This batch has reached its application limit.":c.intakeConstraint==="deadline"?"The application deadline has passed.":c.status==="closed"?"Applications for this batch have closed.":enrollmentUnavailable(intakeStatus(c)),
   checkoutPaused:!!batchRules?.payment_paused,version:batchRules?.form_version,fields:batchRules?formFields(batchRules):undefined};
 }));
 return <Frame><section className="wrap narrow prose"><span className="eyebrow"><i/> STUDENT APPLICATIONS</span><h1>{row?"Application status":user?"Apply for a short course":"Sign in to apply for a short course"}</h1><p>{row?"Check your application, payment and batch details.":!user?"Sign in to your student account before starting a new application.": "Ready to build a new skill? Choose a course with an open batch and share a few details about yourself. After you apply, you can follow your application in the Student Portal."}</p>
 {controls.announcement&&<p className="mutedbox">{controls.announcement}</p>}
 {p.error&&errors[p.error]&&<p role="alert" className="error">{errors[p.error]}</p>}
 {row?<div className="panel formpanel">
   <span className="mini"><CheckCircle2 size={21}/></span><h2>{enrolled?"Enrollment confirmed":"Application received"}</h2>
   <p>{selected?.title} · Batch {row.batch}</p>
   {notice&&<p className="mutedbox">{notice}</p>}
   <dl className="receipt-details"><dt>Application reference</dt><dd className="ref">{row.id}</dd>{tokenRow&&receiptToken&&<><dt>Private tracking code</dt><dd className="ref">{receiptToken}</dd></>}<dt>Review status</dt><dd>{reviewLabels[row.review_state]??"Submitted"}</dd>{!legacyDay&&<><dt>Payment</dt><dd>{row.payment_state==="paid"?"Payment verified":row.payment_state==="test_paid"?"Test payment verified — no real fee collected":"Not paid"}</dd></>}</dl>
   {legacyDay&&<p className="mutedbox">This reference is for an older day-only application. <a className="textlink" href={"/apply?course="+CRASH_SLUG}>Open the full five-day course application</a>.</p>}
   {!legacyDay&&<p className="mutedbox">{row.payment_state==="paid"?(enrolled?"Your fee is verified and your seat is confirmed for all five days.":"Your fee has been received."):row.payment_state==="test_paid"?"This was a test transaction.":row.payment_state==="refunded"?"Your fee was refunded to the original payment method, and this enrollment has ended.":!mode?"Online payment is not enabled. No payment was collected.":checkout?.available?"Continue to payment when you’re ready.":checkout?.message}</p>}
   {!legacyDay&&mode&&row.order_id&&row.payment_state==="unpaid"&&<PaymentStatusCheck id={row.id} token={tokenRow?receiptToken:undefined} receipt={checkoutUrl("receipt",row.id)} onReceipt/>}
   {sessions&&<section className="class-schedule" aria-label="My batch"><h2>My batch</h2><p>Class timings are shown in India Standard Time.</p>
   {sessions.map(s=><div key={s.day} className="app-record"><h3>Day {s.day}</h3>
   {s.starts_at&&s.ends_at?<p><time dateTime={s.starts_at+"+05:30"}>{formatClassTime(s.starts_at)}</time> to <time dateTime={s.ends_at+"+05:30"}>{formatClassTime(s.ends_at)}</time></p>:<p>Class time to be announced</p>}
   <div className="actions">{s.live_url&&<a className="btn primary" href={s.live_url} target="_blank" rel="noopener noreferrer">Join live</a>}
   {s.replay_url?<a className="btn secondary" href={s.replay_url} target="_blank" rel="noopener noreferrer">Watch replay</a>:<small>Recording not available yet</small>}</div></div>)}
   </section>}
   {tokenRow&&receiptToken&&<p>Save the reference and keep the tracking code private. You can use them to recover an application that is not linked to your Student Portal.</p>}
   <p>Submitting a form alone does not confirm a seat.</p>
   <div className="actions">{canContinue&&<a className="btn primary" href={checkoutUrl(billing?"payment":"billing",row.id)}>{billing?"Continue to payment":"Add billing address"}</a>}<a className="btn secondary" href={"/apply?ref="+row.id}>Refresh status</a><a className="btn secondary" href="/apply">Apply for another course</a></div>
 </div>:<>
 {id&&<p className="mutedbox">To open this application, check your <a className="textlink" href="/student?view=applications">Student Portal</a> or use <a className="textlink" href={"/application-status?ref="+id}>application recovery</a>.</p>}
 {user?<ApplicationForm key={selectedSlug} courses={options} selected={selectedSlug} mode={mode} profile={account?{name:account.displayName,email:account.email}:undefined}/>:<div className="panel formpanel"><span className="mini"><LogIn size={21}/></span><h2>Student sign in</h2><p>{courses.find(c=>c.slug===selectedSlug)?.title?<>Selected course <strong>{courses.find(c=>c.slug===selectedSlug)?.title}</strong></>:"Your application will be linked to your student account."}</p><div className="actions"><a className="btn primary" href={signInHref}>Student sign in</a><Link className="btn secondary" href="/#courses">Browse courses</Link></div></div>}
 </>}
 </section></Frame>;
}
