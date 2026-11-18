import {z} from "zod";
import {db,lookup} from "./enrollment";
import {registrationSlug} from "./courses";

const batchSchema=z.object({batch:z.string().regex(/^[a-z0-9][a-z0-9-]{0,29}$/),schedule:z.string().trim().max(150),mode:z.string().trim().max(100),status:z.enum(["soon","open","closed"])});
export async function setBatchIntake(slug:string,input:unknown){
 const p=batchSchema.safeParse(input);
 if(!p.success||registrationSlug(slug)!==slug)return "intake-invalid";
 const course=await lookup(slug);
 if(!course||course.batch!==p.data.batch)return "intake-stale";
 const {batch,schedule,mode,status}=p.data;
 if(status==="open"&&course.visibility!=="published")return "intake-invalid";
 if(status==="open"&&(!schedule||!mode))return "schedule";
 const needsInstructor=status==="open"&&course.needsInstructor;
 const r=await db().prepare(`INSERT INTO course_settings (slug,batch,schedule,mode,status)
 SELECT ?,?,?,?,? WHERE (?=0 OR EXISTS (SELECT 1 FROM course_banners WHERE slug=? AND batch=? AND trim(faculty)<>'')) AND (?<>'open' OR NOT EXISTS (SELECT 1 FROM course_catalogue WHERE slug=? AND visibility<>'published'))
 ON CONFLICT(slug) DO UPDATE SET schedule=excluded.schedule,mode=excluded.mode,status=excluded.status WHERE course_settings.batch=excluded.batch`).bind(slug,batch,schedule,mode,status,needsInstructor?1:0,slug,batch,status,slug).run();
 return r.meta.changes?"intake-saved":(await lookup(slug))?.batch!==batch?"intake-stale":needsInstructor?"instructor":"intake-invalid";
}

export async function setSiteControls(paused:string,announcement:string){
 if(!["yes","no"].includes(paused)||announcement.trim().length>240)return false;
 const r=await db().prepare("INSERT INTO site_controls (id,intake_paused,announcement) VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET intake_paused=excluded.intake_paused,announcement=excluded.announcement").bind(paused==="yes"?1:0,announcement.trim()).run();
 return !!r.meta.changes;
}
