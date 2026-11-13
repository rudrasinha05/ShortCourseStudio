import {headers} from "next/headers";
import {crashCourse,getBannerFields} from "@/lib/course-banners";
import {getClassSessions} from "@/lib/class-sessions";
import {Frame} from "@/app/ui";
import {chatGPTSignInPath} from "@/app/chatgpt-auth";
import {isAdminIdentity,getCourses,paymentMode} from "@/lib/enrollment";
import {listApplications,REVIEW_STATES,reviewLabels} from "@/lib/form-workflows";

export const dynamic="force-dynamic";
export const metadata={title:"Course admin",robots:{index:false,follow:false}};
const messages:Record<string,string>={"banner-saved":"Homepage banner saved.","banner-invalid":"Check the batch, start time and photo URL.","classes-saved":"Class schedule saved.","classes-invalid":"Check the batch, start and end times, and HTTPS links.","access-saved":"Class access updated.","access-invalid":"Accept the application before granting class access.",saved:"Course changes saved.",reviewed:"Application status updated.",invalid:"The details could not be saved. Check the form and try again.",schedule:"Enter the schedule and delivery mode before opening applications.",retry:"The request could not be completed. Please try again."};
const query=(values:Record<string,string>)=>new URLSearchParams(values).toString();
export default async function Page({searchParams}:{searchParams:Promise<{course?:string;filter?:string;page?:string;message?:string}>}){
 const h=await headers();
 if(!isAdminIdentity(h))return <Frame><section className="wrap narrow prose"><span className="eyebrow"><i/> COURSE MANAGEMENT</span><h1>Short Course Studio administration</h1>{h.get("oai-authenticated-user-id")?<p>This account does not have admin access.</p>:<><p>Sign in with the ChatGPT account that owns this site.</p><a href={chatGPTSignInPath("/admin")} className="btn primary" target="_top">Continue with ChatGPT</a></>}</section></Frame>;
 const p=await searchParams,courses=await getCourses(),c=courses.find(x=>x.slug===p.course)??courses[0];
 const filter=courses.find(x=>x.slug===p.filter)?.slug??"";
 const page=typeof p.page==="string"&&/^[1-9][0-9]{0,4}$/.test(p.page)?Number(p.page):1;
 const {rows,next}=await listApplications(filter,page);
 const [sessions,courseBanner,crashBanner]=await Promise.all([getClassSessions(c.slug,c.batch),getBannerFields(c.slug,c.batch),getBannerFields(crashCourse.slug,crashCourse.batch)]);
 const mode=paymentMode();
 const link=(page:number)=>"/admin?"+query({course:c.slug,filter,page:String(page)})+"#applications";
 const ok=["saved","reviewed","classes-saved","access-saved","banner-saved"].includes(p.message??"");
 return <Frame><section className="wrap catalog prose"><span className="eyebrow"><i/> COURSE MANAGEMENT</span><h1>Short Course Studio administration</h1><p>Edit course details and review student applications. Checkout is {mode==="live"?"live":mode==="test"?"in test mode":"not configured"}.</p>
 {p.message&&messages[p.message]&&<p role={ok?"status":"alert"} className={ok?"success":"error"}>{messages[p.message]}</p>}
 <div className="admin-grid"><div>
 <form className="panel formpanel" method="get" action="/admin"><h2>Choose a course to edit</h2><input type="hidden" name="filter" value={filter}/><label>Course<select name="course" defaultValue={c.slug}>{courses.map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label><button className="btn secondary">Load course</button></form>
 <form className="panel formpanel" action="/forms/admin/course" method="post">
 <h2>Edit course</h2><input type="hidden" name="slug" value={c.slug}/>
 <label>Title<input name="title" required minLength={3} maxLength={100} defaultValue={c.title}/></label>
 <label>Introduction<textarea name="blurb" required minLength={4} maxLength={450} defaultValue={c.blurb}/></label>
 <label>Project outcome<textarea name="outcome" required minLength={4} maxLength={300} defaultValue={c.outcome}/></label>
 {c.days.map(([topic,practical],i)=><fieldset key={i}><legend>Day {i+1}</legend><label>Lecture topic<input name={"topic"+i} required minLength={2} maxLength={140} defaultValue={topic}/></label><label>Practical<textarea name={"practical"+i} required minLength={2} maxLength={320} defaultValue={practical}/></label></fieldset>)}
 <label>Schedule<input name="schedule" placeholder="Dates and timings" maxLength={150} defaultValue={c.schedule}/></label>
 <label>Delivery mode or venue<input name="mode" placeholder="Online or campus location" maxLength={100} defaultValue={c.mode}/></label>
 <label>Batch identifier<input name="batch" required maxLength={30} defaultValue={c.batch}/></label><p>Keep the same identifier when announcing an upcoming batch so its pre-applications stay with it.</p>
 <label>Application status<select name="status" defaultValue={c.status}><option value="soon">Batch announcement soon — pre-applications on</option><option value="open">Applications open</option><option value="closed">Applications closed</option></select></label>
 <div className="actions"><button className="btn primary">Save changes</button><a className="btn secondary" href={"/courses/"+c.slug}>View course page</a></div></form>
 <BannerForm id="crash-banner" heading="C by Horesh Sir" slug={crashCourse.slug} batch={crashCourse.batch} data={crashBanner}/>
 <BannerForm id="course-banner" heading={c.title} slug={c.slug} batch={c.batch} data={courseBanner}/>
 <form id="class-schedule" className="panel formpanel" action="/forms/admin/sessions" method="post">
 <h2>Class schedule &amp; recordings</h2><p>Batch {c.batch}. Enter times in India Standard Time. Use private links restricted to enrolled students on your chosen platform.</p>
 <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
 {sessions.map(s=><fieldset key={s.day}><legend>Day {s.day}</legend>
 <label>Starts (IST)<input type="datetime-local" name={"start"+s.day} defaultValue={s.starts_at}/></label>
 <label>Ends (IST)<input type="datetime-local" name={"end"+s.day} defaultValue={s.ends_at}/></label>
 <label>Live class link<input type="url" name={"live"+s.day} maxLength={1500} defaultValue={s.live_url}/></label>
 <label>Recording link<input type="url" name={"replay"+s.day} maxLength={1500} defaultValue={s.replay_url}/></label>
 </fieldset>)}
 <button className="btn primary">Save class schedule</button></form>
 </div>
 <section id="applications" className="panel formpanel records"><h2>Student applications</h2>
 <form className="filter-form" action="/admin#applications" method="get"><input type="hidden" name="course" value={c.slug}/><label>Filter by course<select name="filter" defaultValue={filter}><option value="">All courses</option>{courses.map(x=><option key={x.slug} value={x.slug}>{x.title}</option>)}</select></label><button className="btn secondary">Apply filter</button></form>
 <p>{rows.length?rows.length+" records on page "+page:"No applications on this page."}</p>
 {rows.length>0&&<a className="btn secondary" href={"/forms/admin/export?"+query({filter,page:String(page)})}>Download page as CSV</a>}
 <div className="application-list">{rows.map(r=><article key={r.id} className="app-record"><strong>{r.name}</strong><p>{r.email} · {r.college}</p><p>{courses.find(x=>x.slug===r.slug)?.title??r.slug} · {r.batch}</p><small>{r.id}</small><p>Payment: {r.payment_state.replace("_"," ")}</p>
 <form className="filter-form" action="/forms/admin/review" method="post"><input type="hidden" name="id" value={r.id}/><input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="filter" value={filter}/><input type="hidden" name="page" value={page}/><label>Review status<select name="review" defaultValue={r.review_state}>{REVIEW_STATES.map(s=><option key={s} value={s}>{reviewLabels[s]}</option>)}</select></label><button className="btn secondary">Update status</button></form>
 {r.review_state==="accepted"&&<form className="formpanel" action="/forms/admin/class-access" method="post"><input type="hidden" name="id" value={r.id}/><input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="filter" value={filter}/><input type="hidden" name="page" value={page}/><input type="hidden" name="grant" value={r.class_access?"no":"yes"}/><p>Class access: {r.class_access?"Granted":"Not granted"}</p><button className="btn secondary">{r.class_access?"Revoke class access":"Grant class access"}</button></form>}
 </article>)}</div>
 <div className="actions">{page>1&&<a className="btn secondary" href={link(page-1)}>Previous page</a>}{next&&<a className="btn secondary" href={link(page+1)}>Next page</a>}</div>
 </section></div></section></Frame>;
}

function BannerForm({id,heading,slug,batch,data}:{id:string;heading:string;slug:string;batch:string;data:Awaited<ReturnType<typeof getBannerFields>>}){
 return <form id={id} className="panel formpanel" action="/forms/admin/banner" method="post">
 <h2>Homepage banner</h2><p>{heading} · Batch {batch}</p>
 <input type="hidden" name="slug" value={slug}/><input type="hidden" name="batch" value={batch}/>
 <label>Faculty name<input name="faculty" maxLength={100} defaultValue={data.faculty}/></label>
 <label>Qualification<input name="qualification" maxLength={150} defaultValue={data.qualification}/></label>
 <label>Working profile<input name="profile" maxLength={180} defaultValue={data.profile}/></label>
 <label>Faculty photo URL<input name="photo" type="url" maxLength={1500} defaultValue={data.photo} placeholder="https://…"/></label>
 <label>Start date and time (IST)<input name="startsAt" type="datetime-local" defaultValue={data.starts_at}/></label>
 <label>Timing or batch notes<input name="timing" maxLength={180} defaultValue={data.timing}/></label>
 <label className="check"><input type="checkbox" name="visible" value="yes" defaultChecked={!!data.visible}/> Show on homepage</label>
 <p>Leave start time blank to use the first scheduled class, when available. Past batches are automatically removed.</p>
 <button className="btn primary">Save homepage banner</button></form>
}
