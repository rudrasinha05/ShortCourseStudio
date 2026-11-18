import {PortalLoginShell} from "@/app/portal-login-shell";
import {AdminOwnerEntry} from "../admin-owner-entry";
import {adminGoogleConfigured,adminPassword} from "@/lib/admin-login";
import {ArrowRight,BookOpen,CalendarDays,KeyRound,Mail,ShieldCheck,Users} from "lucide-react";

export const dynamic="force-dynamic";
export const metadata={title:"Admin sign in",robots:{index:false,follow:false},referrer:"no-referrer" as const};
const messages:Record<string,string>={
 invalid:"The email or password is incorrect, or password sign-in has not been set up.",
 rate:"Too many attempts. Wait a few minutes and try again.",
 unavailable:"Sign-in could not be completed. Try again.",
 "google-unavailable":"Google sign-in is not configured yet.",
 "google-session":"This sign-in request expired. Start again.",
 "google-cancelled":"Google sign-in was cancelled.",
 "google-denied":"Use the Google account registered for administrator access.",
};
const tasks=[[BookOpen,"Course catalogue","Publish syllabuses and update course details."],[CalendarDays,"Batch management","Set schedules and control course intake."],[Users,"Student applications","Review enrolment and manage class access."]] as const;
export default async function AdminLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams,google=adminGoogleConfigured();
 return <PortalLoginShell role="Admin" path="/admin/login" backHref="/admin" label="Restricted access" intro={{heading:"Administrator workspace",description:"Manage the short-course programme from one place.",icon:ShieldCheck,tasks}}>
    <h1>Admin sign in</h1><p>Use the email registered for the site owner.</p>
    {error&&Object.hasOwn(messages,error)&&<p className="error" role="alert">{messages[error]}</p>}
    <form className="admin-credentials" method="post" action="/admin/auth/password" target="_top">
     <label>Email<span><Mail size={17} aria-hidden="true"/><input type="email" name="email" autoComplete="username" autoCapitalize="none" required maxLength={254} placeholder="Enter your admin email"/></span></label>
     <label>Password<span><KeyRound size={17} aria-hidden="true"/><input type="password" name="password" autoComplete="current-password" required maxLength={128} placeholder="Enter your password"/></span></label>
     <button className="btn primary">Sign in <ArrowRight size={17} aria-hidden="true"/></button>
    </form>
    <div className="admin-google-login"><p>Or sign in with</p>
     {google?<a href="/admin/auth/google/start" className="btn secondary" target="_top">Sign in with Google</a>:<button className="btn secondary" type="button" disabled aria-describedby="google-login-status">Sign in with Google</button>}
     {!google&&<small id="google-login-status">Google sign-in is not configured yet.</small>}
    </div>
    {!await adminPassword()&&<AdminOwnerEntry/>}
 </PortalLoginShell>;
}
