import {ProgrammeGlance} from "./programme-glance";
import {getSiteContent,priceText} from "@/lib/admin-controls";
import {ArrowRight,ArrowDownToLine} from "lucide-react";
import {getUpcomingBanners} from "@/lib/course-banners";
import {FeaturedBanner} from "./upcoming-banner";
import {HomeCarousel} from "./home-carousel";
import {Badge,Facts,Frame} from "./ui";
import {HomepageSignOutReturn} from "./homepage-signout-return";
import {canApply,enrollmentUnavailable,getCourses,getSiteControls,intakeStatus,publicCatalogue} from "@/lib/enrollment";
import {REGULAR_TRACKS,TRACK_DETAILS,CRASH_SLUG,cDayNumber} from "@/lib/courses";
import {CAREER_DEPARTMENT,CAREER_DEPARTMENT_ABOUT,CAREER_DEPARTMENT_URL,DEPARTMENT,DEPARTMENT_ABOUT,DEPARTMENT_URL,SITE_NAME} from "@/lib/programme";

export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{signed_out?:string|string[]}>}){
 const [all,controls,content,params]=await Promise.all([getCourses(),getSiteControls(),getSiteContent(),searchParams]);
 const signedOut=params?.signed_out==="1";
 const courses=publicCatalogue(all);
 // Server component rendered per request (force-dynamic), so reading the clock here is safe.
 // eslint-disable-next-line react-hooks/purity
 const now=Date.now();
 const featured=await getUpcomingBanners(courses,now,true);
 const slides=featured.slice(0,5);
 const cCourse=courses.find(c=>c.slug===CRASH_SLUG);
 const exclusive=courses.filter(c=>c.exclusive&&c.slug!==CRASH_SLUG);

 return <Frame homeNavigation suppressStudentPopup={signedOut}>
  {signedOut&&<HomepageSignOutReturn/>}
  {controls.announcement&&<p className="site-announcement"><span className="wrap">{controls.announcement}</span></p>}
  <section className="hero"><div className="wrap hero-stack">
   {slides.length?<HomeCarousel slides={slides.map((item,i)=>({id:item.slug,title:item.title,content:<FeaturedBanner item={item} heroTitle={i===0} now={now}/>}))}/>:<div className="homepage-intro">
    <span className="eyebrow">SHORT-TERM TRAINING COURSES</span><h1>{content.headline||SITE_NAME}</h1>
    <p>{content.intro||"Choose a regular five-day module or take an exclusive 15-hour course that covers five modules with one instructor."}</p>
    <Facts/><div className="actions"><a className="btn primary" href="#courses">Browse course catalogue <ArrowRight size={18}/></a><a className="btn hero-download" href={content.brochure||"/brochure.pdf"} target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={17}/></a></div>
   </div>}
   <ProgrammeGlance brochure={content.brochure||"/brochure.pdf"}/>
  </div></section>
  <section className="wrap catalog" id="courses">
   <div className="section-head"><div><span className="eyebrow">ACADEMIC CATALOGUE</span><h2>{content.catalogue||"Explore short-term courses"}</h2></div><p>Browse any syllabus. Applications open individually when the organiser announces a batch.</p></div>
   <nav className="subject-nav" aria-label="Course formats"><a href="#regular-courses">Regular courses</a><a href="#exclusive-courses">Exclusive courses</a></nav>
   <section className="course-format" id="regular-courses" aria-labelledby="regular-heading">
    <h3 id="regular-heading">Regular Short-Term Courses</h3>
    <p>Each subject has five separate course cards. Each card has its own five-day plan, batch and application. Instructors can differ by course.</p>
    <nav className="subject-nav" aria-label="Jump to regular subject">{REGULAR_TRACKS.map(track=><a href={"#"+TRACK_DETAILS[track].id} key={track}><span>{TRACK_DETAILS[track].tag}</span> {TRACK_DETAILS[track].label}</a>)}</nav>
    {[...REGULAR_TRACKS,...(courses.some(c=>c.track==="C Programming"&&(c.slug.startsWith("faculty-")||c.slug.startsWith("studio-"))&&!c.exclusive)?["C Programming" as const]:[])].map((track,i)=>{
     const items=courses.filter(c=>c.track===track&&!c.exclusive&&!cDayNumber(c.slug));
     const details=TRACK_DETAILS[track];
     return <section className="track" id={track==="C Programming"?"regular-c-programming":details.id} key={track}>
      <div className="track-heading"><span className="track-num">{String(i+1).padStart(2,"0")}</span><div><h4>{track}</h4><p>{details.description}</p></div><small>{items.length} courses</small></div>
      <div className="grid">{items.map((c,j)=><a className="course" href={"/courses/"+c.slug} key={c.slug}>
       <div className="cardtop"><span className="course-code">{details.tag}-{String(j+1).padStart(2,"0")}</span><Badge status={intakeStatus(c)}/></div>
       <h4>{c.title}</h4><p>{c.blurb}</p><p className="course-instructor">{c.instructor??"Instructor to be announced"}</p>
       <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>5 days</li><li>{priceText(c.feePaise)}</li></ul>
       <div className="cardbottom"><strong>View syllabus <ArrowRight size={15}/></strong></div>
      </a>)}</div>
     </section>;
    })}
   </section>
   <section className="course-format" id="exclusive-courses" aria-labelledby="exclusive-heading">
    <h3 id="exclusive-heading">Exclusive Short-Term Courses</h3>
    {cCourse&&<section className="track exclusive-c-track" id="c-programming">
     <div className="track-heading"><div><h4>{cCourse.title}</h4><p>{cCourse.instructor} · 5 days · 15 hours total</p></div><Badge status={intakeStatus(cCourse)}/></div>
     <div className="actions exclusive-actions"><strong>{priceText(cCourse.feePaise)} for all five days</strong><a className="btn secondary" href={"/courses/"+cCourse.slug}>View full course <ArrowRight size={15}/></a>{canApply(cCourse)?<a className="btn primary" href={"/apply?course="+cCourse.slug}>{content.cta||"Start application"} <ArrowRight size={15}/></a>:<p>{enrollmentUnavailable(intakeStatus(cCourse))}</p>}</div>
     <div className="grid">{courses.filter(c=>cDayNumber(c.slug)).map(c=><a className="course" href={"/courses/"+c.slug} key={c.slug}>
      <div className="cardtop"><span className="course-code">Day {cDayNumber(c.slug)}</span></div><h4>{c.title}</h4><p>{c.blurb}</p>
      <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>3 hours</li></ul><div className="cardbottom"><strong>View day plan <ArrowRight size={15}/></strong></div>
     </a>)}</div>
    </section>}
    <section className="track" id="exclusive-subjects">
     <div className="track-heading"><div><h4>Faculty-led intensives</h4><p>Each listing is a complete course with a five-session plan.</p></div></div>
     <div className="grid">{exclusive.map(c=><a className="course" href={(c.slug.startsWith("faculty-")||c.slug.startsWith("studio-")?"/courses/":"/faculty-courses/")+c.slug} key={c.slug}>
      <div className="cardtop"><span className="course-code">{TRACK_DETAILS[c.track].tag} · EXCLUSIVE</span><Badge status={intakeStatus(c)}/></div>
      <h4>{c.title}</h4><p>{c.instructor??"Instructor to be announced"}</p>
      <ul className="course-meta" aria-label="Exclusive course summary"><li>5 sessions</li><li>15 hours total</li><li>{priceText(c.feePaise)}</li></ul>
      <div className="cardbottom"><strong>View intensive plan <ArrowRight size={15}/></strong></div>
     </a>)}</div>
    </section>
   </section>
  </section>
  <section className="programme" id="programme"><div className="wrap programme-grid">
   <section><span className="eyebrow">DEPARTMENTS</span><h2>{DEPARTMENT}</h2><p>{DEPARTMENT_ABOUT}</p><a className="textlink" href={DEPARTMENT_URL}>About the department <ArrowRight size={15}/></a><div className="programme-department"><h2>{CAREER_DEPARTMENT}</h2><p>{CAREER_DEPARTMENT_ABOUT}</p><a className="textlink" href={CAREER_DEPARTMENT_URL}>About the department <ArrowRight size={15}/></a></div></section>
   <section><span className="eyebrow">REGISTRATION</span><h2>From application to batch</h2><ol><li>Choose a course and check the prerequisites.</li><li>Wait for the batch to be announced. Once applications open, submit your form and save your tracking details.</li><li>Check your application status and batch details in the Student Portal.</li></ol><a className="textlink" href="/student?view=applications">My applications <ArrowRight size={15}/></a></section>
  </div></section>
 </Frame>;
}
