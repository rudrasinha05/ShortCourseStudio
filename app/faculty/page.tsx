import {loadReminderContact} from "@/lib/class-reminders";
import {ReminderContactForm} from "@/app/reminder-contact-form";
import {headers} from "next/headers";
import {ArrowRight,BookOpen,ClipboardPlus,KeyRound,LayoutDashboard,LifeBuoy,UserRound,Wallet} from "lucide-react";
import {Frame} from "@/app/ui";
import {PortalAccount,PortalNotice,PortalSignIn,Stats} from "@/app/portal-ui";
import {facultyDashboard,facultyFor,money,proposalSlug,requestIdentity,teachingDays} from "@/lib/portals";
import {getCourses} from "@/lib/enrollment";
import {getClassSessions,formatClassTime} from "@/lib/class-sessions";
import {TRACKS} from "@/lib/courses";

export const dynamic="force-dynamic";
export const metadata={title:"Faculty Portal",robots:{index:false,follow:false}};
const notices:Record<string,string>={"reminders-saved":"Reminder preferences saved.","reminders-invalid":"Enter an Indian mobile number or include the country code.",submitted:"Course submitted for administrator review.","progress-saved":"Class progress updated.",invalid:"Could not save the details. Check the form and your batch assignment.",retry:"Could not complete the request. Try again."};
const sections=[
 {id:"overview",label:"Overview",description:"See your teaching progress and next actions.",icon:LayoutDashboard},
 {id:"teaching",label:"Assigned batches",description:"Manage your schedule and mark completed classes.",icon:BookOpen},
 {id:"proposals",label:"Course submissions",description:"Send a syllabus for review and see your proposal status.",icon:ClipboardPlus},
 {id:"income",label:"Income",description:"View the amounts recorded for your batches.",icon:Wallet},
 {id:"profile",label:"My profile",description:"Review your faculty details and sign-in account.",icon:UserRound},
] as const;
type FacultyView=typeof sections[number]["id"];
const url=(view:FacultyView)=>view==="overview"?"/faculty":"/faculty?view="+view;
export default async function Faculty({searchParams}:{searchParams:Promise<{message?:string;view?:string}>}){
 const [h,p]=await Promise.all([headers(),searchParams]);
 const group=sections.find(s=>s.id===p.view)??sections[0],view=group.id;
 const user=requestIdentity(h);
 if(!user)return <PortalSignIn role="Faculty" path={url(view)}/>;
 const faculty=await facultyFor(user);
 if(!faculty)return <Frame portalHeader={{role:"Faculty",path:url(view),signedIn:true}}><div className="wrap portal admin-shell faculty-shell">
  <header className="admin-hero"><div><p className="admin-kicker">Short Course Studio</p><h1>Faculty Portal</h1><p>Teaching workspace</p></div><PortalAccount email={user.email} path="/faculty"/></header>
  <div className="admin-layout"><nav className="admin-sidebar faculty-access-nav" aria-label="Faculty access guide">
   <p className="admin-nav-label">Access guide</p>
   <a href="#faculty-access-status"><KeyRound size={17} aria-hidden="true"/><span><strong>Access status</strong><small>Check your workspace access</small></span></a>
   <a href="#faculty-access-account"><UserRound size={17} aria-hidden="true"/><span><strong>Account setup</strong><small>Use your registered email</small></span></a>
   <a href="#faculty-access-help"><LifeBuoy size={17} aria-hidden="true"/><span><strong>Sign-in help</strong><small>Find the right next step</small></span></a>
  </nav>
  <div className="admin-workspace faculty-access-content">
   <section id="faculty-access-status" className="admin-section-head"><p className="admin-kicker">Faculty workspace</p><h2>Faculty access is not enabled</h2><p>You’re signed in. To use the teaching workspace, your account needs an active faculty profile registered with the same email.</p></section>
   <section id="faculty-access-account" className="panel formpanel"><h3>Check your sign-in email</h3><ol className="faculty-access-steps">
    <li><strong>Check the email shown above.</strong> If it’s different from your registered faculty email, sign out and sign back in with the correct account.</li>
    <li><strong>Ask an administrator to enable access.</strong> If the email is correct, share it with your course organiser so they can check or activate your faculty profile. Reopen this page once they confirm.</li>
   </ol></section>
   <section id="faculty-access-help" className="panel formpanel"><h3>Still need help?</h3><p>Use the sign-in guide if you’re having trouble switching accounts or finding the right one.</p><div className="actions"><a className="btn secondary" href="/help#sign-in">Get sign-in help <ArrowRight size={16} aria-hidden="true"/></a></div></section>
  </div></div>
 </div></Frame>;
 const [{assignments,proposals,progress,payouts},courses]=await Promise.all([facultyDashboard(faculty),view==="profile"||view==="overview"?[]:getCourses()]);
 const reminderContact=view==="profile"?await loadReminderContact("faculty:"+faculty.id):null;
 const sessions=view==="teaching"?await Promise.all(assignments.map(a=>getClassSessions(a.slug,a.batch))):[];
 const income=assignments.reduce((n,a)=>n+a.earned,0),paid=assignments.reduce((n,a)=>n+a.paid,0);
 const stats=[["Assigned batches",assignments.length,"teaching"],["Completed classes",progress.length,"teaching"],["Awaiting review",proposals.filter(x=>x.status==="submitted").length,"proposals"]] as const;
 const actions=[
  {label:"Manage assigned batches",help:"Check class timings and record progress.",view:"teaching",icon:BookOpen},
  {label:"Submit a course",help:"Send a new or revised syllabus for review.",view:"proposals",icon:ClipboardPlus},
 ] as const;
 return <Frame portalHeader={{role:"Faculty",path:url(view),signedIn:true}}><div className="wrap portal admin-shell faculty-shell">
  <header className="admin-hero"><div><p className="admin-kicker">Short Course Studio</p><h1>Faculty Portal</h1><p>{faculty.name} · {faculty.designation}</p></div><PortalAccount email={user.email} path={url(view)}/></header>
  <div className="admin-layout">
   <nav className="admin-sidebar" aria-label="Faculty sections"><p className="admin-nav-label">Workspace</p>{sections.map(({id,label,icon:Icon})=><a href={url(id)} key={id} aria-current={id===view?"page":undefined}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}</nav>
   <div className="admin-workspace">
    <div className="admin-section-head"><p className="admin-kicker">Workspace / {group.label}</p><h2>{group.label}</h2><p>{group.description}</p></div>
    <PortalNotice message={p.message?notices[p.message]:undefined} ok={p.message==="submitted"||p.message==="progress-saved"||p.message==="reminders-saved"}/>
    {view==="overview"&&<>
     <div className="admin-metrics" aria-label="Key numbers">{stats.map(([label,value,target])=><a key={label} href={url(target)}><span>{label}</span><strong>{value}</strong><ArrowRight size={16} aria-hidden="true"/></a>)}</div>
     <section className="portal-section"><h2>Quick actions</h2><div className="admin-quick-grid">{actions.map(({label,help,view,icon:Icon})=><a className="panel admin-quick-card" href={url(view)} key={view}><span className="admin-icon"><Icon size={19} aria-hidden="true"/></span><span><strong>{label}</strong><small>{help}</small></span><ArrowRight size={16} aria-hidden="true"/></a>)}</div></section>
     {faculty.bio&&<section className="panel portal-panel" aria-label="My faculty bio"><h2>My bio</h2><p>{faculty.bio}</p><a className="textlink" href={url("profile")}>View profile</a></section>}
    </>}
    {view==="profile"&&<><section className="panel formpanel"><h3>{faculty.name}</h3><dl className="faculty-profile-facts"><div><dt>Designation</dt><dd>{faculty.designation}</dd></div><div><dt>Department</dt><dd>{faculty.department}</dd></div><div><dt>Qualification</dt><dd>{faculty.qualification||"Not provided"}</dd></div></dl><p>{faculty.bio||"No bio has been added."}</p><p>Contact the administrator to update these details.</p></section><ReminderContactForm role="faculty" contact={reminderContact}/></>}
  {view==="teaching"&&<section className="portal-section" id="assigned"><h2>My assigned batches</h2>
   {assignments.length?assignments.map((a,i)=>{
    const c=courses.find(x=>x.slug===a.slug),done=new Set(progress.filter(x=>x.slug===a.slug&&x.batch===a.batch).map(x=>x.day)),percent=done.size*20;
    return <article className="panel portal-panel" key={a.slug+"/"+a.batch}><h3>{c?.title??a.slug}</h3><p>Batch {a.batch} · <strong>{percent}% complete</strong> · {5-done.size} classes remaining</p>
     <progress max={100} value={percent} aria-label={(c?.title??a.slug)+" completion"}/>
     <ul className="portal-checklist">{teachingDays.map(day=>{
      const slot=sessions[i][day-1],complete=done.has(day);
      return <li key={day}><strong>{complete?"✓ ":""}Day {day} · {c?.days[day-1]?.[0]??"Class"}</strong><span>{slot.starts_at?formatClassTime(slot.starts_at)+" IST":"Not scheduled"} · {complete?"Completed":"Remaining"}</span>
       <form method="post" action="/forms/faculty/progress"><input type="hidden" name="slug" value={a.slug}/><input type="hidden" name="batch" value={a.batch}/><input type="hidden" name="day" value={day}/><button className="btn secondary" name="done" value={complete?"no":"yes"}>{complete?"Undo completion":"Mark complete"}</button></form>
      </li>;
     })}</ul>
    </article>;
   }):<p className="mutedbox">No batches assigned yet. Approved courses and batches assigned by the administrator will appear here.</p>}
  </section>}
  {view==="proposals"&&<section className="portal-section" id="proposals"><h2>Course submissions</h2>
   {proposals.length>0&&<div className="grid">{proposals.map(p=><article className="panel portal-panel" key={p.id}><h3>{p.title}</h3><p>{p.track} · {p.format==="exclusive"?"Exclusive":"Regular"} · {p.status}</p>{p.revision_note&&<p className="mutedbox">{p.revision_note}</p>}{p.status==="approved"&&<a className="textlink" href={"/courses/"+proposalSlug(p.id)}>View course</a>}<details className="portal-details"><summary>Submitted syllabus</summary><p>{p.summary}</p><ol>{(JSON.parse(p.days) as [string,string][]).map(([topic,lab],i)=><li key={i}>{topic} — {lab}</li>)}</ol>{p.syllabus_url&&<a className="textlink" href={p.syllabus_url} target="_blank" rel="noopener noreferrer">Open syllabus document</a>}</details></article>)}</div>}
   <form className="panel formpanel" action="/forms/faculty/proposal" method="post" encType="multipart/form-data"><h3>Submit a new or revised course</h3><p>Enter five three-hour sessions. Upload a PDF syllabus up to 2 MB or provide an HTTPS link. An administrator reviews your submission before it appears in the catalogue.</p>
    <div className="portal-fields"><label>Course title<input name="title" required minLength={2} maxLength={100}/></label><label>Subject track<select name="track">{TRACKS.map(t=><option key={t}>{t}</option>)}</select></label><label>Course format<select name="format"><option value="regular">Regular</option><option value="exclusive">Exclusive</option></select></label><label>Level or prerequisites<input name="level" required minLength={2} maxLength={80}/></label></div>
    <label>Course summary<textarea name="summary" required minLength={2} maxLength={450}/></label>
    <label>Learning outcome or final project<textarea name="outcome" required minLength={2} maxLength={300}/></label>
    <label>Tools and resources<input name="tools" required minLength={2} maxLength={250}/></label>
    <label>Upload syllabus PDF (optional)<input name="syllabus" type="file" accept="application/pdf,.pdf"/></label>
    <label>Syllabus document link (optional)<input name="syllabusUrl" type="url" placeholder="https://…" maxLength={700}/></label>
    {teachingDays.map(day=><fieldset key={day}><legend>Day {day} · 3 hours</legend><label>Lecture topics<input name={"topic"+day} required minLength={2} maxLength={140}/></label><label>Practical or class activity<textarea name={"practical"+day} required minLength={2} maxLength={320}/></label></fieldset>)}
    <button className="btn primary">Submit for review</button>
   </form>
  </section>}
  {view==="income"&&<section className="portal-section" id="income"><h2>Faculty income</h2><p>Amounts recorded by the administrator. This dashboard does not send payments.</p>
   <Stats items={[["Earned",money(income)],["Paid",money(paid)],["Outstanding",money(income-paid)]]}/>
   {assignments.length>0&&<ul className="panel portal-checklist">{assignments.map(a=><li key={a.slug+"/"+a.batch}><strong>{courses.find(c=>c.slug===a.slug)?.title??a.slug} · {a.batch}</strong><span>{money(a.earned)} earned · {money(a.paid)} paid</span></li>)}</ul>}
   {payouts.length>0&&<><h3>Income record history</h3><ul className="panel portal-checklist">{payouts.map((entry,i)=><li key={entry.created_at+"-"+i}><strong>{courses.find(c=>c.slug===entry.slug)?.title??entry.slug} · {entry.batch}</strong><span>{entry.created_at.slice(0,10)} · Earned {money(entry.earned_before)} → {money(entry.earned_after)} · Paid {money(entry.paid_before)} → {money(entry.paid_after)}</span></li>)}</ul></>}
  </section>}
   </div>
  </div>
 </div></Frame>;
}
