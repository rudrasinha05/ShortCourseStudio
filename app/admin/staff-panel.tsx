import {adminSupport,listStaff,staffRoles,supportTypes} from "@/lib/staff";
export async function StaffPanel(){
 const staff=await listStaff();
 return <section className="portal-section" id="staff-access"><h2>Staff access</h2>
  <p>Set the role using the person’s sign-in email. This does not share the private site. The person must already be allowed to open the site.</p>
  <form className="panel formpanel" method="post" action="/forms/admin/control/staff">
   <label>Sign-in email<input name="email" type="email" maxLength={160} required/></label>
   <label>Role<select name="role">{staffRoles.map(role=><option key={role}>{role}</option>)}</select></label>
   <label>Access<select name="active"><option value="yes">Enabled</option><option value="no">Disabled</option></select></label>
   <button className="btn primary">Save staff access</button>
  </form>
  {staff.length>0&&<ul className="panel portal-checklist">{staff.map(s=><li key={s.email}><strong>{s.email}</strong><span>{s.role} · {s.active?"Enabled":"Disabled"}</span>
   <form method="post" action="/forms/admin/control/staff"><input type="hidden" name="email" value={s.email}/><input type="hidden" name="role" value={s.role}/><button className="btn secondary" name="active" value={s.active?"no":"yes"}>{s.active?"Disable":"Enable"} access</button></form>
  </li>)}</ul>}
 </section>;
}
export async function SupportPanel({staff=false}:{staff?:boolean}){
 const requests=await adminSupport();
 return <section className="portal-section" id="support-requests"><h2>Student support requests</h2>
  {requests.length?<ul className="panel portal-checklist">{requests.map(s=><li key={s.id}><strong>{supportTypes[s.type]} · {s.status}</strong><span>{s.application_id} · {s.created_at.slice(0,10)}</span><p>{s.message}</p>
   <form className="formpanel" method="post" action="/forms/admin/control/support">
    <input type="hidden" name="id" value={s.id}/>{staff&&<input type="hidden" name="staff" value="yes"/>}
    <label>Reply in Student Portal<textarea name="response" minLength={3} maxLength={1000} required defaultValue={s.response}/></label>
    <label>Status<select name="status" defaultValue={s.status}><option value="open">Open</option><option value="resolved">Resolved</option></select></label>
    <button className="btn secondary">Save response</button>
   </form>
  </li>)}</ul>:<p className="mutedbox">No student requests yet.</p>}
 </section>;
}
