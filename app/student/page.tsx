import {wishlistStudentPath} from "@/lib/wishlist-path";
import {WishlistButton,WishlistPanel} from "@/app/wishlist-client";
import {WishlistCourseCard} from "@/app/wishlist-course-card";
import {courseHref,wishlistCourseSummary,wishlistStudentIdentity} from "@/lib/wishlist";
import {loadReminderContact} from "@/lib/class-reminders";
import {ReminderContactForm} from "@/app/reminder-contact-form";
import {LearningPreferenceFields} from "@/app/learning-preference-fields";
import {emptyLearningPreferences,matchCourses} from "@/lib/learning-preferences";
import {loadLearningProfile} from "@/lib/student-learning-profile";
import {studentSupport,supportTypes} from "@/lib/staff";
import {getMaterials,getNoticeTemplates,getSiteContent,learningFor} from "@/lib/admin-controls";
import {headers} from "next/headers";
import {ArrowRight,BookOpen,Compass,LayoutDashboard,LifeBuoy,ClipboardList,Heart} from "lucide-react";
import {Badge,Frame} from "@/app/ui";
import {PortalAccount,PortalNotice,PortalSignIn} from "@/app/portal-ui";
import {CourseSlideshow} from "./course-slideshow";
import {canApply,getCourses,intakeStatus,publicCatalogue} from "@/lib/enrollment";
import {getClassSessions,formatClassTime,hasClassAccess} from "@/lib/class-sessions";
import {reviewLabels} from "@/lib/form-workflows";
import {studentApplications} from "@/lib/portals";
import {cDayNumber} from "@/lib/courses";

export const dynamic="force-dynamic";
export const metadata={title:"Student Portal",robots:{index:false,follow:false}};
type Course=Awaited<ReturnType<typeof getCourses>>[number];
const portalNotices:Record<string,string>={"reminders-saved":"Reminder preferences saved.","reminders-invalid":"Enter an Indian mobile number or include the country code.","support-saved":"Support request received.","support-invalid":"Could not submit. Check the details or see whether a request of this type is already open.",linked:"Application linked to your account.","preferences-saved":"Learning preferences saved.","preferences-invalid":"Could not save those preferences. Check your entries and try again.","not-linked":"Could not link that application. Check your reference, tracking code and signed-in email.",retry:"Could not complete the request. Please try again."};
const paymentLabel=(state:string)=>state==="paid"?"Paid":state==="test_paid"?"Test payment":state==="refunded"?"Refunded":"Not paid";

