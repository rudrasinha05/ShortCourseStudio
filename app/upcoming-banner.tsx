import {ArrowRight,Award,CalendarDays,Clock3,Code2,GraduationCap,Terminal,TrendingUp} from "lucide-react";
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
function FacultyPhoto({item,featured}:{item:Item;featured:boolean}){
 return item.photo?<img className="faculty-photo" src={item.photo} alt={item.faculty?item.faculty+" portrait":"Course faculty portrait"} referrerPolicy="no-referrer" loading={featured?"eager":"lazy"}/>:<div className="faculty-mark" aria-hidden="true">{item.crash?<Code2 size={56}/>:<GraduationCap size={50}/>}</div>;
}

function BatchTime({item}:{item:Item}){
 return <div className="upcoming-time"><CalendarDays size={20} aria-hidden="true"/><div>
   <strong>{item.start?<time dateTime={item.start+"+05:30"}>{bannerStart(item.start)}</time>:"Date and time to be announced"}</strong>
   {item.timing&&<span>{item.timing}</span>}
   {item.mode&&<span>{item.mode}</span>}
 </div></div>;
}

function FacultyCaption({item}:{item:Item}){
 return <div className="faculty-caption"><span>Course instructor</span><strong>{item.faculty||"To be announced"}</strong>{item.qualification&&<p>{item.qualification}</p>}{item.profile&&<p>{item.profile}</p>}</div>;
}

function CoursePoster({item,featured}:{item:Item;featured:boolean}){
 const Heading=featured?"h1":"h3";
 return <article className={(featured?"upcoming-banner featured":"upcoming-banner secondary-banner")+" crash-banner"}>
  <div className="upcoming-copy">
   <pre className="c-code-motif" aria-hidden="true">{cSnippet}</pre>
   <div className="upcoming-content">
    <span className="poster-kicker"><Terminal size={15} aria-hidden="true"/> Exclusive Short-Term Course</span>
    <Heading className="poster-title"><span className="poster-letter">C</span>{" "}<span className="poster-by">by <strong>Horesh Sir</strong></span></Heading>
    <p className="poster-deck"><strong>C Programming</strong> from your first compile to <strong>pointers, memory and data structures.</strong></p>
    <BatchTime item={item}/>
    <ul className="poster-benefits" aria-label="Course highlights">
     <li><Clock3 size={18} aria-hidden="true"/><span><strong>15 hours</strong><small>5 days · Hands-on labs</small></span></li>
     <li><Award size={18} aria-hidden="true"/><strong>Certificate included</strong></li>
    </ul>
    <a className="btn poster-cta" href="#c-programming">View the five-day plan <ArrowRight size={17} aria-hidden="true"/></a>
   </div>
  </div>
  <div className="upcoming-faculty">
   <div className="poster-portrait"><FacultyPhoto item={item} featured={featured}/><span className="poster-c-mark" aria-hidden="true">[ C ]</span></div>
   <div className="poster-faculty-info">
    <div className="poster-impact"><TrendingUp size={20} aria-hidden="true"/><div className="poster-impact-copy"><strong>700+ Students</strong><p>Landed jobs with Horesh Sir’s guidance</p></div></div>
    <FacultyCaption item={item}/>
   </div>
  </div>
 </article>;
}

function Banner({item,featured=false}:{item:Item;featured?:boolean}){
 if(item.crash)return <CoursePoster item={item} featured={featured}/>;
 const Heading=featured?"h1":"h3";
 return <article className={featured?"upcoming-banner featured":"upcoming-banner secondary-banner"}>
  <div className="upcoming-copy">
   <div className="upcoming-content">
    <span className="eyebrow">{featured?"Next upcoming batch":"Upcoming batch"}</span>
    <Heading>{item.title}</Heading><p>{item.blurb}</p>
    <BatchTime item={item}/>
    <a className="btn primary" href={"/courses/"+item.slug}>View course <ArrowRight size={17}/></a>
   </div>
  </div>
  <div className="upcoming-faculty"><FacultyPhoto item={item} featured={featured}/><FacultyCaption item={item}/></div>
 </article>;
}
export function FeaturedBanner({item}:{item:Item}){return <Banner item={item} featured/>}
export function MoreUpcoming({items}:{items:Item[]}){return items.length>0&&<section className="wrap upcoming-list" aria-labelledby="more-upcoming"><h2 id="more-upcoming">More upcoming courses</h2><div className="upcoming-list-grid">{items.map(item=><Banner key={item.slug+":"+item.batch} item={item}/>)}</div></section>}
