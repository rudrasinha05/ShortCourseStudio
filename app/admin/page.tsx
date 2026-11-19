import {LaunchReadiness} from "./launch-readiness";
import {BatchScheduleFields} from "./batch-schedule-fields";
import {StudentDirectory,type DirectoryParams} from "./student-directory";
import {reminderPreview} from "@/lib/class-reminders";
import {ArrowRight,BookOpen,CalendarDays,ChartNoAxesColumn,Globe,GraduationCap,LayoutDashboard,Plus,Users} from "lucide-react";
import {adminSections,adminTarget,adminUrl,adminViews,resolveSection,type AdminSection} from "@/lib/admin-navigation";
import {PortalAccessDenied,PortalAccount,PortalNotice,PortalSignIn} from "@/app/portal-ui";
import {StaffPanel,SupportPanel} from "./staff-panel";
import {ApplicantTools,ControlCenter} from "./control-center";
import {learningFor,notesFor} from "@/lib/admin-controls";
import {IntakePanel,SiteControlsPanel,intakeMessages} from "./intake-panel";
import {AdminPortalPanel,facultyMessages} from "./portal-panel";
import {headers} from "next/headers";
import {crashCourse,getBannerFields} from "@/lib/course-banners";
import {cDayNumber,CRASH_SLUG,isCShortCourse} from "@/lib/courses";
import {getClassSessions} from "@/lib/class-sessions";
import {Frame} from "@/app/ui";
import {requestIdentity} from "@/lib/portals";
import {canApply,db,getSiteControls,isAdminIdentity,getCourses,paymentAmount,paymentMode} from "@/lib/enrollment";
import {listApplications,REVIEW_STATES,reviewLabels,type AppFilters} from "@/lib/form-workflows";

export const dynamic="force-dynamic";
export const metadata={title:"Admin Portal",robots:{index:false,follow:false}};
const messages:Record<string,string>={"banner-saved":"Homepage banner saved.","banner-invalid":"Check the batch, start time and photo URL.","classes-saved":"Class schedule saved.","classes-invalid":"Check the batch, start and end times, and HTTPS links.","access-saved":"Class access updated.","access-invalid":"Accept the application before granting class access.",saved:"Course changes saved.",reviewed:"Application status updated.",invalid:"The details could not be saved. Check the form and try again.",schedule:"Enter the schedule and delivery mode before opening applications.","schedule-invalid":"Choose a valid date, time and delivery mode.","course-batch-stale":"The active batch changed. Reload this course before saving.",instructor:"Save one instructor in the course banner section for this batch before opening applications.","parent-course":"Open applications on the full C Programming course, not on an individual day plan.",retry:"The request could not be completed. Please try again."};
const query=(values:Record<string,string>)=>new URLSearchParams(values).toString();

