import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {Frame} from "@/app/ui";
import {PortalAccount} from "@/app/portal-ui";
import {isAdminIdentity} from "@/lib/enrollment";
import {adminPassword,adminGoogleConfigured,ownerEmail} from "@/lib/admin-login";
import {ownerAuthHeader,portalRoleHeader} from "@/lib/portal-session";
export const dynamic="force-dynamic";
export const metadata={title:"Admin security",robots:{index:false,follow:false}};
const messages:Record<string,string>={saved:"Admin password saved. Other direct admin sessions were signed out.",invalid:"Choose a password of 14 to 128 characters and repeat it exactly.",wrong:"The current password is incorrect.",rate:"Too many requests. Wait a few minutes and try again.",retry:"Could not save the password. Reopen this page and try again."};
export default async function AdminSecurity({searchParams}:{searchParams:Promise<{status?:string}>}){
 const h=await headers();
 if(h.get(portalRoleHeader)!=="admin"||!isAdminIdentity(h))redirect("/admin/login");
 const [stored,{status}]=await Promise.all([adminPassword(),searchParams]),current=!!stored&&h.get(ownerAuthHeader)==="password";
 return <Frame portalHeader={{role:"Admin",path:"/admin/security",signedIn:true}}><div className="wrap portal faculty-login-shell">
  <a className="textlink faculty-login-back" href="/admin">← Admin Portal</a>
  <section className="panel formpanel faculty-login-card">
   <h1>Admin security</h1><PortalAccount email={ownerEmail()} path="/admin/security"/>
   <p>{stored?"Change the password for the registered administrator.":"Set the password you want to use on the Admin login page."}</p>
   {status&&Object.hasOwn(messages,status)&&<p role={status==="saved"?"status":"alert"} className={status==="saved"?"success":"error"}>{messages[status]}</p>}
   <form className="faculty-login-form" method="post" action="/admin/auth/set-password" target="_top">
    {current&&<label>Current password<input type="password" name="current" autoComplete="current-password" required maxLength={128}/></label>}
    <label>New password<input type="password" name="password" autoComplete="new-password" minLength={14} maxLength={128} required/></label>
    <label>Confirm new password<input type="password" name="confirm" autoComplete="new-password" minLength={14} maxLength={128} required/></label>
    <button className="btn primary">Save password</button>
   </form>
   <p>Google sign-in {adminGoogleConfigured()?"is configured":"is not configured yet"}.</p>
  </section>
 </div></Frame>;
}
