"use client";

import {useEffect,useSyncExternalStore} from "react";
import {ArrowRight,Heart} from "lucide-react";
import {wishlistSignIn} from "@/lib/wishlist-path";

const key="scs.browser-wishlist.v1";
type Snapshot={mode:"loading"|"guest"|"account"|"error";saved:string[];browser:string[];pending:Set<string>;message:string;importing:boolean};
const empty:Snapshot={mode:"loading",saved:[],browser:[],pending:new Set(),message:"",importing:false};
let state=empty,started=false,checkId=0,refreshQueued=false;
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return ()=>{listeners.delete(listener);}};
const update=(next:Partial<Snapshot>)=>{state={...state,...next};for(const notify of listeners)notify();};
const readLocal=():string[]=>{
 try{const value=JSON.parse(localStorage.getItem(key)??"[]");return Array.isArray(value)?[...new Set(value.filter((s:unknown):s is string=>typeof s==="string"&&/^[a-z0-9][a-z0-9-]{0,99}$/.test(s)))].slice(0,100):[];}catch{return [];}
};
const endpoint="/student/wishlist-data";
function recheck(){
 if(state.pending.size||state.importing){refreshQueued=true;return;}
 void load();
}
function flushRefresh(){
 if(refreshQueued&&!state.pending.size&&!state.importing){refreshQueued=false;recheck();}
}
async function load(){
 const id=++checkId;
 update({mode:"loading",saved:[],browser:[],message:""});
 try{
  const response=await fetch(endpoint,{credentials:"same-origin",cache:"no-store"});
  if(!response.ok)throw Error("Wishlist unavailable");
  const data=await response.json() as {account:boolean;slugs:string[]};
  if(typeof data.account!=="boolean"||!Array.isArray(data.slugs))throw Error("Wishlist unavailable");
  if(id!==checkId)return;
  update(data.account?{mode:"account",saved:data.slugs,browser:readLocal()}:{mode:"guest",saved:[],browser:[]});
 }catch{
  if(id===checkId)update({mode:"error",message:"Wishlist could not load. Refresh the page to try again."});
 }
}
function startWishlist(){
 if(started)return;
 started=true;
 window.addEventListener("pageshow",e=>{if(e.persisted)recheck();});
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")recheck();});
 window.addEventListener("storage",e=>{if(state.mode==="account"&&(e.key===key||e.key===null))update({browser:readLocal()});});
 recheck();
}
function useWishlist(){
 const current=useSyncExternalStore(subscribe,()=>state,()=>empty);
 useEffect(startWishlist,[]);
 return current;
}
async function save(slug:string,title:string){
 if(state.mode!=="account"||state.pending.has(slug)||state.importing||refreshQueued)return;
 const saved=!state.saved.includes(slug);
 update({pending:new Set([...state.pending,slug]),message:""});
 try{
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,saved})});
  if(response.status===401){update({mode:"guest",saved:[],browser:[]});window.location.assign(wishlistSignIn(slug));return;}
  if(!response.ok)throw Error("Could not update wishlist");
  const result=await response.json() as {saved?:boolean};
  if(result.saved!==saved)throw Error("Could not confirm wishlist change");
  update({saved:saved?[slug,...state.saved.filter(s=>s!==slug)]:state.saved.filter(s=>s!==slug),message:saved?title+" saved to your wishlist.":title+" removed from your wishlist."});
 }catch{update({message:"Could not update your wishlist. Try again."});}
 finally{const pending=new Set(state.pending);pending.delete(slug);update({pending});flushRefresh();}
}
async function importBrowser(){
 if(state.mode!=="account"||state.importing||state.pending.size||!state.browser.length)return;
 const candidates=[...state.browser];update({importing:true,message:""});
 try{
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"import",slugs:candidates})});
  if(response.status===401){update({mode:"guest",saved:[],browser:[]});window.location.assign(wishlistSignIn());return;}
  if(!response.ok)throw Error("Could not copy wishlist");
  const {slugs}=await response.json() as {slugs:string[]};
  update({saved:[...new Set([...slugs,...state.saved])],message:slugs.length?"Saved browser courses were added to your student account.":"None of these browser courses are currently available."});
 }catch{update({message:"Could not copy the browser wishlist. Try again."});}
 finally{update({importing:false});flushRefresh();}
}
export function WishlistStatus(){
 const {message}=useSyncExternalStore(subscribe,()=>state,()=>empty);
 useEffect(()=>{if(message){const timeout=window.setTimeout(()=>{if(state.message===message)update({message:""});},4500);return ()=>clearTimeout(timeout);}},[message]);
 return <p className="wishlist-toast" role="status" aria-live="polite" data-visible={Boolean(message)}>{message}</p>;
}
type CourseLabel={slug:string;title:string};
function WishlistSignInLink({slug,title}:CourseLabel){
 return <a className="wishlist-button" href={wishlistSignIn(slug)} aria-label={"Sign in to wishlist "+title} title="Student sign-in required" data-course-wishlist={slug}><Heart size={17} aria-hidden="true"/><span>Wishlist</span></a>;
}
export function WishlistButton({student,...course}:CourseLabel&{student:boolean}){
 return student?<StudentWishlistButton {...course}/>:<WishlistSignInLink {...course}/>;
}
function StudentWishlistButton({slug,title}:CourseLabel){
 const {mode,saved,pending,importing}=useWishlist(),active=mode==="account"&&saved.includes(slug),busy=pending.has(slug);
 if(mode==="guest")return <WishlistSignInLink slug={slug} title={title}/>;
 return <button type="button" className="wishlist-button" aria-pressed={active} aria-busy={busy} aria-label={(active?"Remove from wishlist: ":"Wishlist ")+title} title={active?"Remove from wishlist":"Add to wishlist"} data-course-wishlist={slug} disabled={mode!=="account"||busy||importing} onClick={()=>void save(slug,title)}><Heart size={17} aria-hidden="true" fill={active?"currentColor":"none"}/><span>{active?"Wishlisted":"Wishlist"}</span></button>;
}

