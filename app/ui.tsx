import {getSiteContent} from "@/lib/admin-controls";
import {ArrowRight} from "lucide-react";
import {feeText} from "@/lib/courses";
import {applicationsStatus} from "@/lib/enrollment";
import {CAREER_DEPARTMENT,DEPARTMENT,DEPARTMENT_URL,INSTITUTE,POWERED_BY,SITE_NAME} from "@/lib/programme";
export async function Header(){
 const content=await getSiteContent();
 return <header className="top">
  <div className="wrap nav">
   <a className="brand" href="/">
    <img className="brand-logo" src={content.studioLogo||"/favicon.svg"} alt="" width={40} height={40}/>
    <span><strong>{SITE_NAME}</strong><small>{content.tagline||"Five-day practical courses"}</small></span>
   </a>
   <nav aria-label="Main"><a href="/#courses">Courses</a><a href="/student">Student Portal</a><a href="/faculty">Faculty Portal</a><a href="/help">Help</a><a className="navbutton" href="/apply">Applications <ArrowRight size={15}/></a></nav>
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
export function Frame({children}:{children:React.ReactNode}){return <><a href="#main" className="skip">Skip to content</a><Header/><main id="main">{children}</main><Footer/></>}
export function Badge({status}:{status:string}){return <span className={"badge "+status}><i/>{applicationsStatus(status)}</span>}
export function Facts({fee=feeText}:{fee?:string}={}){return <dl className="facts"><div><dt>Duration</dt><dd>5 days</dd></div><div><dt>Daily schedule</dt><dd>3 hours/day</dd></div><div><dt>Fee per course</dt><dd>{fee}</dd></div></dl>}
