import {ArrowRight,CalendarDays,Code2,GraduationCap} from "lucide-react";
import {bannerStart,getUpcomingBanners} from "@/lib/course-banners";

type Item=Awaited<ReturnType<typeof getUpcomingBanners>>[number];
function Banner({item,featured=false}:{item:Item;featured?:boolean}){
 const Heading=featured?"h1":"h3";
 return <article className={featured?"upcoming-banner featured":"upcoming-banner secondary-banner"}>
  <div className="upcoming-copy">
   <span className="eyebrow">{item.crash?"C programming crash course":featured?"Next upcoming batch":"Upcoming batch"}</span>
   <Heading>{item.title}</Heading>
   <p>{item.blurb}</p>
   <div className="upcoming-time"><CalendarDays size={19} aria-hidden="true"/><div>
    <strong>{item.start?<time dateTime={item.start+"+05:30"}>{bannerStart(item.start)}</time>:"Date and time to be announced"}</strong>
    {item.timing&&<span>{item.timing}</span>}
    {item.mode&&<span>{item.mode}</span>}
   </div></div>
   {!item.crash&&<a className="btn primary" href={"/courses/"+item.slug}>View course <ArrowRight size={17}/></a>}
   {item.crash&&<a className="btn secondary" href="#courses">Explore regular courses <ArrowRight size={17}/></a>}
  </div>
  <div className="upcoming-faculty">
   {item.photo?<img className="faculty-photo" src={item.photo} alt={item.faculty?item.faculty+" portrait":"Course faculty portrait"} referrerPolicy="no-referrer" loading={featured?"eager":"lazy"}/>:<div className="faculty-mark" aria-hidden="true">{item.crash?<Code2 size={56}/>:<GraduationCap size={50}/>}</div>}
   <div className="faculty-caption"><span>Faculty</span><strong>{item.faculty||"To be announced"}</strong>{item.qualification&&<p>{item.qualification}</p>}{item.profile&&<p>{item.profile}</p>}</div>
  </div>
 </article>
}
export function FeaturedBanner({item}:{item:Item}){return <Banner item={item} featured/>}
export function MoreUpcoming({items}:{items:Item[]}){return items.length>0&&<section className="wrap upcoming-list" aria-labelledby="more-upcoming"><h2 id="more-upcoming">More upcoming courses</h2><div className="upcoming-list-grid">{items.map(item=><Banner key={item.slug+":"+item.batch} item={item}/>)}</div></section>}
