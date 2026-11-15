import {getSiteContent} from "@/lib/admin-controls";
import {chatGPTSignInPath,portalLoginPath,getChatGPTUser} from "./chatgpt-auth";
import {HomeStudentLogin} from "./home-student-login";
import {ProfileAvatar} from "./profile-avatar";
import {UserRound} from "lucide-react";
import {feeText} from "@/lib/courses";
import {applicationsStatus} from "@/lib/enrollment";
import {CAREER_DEPARTMENT,DEPARTMENT,DEPARTMENT_URL,INSTITUTE,POWERED_BY,SITE_NAME} from "@/lib/programme";
export type PortalRole="Student"|"Faculty"|"Admin";
type PortalHeader={role:PortalRole;path:string;signedIn?:boolean};
export async function Header({portal,homeNavigation=false,suppressStudentPopup=false}:{portal?:PortalHeader;homeNavigation?:boolean;suppressStudentPopup?:boolean}={}){
 const [content,homeUser]=await Promise.all([getSiteContent(),getChatGPTUser()]);
 const login=homeNavigation?{role:"Student",path:"/student"}:portal&&!portal.signedIn?portal:undefined;
 const privatePortal=login?.role==="Faculty"||login?.role==="Admin";
 return <header className="top">
  <div className="wrap nav">
   <a className="brand" href="/">
    <img className="brand-logo" src={content.studioLogo||"/favicon.svg"} alt="" width={40} height={40}/>
    <span><strong>{SITE_NAME}</strong><small>{content.tagline||"Five-day practical courses"}</small></span>
   </a>
   <nav aria-label="Main"><a href="/#courses">Courses</a><a href="/help">Help</a>
    {homeUser?<a className="profile-nav" href="/profile" aria-label="Open my profile" title="My profile"><ProfileAvatar name={homeUser.displayName}/></a>:homeNavigation?<HomeStudentLogin autoOpen={!suppressStudentPopup} loginPath={portalLoginPath("/student")} signInPath={chatGPTSignInPath("/student")}/>:<a className="navbutton portal-auth-link" href={privatePortal?"#portal-sign-in":portalLoginPath(login?.path??"/student")} target={privatePortal?undefined:"_top"}><UserRound size={16} aria-hidden="true"/>{privatePortal?" "+login?.role+" sign in":" Sign in / Sign up"}</a>}
   </nav>
  </div>
  <div className="institution-strip"><div className="wrap institution-inner">
   <div className="institution-mark" aria-label={POWERED_BY}>
    <img className="institution-logo" src={content.instituteLogo||"/gl-bajaj-crest.png"} alt="" width={74} height={62}/>
    <div><span>Powered by</span><strong>GL Bajaj</strong></div>
   </div>
   <ul className="institution-departments" aria-label="Departments"><li>{DEPARTMENT}</li><li>{CAREER_DEPARTMENT}</li></ul>
  </div></div>
 </header>;
}
export async function Footer(){
 const content=await getSiteContent();
 const groups=[
  {title:"Explore",links:[["About us","/about"],["Course catalogue","/#courses"],["Programme brochure",content.brochure||"/brochure.pdf"],["Department website",DEPARTMENT_URL]]},
  {title:"Support",links:[["FAQ","/faq"],["Help & support","/help"],["Privacy notice","/privacy"],["Verify a certificate","/certificate"]]},
  {title:"Portals",links:[["Student Portal","/student"],["Faculty Portal","/faculty"],["Staff Portal","/staff"],["Admin Portal","/admin"]]},
 ];
 return <footer className="site-footer"><div className="wrap footer-directory">
  <section className="footer-identity"><strong>{SITE_NAME}</strong><p>{POWERED_BY}</p><p>{INSTITUTE} · Greater Noida</p><p>{DEPARTMENT}</p><p>{CAREER_DEPARTMENT}</p></section>
  {groups.map(({title,links})=><nav aria-label={title} className="footer-links" key={title}><strong>{title}</strong>{links.map(([label,href])=><a key={label} href={href}>{label}</a>)}</nav>)}
  <small className="footer-status">Independently organised · Private review draft</small>
 </div></footer>;
}
export function Frame({children,portalHeader,homeNavigation,suppressStudentPopup}:{children:React.ReactNode;portalHeader?:PortalHeader;homeNavigation?:boolean;suppressStudentPopup?:boolean}){return <><a href="#main" className="skip">Skip to content</a><Header portal={portalHeader} homeNavigation={homeNavigation} suppressStudentPopup={suppressStudentPopup}/><main id="main">{children}</main><Footer/></>}
export function Badge({status}:{status:string}){return <span className={"badge "+status}><i/>{applicationsStatus(status)}</span>}
export function Facts({fee=feeText}:{fee?:string}={}){return <dl className="facts"><div><dt>Duration</dt><dd>5 days</dd></div><div><dt>Daily schedule</dt><dd>3 hours/day</dd></div><div><dt>Fee per course</dt><dd>{fee}</dd></div></dl>}
