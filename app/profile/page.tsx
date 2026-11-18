import {hasStudentGoogle,studentGoogleConfigured} from "@/lib/student-google";
import {GoogleSignInMark} from "@/app/google-sign-in";
import {ownerAuthHeader,studentContactHeader} from "@/lib/portal-session";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {getSiteUser,portalLoginPath} from "../site-auth";
import {Frame} from "../ui";
import {ProfileAvatar} from "../profile-avatar";
import {PhotoEditor} from "./photo-editor";
import {facultyFor} from "@/lib/portals";
import {isAdminIdentity} from "@/lib/enrollment";
import {staffRole} from "@/lib/staff";
import {ArrowLeft} from "lucide-react";
export const dynamic="force-dynamic";
export const metadata={title:"My profile",robots:{index:false,follow:false}};
const googleMessages:Record<string,string>={linked:"Google sign-in is linked to this student account.","google-login-required":"Sign in to your student account and start again.","google-cancelled":"Google linking was cancelled.","google-denied":"Google could not verify this account.","google-link-conflict":"Use the Google account that matches your contact email and is not already linked to another student account.","google-failed":"Could not link Google. Please try again.","google-unavailable":"Google sign-in is not available yet.",rate:"Too many attempts. Try again in a few minutes."};
export default async function Profile({searchParams}:{searchParams:Promise<{photo?:string;google?:string}>}){
 const user=await getSiteUser();if(!user)redirect(portalLoginPath("/profile"));
 const h=await headers(),contactOnly=h.has(studentContactHeader);const [faculty,staff,p]=await Promise.all([contactOnly?null:facultyFor({id:user.userId,email:user.email.toLowerCase()}),contactOnly?null:staffRole(h),searchParams]);
 const google=contactOnly&&user.userId.startsWith("student:")&&studentGoogleConfigured();
 const googleLinked=google?await hasStudentGoogle(user.userId.slice(8)):false;
 const googleMessage=p.google&&Object.hasOwn(googleMessages,p.google)?googleMessages[p.google]:"";
 return <Frame><section className="wrap profile-page"><a className="back textlink profile-home-link" href="/"><ArrowLeft size={16} aria-hidden="true"/> Back to homepage</a><span className="eyebrow">MY ACCOUNT</span><h1>My profile</h1><p>Your account, profile photo and learning workspaces.</p>
 <div className="profile-grid"><section className="panel profile-card"><ProfileAvatar name={user.displayName}/><h2>{user.fullName??"Your account"}</h2><p>{user.email}</p><span className="badge">{h.get(ownerAuthHeader)?"Administrator account":"Short Course Studio account"}</span><PhotoEditor/>{["saved","removed"].includes(p.photo??"")&&<p role="status">Profile photo {p.photo}.</p>}</section>
 <div><section className="panel profile-card"><h2>Account details</h2><dl className="receipt-details"><dt>Name</dt><dd>{user.fullName??"Not provided by your sign-in account"}</dd><dt>Email</dt><dd>{user.email}</dd>{faculty&&<><dt>Department</dt><dd>{faculty.department}</dd><dt>Designation</dt><dd>{faculty.designation}</dd></>}</dl><p>{contactOnly?"The email shown here is your application contact address. Sign in with your username.":"Your name and email come from your sign-in account. Faculty details are managed by the administrator."}</p></section>
 <section className="panel profile-card"><h2>Your workspaces</h2><div className="profile-links"><a href="/student">Student dashboard →</a><a href="/student?view=applications">My applications & payments →</a>{faculty&&<a href="/faculty">Faculty teaching workspace →</a>}{staff&&<a href="/staff">Staff workspace →</a>}{!contactOnly&&isAdminIdentity(h)&&<a href="/admin">Admin portal →</a>}</div></section>
 {google&&<section className="panel profile-card"><h2>Google sign-in</h2>
  {googleMessage&&<p role={p.google==="linked"?"status":"alert"}>{googleMessage}</p>}
  {googleLinked?<p>Google is linked to this student account.</p>:<><p>Link the Google account that matches your contact email to keep using this wishlist and application history.</p><form action="/student/auth/google/start" method="post" target="_top"><input type="hidden" name="intent" value="link"/><input type="hidden" name="return_to" value="/profile"/><button className="btn secondary google-auth-button"><GoogleSignInMark/> Link Google account</button></form></>}
 </section>}
 <section className="panel profile-card"><h2>Account session</h2><p>Sign out to return to the homepage.</p><form action="/session/logout" method="post" target="_top"><button className="btn secondary">Sign out</button></form></section></div></div>
 </section></Frame>;
}
