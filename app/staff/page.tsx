import {headers} from "next/headers";
import {Frame} from "@/app/ui";
import {PortalAccessDenied,PortalAccount,PortalSignIn} from "@/app/portal-ui";
import {SupportPanel} from "@/app/admin/staff-panel";
import {batchReports,learningFor,priceText} from "@/lib/admin-controls";
import {getCourses} from "@/lib/enrollment";
import {listApplications,reviewLabels,REVIEW_STATES} from "@/lib/form-workflows";
import {requestIdentity} from "@/lib/portals";
import {staffRole} from "@/lib/staff";
export const dynamic="force-dynamic";
export const metadata={title:"Staff Portal",robots:{index:false,follow:false}};
export default async function Staff({searchParams}:{searchParams:Promise<{q?:string;message?:string}>}){
 const h=await headers(),user=requestIdentity(h);
 if(!user)return <PortalSignIn role="Staff" path="/staff"/>;
 const [role,p]=await Promise.all([staffRole(h),searchParams]);
 if(!role)return <PortalAccessDenied role="Staff" path="/staff" email={user.email}><p>Ask the administrator for a staff role or open the <a className="textlink" href="/admin">Owner Admin Portal</a>.</p></PortalAccessDenied>;
 const courseMap=new Map((await getCourses()).map(c=>[c.slug,c.title]));
 const q=typeof p.q==="string"?p.q.slice(0,120):"";
 const rows=role==="reports"?[]:(await listApplications("",1,{q,...(role==="finance"?{payment:"unpaid"}:role==="academic"?{review:"accepted"}:{})})).rows;
 const reports=role==="reports"?await batchReports():[];
 const learning=role==="academic"?await learningFor(rows.map(r=>r.id)):[];
 return <Frame><section className="wrap portal prose"><header className="admin-hero"><div><p className="admin-kicker">Short Course Studio</p><h1>Staff Portal</h1><p>Role: {role}</p></div><PortalAccount email={user.email} path="/staff"/></header>
  {p.message&&<p role="status">{p.message==="saved"?"Change saved.":"Nothing saved. Check the details."}</p>}
  {role==="reports"?<ul className="panel portal-checklist">{reports.map(r=><li key={r.slug+"/"+r.batch}><strong>{courseMap.get(r.slug)??r.slug} · {r.batch}</strong><span>{r.applications} applications · {r.enrolled} enrolled · {priceText(r.verified)} verified fees</span></li>)}</ul>:
  <><form method="get" className="panel formpanel"><label>Find applicant<input name="q" defaultValue={q} maxLength={120}/></label><button className="btn secondary">Search</button></form>
   <p>Showing up to 50 matching records.</p>
   <ul className="panel portal-checklist">{rows.map(r=>{const record=learning.find(item=>item.application_id===r.id);const attendance:number[]=record?JSON.parse(record.attendance):[];return <li key={r.id}><strong>{role==="finance"?r.id:r.name} · {courseMap.get(r.slug)??r.slug} · {r.batch}</strong><span>{r.id} · {reviewLabels[r.review_state]??r.review_state}</span>
   {role==="admissions"&&<form className="formpanel" method="post" action="/forms/admin/review"><input type="hidden" name="staff" value="yes"/><input type="hidden" name="id" value={r.id}/><label>Review status<select name="review" defaultValue={r.review_state}>{REVIEW_STATES.map(s=><option value={s} key={s}>{reviewLabels[s]}</option>)}</select></label><button className="btn secondary">Update review</button></form>}
   {role==="finance"&&!r.order_id&&r.amount>0&&r.review_state!=="declined"&&<form className="formpanel" action="/forms/admin/control/offline-payment" method="post"><input type="hidden" name="staff" value="yes"/><input type="hidden" name="id" value={r.id}/><label>Independently verified reference<input name="reference" maxLength={64} required/></label><label>Received amount (₹)<input type="number" min={1} step=".01" name="amount" defaultValue={r.amount/100} required/></label><button className="btn secondary">Record offline payment</button></form>}
   {role==="academic"&&!!r.class_access&&<form className="formpanel" action="/forms/admin/control/learning" method="post"><input type="hidden" name="staff" value="yes"/><input type="hidden" name="id" value={r.id}/><label>Score<input type="number" min={0} max={100} name="score" defaultValue={record?.score??""}/></label><label>Result<select name="result" defaultValue={record?.result??"pending"}><option value="pending">Pending</option><option value="passed">Passed</option><option value="not_passed">Not passed</option></select></label>{[1,2,3,4,5].map(day=><label key={day} className="check"><input type="checkbox" name={"present"+day} value="yes" defaultChecked={attendance.includes(day)}/> Day {day} attended</label>)}<button className="btn secondary">Save attendance and result</button></form>}
   </li>;})}</ul>
  </>}
  {role==="admissions"&&<SupportPanel staff/>}
 </section></Frame>;
}
