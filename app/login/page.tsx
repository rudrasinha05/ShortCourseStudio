import {ArrowRight,Bookmark,BookOpen,ClipboardList,GraduationCap,KeyRound,LifeBuoy,Mail,ShieldCheck,UserRound} from "lucide-react";
import {redirect} from "next/navigation";
import {PortalLoginShell} from "../portal-login-shell";
import {portalRoleOf,safePortalTarget} from "@/lib/portal-session";
import {GoogleSignInMark} from "@/app/google-sign-in";
import {studentGoogleConfigured} from "@/lib/student-google";
import {facultyView} from "@/lib/faculty-auth";

export const dynamic="force-dynamic";
export const metadata={title:"Sign in / Sign up",robots:{index:false,follow:false},referrer:"no-referrer" as const};
const studentIntro={heading:"Student workspace",description:"Find practical short courses and manage your learning in one place.",icon:GraduationCap,tasks:[[BookOpen,"Explore courses","Find the right course for your next goal."],[Bookmark,"Save your shortlist","Keep interesting courses in your wishlist."],[ClipboardList,"Track your applications","See your application status and class details."]]} as const;
const staffIntro={heading:"Staff workspace",description:"Use the access granted by your administrator to support the short-course programme.",icon:ShieldCheck,tasks:[[ClipboardList,"Programme operations","Review assigned tasks for the role you hold."],[LifeBuoy,"Student support","Help participants with their applications."]]} as const;
const errors:Record<string,string>={invalid:"Check the details and try again.","invalid-login":"The username or password is incorrect.","username-taken":"That username is already taken.","staff-denied":"Sign-in could not be completed. Use a verified faculty account with active staff access.",rate:"Too many attempts. Wait a few minutes before trying again.",unavailable:"The request could not be completed. Please try again.", "google-unavailable":"Google sign-in is not available yet. You can sign in with your username.", "google-expired":"The Google sign-in request expired. Please start again.", "google-cancelled":"Google sign-in was cancelled.", "google-denied":"Google could not verify the account. Try again or use your username.", "google-failed":"Could not complete Google sign-in. Please try again."};
export default async function LoginPage({searchParams}:{searchParams:Promise<{return_to?:string;mode?:string;error?:string}>}){
 const p=await searchParams, path=safePortalTarget(typeof p.return_to==="string"?p.return_to:"/student"),url=new URL(path,"https://portal.invalid");
 const role=portalRoleOf(url.pathname);
 if(role==="admin")redirect("/admin/login");
 if(role==="faculty"){const view=facultyView(url.searchParams.get("view"));redirect("/faculty/login"+(view?"?view="+encodeURIComponent(view):""));}
 const staff=role==="staff",signup=!staff&&p.mode==="signup",google=!staff&&studentGoogleConfigured();
 const modePath=(mode:string)=>"/login?"+new URLSearchParams({return_to:path,mode});
 return <PortalLoginShell role={staff?"Staff":"Student"} path={path} backHref={staff?"/staff":"/"} label={staff?"Staff access":"Student access"} intro={staff?staffIntro:studentIntro}>
  <h1>{staff?"Staff sign in":signup?"Create student account":"Student sign in"}</h1>
  <p>{staff?"Use the verified faculty account your administrator approved for staff access.":signup?"Choose a username and add the contact email you’ll use on course applications.":"Sign in to your Short Course Studio account."}</p>
  {p.error&&Object.hasOwn(errors,p.error)&&<p className="error" role="alert">{errors[p.error]}</p>}
  {!staff&&<nav className="faculty-auth-tabs" aria-label="Student account options"><a href={modePath("signin")} aria-current={!signup?"page":undefined}>Sign in</a><a href={modePath("signup")} aria-current={signup?"page":undefined}>Create account</a></nav>}
  <form className="admin-credentials" method="post" action={"/student/auth/"+(staff?"staff":signup?"signup":"signin")} target="_top">
   <input type="hidden" name="return_to" value={path}/>
   {signup&&<label>Full name<span><UserRound size={17} aria-hidden="true"/><input name="full_name" autoComplete="name" maxLength={100} required/></span></label>}
   <label>Username<span><UserRound size={17} aria-hidden="true"/><input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} required/></span></label>
   {signup&&<label>Contact email<span><Mail size={17} aria-hidden="true"/><input name="email" type="email" autoComplete="email" maxLength={160} required/></span></label>}
   <label>Password<span><KeyRound size={17} aria-hidden="true"/><input name="password" type="password" autoComplete={signup?"new-password":"current-password"} minLength={signup?12:undefined} maxLength={128} required/></span></label>
   {signup&&<small>Use at least 12 characters. Save your username and password in a password manager.</small>}
   <button className="btn primary">{signup?"Create account":"Sign in"} <ArrowRight size={17} aria-hidden="true"/></button>
  </form>
  {!staff&&<div className="portal-auth-alternative">
   <p className="portal-auth-divider"><span>or</span></p>
   <form action="/student/auth/google/start" method="post" target="_top">
    <input type="hidden" name="return_to" value={path}/>
    <button className="btn secondary google-auth-button" type="submit" disabled={!google} aria-describedby={!google?"student-google-status":undefined}><GoogleSignInMark/> Sign in with Google</button>
   </form>
   {!google?<small id="student-google-status">Google sign-in isn’t available yet. You can still use your username and password.</small>:<small>Already have an account? Sign in with your password first, then link Google from My profile to keep your wishlist and applications.</small>}
  </div>}
  {!staff&&!signup&&<p className="portal-login-help">Already applied before? After creating an account, use your application reference and private tracking code to link it.</p>}
  <a className="textlink portal-login-help" href="/help#sign-in">Need sign-in help?</a>
 </PortalLoginShell>;
}
