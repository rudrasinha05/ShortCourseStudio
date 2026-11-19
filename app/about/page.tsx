import Link from "next/link";
import {Frame} from "@/app/ui";
import {getSiteContent} from "@/lib/admin-controls";
import {DEPARTMENT,DEPARTMENT_ABOUT,DEPARTMENT_URL,INSTITUTE} from "@/lib/programme";

export const dynamic="force-dynamic";
export const metadata={title:"About Short Course Studio"};
export default async function About(){
 const content=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">ABOUT US</span><h1>Short Course Studio</h1>
 <p>Five-day short courses that pair classroom concepts with guided labs and a practical project.</p>
 <div className="panel formpanel"><h2>Two ways to learn</h2><p><strong>Regular courses</strong> focus on one subject module in five three-hour sessions.</p><p><strong>Exclusive courses</strong> cover five modules in one 15-hour intensive with one instructor.</p><p>Course pages list the prerequisites, tools, project outcome and batch status. You can explore a syllabus before applications open.</p></div>
 <div className="panel formpanel"><h2>Organising department</h2><p>{INSTITUTE} · Greater Noida</p><p><strong>{DEPARTMENT}</strong></p><p>{DEPARTMENT_ABOUT}</p><a className="textlink" href={DEPARTMENT_URL}>Department website</a></div>
 <div className="portal-links"><Link className="btn primary" href="/#courses">Browse course catalogue</Link><a className="btn secondary" href={content.brochure||"/brochure.pdf"}>Programme brochure</a></div>
 </section></Frame>;
}
