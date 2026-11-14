"use client";
import {useState} from "react";
import {ArrowLeft,ArrowRight} from "lucide-react";

type Slide={slug:string;title:string;track:string;blurb:string;status:string};
export function CourseSlideshow({slides}:{slides:Slide[]}){
 const [index,setIndex]=useState(0);
 if(!slides.length)return null;
 const slide=slides[index];
 return <section className="portal-slideshow" aria-label="Featured course slideshow" aria-roledescription="carousel">
  <div aria-live="polite" className="portal-slide">
   <span className="eyebrow">Featured courses · {slide.track}</span>
   <h2>{slide.title}</h2><p>{slide.blurb}</p>
   <a className="btn secondary" href={"/courses/"+slide.slug}>Explore course <ArrowRight size={16}/></a>
  </div>
  <div className="portal-slide-controls">
   <button type="button" className="btn secondary" aria-label="Previous course" onClick={()=>setIndex((index+slides.length-1)%slides.length)}><ArrowLeft size={17}/></button>
   <span> {index+1} / {slides.length} </span>
   <button type="button" className="btn secondary" aria-label="Next course" onClick={()=>setIndex((index+1)%slides.length)}><ArrowRight size={17}/></button>
  </div>
 </section>;
}
