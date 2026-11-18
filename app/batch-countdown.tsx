"use client";
import {useEffect,useState} from "react";

export function BatchCountdown({target,initialNow}:{target:number;initialNow:number}){
 const [now,setNow]=useState(initialNow);
 useEffect(()=>{
  const tick=()=>setNow(Date.now());
  tick();
  const timer=window.setInterval(tick,1000);
  return ()=>window.clearInterval(timer);
 },[target]);
 const total=Math.max(0,Math.ceil((target-now)/1000));
 const parts=[["Days",Math.floor(total/86400)],["Hours",Math.floor(total/3600)%24],["Min",Math.floor(total/60)%60],["Sec",total%60]] as const;
 return <div className="batch-countdown" aria-label="Countdown to class start">
  <strong>{total?"Batch starts in":"Batch start time reached"}</strong>
  {total>0&&<dl>{parts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{String(value).padStart(2,"0")}</dd></div>)}</dl>}
 </div>;
}
