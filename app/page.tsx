import {ArrowRight,ArrowDownToLine} from "lucide-react";
import {getUpcomingBanners} from "@/lib/course-banners";
import {FeaturedBanner,MoreUpcoming} from "./upcoming-banner";
import {Badge,Facts,Frame} from "./ui";
import {applicationsOpen,enrollmentUnavailable,getCourses} from "@/lib/enrollment";
import {REGULAR_TRACKS,TRACK_DETAILS,CRASH_SLUG,cDayNumber,feeText} from "@/lib/courses";
import {CAREER_DEPARTMENT,DEPARTMENT,DEPARTMENT_ABOUT,DEPARTMENT_URL,SITE_NAME} from "@/lib/programme";

export const dynamic="force-dynamic";
export default async function Home(){
 const courses=await getCourses();
 const [featured,...upcoming]=await getUpcomingBanners(courses);
 const cCourse=courses.find(c=>c.slug===CRASH_SLUG)!;
 const exclusive=courses.filter(c=>c.exclusive&&c.slug!==CRASH_SLUG);

 return <Frame>
  <section className="hero"><div className="wrap hero-stack">
   {featured?<FeaturedBanner item={featured}/>:<div className="homepage-intro">
    <span className="eyebrow">SHORT-TERM TRAINING COURSES</span><h1>{SITE_NAME}</h1>
    <p>Choose a regular five-day module or take an exclusive 15-hour course that covers five modules with one instructor.</p>
    <Facts/><div className="actions"><a className="btn primary" href="#courses">Browse course catalogue <ArrowRight size={18}/></a><a className="btn hero-download" href="/brochure.pdf" target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={17}/></a></div>
   </div>}
   <aside className="format"><span className="eyebrow">AT A GLANCE</span><h2>Programme information</h2>
    <dl><dt>Audience</dt><dd>Undergraduate engineering and computing students</dd><dt>Daily format</dt><dd>Three hours per day, including lecture and practical work</dd><dt>Batch dates &amp; venue</dt><dd>Announced for each course</dd><dt>Registration</dt><dd>Apply once your chosen batch is announced and open</dd></dl>
    {featured&&<a className="textlink" href="/brochure.pdf" target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={16}/></a>}
   </aside>
  </div></section>
  <MoreUpcoming items={upcoming}/>
  <section className="wrap catalog" id="courses">
   <div className="section-head"><div><span className="eyebrow">ACADEMIC CATALOGUE</span><h2>Explore short-term courses</h2></div><p>Browse any syllabus. Applications open individually when the organiser announces a batch.</p></div>
   <nav className="subject-nav" aria-label="Course formats"><a href="#regular-courses">Regular courses</a><a href="#exclusive-courses">Exclusive courses</a></nav>
   <section className="course-format" id="regular-courses" aria-labelledby="regular-heading">
    <h3 id="regular-heading">Regular Short-Term Courses</h3>
    <p>Each subject has five separate course cards. Each card has its own five-day plan, batch and application. Instructors can differ by course.</p>
    <nav className="subject-nav" aria-label="Jump to regular subject">{REGULAR_TRACKS.map(track=><a href={"#"+TRACK_DETAILS[track].id} key={track}><span>{TRACK_DETAILS[track].tag}</span> {TRACK_DETAILS[track].label}</a>)}</nav>
    {REGULAR_TRACKS.map((track,i)=>{
     const items=courses.filter(c=>c.track===track&&!c.exclusive);
     const details=TRACK_DETAILS[track];
     return <section className="track" id={details.id} key={track}>
      <div className="track-heading"><span className="track-num">{String(i+1).padStart(2,"0")}</span><div><h4>{track}</h4><p>{details.description}</p></div><small>{items.length} courses</small></div>
      <div className="grid">{items.map((c,j)=><a className="course" href={"/courses/"+c.slug} key={c.slug}>
       <div className="cardtop"><span className="course-code">{details.tag}-{String(j+1).padStart(2,"0")}</span><Badge status={c.status}/></div>
       <h4>{c.title}</h4><p>{c.blurb}</p><p className="course-instructor">{c.instructor??"Instructor to be announced"}</p>
       <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>5 days</li><li>{feeText}</li></ul>
       <div className="cardbottom"><strong>View syllabus <ArrowRight size={15}/></strong></div>
      </a>)}</div>
     </section>;
    })}
   </section>
   <section className="course-format" id="exclusive-courses" aria-labelledby="exclusive-heading">
    <h3 id="exclusive-heading">Exclusive Short-Term Courses</h3>
    <p>One faculty member teaches the five modules as five intensive three-hour sessions. That’s one 15-hour course, one fee and one application for all five days.</p>
    <section className="track exclusive-c-track" id="c-programming">
     <div className="track-heading"><div><h4>{cCourse.title}</h4><p>{cCourse.instructor} · 5 days · 15 hours total</p></div><Badge status={cCourse.status}/></div>
     <div className="actions exclusive-actions"><strong>{feeText} for all five days</strong><a className="btn secondary" href={"/courses/"+cCourse.slug}>View full course <ArrowRight size={15}/></a>{applicationsOpen(cCourse)?<a className="btn primary" href={"/apply?course="+cCourse.slug}>Start application <ArrowRight size={15}/></a>:<p>{enrollmentUnavailable(cCourse.status)}</p>}</div>
     <div className="grid">{courses.filter(c=>cDayNumber(c.slug)).map(c=><a className="course" href={"/courses/"+c.slug} key={c.slug}>
      <div className="cardtop"><span className="course-code">Day {cDayNumber(c.slug)}</span></div><h4>{c.title}</h4><p>{c.blurb}</p>
      <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>3 hours</li></ul><div className="cardbottom"><strong>View day plan <ArrowRight size={15}/></strong></div>
     </a>)}</div>
    </section>
    <section className="track" id="exclusive-subjects">
     <div className="track-heading"><div><h4>Data Analytics &amp; DBMS intensives</h4><p>Each listing is a complete course with a five-session plan.</p></div></div>
     <div className="grid">{exclusive.map(c=><a className="course" href={"/faculty-courses/"+c.slug} key={c.slug}>
      <div className="cardtop"><span className="course-code">{TRACK_DETAILS[c.track].tag} · EXCLUSIVE</span><Badge status={c.status}/></div>
      <h4>{c.title}</h4><p>{c.instructor??"Instructor to be announced"}</p>
      <ul className="course-meta" aria-label="Exclusive course summary"><li>5 sessions</li><li>15 hours total</li><li>{feeText}</li></ul>
      <div className="cardbottom"><strong>View intensive plan <ArrowRight size={15}/></strong></div>
     </a>)}</div>
    </section>
   </section>
  </section>
  <section className="programme" id="programme"><div className="wrap programme-grid">
   <section><span className="eyebrow">DEPARTMENTS</span><h2>{DEPARTMENT}</h2><p>{DEPARTMENT_ABOUT}</p><a className="textlink" href={DEPARTMENT_URL}>About the department <ArrowRight size={15}/></a><div className="programme-department"><h2>{CAREER_DEPARTMENT}</h2><p>Career readiness and professional development.</p></div></section>
   <section><span className="eyebrow">REGISTRATION</span><h2>From application to batch</h2><ol><li>Choose a course and check the prerequisites.</li><li>Wait for the batch to be announced. Once applications open, submit your form and save your tracking details.</li><li>Check your application status online.</li></ol><a className="textlink" href="/apply#track">Track an application <ArrowRight size={15}/></a></section>
  </div></section>
 </Frame>;
}
