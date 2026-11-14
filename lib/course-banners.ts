import {cfg,db,getCourses,lookup} from "./enrollment";
import {CRASH_SLUG,CRASH_TITLE,isCShortCourse} from "./courses";
export {CRASH_SLUG} from "./courses";

const CRASH_BATCH="launch";
const CRASH_PHOTO="/horesh-sir.webp";
export const crashCourse={
 slug:CRASH_SLUG,batch:CRASH_BATCH,title:CRASH_TITLE,
 blurb:"A short-term course in C programming, launching before the regular Short Course Studio catalogue.",
};
const empty={faculty:"",qualification:"",profile:"",photo:"",starts_at:"",timing:"",visible:1};
const crashDefaults={...empty,faculty:"Horesh Sir",qualification:"M.Tech from NSUT, Delhi",profile:"DSA Tech Trainer at GL Bajaj Institute of Technology & Management",photo:CRASH_PHOTO,starts_at:"2026-11-26T20:00"};
type BannerFields=typeof empty;
type BannerRecord=BannerFields&{slug:string;batch:string};
type SessionStart={slug:string;batch:string;starts_at:string};
const instant=(s:string)=>Date.parse(s+"+05:30");
function dateIsValid(value:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const d=new Date(value+"Z");
 return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,16)===value;
}
function photoIsValid(value:string,slug:string){
 if(!value)return true;
 if(slug===CRASH_SLUG&&value===CRASH_PHOTO)return true;
 try{
  const url=new URL(value);
  return url.protocol==="https:"&&!url.username&&!url.password;
 }catch{return false;}
}
function bannerFields(slug:string,saved:BannerFields|null|undefined):BannerFields{
 if(slug!==CRASH_SLUG)return saved??empty;
 return saved?{...saved,photo:saved.photo||crashDefaults.photo,starts_at:saved.starts_at||crashDefaults.starts_at}:crashDefaults;
}
export async function getBannerFields(slug:string,batch:string):Promise<BannerFields>{
 const saved=cfg.DB?await db().prepare("SELECT faculty,qualification,profile,photo,starts_at,timing,visible FROM course_banners WHERE slug=? AND batch=?").bind(slug,batch).first<BannerFields>():null;
 return bannerFields(slug,saved);
}
export async function saveBanner(slug:string,batch:string,val:(key:string)=>string){
 const actualBatch=slug===CRASH_SLUG?CRASH_BATCH:(await lookup(slug))?.batch;
 if(!actualBatch||actualBatch!==batch)return false;
 const faculty=val("faculty").trim(),qualification=val("qualification").trim(),profile=val("profile").trim(),photo=val("photo").trim(),start=val("startsAt").trim(),timing=val("timing").trim();
 if(faculty.length>100||qualification.length>150||profile.length>180||photo.length>1500||timing.length>180||!photoIsValid(photo,slug)||(start&&!dateIsValid(start)))return false;
 const visible=val("visible")==="yes"?1:0;
 await db().prepare("INSERT INTO course_banners (slug,batch,faculty,qualification,profile,photo,starts_at,timing,visible) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug,batch) DO UPDATE SET faculty=excluded.faculty,qualification=excluded.qualification,profile=excluded.profile,photo=excluded.photo,starts_at=excluded.starts_at,timing=excluded.timing,visible=excluded.visible").bind(slug,batch,faculty,qualification,profile,photo,start,timing,visible).run();
 return true;
}
type Courses=Awaited<ReturnType<typeof getCourses>>;
export async function getUpcomingBanners(courses:Courses,now=Date.now()){
 const [records,starts]=cfg.DB?await Promise.all([
  db().prepare("SELECT * FROM course_banners").all<BannerRecord>(),
  db().prepare("SELECT slug,batch,MIN(starts_at) AS starts_at FROM class_sessions WHERE starts_at <> '' GROUP BY slug,batch").all<SessionStart>()
 ]):[{results:[] as BannerRecord[]},{results:[] as SessionStart[]}];
 const available=[{...crashCourse,crash:true,status:"soon",mode:"",schedule:""},...courses.filter(c=>c.status!=="closed"&&!isCShortCourse(c.slug)).map(c=>({...c,crash:false}))];
 return available.flatMap(course=>{
  const saved=records.results.find(r=>r.slug===course.slug&&r.batch===course.batch);
  const f=bannerFields(course.slug,saved);
  if(!f.visible)return [];
  const start=f.starts_at||starts.results.find(s=>s.slug===course.slug&&s.batch===course.batch)?.starts_at||"";
  if((start&&(!dateIsValid(start)||instant(start)<=now))||(!start&&!course.crash&&!saved))return [];
  return [{...course,...f,start,when:start?instant(start):Infinity}];
 }).sort((a,b)=>(a.when-b.when)||(Number(b.crash)-Number(a.crash))||a.title.localeCompare(b.title));
}
export function bannerStart(value:string){
 return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(instant(value))+" IST";
}
