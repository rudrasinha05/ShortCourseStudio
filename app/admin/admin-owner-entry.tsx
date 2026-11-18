"use client";

import {useEffect,useState} from "react";
import {ArrowRight,KeyRound} from "lucide-react";

export function AdminOwnerEntry(){
 const [owner,setOwner]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/session/admin-account",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
   .then(res=>res.ok?res.json<{kind?:unknown;email?:unknown}>():null)
   .then(data=>{if(!controller.signal.aborted&&data?.kind==="owner")setOwner(true);})
   .catch(()=>{});
  return ()=>controller.abort();
 },[]);
 if(!owner)return null;
 return <form className="admin-known-owner" method="post" action="/session/enter" target="_top">
  <input type="hidden" name="return_to" value="/admin"/>
  <KeyRound size={18} aria-hidden="true"/>
  <div><strong>Administrator setup</strong><button type="submit" className="textlink">Set up your admin password <ArrowRight size={15} aria-hidden="true"/></button></div>
 </form>;
}