type Course=Awaited<ReturnType<typeof getCourses>>[number];
type Params=AppFilters&DirectoryParams&{section?:string;view?:string;course?:string;filter?:string;page?:string;message?:string;portalMessage?:string;intakeMessage?:string;controlMessage?:string};
const icons={overview:LayoutDashboard,students:Users,courses:BookOpen,classes:CalendarDays,faculty:GraduationCap,website:Globe,reports:ChartNoAxesColumn};
const quickLinks=[
 {label:"Review applications",description:"Check new submissions and update application status.",anchor:"applications",icon:Users},
 {label:"Manage batch admissions",description:"Open or close applications for a course.",anchor:"enrollment-controls",icon:BookOpen},
 {label:"Add a faculty member",description:"Create an instructor profile with a short bio.",anchor:"add-faculty",icon:Plus},
 {label:"Set up a class",description:"Add class timings, live links or recordings.",anchor:"class-schedule",icon:CalendarDays},
] as const;
export default async function Page({searchParams}:{searchParams:Promise<Params>}){
 const h=await headers(),user=requestIdentity(h);
 if(!user)return <PortalSignIn role="Admin" path="/admin"/>;
 if(!isAdminIdentity(h))return <PortalAccessDenied role="Admin" path="/admin" email={user.email}><p>The Admin Portal is restricted to the site owner. If you were assigned a staff role, open the <a className="textlink" href="/staff">Staff Portal</a>.</p></PortalAccessDenied>;
 const [p,courses]=await Promise.all([searchParams,getCourses()]);
 const section=resolveSection(p.section,!!(p.filter||p.q||p.page||p.batch||p.payment||p.review));
 const views=section==="overview"?[]:adminViews[section];
 const applicationFilters=!!(p.filter||p.q||p.page||p.batch||p.payment||p.review);
 const view=views.find(([id])=>id===p.view)?.[0]??(section==="students"&&applicationFilters?"applications":views[0]?.[0]??"");
 const explicitCourse=courses.find(x=>x.slug===p.course);
 const selected=explicitCourse??courses.find(x=>x.slug===CRASH_SLUG)??courses[0];
 const c=cDayNumber(selected.slug)&&view!=="syllabus"?courses.find(x=>x.slug===CRASH_SLUG)??selected:selected;
 const group=adminSections.find(x=>x.id===section)!;
 const picker=({
  batch:{label:"Course for batch rules",button:"Load batch rules"},
  syllabus:{label:"Course or day plan to edit",button:"Load syllabus"},
  catalogue:{label:"Course for catalogue visibility",button:"Load course visibility"},
  schedule:{label:"Course for class timetable",button:"Load timetable"},
  resources:{label:"Course for learning materials",button:"Load resources"},
  assignments:{label:"Course for faculty assignment",button:"Load assignments"},
  banners:{label:"Course for homepage banner",button:"Load banner"},
 } as Record<string,{label:string;button:string}>)[view];
 const intakeCourse=explicitCourse&&explicitCourse.visibility==="published"&&!cDayNumber(explicitCourse.slug)?explicitCourse:undefined;
 const notice=p.message?messages[p.message]:p.portalMessage?facultyMessages[p.portalMessage]:p.intakeMessage?intakeMessages[p.intakeMessage]:p.controlMessage==="saved"?"Changes saved.":p.controlMessage==="invalid"?"Nothing was saved. Check the fields and try again.":undefined;
 const ok=["saved","reviewed","classes-saved","access-saved","banner-saved","faculty-added","faculty-updated","assignment-saved","proposal-reviewed","intake-saved","site-saved"].includes(p.message??p.portalMessage??p.intakeMessage??p.controlMessage??"");
 return <Frame portalHeader={{role:"Admin",path:"/admin",signedIn:true}}><div className="wrap portal admin-shell">
  <header className="admin-hero"><div><p className="admin-kicker">Short Course Studio</p><h1>Admin Portal</h1><p>Manage courses, students and the website from one place.</p></div><div className="admin-header-account"><PortalAccount email={user.email} path="/admin"/><a className="textlink" href="/admin/security">Admin security</a></div></header>
  <div className="admin-layout">
   <nav className="admin-sidebar" aria-label="Admin sections"><p className="admin-nav-label">Workspace</p>{adminSections.map(item=>{const Icon=icons[item.id];return <a key={item.id} aria-current={item.id===section?"page":undefined} href={adminUrl(item.id)}><Icon size={17} aria-hidden="true"/><span>{item.label}</span></a>;})}</nav>
   <div className="admin-workspace" id="admin-workspace">
    <div className="admin-section-head"><p className="admin-kicker">Workspace / {group.label}</p><h2>{group.label}</h2><p>{group.description}</p></div>
    {views.length>0&&<nav aria-label={group.label+" tools"} className="admin-tabs">{views.map(([id,label])=><a key={id} aria-current={id===view?"page":undefined} href={adminUrl(section,{view:id})}>{label}</a>)}</nav>}
    <PortalNotice message={notice} ok={ok}/>
    {picker&&<CoursePicker courses={courses} selected={c} section={section} view={view} {...picker}/>}
    {section==="overview"?<Overview courses={courses} selected={c}/>:
     view==="roster"?<StudentDirectory courses={courses} params={p}/>:
     view==="applications"?<Applications courses={courses} selected={c} p={p}/>:
     view==="support"?<SupportPanel/>:
     view==="admissions"?<IntakePanel courses={courses} selected={intakeCourse}/>:
     view==="syllabus"?<CourseEditor c={c}/>:
     view==="schedule"?<ClassSchedule c={c}/>:
     section==="faculty"?<AdminPortalPanel courses={courses} selected={c} view={view as "directory"|"proposals"|"assignments"}/>:
     view==="banners"?<CourseBanners c={c}/>:
     view==="controls"?<SiteControlsPanel selected={c}/>:
     view==="access"?<StaffPanel/>:
     view==="launch"?<LaunchReadiness courses={courses}/>:
     <ControlCenter courses={courses} selected={c} view={view}/>}
   </div>
  </div>
 </div></Frame>;
}
function CoursePicker({courses,selected,section,view,label,button}:{courses:Course[];selected:Course;section:AdminSection;view:string;label:string;button:string}){
 const options=courses.filter(x=>view==="syllabus"||!cDayNumber(x.slug));
 return <form className="panel formpanel admin-course-picker" method="get" action="/admin">
  <input type="hidden" name="section" value={section}/><input type="hidden" name="view" value={view}/>
  <label>{label}<select name="course" defaultValue={selected.slug}>{options.map(x=><option key={x.slug} value={x.slug}>{cDayNumber(x.slug)?"C · Day "+cDayNumber(x.slug)+" · ":""}{x.title}</option>)}</select></label>
  <button className="btn secondary">{button}</button><span className="admin-field-hint">Batch {selected.batch}</span>
 </form>;
}
async function Overview({courses,selected}:{courses:Course[];selected:Course}){
 const [summary,controls]=await Promise.all([db().prepare(`SELECT
 (SELECT COUNT(*) FROM applications) AS applications,
 (SELECT COUNT(*) FROM applications WHERE review_state IN ('submitted','under_review')) AS pending,
 (SELECT COUNT(*) FROM faculty_profiles WHERE active=1) AS faculty,
 (SELECT COUNT(*) FROM applicant_support WHERE status='open') AS support`).first<{applications:number;pending:number;faculty:number;support:number}>(),getSiteControls()]);
 const mode=paymentMode(),open=courses.filter(c=>!cDayNumber(c.slug)&&canApply(c)).length;
 const stats=[["Open batches",open,"enrollment-controls"],["Applications",summary?.applications??0,"applications"],["Awaiting review",summary?.pending??0,"applications"],["Active faculty",summary?.faculty??0,"faculty-directory"]] as const;
 return <div className="admin-overview">
  <div className="admin-metrics" aria-label="Key numbers">{stats.map(([label,value,target])=><a key={label} href={adminTarget(target,label==="Awaiting review"?{review:"pending"}:{})}><span>{label}</span><strong>{value}</strong><ArrowRight size={16} aria-hidden="true"/></a>)}</div>
  <section className="portal-section"><h2>Quick actions</h2><div className="admin-quick-grid">{quickLinks.map(({label,description,anchor,icon:Icon})=><a className="panel admin-quick-card" key={anchor} href={anchor==="add-faculty"?adminUrl("faculty",{view:"directory"},"add-faculty"):adminTarget(anchor,{course:selected.slug})}><span className="admin-icon"><Icon size={19} aria-hidden="true"/></span><span><strong>{label}</strong><small>{description}</small></span><ArrowRight className="admin-quick-arrow" size={16} aria-hidden="true"/></a>)}</div></section>
  <section className="panel admin-status" aria-label="Website status">
   <div><strong>New applications</strong><span>{controls.intake_paused?"Paused site-wide":"Allowed for open batches"}</span></div>
   <div><strong>Online checkout</strong><a className="textlink" href={adminTarget("launch-readiness")}>{mode==="live"?"Live":mode==="test"?"Test only":"Not configured"} · Launch checklist</a></div>
   <div><strong>Open support requests</strong><a className="textlink" href={adminTarget("support-requests")}>{summary?.support??0} · View requests</a></div>
  </section>
 </div>;
}
function CourseEditor({c}:{c:Course}){
 return <section className="portal-section" id="course-management"><h2>Course details &amp; syllabus</h2><p>Edit what students see on the course page.</p>
 <form key={c.slug+"/"+c.batch} className="panel formpanel" action="/forms/admin/course" method="post">
 <h2>Edit course</h2><p>{cDayNumber(c.slug)?"Exclusive day plan · Applications are managed on the full course.":c.exclusive?"Exclusive Short-Term Course · One instructor · 15 hours total":"Regular Short-Term Course · One module · 15 hours"}</p><input type="hidden" name="slug" value={c.slug}/>
 <label>Title<input name="title" required minLength={3} maxLength={100} defaultValue={c.title}/></label>
 <label>Introduction<textarea name="blurb" required minLength={4} maxLength={450} defaultValue={c.blurb}/></label>
 <label>Project outcome<textarea name="outcome" required minLength={4} maxLength={300} defaultValue={c.outcome}/></label>
 {c.days.map(([topic,practical],i)=><fieldset key={i}><legend>{cDayNumber(c.slug)?"Topic":"Day"} {i+1}</legend><label>Lecture topic<input name={"topic"+i} required minLength={2} maxLength={140} defaultValue={topic}/></label><label>Practical<textarea name={"practical"+i} required minLength={2} maxLength={320} defaultValue={practical}/></label></fieldset>)}
 <details className="admin-detail"><summary>Batch and application settings</summary><div className="formpanel"><p>These settings are also available under Open or close applications.</p>
 <BatchScheduleFields schedule={c.schedule} mode={c.mode}/>
 <input type="hidden" name="batch" value={c.batch}/><p>Editing batch <strong>{c.batch}</strong>. Use Fees, deadlines &amp; batches to start a different cohort.</p>
 <label>Application status<select name="status" defaultValue={cDayNumber(c.slug)?"soon":c.status}><option value="soon">Batch announcement soon — applications locked</option>{!cDayNumber(c.slug)&&<option value="open">Announce batch and open applications</option>}<option value="closed">Applications closed</option></select></label></div></details>
 <div className="actions"><button className="btn primary">Save changes</button><a className="btn secondary" href={"/courses/"+c.slug}>View course page</a></div></form>
 </section>;
}
async function ClassSchedule({c}:{c:Course}){
 const [sessions,reminders]=await Promise.all([getClassSessions(c.slug,c.batch),cDayNumber(c.slug)?null:reminderPreview(c.slug,c.batch)]);
 return <section className="portal-section">
 {!cDayNumber(c.slug)&&<form id="class-schedule" className="panel formpanel" action="/forms/admin/sessions" method="post">
 <h2>Class schedule &amp; recordings</h2><p>Batch {c.batch}. Enter times in India Standard Time. Use private links restricted to enrolled students on your chosen platform.</p>
 <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
 {sessions.map(s=><details className="admin-detail" key={s.day} open={s.day===1||undefined}><summary>Day {s.day} {s.starts_at?"· Scheduled":""}</summary><div className="formpanel">
 <label>Starts (IST)<input type="datetime-local" name={"start"+s.day} defaultValue={s.starts_at}/></label>
 <label>Ends (IST)<input type="datetime-local" name={"end"+s.day} defaultValue={s.ends_at}/></label>
 <label>Live class link<input type="url" name={"live"+s.day} maxLength={1500} defaultValue={s.live_url}/></label>
 <label>Recording link<input type="url" name={"replay"+s.day} maxLength={1500} defaultValue={s.replay_url}/></label>
 </div></details>)}
 <button className="btn primary">Save class schedule</button></form>}
 {reminders&&<section className="panel admin-summary" aria-labelledby="reminder-status-title">
  <h2 id="reminder-status-title">Class reminders</h2>
  <p>Scheduled reminders are for enrolled students and faculty assigned to this batch. WhatsApp is sent only to people who opt in.</p>
  <p><strong>Email:</strong> {reminders.channels.email?"Sender configured":"Not connected"} · <strong>WhatsApp:</strong> {reminders.channels.whatsapp?"Sender configured":"Not connected"}</p>
  {reminders.channels.email||reminders.channels.whatsapp?<p>The scheduled delivery job must also be connected. Batch delivery attempts: {reminders.totals.accepted??0} accepted by providers, {reminders.totals.failed??0} failed or unconfirmed, {reminders.totals.attempting??0} in progress or interrupted.</p>:<p>Reminders aren’t being sent yet. Connect the senders and scheduled delivery job to activate them.</p>}
 </section>}
 </section>;
}
async function CourseBanners({c}:{c:Course}){
 const [crashBanner,courseBanner]=await Promise.all([getBannerFields(crashCourse.slug,crashCourse.batch),isCShortCourse(c.slug)?null:getBannerFields(c.slug,c.batch)]);
 return <section className="portal-section"><h2>Course banners</h2><p>Set the instructor, image and timing for homepage batch promotions.</p>
 {courseBanner?<BannerForm id="course-banner" heading={c.title} slug={c.slug} batch={c.batch} data={courseBanner}/>:<BannerForm id="crash-banner" heading={c.slug===CRASH_SLUG?c.title:crashCourse.title} slug={crashCourse.slug} batch={crashCourse.batch} data={crashBanner}/>}
 </section>;
}
async function Applications({courses,selected:c,p}:{courses:Course[];selected:Course;p:Params}){
 const filter=courses.find(x=>x.slug===p.filter)?.slug??"";
 const page=typeof p.page==="string"&&/^[1-9][0-9]{0,4}$/.test(p.page)?Number(p.page):1;
 const filters={q:typeof p.q==="string"?p.q.slice(0,120):"",review:typeof p.review==="string"?p.review:"",payment:typeof p.payment==="string"?p.payment:"",batch:typeof p.batch==="string"?p.batch:""};
 const {rows,next}=await listApplications(filter,page,filters);
 const [notes,learning]=await Promise.all([notesFor(rows.map(r=>r.id)),learningFor(rows.map(r=>r.id))]);
 const returnFields={filter,page:String(page),returnQ:filters.q,returnBatch:filters.batch,returnReview:filters.review,returnPayment:filters.payment};
 const link=(page:number)=>adminTarget("applications",{course:c.slug,filter,page:String(page),...filters});
 return  <section id="applications" className="panel formpanel records"><h2>Student applications</h2>
 <p>Review applications, verify fees and manage class access.</p><form className="filter-form admin-filters" action="/admin#applications" method="get"><input type="hidden" name="section" value="students"/><input type="hidden" name="view" value="applications"/><input type="hidden" name="course" value={c.slug}/><label>Filter by course<select name="filter" defaultValue={filter}><option value="">All courses</option>{courses.map(x=><option key={x.slug} value={x.slug}>{cDayNumber(x.slug)?"C · Day "+cDayNumber(x.slug)+" · ":""}{x.title}</option>)}</select></label><label>Search applicants<input name="q" maxLength={120} defaultValue={filters.q} placeholder="Name, email, college or reference"/></label><label>Batch ID<input name="batch" maxLength={30} defaultValue={filters.batch}/></label><label>Review status<select name="review" defaultValue={filters.review}><option value="">All</option><option value="pending">Awaiting review</option>{REVIEW_STATES.map(s=><option key={s} value={s}>{reviewLabels[s]}</option>)}</select></label><label>Payment status<select name="payment" defaultValue={filters.payment}><option value="">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="test_paid">Test paid</option></select></label><button className="btn secondary">Apply filters</button><a className="textlink" href={adminTarget("applications")}>Clear filters</a></form>
 <p>{rows.length?rows.length+" records on page "+page:"No applications match these filters."}</p>
 {rows.length>0&&<a className="btn secondary" href={"/forms/admin/export?"+query({filter,page:String(page),...filters})}>Download page as CSV</a>}
 <div className="application-list">{rows.map(r=><article key={r.id} className="app-record"><a className="textlink" href={adminUrl("students",{view:"roster",student:r.id})}>{r.name}</a><p>{r.email} · {r.college}</p><p>{courses.find(x=>x.slug===r.slug)?.title??r.slug} · {r.batch}</p><small>{r.id}</small>{!cDayNumber(r.slug)&&<p>Payment: {r.payment_state.replace("_"," ")}</p>}
 <form className="filter-form" action="/forms/admin/review" method="post"><input type="hidden" name="id" value={r.id}/><input type="hidden" name="slug" value={c.slug}/><ApplicationReturn values={returnFields}/><label>Review status<select name="review" defaultValue={r.review_state}>{REVIEW_STATES.map(s=><option key={s} value={s}>{reviewLabels[s]}</option>)}</select></label><button className="btn secondary">Update status</button></form>
 {r.review_state==="accepted"&&(r.slug!==CRASH_SLUG||r.payment_state==="paid")&&<form className="formpanel" action="/forms/admin/class-access" method="post"><input type="hidden" name="id" value={r.id}/><input type="hidden" name="slug" value={c.slug}/><ApplicationReturn values={returnFields}/><input type="hidden" name="grant" value={r.class_access?"no":"yes"}/><p>Class access: {r.class_access?"Granted":"Not granted"}</p><button className="btn secondary">{r.class_access?"Revoke class access":"Grant class access"}</button></form>}
 <ApplicantTools returnFields={returnFields} id={r.id} slug={c.slug} notes={notes.filter(n=>n.application_id===r.id)} record={learning.find(l=>l.application_id===r.id)} amount={paymentAmount(r)} offline={r.payment_state==="unpaid"&&r.review_state!=="declined"&&!cDayNumber(r.slug)} answers={r.form_answers} eligible={r.review_state==="accepted"&&r.class_access===1&&(r.slug!==CRASH_SLUG||r.payment_state==="paid")}/>
 </article>)}</div>
 <div className="actions">{page>1&&<a className="btn secondary" href={link(page-1)}>Previous page</a>}{next&&<a className="btn secondary" href={link(page+1)}>Next page</a>}</div>
 </section>;
}
function ApplicationReturn({values}:{values:Record<string,string>}){return Object.entries(values).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>);}

