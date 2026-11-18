import {BatchScheduleFields} from "./batch-schedule-fields";
import {adminTarget} from "@/lib/admin-navigation";
import {Badge} from "@/app/ui";

import {canApply,getCourses,getSiteControls,intakeStatus,paymentMode} from "@/lib/enrollment";
import {cDayNumber} from "@/lib/courses";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
export const intakeMessages:Record<string,string>={
 "intake-saved":"Batch admissions settings saved.",
 "intake-stale":"The selected batch changed. Reload the batch and try again.",
 "intake-invalid":"Could not save batch admissions settings.",
 "schedule-invalid":"Choose a valid date, time and delivery mode.",
 "site-saved":"Website-wide settings saved.",
 "site-invalid":"Check the pause setting and announcement length.",
 schedule:"Enter a schedule and delivery mode before opening the batch.",
 instructor:"Add an instructor in Website → Course banners before opening applications."
};
export function IntakePanel({courses,selected}:{courses:Course[];selected?:Course}){
 const eligible=courses.filter(c=>!cDayNumber(c.slug)&&c.visibility==="published");
 const open=eligible.filter(canApply),managed=eligible.filter(c=>!canApply(c)),c=selected;
 const load=(slug:string)=>adminTarget("batch-editor",{course:slug});
 return <section id="enrollment-controls" className="portal-section">
  <h2>Open or close applications</h2><p>Load a course to set its batch start, delivery mode and application status. Existing applications stay on their original batch.</p>
  <div className="panel admin-open-batches">
   <div className="admin-panel-line"><h3>Courses open for applications</h3><span>{open.length} open</span></div>
   {open.length?<div className="student-table-wrap" role="region" aria-label="Open courses" tabIndex={0}><table aria-label="Courses open for applications"><thead><tr><th scope="col">Course &amp; batch</th><th scope="col">Batch starts</th><th scope="col">Delivery</th><th scope="col">Action</th></tr></thead><tbody>
    {open.map(course=><tr key={course.slug}><th scope="row">{course.title}<small>{course.batch}</small></th><td>{course.schedule}</td><td>{course.mode}</td><td><a className="textlink" href={load(course.slug)} aria-label={"Load "+course.title}>Load</a></td></tr>)}
   </tbody></table></div>:<p className="mutedbox">No courses are accepting applications right now. Load a published course below to open a batch.</p>}
  </div>
  <form className="panel formpanel admin-course-picker admin-intake-picker" method="get" action="/admin#batch-editor">
   <input type="hidden" name="section" value="courses"/><input type="hidden" name="view" value="admissions"/>
   <label>Choose a course<select name="course" required defaultValue={c?.slug??""}><option value="" disabled>Select a published course</option>
    {!!open.length&&<optgroup label="Applications open">{open.map(course=><option value={course.slug} key={course.slug}>{course.title} · {course.batch}</option>)}</optgroup>}
    {!!managed.length&&<optgroup label="Other published courses">{managed.map(course=><option value={course.slug} key={course.slug}>{course.title} · {course.batch}</option>)}</optgroup>}
   </select></label><button className="btn secondary">Load course</button>
  </form>
  {c&&<form id="batch-editor" key={c.slug+"/"+c.batch} className="panel formpanel" method="post" action="/forms/admin/intake">
   <div className="admin-panel-line"><div><h3>{c.title}</h3><p>Batch {c.batch}</p></div><Badge status={intakeStatus(c)}/></div>
   <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
   <BatchScheduleFields schedule={c.schedule} mode={c.mode}/>
   <label>Application status<select name="status" defaultValue={c.status}><option value="soon">Not announced · no applications</option><option value="open">Announce and open applications</option><option value="closed">Close applications</option></select></label>
   <div className="actions"><button className="btn primary">Save admissions settings</button><a className="btn secondary" href={adminTarget("applications",{course:c.slug,filter:c.slug})}>Review applicants</a><a className="textlink" href={canApply(c)?"/apply?course="+c.slug:"/courses/"+c.slug}>{canApply(c)?"View application form":"View course page"}</a></div>
  </form>}
 </section>;
}
export async function SiteControlsPanel({selected}:{selected:Course}){
 const controls=await getSiteControls(),mode=paymentMode();
 return <section className="portal-section" id="site-controls">
  <h2>Site-wide applications &amp; announcement</h2><p>Use this to pause new applications across every course or post a notice.</p>
  <form className="panel formpanel" action="/forms/admin/site-controls" method="post">
   <input type="hidden" name="slug" value={selected.slug}/>
   <label>New applications across the website<select name="paused" defaultValue={controls.intake_paused?"yes":"no"}><option value="no">Allow applications for open batches</option><option value="yes">Pause all new applications</option></select></label>
   <p>Pausing blocks new submissions without removing existing applications, changing payments already available to applicants, or revoking class access.</p>
   <label>Site announcement<textarea name="announcement" maxLength={240} defaultValue={controls.announcement} placeholder="Optional notice on the homepage and application page"/></label>
   <button className="btn primary">Save site-wide settings</button>
   <p>Online checkout: <strong>{mode==="live"?"Live":mode==="test"?"Test only":"Not configured"}</strong>. Payment credentials are managed separately.</p>
  </form>
 </section>;
}
