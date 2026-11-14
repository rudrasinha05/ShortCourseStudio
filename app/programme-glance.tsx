import {ArrowDownToLine,ArrowRight,CalendarDays,Clock3,GraduationCap,ClipboardCheck} from "lucide-react";

const facts=[
 {icon:GraduationCap,title:"Who it’s for",body:"Undergraduate engineering and computing students."},
 {icon:Clock3,title:"5 days · 15 hours",body:"Three hours a day with teaching, guided practice and review."},
 {icon:CalendarDays,title:"Dates & venue",body:"Each course lists its own batch schedule and delivery mode."},
 {icon:ClipboardCheck,title:"When to apply",body:"Apply once your chosen batch is announced and open."},
];
export function ProgrammeGlance({brochure}:{brochure:string}){
 return <aside className="programme-glance" aria-labelledby="programme-glance-title">
   <div className="glance-header"><div><span className="eyebrow">AT A GLANCE</span><h2 id="programme-glance-title">Programme essentials</h2></div><a className="btn secondary" href={brochure} target="_blank" rel="noopener">Programme brochure <ArrowDownToLine size={16} aria-hidden="true"/></a></div>
   <dl className="glance-facts">{facts.map(({icon:Icon,title,body})=><div key={title}><span className="glance-icon" aria-hidden="true"><Icon size={20}/></span><dt>{title}</dt><dd>{body}</dd></div>)}</dl>
   <a className="textlink" href="#courses">Explore the course catalogue <ArrowRight size={15} aria-hidden="true"/></a>
 </aside>;
}
