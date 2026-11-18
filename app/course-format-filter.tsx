"use client";

import {useEffect,useRef,useState,type ReactNode} from "react";

const formats=[["all","All"],["regular","Regular"],["exclusive","Exclusive"]] as const;
type Format=(typeof formats)[number][0];
const announcements:Record<Format,string>={
 all:"Showing regular and exclusive courses.",
 regular:"Showing regular courses only.",
 exclusive:"Showing exclusive courses only.",
};

function linkedSection(){
 if(!window.location.hash)return null;
 try{return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));}catch{return null;}
}

export function CourseFormatFilter({regular,exclusive}:{regular:ReactNode;exclusive:ReactNode}){
 const [format,setFormat]=useState<Format>("all");
 const regularPanel=useRef<HTMLDivElement>(null),exclusivePanel=useRef<HTMLDivElement>(null);
 const restoreAnchor=useRef<HTMLElement|null>(null);
 const hides=(selection:Format,target:HTMLElement)=>(
  selection==="regular"?exclusivePanel.current?.contains(target):
  selection==="exclusive"?regularPanel.current?.contains(target):false
 );
 function select(next:Format){
  const target=linkedSection();
  // Keep the catalogue URL useful when the previously linked section is hidden.
  if(target&&hides(next,target))window.history.replaceState(window.history.state,"","#courses");
  setFormat(next);
 }
 useEffect(()=>{
  function followHash(){
   const target=linkedSection();
   if(!target||!(regularPanel.current?.contains(target)||exclusivePanel.current?.contains(target)))return;
   if(target.closest("[data-course-format-result][hidden]")){
    restoreAnchor.current=target;
    setFormat("all");
   }
  }
  window.addEventListener("hashchange",followHash);
  return ()=>window.removeEventListener("hashchange",followHash);
 },[]);
 useEffect(()=>{
  if(format==="all"&&restoreAnchor.current){
   restoreAnchor.current.scrollIntoView({block:"start"});
   restoreAnchor.current=null;
  }
 },[format]);
 return <>
  <fieldset className="course-format-filter">
   <legend>Course format</legend>
   <div className="course-format-options">{formats.map(([value,label])=><label key={value}>
    <input type="radio" name="course-format" value={value} checked={format===value} onChange={()=>select(value)}/>
    <span>{label}</span>
   </label>)}</div>
  </fieldset>
  <p role="status" className="course-format-announcement">{announcements[format]}</p>
  <div ref={regularPanel} data-course-format-result="regular" hidden={format==="exclusive"}>{regular}</div>
  <div ref={exclusivePanel} data-course-format-result="exclusive" hidden={format==="regular"}>{exclusive}</div>
 </>;
}
