import {WishlistButton} from "@/app/wishlist-client";
import {priceText} from "@/lib/admin-controls";
import {wishlistStudentIdentity} from "@/lib/wishlist";
import {headers} from "next/headers";
import {notFound} from "next/navigation";
import {ArrowLeft,ArrowRight,ArrowDownToLine} from "lucide-react";
import {Badge,Facts,Frame} from "@/app/ui";
import {getCourse,TRACK_DETAILS,CRASH_TITLE,cDayNumber,registrationSlug,isCShortCourse,C_DAY_SLUGS,regularModules} from "@/lib/courses";
import {canApply,enrollmentUnavailable,intakeStatus,lookup,paymentMode} from "@/lib/enrollment";
import {courseBrief,pythonDetails} from "@/lib/programme";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const course=await lookup((await params).slug);const day=course?cDayNumber(course.slug):0;return {title:course?(day?"Day "+day+" · ":"")+course.title:"Course not found"}}
export default async function CoursePage({params}:{params:Promise<{slug:string}>}){
 const c=await lookup((await params).slug);if(!c||c.visibility!=="published"||(cDayNumber(c.slug)&&(await lookup(registrationSlug(c.slug)))?.visibility!=="published"))notFound();
 const student=!!wishlistStudentIdentity(await headers());
 const brief=courseBrief(c),python=c.slug==="python-for-data-analytics";
 const defaults=getCourse(c.slug)??c;
 const anchor=TRACK_DETAILS[c.track].id;
 const day=cDayNumber(c.slug),cShortCourse=isCShortCourse(c.slug),registration=day?await lookup(registrationSlug(c.slug)):c;
 const exclusive=!!day||!!c.exclusive, instructor=registration?.instructor;
 const modules=c.exclusive&&!cShortCourse?regularModules(c.track):[];
 const backHref=exclusive&&!cShortCourse?"/#exclusive-subjects":c.track==="C Programming"&&!cShortCourse?"/#regular-c-programming":"/#"+anchor;
 return <Frame><section className="detail-hero"><div className="wrap"><a className="back" href={backHref}><ArrowLeft size={16}/> {c.track}</a><div className="detail-grid"><div><span className="eyebrow">{day?(registration?.title??CRASH_TITLE).toUpperCase()+" · DAY "+day:exclusive?"EXCLUSIVE SHORT-TERM COURSE":"REGULAR SHORT-TERM COURSE"}</span><h1>{c.title}</h1><p>{c.blurb}</p><div className="course-detail-wishlist"><WishlistButton student={student} slug={c.slug} title={c.title}/></div>{!day&&!exclusive&&<Facts fee={priceText(c.feePaise)}/>}{python&&<a className="textlink" href="/brochure.pdf" target="_blank" rel="noopener">Download the detailed brochure <ArrowDownToLine size={17}/></a>}</div><aside className="enroll"><Badge status={intakeStatus(registration??c)}/><h2>Registration details</h2><dl><dt>Course fee</dt><dd>{priceText(registration?.feePaise)} {exclusive?"for all five days":"per participant"}</dd><dt>Instructor</dt><dd>{instructor??"To be announced"}</dd><dt>Duration</dt><dd>{exclusive?"5 days · 3 hours/day · 15 hours total":"5 days · 3 hours/day"}</dd><dt>Batch schedule</dt><dd>{registration?.schedule||"To be announced"}</dd><dt>Mode / venue</dt><dd>{registration?.mode||"To be announced"}</dd></dl>{canApply(registration)?<a className="btn primary" href={"/apply?course="+registrationSlug(c.slug)}>Start application <ArrowRight size={17}/></a>:<div className="mutedbox">{enrollmentUnavailable(intakeStatus(registration??c))}</div>}{canApply(registration)&&paymentMode()==="live"&&<small className="paymethods">Online payment options may include UPI, cards and net banking.</small>}</aside></div></div></section>
 <section className="wrap syllabus"><div><span className="eyebrow">DAY-WISE COURSE CONTENT</span><h2>{day?"Day "+day+" plan":exclusive?"Five-day intensive plan":"Five-day teaching plan"}</h2>{exclusive&&!day?<p className="plan-time">One instructor covers one module per three-hour session. The plan condenses the core topics and practicals of all five modules into 15 hours.</p>:!exclusive&&<p className="plan-time">Each day includes a 45-minute lecture, 90-minute lab, 30-minute review and 15-minute break.</p>}
 <ol className="days">{c.days.map(([title,practical],i)=>{const original=python&&title===defaults.days[i][0]&&practical===defaults.days[i][1];const sessionModule=modules[i]?.title===title?modules[i]:null;return <li key={i}><span className="day-no">{day?"TOPIC":"DAY"} {String(i+1).padStart(2,"0")}</span><div><h3>{title}</h3>{original&&<p><strong>Lecture topics</strong> {pythonDetails.lecture[i]}</p>}<p><strong>Guided practical</strong> {original?pythonDetails.practical[i]:practical}</p>{original&&<p><strong>Lab output</strong> {pythonDetails.evidence[i]}</p>}{c.exclusive&&!day&&<p><strong>Session length</strong> 3 hours</p>}{sessionModule&&<details className="intensive-topics"><summary>Topics covered in this session</summary><ul>{sessionModule.days.map(([topic])=><li key={topic}>{topic}</li>)}</ul></details>}{cShortCourse&&!day&&<a className="textlink" href={"/courses/"+C_DAY_SLUGS[i]}>View detailed day plan</a>}</div></li>})}</ol></div>
 <div className="course-sidebar"><aside className="outcome"><h3>Learning objectives</h3><ul>{brief.objectives.map(item=><li key={item}>{item}</li>)}</ul><h3>Final project</h3><p>{c.outcome}</p></aside><aside className="outcome"><h3>Who should attend</h3><p>{brief.audience}</p><h3>Prerequisites</h3><p>{brief.prerequisite}</p><h3>Tools &amp; resources</h3><p>{c.tools}.</p><p>{brief.resources}</p></aside></div></section>
 </Frame>;
}
