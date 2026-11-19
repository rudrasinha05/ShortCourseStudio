import {readLearningPreferences,skillLevels} from "@/lib/learning-preferences";
import {adminTarget} from "@/lib/admin-navigation";
import {batchHistory,batchReports,formFields,getAudit,getBatchRules,getMaterials,getNoticeTemplates,getSiteContent,priceText,type Learning,type Note} from "@/lib/admin-controls";
import {TRACK_DETAILS,cDayNumber} from "@/lib/courses";
import {getCourses} from "@/lib/enrollment";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
const Field=({name,label,value="",max=90}:{name:string;label:string;value?:string;max?:number})=><label>{label}<input name={name} maxLength={max} defaultValue={value}/></label>;
export async function ControlCenter({courses,selected,view}:{courses:Course[];selected:Course;view:string}){
 const c=cDayNumber(selected.slug)?courses.find(x=>x.slug==="c-by-horesh-sir")!:selected;
 const [content,notices,rules,history,events,reports,materials]=await Promise.all([
  view==="content"?getSiteContent():null,view==="messages"?getNoticeTemplates():null,
  view==="batch"?getBatchRules(c.slug,c.batch):null,view==="batch"?batchHistory(c.slug):[],
  view==="audit"?getAudit():[],view==="summary"?batchReports():[],view==="resources"?getMaterials(c.slug,c.batch):[],
 ]);
 const recent=events.slice(0,20);
 const deadline=rules?.closes_at?new Date(Date.parse(rules.closes_at)+330*60000).toISOString().slice(0,16):"";
 return <>
  {view==="batch"&&rules&&<section id="batch-rules" className="portal-section">
   <h2>Fees, deadlines &amp; batches</h2><p>Set the fee and application rules, or create a new batch without changing older applications.</p>
   <div className="admin-grid">
    <form action="/forms/admin/control/batch-rules" method="post" className="panel formpanel">
     <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
     <label>Maximum applications (0 means unlimited)<input type="number" name="applicationLimit" min={0} max={100000} required defaultValue={rules.application_limit}/></label>
     <label>Application deadline (IST)<input type="datetime-local" name="closesAt" defaultValue={deadline}/></label>
     <label>New online checkout orders<select name="paymentPaused" defaultValue={rules.payment_paused?"yes":"no"}><option value="no">Allow when checkout is configured</option><option value="yes">Pause new orders</option></select></label>
     <label>Course fee (₹, blank uses default)<input type="number" name="fee" min={1} max={999999.99} step=".01" defaultValue={rules.fee_paise===null?"":rules.fee_paise/100}/></label>
     <label>Extra application fields (optional, one label per line)<textarea name="customFields" maxLength={410} defaultValue={formFields(rules).map(f=>(f.required?"*":"")+f.label).join("\n")}/></label>
     <p>Leave blank to keep the original form. Prefix a label with * to make it required. Existing submissions keep their original fee and answers.</p>
     <button className="btn primary">Save batch rules</button>
    </form>
    <form action="/forms/admin/control/batch-switch" method="post" className="panel formpanel">
     <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
     <h3>Start or restore a batch</h3><p>Close the current batch first. Previous applications and student class access stay on their original batch. The selected batch starts with applications locked.</p>
     <label>Action<select name="batchAction"><option value="new">Create new draft batch</option><option value="restore">Restore a previous batch as draft</option></select></label>
     <label>Batch ID<input name="nextBatch" list="prior-batches" required pattern="[a-z0-9][a-z0-9-]{0,29}" maxLength={30}/></label>
     <datalist id="prior-batches">{history.filter(b=>b.batch!==c.batch).map(b=><option key={b.batch} value={b.batch}>{b.schedule}</option>)}</datalist>
     <button className="btn secondary">Switch active batch</button>
    </form>
   </div>
  </section>}
  {view==="catalogue"&&<section id="catalogue-controls" className="portal-section">
   <h2>Publish or hide a course</h2>
   <form action="/forms/admin/control/catalogue" method="post" className="panel formpanel">
    <input type="hidden" name="slug" value={c.slug}/>
    <label>Visibility for {c.title}<select name="visibility" defaultValue={c.visibility}><option value="draft">Draft · hidden</option><option value="published">Published · listed</option><option value="archived">Archived · hidden</option></select></label>
    <p>Publishing does not open applications. Hiding a course closes its current intake and preserves existing records.</p>
    <button className="btn primary">Save catalogue visibility</button>
   </form>
   <details className="panel formpanel"><summary>Create a course draft</summary>
    <form action="/forms/admin/control/catalogue" method="post" className="formpanel">
     <input type="hidden" name="visibility" value="draft"/><input type="hidden" name="create" value="yes"/>
     <label>Course ID (start with studio-)<input name="slug" required pattern="studio-[a-z0-9-]+" maxLength={90}/></label>
     <Field name="title" label="Course title" max={100}/>
     <label>Subject<select name="track">{Object.keys(TRACK_DETAILS).map(k=><option key={k}>{k}</option>)}</select></label>
     <label>Format<select name="format"><option value="regular">Regular</option><option value="exclusive">Exclusive</option></select></label>
     <label>Summary<textarea name="summary" maxLength={450} required/></label><Field name="outcome" label="Learning outcome" max={300}/><Field name="instructor" label="Instructor" max={100}/><Field name="tools" label="Tools" max={150}/>
     {[0,1,2,3,4].map(i=><fieldset key={i}><legend>Day {i+1}</legend><Field name={"topic"+i} label="Topic" max={140}/><label>Practical<textarea name={"practical"+i} maxLength={320} required/></label></fieldset>)}
     <button className="btn primary">Create draft</button>
    </form>
   </details>
  </section>}
  {view==="content"&&content&&<section id="website-content" className="portal-section"><h2>Website and student dashboard content</h2>
   <form action="/forms/admin/control/content" method="post" className="panel formpanel">
    <input type="hidden" name="slug" value={c.slug}/>
    <div className="portal-fields"><Field name="headline" label="Homepage headline when no batch banner is featured" value={content.headline}/><Field name="catalogue" label="Catalogue title" value={content.catalogue}/><Field name="tagline" label="Header tagline" value={content.tagline}/><Field name="cta" label="Featured catalogue application button" value={content.cta} max={40}/>
    <Field name="studioLogo" label="Studio logo HTTPS URL" value={content.studioLogo} max={1200}/><Field name="instituteLogo" label="GL Bajaj logo HTTPS URL" value={content.instituteLogo} max={1200}/>
    <Field name="brochure" label="Brochure HTTPS URL" value={content.brochure} max={1200}/><Field name="contact" label="Support email" value={content.contact} max={150}/><Field name="phone" label="Support phone (shown on Contact us)" value={content.phone} max={30}/></div>
    <label>Organiser postal address (shown on Contact us)<textarea name="address" maxLength={300} defaultValue={content.address}/></label>
    <label>Terms &amp; conditions (shown at /terms; blank lines start new paragraphs)<textarea name="terms" maxLength={5000} defaultValue={content.terms}/></label>
    <label>Cancellation &amp; refund policy (shown at /refund-policy; required before accepting fees)<textarea name="refund" maxLength={5000} defaultValue={content.refund}/></label>
    <label>Homepage introduction<textarea name="intro" maxLength={450} defaultValue={content.intro}/></label>
    <label>FAQ and help text<textarea name="faq" maxLength={1800} defaultValue={content.faq}/></label>
    <label>Student slideshow course IDs (up to 6, in order)<textarea name="slides" defaultValue={content.slides.join("\n")}/></label>
    <label>Recommended course IDs (up to 12, in priority order)<textarea name="recommendations" defaultValue={content.recommendations.join("\n")}/></label>
    <details><summary>Show course IDs</summary><ul>{courses.filter(x=>!cDayNumber(x.slug)).map(x=><li key={x.slug}>{x.title} — {x.slug}</li>)}</ul></details>
    <p>Leave a field empty to use the default content or recommendations.</p><button className="btn primary">Save website content</button>
   </form>
  </section>}
  {view==="messages"&&notices&&<section id="notice-templates" className="portal-section"><h2>On-site messages</h2>
   <form action="/forms/admin/control/notices" method="post" className="panel formpanel">
    <input type="hidden" name="slug" value={c.slug}/>
    <p>These messages appear only in the relevant application status or enrolled student view. Saving does not send emails or WhatsApp messages.</p>
    {([["receipt","Application received"],["accepted","Application accepted"],["declined","Application declined"],["classReminder","Enrolled student reminder"]] as const).map(([name,label])=><label key={name}>{label}<textarea name={name} maxLength={500} defaultValue={notices[name]}/></label>)}
    <button className="btn primary">Save on-site messages</button>
   </form>
  </section>}
  {view==="resources"&&<section id="learning-materials" className="portal-section"><h2>Class resources and assignments</h2>
   <form action="/forms/admin/control/materials" method="post" className="panel formpanel">
    <input type="hidden" name="slug" value={c.slug}/><input type="hidden" name="batch" value={c.batch}/>
    <p>{c.title} · {c.batch}. These links are displayed only to enrolled students. Restrict access on the hosting service too.</p>
    {[1,2,3,4,5].map(day=>{const m=materials.find(x=>x.day===day);return <details key={day} className="portal-details"><summary>Day {day}</summary>
     <Field name={"resourceTitle"+day} label="Resource title" value={m?.resource_title} max={120}/><Field name={"resourceUrl"+day} label="Resource HTTPS URL" value={m?.resource_url} max={1200}/>
     <Field name={"assignmentTitle"+day} label="Assignment title" value={m?.assignment_title} max={120}/><Field name={"assignmentUrl"+day} label="Assignment HTTPS URL" value={m?.assignment_url} max={1200}/>
    </details>;})}<button className="btn primary">Save class resources</button>
   </form>
  </section>}
  {view==="summary"&&<section id="batch-reports" className="portal-section"><h2>Batch and fee reports</h2>
   {reports.length?<div className="panel portal-panel" style={{overflowX:"auto"}}><table><thead><tr><th scope="col">Course and batch</th><th scope="col">Applications</th><th scope="col">Accepted</th><th scope="col">Enrolled</th><th scope="col">Verified fees</th></tr></thead><tbody>{reports.map(row=><tr key={row.slug+"/"+row.batch}><td><a className="textlink" href={adminTarget("applications",{course:row.slug,filter:row.slug,batch:row.batch})}>{courses.find(x=>x.slug===row.slug)?.title??row.slug} · {row.batch}</a></td><td>{row.applications}</td><td>{row.accepted}</td><td>{row.enrolled}</td><td>{priceText(row.verified)}</td></tr>)}</tbody></table></div>:<p className="mutedbox">Reports appear after the first application.</p>}
  </section>}
  {view==="audit"&&<section id="change-history" className="portal-section"><h2>Recent admin changes</h2>
   {recent.length?<ul className="panel portal-checklist">{recent.map(e=><li key={e.id}><strong>{e.action} · {e.target}</strong><small>{new Date(e.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST · {e.actor}</small>
    {e.next&&["save content","save notices"].includes(e.action)&&<form action="/forms/admin/control/restore" method="post"><input type="hidden" name="event" value={e.id}/><button className="btn secondary">Restore settings before this change</button></form>}
   </li>)}</ul>:<p className="mutedbox">No admin changes recorded yet.</p>}
  </section>}
 </>;
}
export function ApplicantTools({id,slug,notes,record,eligible,amount,offline,answers,returnFields}:{returnFields:Record<string,string>;id:string;slug:string;notes:Note[];record?:Learning;eligible:boolean;amount:number;offline:boolean;answers:string}){
 const present:number[]=record?JSON.parse(record.attendance):[];
 const response=JSON.parse(answers) as {details?:{phone?:string;programme?:string;year?:string;motivation?:string};answers?:{label:string;value:string}[]};
 const d=response.details,prefs=readLearningPreferences(answers,true);
 const extra=[...(d?[{label:"Mobile number",value:d.phone??""},{label:"Programme and branch",value:d.programme??""},{label:"Year or status",value:d.year??""},{label:"Learning goals",value:d.motivation??""}]:[]),...(prefs?[{label:"Interests",value:prefs.interests.join(", ")},{label:"Current skills",value:prefs.skills},{label:"Experience level",value:skillLevels.find(([id])=>id===prefs.level)?.[1]??""}]:[]),...(response.answers??[])];
 const hidden=Object.entries(returnFields).map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>);
 return <details className="portal-details"><summary>Application details, notes, payments & attendance</summary>
  <form className="formpanel" action="/forms/admin/control/note" method="post"><input type="hidden" name="slug" value={slug}/><input type="hidden" name="id" value={id}/>{hidden}
   <label>Private staff note<textarea name="note" minLength={2} maxLength={1000} required/></label><button className="btn secondary">Add note</button>
  </form>
  {notes.length>0&&<ul className="portal-checklist">{notes.map(n=><li key={n.id}><p>{n.note}</p><small>{n.created_at.slice(0,10)} · {n.actor}</small></li>)}</ul>}
  {extra.length>0&&<dl>{extra.map((a,i)=><div key={i}><dt>{a.label}</dt><dd>{a.value||"Not provided"}</dd></div>)}</dl>}
  {offline&&amount>0&&<form className="formpanel" action="/forms/admin/control/offline-payment" method="post">
   <input type="hidden" name="slug" value={slug}/><input type="hidden" name="id" value={id}/>{hidden}
   <label>Verified offline payment reference<input name="reference" required maxLength={64}/></label>
   <label>Received amount (₹)<input type="number" name="amount" required min={1} step=".01" defaultValue={amount/100}/></label>
   <p>Record only an independently verified payment. This does not collect money or grant class access.</p>
   <button className="btn secondary">Record verified offline payment</button>
  </form>}
  {eligible&&<form className="formpanel" action="/forms/admin/control/learning" method="post">
   <input type="hidden" name="slug" value={slug}/><input type="hidden" name="id" value={id}/>{hidden}
   <fieldset><legend>Classes attended</legend>{[1,2,3,4,5].map(day=><label className="check" key={day}><input type="checkbox" value="yes" name={"present"+day} defaultChecked={present.includes(day)}/>Day {day}</label>)}</fieldset>
   <label>Score (0–100)<input type="number" name="score" min={0} max={100} defaultValue={record?.score??""}/></label>
   <label>Result<select name="result" defaultValue={record?.result??"pending"}><option value="pending">Pending</option><option value="passed">Passed</option><option value="not_passed">Not passed</option></select></label>
   <button className="btn secondary">Save attendance and result</button>
  </form>}
  {(record?.certificate_id||(eligible&&record?.result==="passed"))&&<form className="formpanel" action="/forms/admin/control/certificate" method="post">
   <input type="hidden" name="slug" value={slug}/><input type="hidden" name="id" value={id}/>{hidden}
   {record.certificate_id&&<a className="textlink" href={"/certificate?id="+record.certificate_id}>View issued certificate</a>}
   <button className="btn secondary" name="operation" value={record.certificate_id?"revoke":"issue"}>{record.certificate_id?"Revoke certificate":"Issue certificate"}</button>
  </form>}
 </details>;
}
