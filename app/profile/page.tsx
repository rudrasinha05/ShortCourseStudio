import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {getChatGPTUser,portalLoginPath,chatGPTSignOutPath} from "../chatgpt-auth";
import {Frame} from "../ui";
import {ProfileAvatar} from "../profile-avatar";
import {PhotoEditor} from "./photo-editor";
import {facultyFor} from "@/lib/portals";
import {isAdminIdentity} from "@/lib/enrollment";
import {staffRole} from "@/lib/staff";
export const dynamic="force-dynamic";
export const metadata={title:"My profile",robots:{index:false,follow:false}};
export default async function Profile({searchParams}:{searchParams:Promise<{photo?:string}>}){
 const user=await getChatGPTUser();if(!user)redirect(portalLoginPath("/profile"));
 const h=await headers();const [faculty,staff,p]=await Promise.all([facultyFor({id:user.userId,email:user.email.toLowerCase()}),staffRole(h),searchParams]);
 return <Frame><section className="wrap profile-page"><span className="eyebrow">MY ACCOUNT</span><h1>My profile</h1><p>Your account, profile photo and learning workspaces.</p>
 <div className="profile-grid"><section className="panel profile-card"><ProfileAvatar name={user.displayName}/><h2>{user.fullName??"Your account"}</h2><p>{user.email}</p><span className="badge">ChatGPT account</span><PhotoEditor/>{["saved","removed"].includes(p.photo??"")&&<p role="status">Profile photo {p.photo}.</p>}</section>
 <div><section className="panel profile-card"><h2>Account details</h2><dl className="receipt-details"><dt>Name</dt><dd>{user.fullName??"Not provided by your sign-in account"}</dd><dt>Email</dt><dd>{user.email}</dd>{faculty&&<><dt>Department</dt><dd>{faculty.department}</dd><dt>Designation</dt><dd>{faculty.designation}</dd></>}</dl><p>Your name and email come from your sign-in account. Faculty details are managed by the administrator.</p></section>
 <section className="panel profile-card"><h2>Your workspaces</h2><div className="profile-links"><a href="/student">Student dashboard →</a><a href="/student?view=applications">My applications & payments →</a>{faculty&&<a href="/faculty">Faculty teaching workspace →</a>}{staff&&<a href="/staff">Staff workspace →</a>}{isAdminIdentity(h)&&<a href="/admin">Admin portal →</a>}</div></section>
 <section className="panel profile-card"><h2>Account session</h2><p>Sign out to return to the homepage.</p><a className="btn secondary" href={chatGPTSignOutPath("/")} target="_top">Sign out</a></section></div></div>
 </section></Frame>;
}
