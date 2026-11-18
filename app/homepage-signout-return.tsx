"use client";

import {useEffect} from "react";

export function HomepageSignOutReturn(){
 useEffect(()=>{
  const url=new URL(window.location.href);
  url.searchParams.delete("signed_out");
  window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
 },[]);
 return null;
}
