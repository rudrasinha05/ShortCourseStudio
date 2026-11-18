import {headers} from "next/headers";
import {ArrowRight,BookOpen,CalendarDays,ClipboardCheck,GraduationCap,KeyRound,Mail,Phone,UserRound} from "lucide-react";
import {GoogleSignInMark} from "@/app/google-sign-in";
import {PortalLoginShell} from "@/app/portal-login-shell";
import {getFacultySession,facultyPath,facultyView,providerAvailable,verificationEmailAvailable} from "@/lib/faculty-auth";

export const dynamic="force-dynamic";
export const metadata={title:"Faculty Sign in and Sign up",robots:{index:false,follow:false},referrer:"no-referrer" as const};
const messages:Record<string,string>={
 "invalid-login":"The username or password is incorrect.",
 "invalid-signup":"Check each field and try again. Use a valid email and phone number.",
 "username-taken":"That username is already taken. Try a different one.",
 "account-unavailable":"Could not create this account. If you already registered, use your original sign-in method.",
 "rate":"Too many attempts. Please wait a few minutes and try again.",
 "provider-unconfigured":"That sign-in option is not yet configured.",
 "oauth-expired":"Your sign-in request expired. Start again from this page.",
 "oauth-cancelled":"Sign-in was cancelled. Try again when you’re ready.",
 "oauth-email":"The provider did not return a verified email address.",
 "oauth-account":"Could not use this provider for this account. Try your original sign-in method or contact support.",
 "verify-signin":"Sign in to the faculty account that requested this link, then open the link again.",
 "verify-invalid":"This verification link is invalid or has expired. Sign in and request a new one.",
 "unavailable":"Could not complete the request. Try again in a moment.",
};
const intro={heading:"Faculty workspace",description:"Plan your short courses, manage teaching assignments and follow each batch’s progress.",icon:GraduationCap,tasks:[[BookOpen,"Course proposals","Submit course plans and supporting material."],[CalendarDays,"Teaching assignments","See assigned batches and sessions."],[ClipboardCheck,"Class progress","Keep track of sessions and delivery."]]} as const;
export default async function FacultyLogin({searchParams}:{searchParams:Promise<{mode?:string;message?:string;token?:string;view?:string}>}){
 const [p,h]=await Promise.all([searchParams,headers()]);
 const signup=p.mode==="signup",verify=p.mode==="verify",view=facultyView(p.view),returnPath=facultyPath(view);
 const google=providerAvailable("google");
 const query=view?"&view="+view:"";
 const token=typeof p.token==="string"&&/^[a-f0-9]{64}$/.test(p.token)?p.token:"";
 const account=verify?await getFacultySession(h):null;
 return <PortalLoginShell role="Faculty" path="/faculty/login" backHref={returnPath} label="Faculty access" intro={intro}>
   <h1>{verify?"Verify your email":signup?"Create faculty account":"Faculty sign in"}</h1>
   <p>{verify?"Confirm the email on your faculty account.":signup?"Use the email registered with your administrator. A new account does not grant teaching access.":"Access your teaching workspace with your faculty account."}</p>
   {p.message&&Object.hasOwn(messages,p.message)&&<p className="error" role="alert">{messages[p.message]}</p>}
   {verify?account&&token?<form method="post" action="/faculty/auth/verify" target="_top">
    <input type="hidden" name="token" value={token}/><button className="btn primary">Confirm email</button>
   </form>:<a className="btn primary" href={account?"/faculty":"/faculty/login"}>{account?"Return to Faculty Portal":"Sign in to continue"}</a>:<>
   <nav className="faculty-auth-tabs" aria-label="Faculty account options">
    <a href={"/faculty/login?mode=signin"+query} aria-current={!signup?"page":undefined}>Sign in</a>
    <a href={"/faculty/login?mode=signup"+query} aria-current={signup?"page":undefined}>Create account</a>
   </nav>
   <form method="post" action={"/faculty/auth/"+(signup?"signup":"signin")} target="_top" className="admin-credentials faculty-credentials">
    <input type="hidden" name="view" value={view}/>
    {signup&&<div className="faculty-login-names">
     <label>First name<span><UserRound size={17} aria-hidden="true"/><input name="first_name" autoComplete="given-name" required maxLength={80}/></span></label>
     <label>Last name<span><UserRound size={17} aria-hidden="true"/><input name="last_name" autoComplete="family-name" required maxLength={80}/></span></label>
    </div>}
    <label>Username<span><UserRound size={17} aria-hidden="true"/><input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern={"[A-Za-z0-9][A-Za-z0-9._\\-]{2,31}"} aria-describedby={signup?"faculty-username-help":undefined}/></span></label>
    {signup&&<><small id="faculty-username-help">Use 3–32 characters. Start with a letter or number. Periods, underscores and hyphens are allowed.</small>
     <label>Phone<span><Phone size={17} aria-hidden="true"/><input name="phone" type="tel" autoComplete="tel" required maxLength={28} placeholder="+91 …"/></span></label>
     <label>Email<span><Mail size={17} aria-hidden="true"/><input name="email" type="email" autoComplete="email" required maxLength={254}/></span></label>
    </>}
    <label>Password<span><KeyRound size={17} aria-hidden="true"/><input name="password" type="password" autoComplete={signup?"new-password":"current-password"} required minLength={signup?12:undefined} maxLength={128} aria-describedby={signup?"faculty-password-help":undefined}/></span></label>
    {signup&&<small id="faculty-password-help">Use at least 12 characters.</small>}
    <button className="btn primary">{signup?"Create account":"Sign in"} <ArrowRight size={16} aria-hidden="true"/></button>
   </form>
   {signup&&!verificationEmailAvailable()&&<p className="mutedbox">Verification emails are not available yet. You can create an account, but teaching access stays locked until your email is verified.</p>}
   {google&&<div className="portal-auth-alternative">
    <p className="portal-auth-divider"><span>or</span></p>
    <a className="btn secondary google-auth-button" target="_top" href={"/faculty/auth/google/start?view="+view}><GoogleSignInMark/> Sign in with Google</a>
   </div>}
   <p className="faculty-access-note">{signup?"Teaching access requires a verified email and an active faculty profile.":"Use your registered faculty account. If you don’t have one yet, choose Create account."}</p>
   <a className="textlink" href="/help#sign-in">Need sign-in help?</a>
   </>}
 </PortalLoginShell>;
}
