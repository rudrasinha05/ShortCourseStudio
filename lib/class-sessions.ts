import {db,lookup,type Application} from "./enrollment";
import {refPattern} from "./form-workflows";

type Session={day:number;starts_at:string;ends_at:string;live_url:string;replay_url:string};
const days=[1,2,3,4,5];
export async function getClassSessions(slug:string,batch:string){
 const rows=(await db().prepare("SELECT day,starts_at,ends_at,live_url,replay_url FROM class_sessions WHERE slug=? AND batch=? ORDER BY day").bind(slug,batch).all<Session>()).results;
 return days.map(day=>rows.find(r=>r.day===day)??{day,starts_at:"",ends_at:"",live_url:"",replay_url:""});
}
function localTime(s:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))return false;
 const d=new Date(s+"Z");
 return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,16)===s;
}
function safeUrl(s:string){
 if(s.length>1500||/[\u0000-\u0020\u007f]/.test(s))return false;
 if(!s)return true;
 try{const url=new URL(s);return url.protocol==="https:"&&!!url.hostname&&!url.username&&!url.password;}
 catch{return false;}
}
export async function saveClassSessions(slug:string,batch:string,val:(key:string)=>string){
 const course=await lookup(slug);
 if(!course||course.batch!==batch)return false;
 const sessions=days.map(day=>({day,start:val("start"+day).trim(),end:val("end"+day).trim(),live:val("live"+day).trim(),replay:val("replay"+day).trim()}));
 if(sessions.some(({start,end,live,replay})=>!safeUrl(live)||!safeUrl(replay)||((start||end||live)&&(!localTime(start)||!localTime(end)||start>=end))))return false;
 const d=db();
 await d.batch(sessions.map(({day,start,end,live,replay})=>d.prepare("INSERT INTO class_sessions (slug,batch,day,starts_at,ends_at,live_url,replay_url) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT batch FROM course_settings WHERE slug=?),'batch-1')=? ON CONFLICT(slug,batch,day) DO UPDATE SET starts_at=excluded.starts_at,ends_at=excluded.ends_at,live_url=excluded.live_url,replay_url=excluded.replay_url").bind(slug,batch,day,start,end,live,replay,slug,batch)));
 return (await lookup(slug))?.batch===batch;
}
export async function setClassAccess(id:string,grant:string){
 if(!refPattern.test(id)||(grant!=="yes"&&grant!=="no"))return false;
 const value=grant==="yes"?1:0;
 const result=await db().prepare("UPDATE applications SET class_access=? WHERE id=? AND (?=0 OR review_state='accepted')").bind(value,id,value).run();
 return result.meta.changes===1;
}
export const hasClassAccess=(row:Application)=>row.review_state==="accepted"&&row.class_access===1;
export function formatClassTime(s:string){
 return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(s+"+05:30"));
}