function BannerForm({id,heading,slug,batch,data}:{id:string;heading:string;slug:string;batch:string;data:Awaited<ReturnType<typeof getBannerFields>>}){
 return <form id={id} className="panel formpanel" action="/forms/admin/banner" method="post">
 <h2>Homepage banner</h2><p>{heading} · Batch {batch}</p>
 <input type="hidden" name="slug" value={slug}/><input type="hidden" name="batch" value={batch}/>
 <label>Faculty name<input name="faculty" maxLength={100} defaultValue={data.faculty}/></label>
 <label>Qualification<input name="qualification" maxLength={150} defaultValue={data.qualification}/></label>
 <label>Working profile<input name="profile" maxLength={180} defaultValue={data.profile}/></label>
 <label>Faculty photo URL<input name="photo" type={slug===crashCourse.slug?"text":"url"} maxLength={1500} defaultValue={data.photo} placeholder="https://…"/></label>
 <label>Start date and time (IST)<input name="startsAt" type="datetime-local" defaultValue={data.starts_at}/></label>
 <label>Timing or batch notes<input name="timing" maxLength={180} defaultValue={data.timing}/></label>
 <label className="check"><input type="checkbox" name="visible" value="yes" defaultChecked={!!data.visible}/> Show on homepage</label>
 <p>{slug===crashCourse.slug?"Leave the start and photo blank to use the launch defaults.":"Leave start time blank to use the first scheduled class, when available. Saving the instructor does not open applications."} Past batches are automatically removed.</p>
 <button className="btn primary">Save homepage banner</button></form>
}