function Suggestions({id,title,description,courses,reasons,empty}:{id:string;title:string;description:string;courses:Course[];reasons?:Map<string,string[]>;empty?:string}){
 return <section id={id} className="portal-section"><h2>{title}</h2><p>{description}</p>
  {courses.length?<div className="grid">{courses.map(c=><WishlistCourseCard student key={c.slug} slug={c.slug} title={c.title} href={courseHref(c.slug)} label="View syllabus"><Badge status={intakeStatus(c)}/><h4>{c.title}</h4><p>{c.track}</p>{reasons?.has(c.slug)&&<ul className="course-match-reasons" aria-label="Why this course">{reasons.get(c.slug)!.map(reason=><li key={reason}>{reason}</li>)}</ul>}</WishlistCourseCard>)}</div>:<p className="mutedbox">{empty??"No additional courses to show here yet."}</p>}
 </section>;
}
const studentSections=[
 {id:"overview",label:"Overview",description:"Your learning progress and next steps.",icon:LayoutDashboard},
 {id:"courses",label:"My courses",description:"Class links, materials and certificates for your enrolled courses.",icon:BookOpen},
 {id:"applications",label:"Applications",description:"Manage applications and check payment status.",icon:ClipboardList},
 {id:"explore",label:"Explore courses",description:"Find related courses and recommended next steps.",icon:Compass},
 {id:"wishlist",label:"Wishlist",description:"Find the courses you saved for later.",icon:Heart},
 {id:"support",label:"Help & support",description:"Send a question about your application to the organiser.",icon:LifeBuoy},
] as const;
type StudentView=typeof studentSections[number]["id"];
const studentUrl=(view:StudentView)=>view==="overview"?"/student":"/student?view="+view;
export default async function Student({searchParams}:{searchParams:Promise<{message?:string;view?:string;course?:string}>}){
 const user=wishlistStudentIdentity(await headers());
 const p=await searchParams;
 const group=studentSections.find(({id})=>id===p.view)??studentSections[0];
 const view=group.id;
 const selectedSlug=view==="wishlist"&&typeof p.course==="string"&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(p.course)?p.course:undefined;
 if(!user)return <PortalSignIn role="Student" path={selectedSlug?wishlistStudentPath(selectedSlug):studentUrl(view)}/>;
 const [courses,rows,content,notices,support,preferences,reminderContact]=await Promise.all([getCourses(),studentApplications(user),getSiteContent(),view==="courses"?getNoticeTemplates():null,view==="support"?studentSupport(user.id):[],view==="explore"?loadLearningProfile(user.id):null,view==="support"?loadReminderContact(user.id):null]);
 const publicCourses=publicCatalogue(courses);
 const enrolled=rows.filter(hasClassAccess),taken=new Set(rows.map(row=>row.slug));
 const courseMap=new Map(courses.map(c=>[c.slug,c]));
 const tracks=new Set(enrolled.map(r=>courseMap.get(r.slug)?.track));
 const candidates=publicCourses.filter(c=>!cDayNumber(c.slug)&&c.status!=="closed"&&!taken.has(c.slug));
 candidates.sort((a,b)=>Number(canApply(b))-Number(canApply(a)));
 const related=candidates.filter(c=>tracks.has(c.track)).slice(0,3);
 const prefs=preferences??emptyLearningPreferences;
 const matches=view==="explore"?matchCourses(candidates,prefs,content.recommendations).slice(0,3):[];
 const reasons=new Map(matches.map(match=>[match.course.slug,match.reasons]));
 const hasPreferences=prefs.interests.length>0||!!prefs.skills;
 const featured=publicCourses.filter(c=>!cDayNumber(c.slug)&&c.status!=="closed").sort((a,b)=>Number(canApply(b))-Number(canApply(a)));
 const perTrack=new Set<string>(),defaults=featured.filter(c=>{if(perTrack.has(c.track))return false;perTrack.add(c.track);return true;}).slice(0,6);
 const slides=content.slides.length?content.slides.flatMap(slug=>featured.filter(c=>c.slug===slug)):defaults;
 const [sessions,learning,materials]=view==="courses"?await Promise.all([Promise.all(enrolled.map(r=>getClassSessions(r.slug,r.batch))),learningFor(enrolled.map(r=>r.id)),Promise.all(enrolled.map(r=>getMaterials(r.slug,r.batch)))]):[[],[],[]] as const;
 const stats=[{label:"Enrolled courses",value:enrolled.length,view:"courses"},{label:"Applications",value:rows.length,view:"applications"},{label:"Verified payments",value:rows.filter(r=>r.payment_state==="paid").length,view:"applications"}] as const;
 return <Frame portalHeader={{role:"Student",path:studentUrl(view),signedIn:true}}><div className="wrap portal admin-shell student-shell">
  <header className="admin-hero"><div><p className="admin-kicker">Short Course Studio</p><h1>Student Portal</h1><p>My learning dashboard</p></div><PortalAccount email={user.email} path={studentUrl(view)}/></header>
  <div className="admin-layout">
   <nav className="admin-sidebar" aria-label="Student sections"><p className="admin-nav-label">Workspace</p>{studentSections.map(({id,label,icon:Icon})=><a href={studentUrl(id)} aria-current={id===view?"page":undefined} key={id}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}</nav>
   <div className="admin-workspace">
    <div className="admin-section-head"><p className="admin-kicker">Workspace / {group.label}</p><h2>{group.label}</h2><p>{group.description}</p></div>
    <PortalNotice ok={p.message==="linked"||p.message==="support-saved"||p.message==="preferences-saved"||p.message==="reminders-saved"} message={p.message?portalNotices[p.message]:undefined}/>
    {view==="overview"&&<>
     <div className="admin-metrics" aria-label="Key numbers">{stats.map(s=><a key={s.label} href={studentUrl(s.view)}><span>{s.label}</span><strong>{s.value}</strong><ArrowRight size={16} aria-hidden="true"/></a>)}</div>
     <section className="portal-section"><h2>Quick actions</h2><div className="admin-quick-grid">
      <a className="panel admin-quick-card" href="/apply"><span className="admin-icon"><ClipboardList size={19} aria-hidden="true"/></span><span><strong>Apply for a course</strong><small>Choose a batch that is accepting applications.</small></span><ArrowRight size={16} aria-hidden="true"/></a>
      <a className="panel admin-quick-card" href={studentUrl("courses")}><span className="admin-icon"><BookOpen size={19} aria-hidden="true"/></span><span><strong>Open my courses</strong><small>Find class links, recordings and learning materials.</small></span><ArrowRight size={16} aria-hidden="true"/></a>
     </div></section>
     <CourseSlideshow slides={slides}/>
    </>}
  {view==="courses"&&<section className="portal-section" id="enrolled"><h2>Enrolled courses</h2>
  {enrolled.length?<div className="grid">{enrolled.map((r,i)=>{const record=learning.find(item=>item.application_id===r.id);return <article className="panel portal-panel" key={r.id}><h3>{courseMap.get(r.slug)?.title??r.slug}</h3><p>Batch {r.batch} · {paymentLabel(r.payment_state)}</p>
    <details className="portal-details"><summary>Class schedule and recordings</summary><ul className="portal-checklist">{sessions[i].map(s=><li key={s.day}><strong>Day {s.day}</strong><span>{s.starts_at?formatClassTime(s.starts_at)+" IST":"Time to be announced"}</span><div className="actions">{s.live_url&&<a className="textlink" href={s.live_url} target="_blank" rel="noopener noreferrer">Join live</a>}{s.replay_url&&<a className="textlink" href={s.replay_url} target="_blank" rel="noopener noreferrer">Watch replay</a>}</div></li>)}</ul></details>
    {materials[i].some(m=>m.resource_url||m.assignment_url)&&<details className="portal-details"><summary>Resources and assignments</summary><ul className="portal-checklist">{materials[i].filter(m=>m.resource_url||m.assignment_url).map(m=><li key={m.day}><strong>Day {m.day}</strong><div className="actions">{m.resource_url&&<a className="textlink" href={m.resource_url} target="_blank" rel="noopener noreferrer">{m.resource_title}</a>}{m.assignment_url&&<a className="textlink" href={m.assignment_url} target="_blank" rel="noopener noreferrer">{m.assignment_title}</a>}</div></li>)}</ul></details>}
    {notices?.classReminder&&<p>{notices.classReminder}</p>}
    {record&&<p>Attendance: {(JSON.parse(record.attendance) as number[]).length}/5 · Result: {record.result.replaceAll("_"," ")}{record.score===null?"":" · Score "+record.score+"%"}</p>}
    {courseMap.has(r.slug)&&publicCourses.some(c=>c.slug===r.slug)&&<WishlistButton student slug={r.slug} title={courseMap.get(r.slug)!.title}/>}
    {record?.certificate_id&&<a className="textlink" href={"/certificate?id="+record.certificate_id}>View completion certificate</a>}
   </article>;})}</div>:<p className="mutedbox">No enrolled courses yet. An accepted application with class access will appear here.</p>}
  </section>}
  {view==="explore"&&<>
   <form className="panel formpanel" method="post" action="/forms/student/learning-profile">
    <h3>Your interests and skills</h3><p>Update the preferences from your application or add them here. They don’t affect admission decisions.</p>
    <LearningPreferenceFields value={prefs}/>
    <button className="btn primary">Save learning preferences</button>
   </form>
   <Suggestions id="related" title="Related courses" description="Build on subjects you’re already studying." courses={related}/>
   <Suggestions id="recommended" title="Recommended for you" description="Based on your interests, existing skills and experience. Each match shows why it fits." courses={matches.map(match=>match.course)} reasons={reasons}
    empty={hasPreferences?"No courses match those interests or skills right now. You can adjust your preferences or browse the full catalogue.":"Add your interests or skills above to see personalised recommendations."}/>
  </>}
  {view==="wishlist"&&<WishlistPanel courses={publicCourses.map(wishlistCourseSummary)} selectedSlug={selectedSlug}/>}
  {view==="applications"&&<section className="portal-section" id="applications"><h2>My applications</h2>
   {rows.length>0&&<ul className="portal-checklist panel">{rows.map(r=><li key={r.id}><strong>{courseMap.get(r.slug)?.title??r.slug}</strong><span>{r.id} · {reviewLabels[r.review_state]??r.review_state} · {paymentLabel(r.payment_state)}</span><a className="textlink" href={"/apply?ref="+r.id}>Open application</a></li>)}</ul>}
   <details className="panel portal-panel portal-details"><summary>Link a previous application</summary><form className="formpanel" method="post" action="/forms/student/claim"><h3>Link an existing application</h3><p>Use your reference and tracking code. The application email must match your signed-in account.</p>
    <label>Application reference<input required name="id" maxLength={30} autoComplete="off"/></label>
    <label>Tracking code<input required name="code" type="password" minLength={64} maxLength={64} autoComplete="off"/></label><button className="btn primary">Link application</button>
   </form></details>
   <div className="portal-links"><a className="textlink" href="/apply">Apply for an open batch</a></div>
  </section>}
  {view==="support"&&<section className="portal-section" id="support"><h2>Application support</h2>
   <ReminderContactForm role="student" contact={reminderContact}/>
   {rows.length?<form className="panel formpanel" method="post" action="/forms/student/support">
    <label>Application<select name="id">{rows.map(r=><option value={r.id} key={r.id}>{courseMap.get(r.slug)?.title??r.slug} · {r.id}</option>)}</select></label>
    <label>Request type<select name="type">{Object.entries(supportTypes).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    <label>How can we help?<textarea name="message" required minLength={3} maxLength={1000}/></label><button className="btn secondary">Submit support request</button>
   </form>:<p className="mutedbox">Link an application to send a support request.</p>}
   {support.length>0&&<ul className="panel portal-checklist">{support.map(s=><li key={s.id}><strong>{supportTypes[s.type]} · {s.status}</strong><p>{s.message}</p>{s.response&&<p><strong>Organiser reply</strong> {s.response}</p>}</li>)}</ul>}
  </section>}
   </div>
  </div>
 </div></Frame>;
}