export type WishlistCourse={slug:string;title:string;track:string;href:string;status:string};
export function WishlistPanel({courses,selectedSlug}:{courses:WishlistCourse[];selectedSlug?:string}){
 const {mode,saved,browser,importing,pending}=useWishlist();
 const bySlug=new Map(courses.map(course=>[course.slug,course]));
 const available=saved.flatMap(slug=>bySlug.has(slug)?[bySlug.get(slug)!]:[]);
 const selected=selectedSlug?bySlug.get(selectedSlug):undefined;
 const hasBrowserSaves=browser.some(slug=>bySlug.has(slug)&&!saved.includes(slug));
 if(mode==="loading")return <p className="mutedbox" role="status">Loading wishlist…</p>;
 if(mode==="error")return <p className="mutedbox">Your wishlist could not load. Refresh the page to try again.</p>;
 if(mode==="guest")return <div className="panel wishlist-empty"><Heart size={28} aria-hidden="true"/><h2>Sign in to use your wishlist</h2><p>Student sign-in is required to save and view courses in your wishlist.</p><a className="btn primary" href={wishlistSignIn()}>Student sign in <ArrowRight size={16} aria-hidden="true"/></a></div>;
 return <div className="wishlist-list">
  <div className="wishlist-summary"><p>Saved to your student account.</p>
   {hasBrowserSaves&&<button className="btn secondary" type="button" disabled={importing||Boolean(pending.size)} onClick={()=>void importBrowser()}>{importing?"Copying…":"Import previous browser saves"}</button>}
  </div>
  {selected&&!saved.includes(selected.slug)&&<div className="panel wishlist-item"><div><span className="eyebrow">Selected course</span><h3><a href={selected.href}>{selected.title}</a></h3><p>Use Wishlist to save this course to your account.</p></div><WishlistButton student slug={selected.slug} title={selected.title}/></div>}
  {available.length?<ul className="wishlist-items">{available.map(c=><li className="panel wishlist-item" key={c.slug}><div><span className="eyebrow">{c.track}</span><h3><a href={c.href}>{c.title}</a></h3><p>{c.status}</p></div><WishlistButton student slug={c.slug} title={c.title}/></li>)}</ul>:<div className="panel wishlist-empty"><Heart size={28} aria-hidden="true"/><h2>No saved courses yet</h2><p>Tap Wishlist on a course you want to come back to.</p><a className="btn primary" href="/#courses">Explore courses <ArrowRight size={16} aria-hidden="true"/></a></div>}
 </div>;
}
