import {adminTarget} from "@/lib/admin-navigation";
import {pendingFacultyAccounts,verificationEmailAvailable} from "@/lib/faculty-auth";
import {adminDashboard,money,proposalSlug} from "@/lib/portals";
import {getCourses} from "@/lib/enrollment";
import {cDayNumber} from "@/lib/courses";


export const facultyMessages:Record<string,string>={"faculty-added":"Faculty account added.","duplicate-email":"A faculty profile already exists for that email.","faculty-updated":"Faculty access updated.","assignment-saved":"Batch assignment and income saved.","assignment-invalid":"Could not save. Check the active faculty member, current batch, and amounts. A batch with income or completed classes cannot be reassigned.","proposal-reviewed":"Course proposal reviewed.","account-verified":"Faculty account verified. They can now sign in to the Faculty Portal.","account-removed":"Unverified faculty sign-up removed.",invalid:"The change could not be saved. Check the details and try again."};
type Course=Awaited<ReturnType<typeof getCourses>>[number];

export async function AdminPortalPanel({courses,selected,view}:{courses:Course[];selected:Course;view:"directory"|"proposals"|"assignments"}){
 const [{faculty,assignments,proposals,progress},pending]=await Promise.all([adminDashboard(),view==="directory"?pendingFacultyAccounts():[]]);
 const byFaculty=new Map(faculty.map(f=>[f.id,f]));
 const current=assignments.find(a=>a.slug===selected.slug&&a.batch===selected.batch);
 const active=faculty.filter(f=>f.active);
 return <>
  {view==="directory"&&<section className="portal-section" id="faculty-accounts"><h2>Faculty sign-ups waiting for verification</h2>
   <p>{verificationEmailAvailable()?"These people created a faculty account but have not confirmed their email yet. Verify only someone you have confirmed directly.":"Verification emails are not configured, so new faculty accounts stay locked until you verify them here. Confirm the person directly, for example by phone, before verifying."}</p>
   {pending.length?<ul className="portal-checklist panel faculty-pending">{pending.map(a=><li key={a.id}>
    <strong>{a.first_name} {a.last_name} <small>@{a.username}</small></strong>
    <span>{a.email}{a.phone?" · "+a.phone:""} · signed up {new Date(a.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"})}</span>
    <span className={a.has_profile?"":"admin-field-hint"}>{a.has_profile?"Matches an active faculty profile: teaching access starts once verified.":"No active faculty profile uses this email. Add one in the directory below to give teaching access."}</span>
    <div className="actions"><form method="post" action="/forms/admin/faculty-account"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={a.id}/><input type="hidden" name="decision" value="verify"/><button className="btn primary">Verify account</button></form>
     <form method="post" action="/forms/admin/faculty-account"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={a.id}/><input type="hidden" name="decision" value="remove"/><button className="btn secondary">Remove sign-up</button></form></div>
   </li>)}</ul>:<p className="mutedbox">No faculty sign-ups are waiting.</p>}
  </section>}
  {view==="directory"&&<section className="portal-section" id="faculty-directory"><h2>Faculty directory</h2><p>Add instructors, update their profiles and manage their portal access.</p>
   <form className="panel formpanel" method="post" action="/forms/admin/faculty" id="add-faculty"><h3>Add a faculty member</h3><p className="admin-field-hint">Use the same email as their faculty account. Teaching access needs this profile and a verified faculty account.</p><input type="hidden" name="slug" value={selected.slug}/>
    <div className="portal-fields">
     <label>Full name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>
     <label>Sign-in email<input name="email" required type="email" maxLength={160} autoComplete="email"/></label>
     <label>Department<input name="department" required minLength={2} maxLength={100}/></label>
     <label>Designation<input name="designation" required minLength={2} maxLength={100}/></label>
     <label>Qualification (optional)<input name="qualification" maxLength={150}/></label>
    </div>
    <label>Short bio <span className="admin-field-hint">Optional · up to 300 characters. Add 1–2 lines about their expertise and what they teach.</span>
     <textarea name="bio" rows={3} maxLength={300} placeholder="Example: Teaches AI and Python through hands-on projects. Research interests include machine learning and computer vision."/>
    </label>
    <button className="btn primary">Add faculty</button>
   </form>
   {faculty.length>0&&<ul className="panel portal-checklist">{faculty.map(f=>{
    const batches=assignments.filter(a=>a.faculty_id===f.id);
    return <li key={f.id}><strong>{f.name} · {f.active?"Active":"Inactive"}</strong><span>{f.email} · {f.designation} · {f.department}{f.qualification?" · "+f.qualification:""}</span>{f.bio&&<p className="admin-bio">{f.bio}</p>}<span>{batches.length} assigned batches · {money(batches.reduce((n,a)=>n+a.earned,0))} recorded earnings</span>
     <form method="post" action="/forms/admin/faculty-active"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={f.id}/><button className="btn secondary" name="active" value={f.active?"no":"yes"}>{f.active?"Disable faculty access":"Enable faculty access"}</button></form>
     <details className="portal-details"><summary>Edit faculty profile</summary><form className="formpanel" method="post" action="/forms/admin/control/faculty-profile"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={f.id}/>
      <label>Name<input name="name" required maxLength={100} defaultValue={f.name}/></label><label>Department<input name="department" required maxLength={100} defaultValue={f.department}/></label><label>Designation<input name="designation" required maxLength={100} defaultValue={f.designation}/></label><label>Qualification<input name="qualification" maxLength={150} defaultValue={f.qualification}/></label><label>Short bio <span className="admin-field-hint">Optional · up to 300 characters.</span><textarea name="bio" rows={3} maxLength={300} defaultValue={f.bio}/></label><button className="btn secondary">Save faculty profile</button></form></details>
    </li>;
   })}</ul>}
  </section>}
  {view==="proposals"&&<section className="portal-section" id="faculty-proposals"><h2>Faculty course proposals</h2><p>Approving adds the course to the catalogue as “Batch announcement soon.” Open applications separately in course management.</p>
   {proposals.length?<div className="grid">{proposals.map(p=><article className="panel portal-panel" key={p.id}><h3>{p.title}</h3><p>{byFaculty.get(p.faculty_id)?.name??"Faculty"} · {p.track} · {p.format} · {p.status}</p>
    <details className="portal-details"><summary>Review syllabus</summary><p>{p.summary}</p><p><strong>Outcome</strong> {p.outcome}</p><p><strong>Level</strong> {p.level} · <strong>Tools</strong> {p.tools}</p><ol>{(JSON.parse(p.days) as [string,string][]).map(([topic,lab],i)=><li key={i}>{topic} — {lab}</li>)}</ol>
     {p.syllabus_url&&<a className="textlink" href={p.syllabus_url} target="_blank" rel="noopener noreferrer">Open submitted document</a>}
    </details>
    {p.status==="submitted"&&<form className="actions" method="post" action="/forms/admin/proposal"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={p.id}/><button className="btn primary" name="decision" value="approved">Approve course</button><button className="btn secondary" name="decision" value="declined">Decline</button></form>}
    {p.status==="submitted"&&<form className="formpanel" method="post" action="/forms/admin/control/proposal-revision"><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="id" value={p.id}/><label>Changes requested<textarea name="note" minLength={3} maxLength={1000} required/></label><button className="btn secondary">Request revision</button></form>}
    {p.status==="approved"&&<a className="textlink" href={adminTarget("course-management",{course:proposalSlug(p.id),view:"syllabus"})}>Manage this course</a>}
   </article>)}</div>:<p className="mutedbox">No course proposals yet.</p>}
  </section>}
  {view==="assignments"&&<section className="portal-section" id="assignments"><h2>Batch assignments and faculty income</h2><p>Record the earned and paid amounts in rupees. This does not initiate a payout.</p>

   {active.length>0&&!cDayNumber(selected.slug)?<form className="panel formpanel" method="post" action="/forms/admin/assignment">
    <h3>{selected.title} · {selected.batch}</h3><input type="hidden" name="slug" value={selected.slug}/><input type="hidden" name="batch" value={selected.batch}/>
    <label>Assigned faculty<select name="faculty" required defaultValue={current?.faculty_id??""}><option value="" disabled>Choose faculty</option>{active.map(f=><option key={f.id} value={f.id}>{f.name} ({f.email})</option>)}</select></label>
    <div className="portal-fields"><label>Earned (₹)<input type="number" name="earned" min={0} max={99999999.99} step=".01" required defaultValue={(current?.earned??0)/100}/></label><label>Paid (₹)<input type="number" name="paid" min={0} max={99999999.99} step=".01" required defaultValue={(current?.paid??0)/100}/></label></div><button className="btn primary">Save assignment and income</button>
   </form>:<p className="mutedbox">Add active faculty and select a full course to assign a batch.</p>}
   {assignments.length>0&&<ul className="panel portal-checklist">{assignments.map(a=>{
    const done=progress.filter(p=>p.slug===a.slug&&p.batch===a.batch).length;
    return <li key={a.slug+"/"+a.batch}><strong>{courses.find(c=>c.slug===a.slug)?.title??a.slug} · {a.batch}</strong><span>{byFaculty.get(a.faculty_id)?.name??"Faculty"} · {done*20}% complete · {5-done} classes remaining</span><span>{money(a.earned)} earned · {money(a.paid)} paid</span></li>;
   })}</ul>}
  </section>}
 </>;
}
