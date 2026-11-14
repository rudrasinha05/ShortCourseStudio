import {formatClassTime,getClassSessions,hasClassAccess} from "@/lib/class-sessions";
import { cookies } from "next/headers";
import { ArrowRight,CheckCircle2 } from "lucide-react";
import { Badge,Frame } from "@/app/ui";
import { cDayNumber,CRASH_SLUG,feeText,registrationSlug } from "@/lib/courses";
import { applicationsOpen,enrollmentUnavailable,getApplication,getCourses,paymentMode } from "@/lib/enrollment";
import { accessCookie,refPattern,reviewLabels } from "@/lib/form-workflows";
import PaymentCheckout from "./payment-checkout";

export const dynamic="force-dynamic";
export const metadata={title:"Applications",referrer:"same-origin"};
const errors:Record<string,string>={
 invalid:"Enter a valid name, email and college, and tick the consent box.",
 duplicate:"This email already has an application for this batch. Use your tracking details below, or contact the organiser.",
 closed:"This batch is no longer accepting applications.",
 "not-open":"Applications are not open for this batch.",
 notfound:"That reference and tracking code did not match. Check both and try again.",
 retry:"The request could not be completed. Please try again."
};
export default async function Apply({searchParams}:{searchParams:Promise<{course?:string;ref?:string;error?:string}>}){
 const p=await searchParams,courses=await getCourses(),active=courses.find(c=>c.slug===registrationSlug(p.course??""));
 const openCourses=courses.filter(c=>!cDayNumber(c.slug)&&applicationsOpen(c));
 const value=(await cookies()).get(accessCookie)?.value??"";
 const [storedId,token]=value.split(".");
 const id=typeof p.ref==="string"&&refPattern.test(p.ref)?p.ref:"";
 const row=id&&id===storedId&&token?await getApplication(id,token):null;
 const selected=row?courses.find(c=>c.slug===row.slug):null;
 const sessions=row&&hasClassAccess(row)?await getClassSessions(row.slug,row.batch):null;
 const legacyDay=!!row&&!!cDayNumber(row.slug);
 const cCourse=(row?.slug??active?.slug)===CRASH_SLUG;
 const enrolled=!!row&&cCourse&&hasClassAccess(row);
 const mode=legacyDay?null:paymentMode();
 const payable=!!mode&&!!selected&&applicationsOpen(selected)&&selected.batch===row?.batch&&row?.review_state!=="declined"&&row?.payment_state==="unpaid";
 return <Frame><section className="wrap narrow prose"><span className="eyebrow"><i/> STUDENT APPLICATIONS</span><h1>{row?"Application status":"Apply for a short course"}</h1><p>{row?"Keep your reference and tracking code to check this application again.":"Applications are available only for announced batches that are open for registration."}</p>
 {p.error&&errors[p.error]&&<p role="alert" className="error">{errors[p.error]}</p>}
 {row?<div className="panel formpanel">
   <span className="mini"><CheckCircle2 size={21}/></span><h2>{enrolled?"Enrollment confirmed":"Application received"}</h2>
   <p>{selected?.title} · Batch {row.batch}</p>
   <dl className="receipt-details"><dt>Application reference</dt><dd className="ref">{row.id}</dd><dt>Private tracking code</dt><dd className="ref">{token}</dd><dt>Review status</dt><dd>{reviewLabels[row.review_state]??"Submitted"}</dd>{!legacyDay&&<><dt>Payment</dt><dd>{row.payment_state==="paid"?"Payment verified":row.payment_state==="test_paid"?"Test payment verified — no real fee collected":"Not paid"}</dd></>}</dl>
   {legacyDay&&<p className="mutedbox">This reference is for an older day-only application. <a className="textlink" href={"/apply?course="+CRASH_SLUG}>Open the full five-day course application</a>.</p>}
   {!legacyDay&&(payable&&token?<PaymentCheckout id={row.id} token={token} mode={mode!}/>:<p className="mutedbox">{row.payment_state==="paid"?(enrolled?"Your fee is verified and your seat is confirmed for all five days.":"Your fee has been received."):row.payment_state==="test_paid"?"This was a test transaction.":!mode?"Online payment is not enabled. No payment was collected.":"Payment is not available for this application right now."}</p>)}
   {sessions&&<section className="class-schedule" aria-label="My batch"><h2>My batch</h2><p>Class timings are shown in India Standard Time.</p>
   {sessions.map(s=><div key={s.day} className="app-record"><h3>Day {s.day}</h3>
   {s.starts_at&&s.ends_at?<p><time dateTime={s.starts_at+"+05:30"}>{formatClassTime(s.starts_at)}</time> to <time dateTime={s.ends_at+"+05:30"}>{formatClassTime(s.ends_at)}</time></p>:<p>Class time to be announced</p>}
   <div className="actions">{s.live_url&&<a className="btn primary" href={s.live_url} target="_blank" rel="noopener noreferrer">Join live</a>}
   {s.replay_url?<a className="btn secondary" href={s.replay_url} target="_blank" rel="noopener noreferrer">Watch replay</a>:<small>Recording not available yet</small>}</div></div>)}
   </section>}
   <p>Keep your tracking code private. Submitting a form alone does not confirm a seat.</p>
   <div className="actions"><a className="btn secondary" href={"/apply?ref="+row.id}>Refresh status</a><a className="btn secondary" href="/apply">Apply for another course</a></div>
 </div>:<>
 {id&&<p className="mutedbox">Enter your reference and tracking code below to view this application.</p>}
 {openCourses.length>0?<form className="panel formpanel" action="/apply" method="get">
  <label>Course<select name="course" required defaultValue={applicationsOpen(active)?active?.slug:""}><option value="" disabled>Choose an open course</option>{openCourses.map(c=><option key={c.slug} value={c.slug}>{c.title}{c.exclusive&&c.instructor&&!c.title.includes(c.instructor)?" — "+c.instructor:""}</option>)}</select></label>
  <button className="btn secondary">Load course form <ArrowRight size={16}/></button>
 </form>:!active&&<p className="mutedbox">No batches are currently open for applications. <a href="/#courses">Browse the catalogue</a>.</p>}
 {active&&!applicationsOpen(active)&&<div className="panel formpanel"><Badge status={active.status}/><h2>{active.title}</h2><p>{enrollmentUnavailable(active.status)}</p><a className="textlink" href={"/courses/"+active.slug}>View course details</a></div>}
 {active&&applicationsOpen(active)&&<form className="panel formpanel" action="/forms/apply" method="post">
  <input type="hidden" name="slug" value={active.slug}/>
  <input type="hidden" name="batch" value={active.batch}/>
  <h2>Batch application</h2>
  <p className="mutedbox">Course fee {feeText}{active.exclusive?" for all five days":""}. {!mode?"Online payment is not enabled. You can still submit your application.":cCourse?"Enrollment is confirmed once your payment is verified.":"Payment is a separate step after submission."}</p>
  <label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
  <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={160}/></label>
  <label>College or university<input name="college" autoComplete="organization" required minLength={2} maxLength={140}/></label>
  <label className="check"><input type="checkbox" name="consent" value="yes" required/><span>I agree to submit these details to the organiser for this course application. Read the <a href="/privacy">privacy notice</a>.</span></label>
  <button className="btn primary">Submit application <ArrowRight size={17}/></button>
 </form>}
 <form id="track" className="panel formpanel" action="/forms/status" method="post">
   <h2>Track an application</h2>
   <label>Application reference<input name="id" defaultValue={id} required maxLength={30} autoComplete="off" spellCheck={false}/></label>
   <label>Private tracking code<input type="password" name="code" required minLength={64} maxLength={64} autoComplete="off"/></label>
   <button className="btn secondary">Check application status</button>
 </form>
 </>}
 </section></Frame>;
}
