import {CourseFormatFilter} from "./course-format-filter";
import {WishlistButton} from "./wishlist-client";
import {WishlistCourseCard} from "./wishlist-course-card";
import {courseHref,wishlistStudentIdentity} from "@/lib/wishlist";
import {headers} from "next/headers";
import {ProgrammeGlance} from "./programme-glance";
import {getSiteContent,priceText} from "@/lib/admin-controls";
import {ArrowRight,ArrowDownToLine,BriefcaseBusiness,Code2,FolderOpen,MessagesSquare} from "lucide-react";
import {getUpcomingBanners} from "@/lib/course-banners";
import {FeaturedBanner} from "./upcoming-banner";
import {HomeCarousel} from "./home-carousel";
import {Badge,Facts,Frame} from "./ui";
import {HomepageSignOutReturn} from "./homepage-signout-return";
import {canApply,enrollmentUnavailable,getCourses,getSiteControls,intakeStatus,publicCatalogue} from "@/lib/enrollment";
import {REGULAR_TRACKS,TRACK_DETAILS,CRASH_SLUG,cDayNumber,type Track} from "@/lib/courses";
import {DEPARTMENT,DEPARTMENT_ABOUT,DEPARTMENT_URL,SITE_NAME} from "@/lib/programme";

export const dynamic="force-dynamic";
export const metadata={description:"Prepare for placements with Short Course Studio. Build job-relevant skills in five-day courses with guided labs and practical projects you can discuss in technical interviews."};
const placementBenefits=[[Code2,"Practise job-relevant skills"],[FolderOpen,"Build a project to showcase"],[MessagesSquare,"Explain your work in interviews"]] as const;
function SubjectNav({format,links}:{format:"regular"|"exclusive";links:ReadonlyArray<readonly [Track,string]>}){
 if(!links.length)return null;
 return <nav className="subject-nav" aria-label={"Jump to "+format+" subject"}>{links.map(([track,id])=><a href={"#"+id} key={track}><span>{TRACK_DETAILS[track].tag}</span> {TRACK_DETAILS[track].label}</a>)}</nav>;
}
export default async function Home({searchParams}:{searchParams:Promise<{signed_out?:string|string[]}>}){
 const [all,controls,content,params,requestHeaders]=await Promise.all([getCourses(),getSiteControls(),getSiteContent(),searchParams,headers()]);
 const student=!!wishlistStudentIdentity(requestHeaders);
 const signedOut=params?.signed_out==="1";
 const courses=publicCatalogue(all);
 const now=Date.now();
 const featured=await getUpcomingBanners(courses,now,true);
 const slides=featured.slice(0,5);
 const cCourse=courses.find(c=>c.slug===CRASH_SLUG);
 const regular=courses.filter(c=>!c.exclusive&&!cDayNumber(c.slug));
 const regularTracks=[...REGULAR_TRACKS,...(regular.some(c=>c.track==="C Programming")?["C Programming" as const]:[])];
 const regularAnchor=(track:typeof regularTracks[number])=>track==="C Programming"?"regular-c-programming":TRACK_DETAILS[track].id;
 const exclusive=courses.filter(c=>c.exclusive&&c.slug!==CRASH_SLUG);
 const firstExclusiveBySubject=new Map<Track,string>();
 for(const course of exclusive)if(!firstExclusiveBySubject.has(course.track))firstExclusiveBySubject.set(course.track,course.slug);
 const exclusiveAnchor=(track:Track)=>"exclusive-"+TRACK_DETAILS[track].id;
 const exclusiveLinks:Array<readonly [Track,string]>=cCourse?[[cCourse.track,"c-programming"]]:[];
 for(const track of firstExclusiveBySubject.keys())if(track!==cCourse?.track)exclusiveLinks.push([track,exclusiveAnchor(track)]);

 return <Frame homeNavigation suppressStudentPopup>
  {signedOut&&<HomepageSignOutReturn/>}
  {controls.announcement&&<p className="site-announcement"><span className="wrap">{controls.announcement}</span></p>}
  <section className="hero"><div className="wrap hero-stack">
   {slides.length?<HomeCarousel slides={slides.map((item,i)=>({id:item.slug,title:item.title,content:<FeaturedBanner item={item} heroTitle={i===0} now={now}/>}))}/>:<div className="homepage-intro">
    <span className="eyebrow">SHORT-TERM TRAINING COURSES</span><h2>{content.headline||SITE_NAME}</h2>
    <p>{content.intro||"Choose a regular five-day module or take an exclusive 15-hour course that covers five modules with one instructor."}</p>
    <Facts/><div className="actions"><a className="btn primary" href="#courses">Browse course catalogue <ArrowRight size={18}/></a><a className="btn hero-download" href={content.brochure||"/brochure.pdf"} target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={17}/></a></div>
   </div>}
   <section className="placement-intro" aria-labelledby="placement-heading">
    <div><span className="eyebrow"><BriefcaseBusiness size={15} aria-hidden="true"/> PLACEMENT PREPARATION</span>
     <h1 id="placement-heading">Get placement-ready, one short course at a time.</h1>
     <p>Short Course Studio helps students turn classroom concepts into skills they can use in technical rounds. Spend five days learning with faculty, practising in guided labs and building work you can talk about in interviews.</p>
     <ul aria-label="What you’ll practise">{placementBenefits.map(([Icon,label])=><li key={label}><Icon size={16} aria-hidden="true"/> {label}</li>)}</ul>
    </div>
    <a className="btn primary" href="#courses">Explore short-term courses <ArrowRight size={17} aria-hidden="true"/></a>
   </section>
   <ProgrammeGlance brochure={content.brochure||"/brochure.pdf"}/>
  </div></section>
  <section className="wrap catalog" id="courses">
   <div className="section-head"><div><span className="eyebrow">ACADEMIC CATALOGUE</span><h2>{content.catalogue||"Explore short-term courses"}</h2></div><p>Browse any syllabus. Applications open individually when the organiser announces a batch.</p></div>
   <CourseFormatFilter regular={<section className="course-format" id="regular-courses" aria-labelledby="regular-heading">
    <h3 id="regular-heading">Regular Short-Term Courses</h3>
    <p>Build practical skills one course at a time. Pick a subject below, then explore focused five-day courses and see what you’ll learn, practise and build.</p>
    <SubjectNav format="regular" links={regularTracks.map(track=>[track,regularAnchor(track)])}/>
    {regularTracks.map((track,i)=>{
     const items=regular.filter(c=>c.track===track);
     const details=TRACK_DETAILS[track];
     return <section className="track" id={regularAnchor(track)} key={track}>
      <div className="track-heading"><span className="track-num">{String(i+1).padStart(2,"0")}</span><div><h4>{track}</h4><p>{details.description}</p></div><small>{items.length} courses</small></div>
      <div className="grid">{items.map((c,j)=><WishlistCourseCard student={student} slug={c.slug} title={c.title} href={courseHref(c.slug)} label="View syllabus" key={c.slug}>
       <div className="cardtop"><span className="course-code">{details.tag}-{String(j+1).padStart(2,"0")}</span><Badge status={intakeStatus(c)}/></div>
       <h4>{c.title}</h4><p>{c.blurb}</p><p className="course-instructor">{c.instructor??"Instructor to be announced"}</p>
       <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>5 days</li><li>{priceText(c.feePaise)}</li></ul>
      </WishlistCourseCard>)}</div>
     </section>;
    })}
   </section>} exclusive={<section className="course-format" id="exclusive-courses" aria-labelledby="exclusive-heading">
    <h3 id="exclusive-heading">Exclusive Short-Term Courses</h3>
    <SubjectNav format="exclusive" links={exclusiveLinks}/>
    {cCourse&&<section className="track exclusive-c-track" id="c-programming">
     <div className="track-heading"><div><h4>{cCourse.title}</h4><p>{cCourse.instructor} · 5 days · 15 hours total</p></div><Badge status={intakeStatus(cCourse)}/></div>
     <div className="actions exclusive-actions"><strong>{priceText(cCourse.feePaise)} for all five days</strong><a className="btn secondary" href={"/courses/"+cCourse.slug}>View full course <ArrowRight size={15}/></a>{canApply(cCourse)?<a className="btn primary" href={"/apply?course="+cCourse.slug}>{content.cta||"Start application"} <ArrowRight size={15}/></a>:<p>{enrollmentUnavailable(intakeStatus(cCourse))}</p>}<WishlistButton student={student} title={cCourse.title} slug={cCourse.slug}/></div>
     <div className="grid">{courses.filter(c=>cDayNumber(c.slug)).map(c=><WishlistCourseCard student={student} slug={c.slug} title={c.title} href={courseHref(c.slug)} label="View day plan" key={c.slug}>
      <div className="cardtop"><span className="course-code">Day {cDayNumber(c.slug)}</span></div><h4>{c.title}</h4><p>{c.blurb}</p>
      <ul className="course-meta" aria-label="Course summary"><li>{c.level}</li><li>3 hours</li></ul>
     </WishlistCourseCard>)}</div>
    </section>}
    <div className="grid exclusive-course-grid" id="exclusive-subjects">{exclusive.map(c=><WishlistCourseCard id={c.track!==cCourse?.track&&firstExclusiveBySubject.get(c.track)===c.slug?exclusiveAnchor(c.track):undefined} student={student} slug={c.slug} title={c.title} href={courseHref(c.slug)} label="View syllabus" key={c.slug}>
      <div className="cardtop"><span className="course-code">{TRACK_DETAILS[c.track].tag} · EXCLUSIVE</span><Badge status={intakeStatus(c)}/></div>
      <h4>{c.title}</h4><p>{c.instructor??"Instructor to be announced"}</p>
      <ul className="course-meta" aria-label="Exclusive course summary"><li>5 sessions</li><li>15 hours total</li><li>{priceText(c.feePaise)}</li></ul>
    </WishlistCourseCard>)}</div>
   </section>}/>
  </section>
  <section className="programme" id="programme"><div className="wrap programme-grid">
   <section><span className="eyebrow">DEPARTMENT</span><h2>{DEPARTMENT}</h2><p>{DEPARTMENT_ABOUT}</p><a className="textlink" href={DEPARTMENT_URL}>About the department <ArrowRight size={15}/></a></section>
   <section><span className="eyebrow">REGISTRATION</span><h2>From application to batch</h2><ol><li>Choose a course and check the prerequisites.</li><li>Wait for the batch to be announced. Once applications open, submit your form and save your tracking details.</li><li>Check your application status and batch details in the Student Portal.</li></ol><a className="textlink" href="/student?view=applications">My applications <ArrowRight size={15}/></a></section>
  </div></section>
 </Frame>;
}
