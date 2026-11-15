"use client";

import {useEffect,useRef} from "react";
import {ArrowRight,GraduationCap,UserRound,X} from "lucide-react";

const seenKey="scs:student-login-shown";

export function HomeStudentLogin({loginPath,signInPath,autoOpen}:{loginPath:string;signInPath:string;autoOpen:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLAnchorElement>(null);
 const close=useRef<HTMLButtonElement>(null);
 function open(){
  const panel=dialog.current;
  if(!panel||typeof panel.showModal!=="function")return false;
  if(!panel.open)panel.showModal();
  close.current?.focus();
  try{sessionStorage.setItem(seenKey,"1")}catch{/* Storage is optional. */}
  return true;
 }
 useEffect(()=>{
  if(!autoOpen){
   try{sessionStorage.setItem(seenKey,"1")}catch{/* Storage is optional. */}
   return;
  }
  try{if(sessionStorage.getItem(seenKey))return}catch{/* Allow opening without storage. */}
  open();
 },[autoOpen]);
 return <>
  <a ref={trigger} className="navbutton portal-auth-link" href={loginPath} target="_top"
   aria-haspopup="dialog" onClick={e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&open())e.preventDefault()}}>
   <UserRound size={16} aria-hidden="true"/> Student sign in / Sign up
  </a>
  <dialog ref={dialog} id="home-student-login" className="student-login-dialog" data-auto-open={autoOpen} aria-labelledby="home-student-login-title"
   aria-describedby="home-student-login-description" onClose={()=>trigger.current?.focus()}>
   <div className="student-login-inner">
    <button ref={close} className="student-login-close" type="button" aria-label="Close student login" onClick={()=>dialog.current?.close()}><X size={21} aria-hidden="true"/></button>
    <span className="student-login-icon"><GraduationCap size={26} aria-hidden="true"/></span>
    <span className="eyebrow">STUDENT PORTAL</span>
    <h2 id="home-student-login-title">Student login</h2>
    <p id="home-student-login-description">Sign in to apply for courses, track your applications and access your classes.</p>
    <a className="btn primary student-login-continue" href={signInPath} target="_top">Continue with ChatGPT <ArrowRight size={17} aria-hidden="true"/></a>
    <button className="student-login-browse" type="button" onClick={()=>dialog.current?.close()}>Browse courses without signing in</button>
   </div>
  </dialog>
 </>;
}
