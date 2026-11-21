import {BatchCountdown} from "./batch-countdown";
import {canApply,intakeStatus,applicationsStatus} from "@/lib/enrollment";
import {ArrowRight,Award,CalendarDays,Clock3,Code2,Terminal} from "lucide-react";
import {bannerStart,getUpcomingBanners} from "@/lib/course-banners";

type Item=Awaited<ReturnType<typeof getUpcomingBanners>>[number];
const cSnippet=[
 '#include <stdio.h>',
 '',
 'int main(void) {',
 '    for (;;) {',
 '        puts("Once in a Lifetime Opportunity");',
 '    }',
 '}',
].join("\n");
function BatchTime({item}:{item:Item}){
 return <div className="upcoming-time"><CalendarDays size={20} aria-hidden="true"/><div>
   <strong>{item.start?<time dateTime={item.start+"+05:30"}>{bannerStart(item.start)}</time>:"Date and time to be announced"}</strong>
   {item.timing&&<span>{item.timing}</span>}
   {item.mode&&<span>{item.mode}</span>}
 </div></div>;
}

function CoursePoster({item,featured,heroTitle,now}:{item:Item;featured:boolean;heroTitle:boolean;now:number}){
 const Heading=heroTitle?"h1":"h3";
 return <article className={(featured?"upcoming-banner featured":"upcoming-banner secondary-banner")+" crash-banner"}>
  <div className="upcoming-copy">
   <pre className="c-code-motif" aria-hidden="true">{cSnippet}</pre>
   <div className="upcoming-content">
    <span className="poster-kicker"><Terminal size={15} aria-hidden="true"/> Exclusive Short-Term Course</span>
    <Heading className="poster-title"><span className="poster-letter">C</span><span className="poster-course-word">Programming</span></Heading>
    <p className="poster-deck"><strong>C Programming</strong> from your first compile to <strong>pointers, memory and data structures.</strong></p>
    <BatchTime item={item}/>
    {canApply(item)&&item.start&&<BatchCountdown target={item.when} initialNow={now}/>}
    <ul className="poster-benefits" aria-label="Course highlights">
     <li><Clock3 size={18} aria-hidden="true"/><span><strong>15 hours</strong><small>5 days · Hands-on labs</small></span></li>
     <li><Award size={18} aria-hidden="true"/><strong>Certificate included</strong></li>
    </ul>
    {canApply(item)?<div className="actions poster-enrollment"><a className="btn poster-cta" href={"/apply?course="+item.slug}>Apply now <ArrowRight size={17} aria-hidden="true"/></a><a className="poster-plan" href="#c-programming">View the five-day plan</a></div>:<><p className="poster-intake-status">{applicationsStatus(intakeStatus(item))}</p><a className="btn poster-cta" href="#c-programming">View the five-day plan <ArrowRight size={17} aria-hidden="true"/></a></>}
   </div>
  </div>
  <div className="upcoming-faculty">
   <div className="subject-art poster-coding-art" aria-hidden="true"><div className="subject-art-code"><strong>C</strong><pre>{motifs.C.join("\n")}</pre></div></div>
  </div>
 </article>;
}

const motifs:Record<string,string[]>={
 DA:["import pandas as pd","data = pd.read_csv('dataset.csv')","insights = data.describe()"],
 DB:["SELECT topic, COUNT(*)","FROM course_projects","GROUP BY topic;"],
 CN:["workstation → switch","switch → router","router → destination"],
 CA:["01  FETCH","02  DECODE","03  EXECUTE"],
 TC:["Q = { q₀, q₁, q₂ }","Σ = { 0, 1 }","q₀ → q₁ → q₂"],
 C:["#include <stdio.h>","int main(void) {","  return 0;","}"],
};
function Banner({item,featured=false,heroTitle=false,now}:{item:Item;featured?:boolean;heroTitle?:boolean;now:number}){
 if(item.crash)return <CoursePoster item={item} featured={featured} heroTitle={heroTitle} now={now}/>;
 const Heading=heroTitle?"h1":"h3";
 const status=intakeStatus(item);
 return <article className={(featured?"upcoming-banner featured":"upcoming-banner secondary-banner")+" subject-poster"} data-track={item.tag}>
  <div className="upcoming-copy">
   <div className="upcoming-content">
    <span className="poster-kicker"><Terminal size={15} aria-hidden="true"/> {item.exclusive?"Exclusive Short-Term Course":item.trackLabel}</span>
    <Heading>{item.title}</Heading><p>{item.blurb}</p>
    <div className="subject-poster-facts"><span><Clock3 size={16} aria-hidden="true"/> 5 days · 15 hours</span><span><Code2 size={16} aria-hidden="true"/> Guided labs</span></div>
    {item.start||item.timing||item.mode?<BatchTime item={item}/>:<p className="poster-intake-status">{applicationsStatus(status)}</p>}
    {canApply(item)&&item.start&&<BatchCountdown target={item.when} initialNow={now}/>}
    <div className="actions">
     {canApply(item)&&<a className="btn primary" href={"/apply?course="+item.slug}>Apply now <ArrowRight size={17}/></a>}
     <a className={canApply(item)?"btn subject-poster-secondary":"btn primary"} href={"/courses/"+item.slug}>View course plan <ArrowRight size={17}/></a>
    </div>
   </div>
  </div>
  <div className="upcoming-faculty">
   <div className="subject-art" aria-hidden="true"><div className="subject-art-code"><strong>{item.tag}</strong><pre>{(motifs[item.tag]??motifs.C).join("\n")}</pre></div></div>
  </div>
 </article>;
}
export function FeaturedBanner({item,heroTitle=true,now}:{item:Item;heroTitle?:boolean;now:number}){return <Banner item={item} featured heroTitle={heroTitle} now={now}/>}
