import {adminTarget} from "@/lib/admin-navigation";
import {Badge} from "@/app/ui";

import {canApply,getCourses,getSiteControls,paymentMode} from "@/lib/enrollment";
import {CRASH_SLUG,cDayNumber} from "@/lib/courses";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
export const intakeMessages:Record<string,string>={
 "intake-saved":"Batch admissions settings saved.",
 "intake-stale":"The selected batch changed. Reload the batch and try again.",
 "intake-invalid":"Could not save batch admissions settings.",
 "site-saved":"Website-wide settings saved.",
 "site-invalid":"Check the pause setting and announcement length.",
 schedule:"Enter a schedule and delivery mode before opening the batch.",
 instructor:"Add an instructor in Website → Course banners before opening applications."
};
export function IntakePanel({courses,selected}:{courses:Course[];selected:Course}){
 const c=cDayNumber(selected.slug)?courses.find(x=>x.slug===CRASH_SLUG)!:selected;
 return <section id="enrollment-controls" className="portal-section">
  <h2>Open or close applications</h2><p>Choose when students can apply for this batch. This does not change the syllabus or remove existing applications.</p>
  <form className="panel formpanel" method="post" action="/forms/admin/intake">
   <div className="admin-panel-line"><h3>{c.title}</h3><Badge status={c.status}/></div>
   <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
   <div className="portal-fields">
    <label>Batch schedule<input name="schedule" maxLength={150} defaultValue={c.schedule} placeholder="Start date and time (IST)"/></label>
    <label>Delivery mode or venue<input name="mode" maxLength={100} defaultValue={c.mode} placeholder="Online or campus venue"/></label>
   </div>
   <label>Application status<select name="status" defaultValue={c.status}><option value="soon">Not announced · no applications</option><option value="open">Announce and open applications</option><option value="closed">Close applications</option></select></label>
   <div className="actions"><button className="btn primary">Save admissions settings</button><a className="btn secondary" href={adminTarget("applications",{course:c.slug,filter:c.slug})}>Review applicants</a><a className="textlink" href={canApply(c)?"/apply?course="+c.slug:"/courses/"+c.slug}>{canApply(c)?"View application form":"View course page"}</a></div>
  </form>
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
