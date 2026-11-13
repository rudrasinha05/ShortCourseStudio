import {ArrowRight,ArrowDownToLine} from "lucide-react";
import {getUpcomingBanners} from "@/lib/course-banners";
import {FeaturedBanner,MoreUpcoming} from "./upcoming-banner";
import {Badge,Facts,Frame} from "./ui";
import {getCourses} from "@/lib/enrollment";
import {TRACKS,feeText} from "@/lib/courses";
import {CAREER_DEPARTMENT,DEPARTMENT,DEPARTMENT_ABOUT,DEPARTMENT_URL,SITE_NAME} from "@/lib/programme";
export const dynamic="force-dynamic";
const ids=["data-analytics","dbms","networks","coa","toc"];
const tags=["DA","DB","CN","CA","TC"];
const descriptions=[
 "Analyse data with Python, probability, statistics, machine learning and deep learning.",
 "Design relational databases, write reports, tune queries and build data pipelines.",
 "Plan networks, configure switching and routing, and troubleshoot in a simulator.",
 "Explore the datapath, assembly language, arithmetic, memory and processor performance.",
 "Build automata, design grammars and examine what machines can compute."
];
export default async function Home(){const courses=await getCourses(),[featured,...upcoming]=await getUpcomingBanners(courses);return <Frame>
 <section className="hero"><div className="wrap hero-stack">{featured?<FeaturedBanner item={featured}/>:<div className="homepage-intro"><span className="eyebrow">SHORT-TERM TRAINING COURSES</span><h1>{SITE_NAME}</h1><p>Choose from 25 practical courses across five subject tracks. Build a final project you can demonstrate, with a daily lecture and guided lab work.</p><Facts/><div className="actions"><a className="btn primary" href="#courses">Browse course catalogue <ArrowRight size={18}/></a><a className="btn hero-download" href="/brochure.pdf" target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={17}/></a></div></div>}
 <aside className="format"><span className="eyebrow">AT A GLANCE</span><h2>Programme information</h2><dl><dt>Audience</dt><dd>Undergraduate engineering and computing students</dd><dt>Daily format</dt><dd>45 min lecture · 90 min practical · 30 min review · 15 min break</dd><dt>Batch dates &amp; venue</dt><dd>To be announced for each course</dd><dt>Registration</dt><dd>Pre-apply without payment and track your application online</dd></dl>{featured&&<a className="textlink" href="/brochure.pdf" target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={16}/></a>}</aside></div></section>
 <MoreUpcoming items={upcoming}/>
 <section className="wrap catalog" id="courses"><div className="section-head"><div><span className="eyebrow">ACADEMIC CATALOGUE</span><h2>Explore the five subject tracks</h2></div><p>Each card opens a separate five-day course with lecture topics, lab work, prerequisites and the final deliverable.</p></div>
 <nav className="subject-nav" aria-label="Jump to subject">{TRACKS.map((track,i)=><a href={"#"+ids[i]} key={track}><span>{tags[i]}</span> {["Data Analytics","DBMS","Computer Networks","COA","TOC"][i]}</a>)}</nav>
 {TRACKS.map((track,i)=><section className="track" id={ids[i]} key={track}><div className="track-heading"><span className="track-num">{String(i+1).padStart(2,"0")}</span><div><h3>{track}</h3><p>{descriptions[i]}</p></div><small>{courses.filter(c=>c.track===track).length} courses</small></div><div className="grid">{courses.filter(c=>c.track===track).map((c,j)=><a className="course" href={"/courses/"+c.slug} key={c.slug}><div className="cardtop"><span className="course-code">{tags[i]}-{String(j+1).padStart(2,"0")}</span><Badge status={c.status}/></div><h4>{c.title}</h4><p>{c.blurb}</p><ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>5 days</li><li>{feeText}</li></ul><div className="cardbottom"><strong>View syllabus <ArrowRight size={15}/></strong></div></a>)}</div></section>)}
 </section>
 <section className="programme" id="programme"><div className="wrap programme-grid"><section><span className="eyebrow">DEPARTMENTS</span><h2>{DEPARTMENT}</h2><p>{DEPARTMENT_ABOUT}</p><a className="textlink" href={DEPARTMENT_URL}>About the department <ArrowRight size={15}/></a><div className="programme-department"><h2>{CAREER_DEPARTMENT}</h2><p>Career readiness and professional development.</p></div></section><section><span className="eyebrow">REGISTRATION</span><h2>From application to batch</h2><ol><li>Choose a course and check the prerequisites.</li><li>Pre-apply or submit a batch application. Save your reference and tracking code.</li><li>Check your status online. Dates and payment instructions will be announced separately.</li></ol><a className="textlink" href="/apply#track">Track an application <ArrowRight size={15}/></a></section></div></section>
 </Frame>}
