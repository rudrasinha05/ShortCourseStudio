"use client";
import {useEffect,useState,useSyncExternalStore,type ReactNode} from "react";
import {ArrowLeft,ArrowRight,Pause,Play} from "lucide-react";

const REDUCED_MOTION="(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange:()=>void){
 const query=window.matchMedia(REDUCED_MOTION);
 query.addEventListener("change",onChange);
 return ()=>query.removeEventListener("change",onChange);
}

export function HomeCarousel({slides}:{slides:{id:string;title:string;content:ReactNode}[]}){
 const [index,setIndex]=useState(0),[userPlaying,setUserPlaying]=useState<boolean|null>(null),[hover,setHover]=useState(false),[focus,setFocus]=useState(false);
 // Autoplay unless the visitor prefers reduced motion; an explicit play/pause click wins. The server snapshot keeps it paused.
 const reducedMotion=useSyncExternalStore(subscribeReducedMotion,()=>window.matchMedia(REDUCED_MOTION).matches,()=>true);
 const playing=userPlaying??!reducedMotion;
 const total=slides.length;
 useEffect(()=>{
  if(!playing||hover||focus||total<2)return;
  const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%total);},7500);
  return ()=>window.clearInterval(timer);
 },[playing,hover,focus,total]);
 const move=(delta:number)=>{setUserPlaying(false);setIndex(i=>(i+delta+total)%total);};
 if(!total)return null;
 return <section className="home-carousel" aria-roledescription="carousel" aria-label="Featured courses"
   onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocusCapture={()=>setFocus(true)}
   onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocus(false);}}>
  <div className="home-carousel-stage">
   {slides.map((slide,i)=><div key={slide.id} className="home-carousel-slide" hidden={i!==index} role="group" aria-roledescription="slide" aria-label={slide.title+" · "+(i+1)+" of "+total}>{slide.content}</div>)}
  </div>
  {total>1&&<div className="home-carousel-controls">
   <div className="home-carousel-counter"><span>COURSE SPOTLIGHT</span><strong role="status" aria-live={playing?"off":"polite"}>{index+1} / {total}</strong></div>
   <div className="home-carousel-buttons">
    <button type="button" onClick={()=>move(-1)} aria-label="Previous featured course"><ArrowLeft size={18} aria-hidden="true"/></button>
    <button type="button" onClick={()=>setUserPlaying(!playing)} aria-label={playing?"Pause slideshow":"Play slideshow"}>{playing?<Pause size={17} aria-hidden="true"/>:<Play size={17} aria-hidden="true"/>}</button>
    <button type="button" onClick={()=>move(1)} aria-label="Next featured course"><ArrowRight size={18} aria-hidden="true"/></button>
   </div>
  </div>}
 </section>;
}
