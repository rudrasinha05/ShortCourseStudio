import {readBatchStart} from "./batch-schedule";
import {cfg,db,digest,getCourses,secureEqual} from "./enrollment";
import {CRASH_SLUG,C_LAUNCH_START,C_LAUNCH_SCHEDULE} from "./courses";
import {formatClassTime} from "./class-sessions";

type Recipient={id:string;role:"student"|"faculty";email:string;phone:string};
type Channel="email"|"whatsapp";
type Session={slug:string;batch:string;day:number;start:string;title:string;mode:string};
export function normalizeWhatsApp(raw:string){
 const s=raw.trim().replace(/[ ()-]/g,"");
 if(/^[6-9]\d{9}$/.test(s))return "91"+s;
 if(/^\+[1-9]\d{6,14}$/.test(s))return s.slice(1);
 return "";
}
export async function loadReminderContact(userId:string){
 const saved=await db().prepare("SELECT whatsapp,enabled FROM reminder_contacts WHERE user_id=?").bind(userId).first<{whatsapp:string;enabled:number}>();
 if(saved||userId.startsWith("faculty:"))return saved;
 const application=await db().prepare(`SELECT json_extract(form_answers,'$.details.phone') AS phone FROM applications
 WHERE student_user_id=? AND json_valid(form_answers) AND json_extract(form_answers,'$.details.whatsappReminders')=1
 ORDER BY created_at DESC,id DESC LIMIT 1`).bind(userId).first<{phone:string|null}>();
 const whatsapp=normalizeWhatsApp(application?.phone??"");
 return whatsapp?{whatsapp,enabled:1}:null;
}
export async function saveReminderContact(userId:string,enabled:boolean,raw:string){
 const number=normalizeWhatsApp(raw);
 if(enabled&&!number)return false;
 await db().prepare("INSERT INTO reminder_contacts (user_id,whatsapp,enabled) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET whatsapp=excluded.whatsapp,enabled=excluded.enabled")
  .bind(userId,enabled?number:"",enabled?1:0).run();
 return true;
}
export function reminderChannels(){
 return {email:!!(cfg.RESEND_API_KEY&&cfg.REMINDER_EMAIL_FROM),whatsapp:!!(cfg.WHATSAPP_ACCESS_TOKEN&&/^\d{5,24}$/.test(cfg.WHATSAPP_PHONE_NUMBER_ID??"")&&/^v\d{1,3}\.\d+$/.test(cfg.WHATSAPP_API_VERSION??"")&&/^[a-z0-9_]{1,128}$/.test(cfg.WHATSAPP_TEMPLATE_NAME??"")&&cfg.WHATSAPP_TEMPLATE_LANGUAGE)};
}
export async function authorizedReminderJob(req:Request){
 const key=cfg.REMINDER_JOB_SECRET,header=req.headers.get("authorization");
 return !!key&&key.length>=32&&!!header?.startsWith("Bearer ")&&secureEqual(await digest(key),await digest(header.slice(7)));
}
async function upcomingSessions(now:number,limit=400){
 const courses=await getCourses(),bound=(ms:number)=>new Date(ms+19800000).toISOString().slice(0,16);
 const from=bound(now),to=bound(now+24*3600000);
 const records=(await db().prepare(`SELECT slug,batch,day,starts_at,0 AS launch_fallback FROM class_sessions WHERE starts_at>=? AND starts_at<=?
 UNION ALL
 SELECT slug,batch,1,COALESCE((SELECT NULLIF(starts_at,'') FROM course_banners b WHERE b.slug=c.slug AND b.batch='launch'),?) AS starts_at,1 AS launch_fallback
 FROM course_settings c WHERE c.slug=? AND c.batch='batch-1' AND NOT EXISTS
 (SELECT 1 FROM class_sessions s WHERE s.slug=c.slug AND s.batch=c.batch AND s.day=1 AND s.starts_at<>'')
 ORDER BY starts_at,slug,batch,day LIMIT 400`).bind(from,to,C_LAUNCH_START,CRASH_SLUG).all<{slug:string;batch:string;day:number;starts_at:string;launch_fallback:number}>()).results;
 return records.flatMap(({slug,batch,day,starts_at,launch_fallback})=>{
  const course=courses.find(c=>c.slug===slug);
  const start=(launch_fallback&&course&&course.schedule!==C_LAUNCH_SCHEDULE?readBatchStart(course.schedule):"")||starts_at;
  const ms=Date.parse(start+"+05:30");
  if(!course||!Number.isFinite(ms)||ms<=now||ms>now+24*3600000)return [];
  return [{slug,batch,day,start,title:course.title,mode:course.batch===batch?course.mode:""}];
 }).slice(0,limit);
}
async function recipients(session:Session,limit:number,offset:number){
 const result=await db().prepare(`SELECT a.id AS id,'student' AS role,a.email AS email,
 CASE WHEN r.user_id IS NOT NULL THEN CASE WHEN r.enabled=1 THEN '+'||r.whatsapp ELSE '' END
 WHEN json_valid(a.form_answers) AND json_extract(a.form_answers,'$.details.whatsappReminders')=1 THEN COALESCE(json_extract(a.form_answers,'$.details.phone'),'') ELSE '' END AS phone
 FROM applications a LEFT JOIN reminder_contacts r ON r.user_id=a.student_user_id
 WHERE a.slug=? AND a.batch=? AND a.review_state='accepted' AND a.class_access=1 AND (a.slug<>? OR a.payment_state='paid')
 UNION ALL
 SELECT f.id AS id,'faculty' AS role,f.email AS email,COALESCE(CASE WHEN r.enabled=1 THEN '+'||r.whatsapp ELSE '' END,'') AS phone
 FROM faculty_assignments x JOIN faculty_profiles f ON f.id=x.faculty_id AND f.active=1 LEFT JOIN reminder_contacts r ON r.user_id='faculty:'||f.id
 WHERE x.slug=? AND x.batch=?
 ORDER BY role,id LIMIT ? OFFSET ?`).bind(session.slug,session.batch,CRASH_SLUG,session.slug,session.batch,limit,offset).all<Recipient>();
 return result.results;
}
export async function reminderPreview(slug:string,batch:string){
 const rows=await db().prepare("SELECT status,COUNT(*) AS total FROM class_reminder_dispatch WHERE slug=? AND batch=? GROUP BY status").bind(slug,batch).all<{status:string;total:number}>();
 return {channels:reminderChannels(),totals:Object.fromEntries(rows.results.map(r=>[r.status,r.total]))};
}
const SITE="https://short-course-studio-rs.rudrasinha05.chatgpt.site";
async function send(channel:Channel,recipient:Recipient,session:Session,key:string){
 const time=formatClassTime(session.start)+" IST",site=SITE+(recipient.role==="faculty"?"/faculty?view=teaching":"/student?view=courses");
 if(channel==="email"){
  const response=await fetch("https://api.resend.com/emails",{method:"POST",redirect:"manual",signal:AbortSignal.timeout(7000),headers:{"Authorization":"Bearer "+cfg.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":"scs-class-"+key},body:JSON.stringify({from:cfg.REMINDER_EMAIL_FROM,to:[recipient.email],subject:"Class reminder: "+session.title,text:session.title+" · "+session.batch+" · Day "+session.day+"\nStarts "+time+(session.mode?" · "+session.mode:"")+"\nYour class details: "+site})});
  return response.ok;
 }
 const number=normalizeWhatsApp(recipient.phone);
 if(!number)return false;
 const parameters=[session.title+" · "+session.batch+" · Day "+session.day,time,site].map(text=>({type:"text",text}));
 const response=await fetch("https://graph.facebook.com/"+cfg.WHATSAPP_API_VERSION+"/"+cfg.WHATSAPP_PHONE_NUMBER_ID+"/messages",{method:"POST",redirect:"manual",signal:AbortSignal.timeout(7000),headers:{"Authorization":"Bearer "+cfg.WHATSAPP_ACCESS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to:number,type:"template",template:{name:cfg.WHATSAPP_TEMPLATE_NAME,language:{code:cfg.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:"body",parameters}]}})});
 return response.ok;
}
export async function dispatchClassReminders(now=Date.now()){
 const channels=reminderChannels();
 const result={channels,accepted:0,failed:0,skipped:0,more:false};
 if(!channels.email&&!channels.whatsapp)return result;
 const sessions=await upcomingSessions(now);
 // Keep each invocation bounded. Already attempted messages are skipped on later runs.
 let budget=12;
 for(const session of sessions){
  const addresses=new Set<string>();
  for(let offset=0;offset<3000&&budget>0;offset+=60){
   const group=await recipients(session,60,offset);
   for(const person of group){
    for(const channel of ["email","whatsapp"] as const){
     const target=channel==="email"?person.email.trim().toLowerCase():normalizeWhatsApp(person.phone);
     if(!channels[channel]||!target||(channel==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)))continue;
     const unique=channel+"|"+person.role+"|"+target;
     if(addresses.has(unique))continue;
     addresses.add(unique);
     if(!budget){result.more=true;return result;}
     const key=await digest(JSON.stringify([session.slug,session.batch,session.day,session.start,channel,person.role,target]));
     const claim=await db().prepare("INSERT INTO class_reminder_dispatch(event_key,slug,batch,channel,status,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(event_key) DO NOTHING").bind(key,session.slug,session.batch,channel,"attempting",new Date().toISOString()).run();
     if(!claim.meta.changes){result.skipped++;continue;}
     budget--;
     let status="failed";
     try{if(await send(channel,person,session,key))status="accepted";}catch{/* Do not retry uncertain provider requests automatically. */}
     await db().prepare("UPDATE class_reminder_dispatch SET status=?,updated_at=? WHERE event_key=?").bind(status,new Date().toISOString(),key).run();
     if(status==="accepted")result.accepted++;else result.failed++;
    }
   }
   if(group.length<60)break;
  }
  if(!budget){result.more=true;break;}
 }
 return result;
}
