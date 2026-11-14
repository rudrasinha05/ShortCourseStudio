import {z} from "zod";
import {authorizedAdmin,cfg,db,isAdminIdentity} from "./enrollment";
import {audit} from "./admin-controls";

export const staffRoles=["admissions","academic","finance","reports"] as const;
export type StaffRole=typeof staffRoles[number];
type Staff={email:string;role:StaffRole;active:number};
export async function staffRole(h:Pick<Headers,"get">){
 const email=h.get("oai-authenticated-user-email")?.trim().toLowerCase();
 if(!email||!h.get("oai-authenticated-user-id"))return null;
 const r=await db().prepare("SELECT role FROM admin_staff WHERE email=? AND active=1").bind(email).first<StaffRole>("role");
 return staffRoles.some(role=>role===r)?r:null;
}
export async function isAllowed(req:Request,roles:StaffRole[]){
 return await authorizedAdmin(req)||roles.includes((await staffRole(req.headers)) as StaffRole);
}
export const isOwner=isAdminIdentity;
export async function listStaff(){return (await db().prepare("SELECT email,role,active FROM admin_staff ORDER BY active DESC,email").all<Staff>()).results;}
export async function saveStaff(actor:string,emailInput:string,role:string,active:string){
 const email=emailInput.trim().toLowerCase();
 if(!z.string().email().max(160).safeParse(email).success||email===cfg.SITE_ADMIN_EMAIL?.toLowerCase()||!staffRoles.some(x=>x===role)||!["yes","no"].includes(active))return false;
 await db().batch([
  db().prepare("INSERT INTO admin_staff(email,role,active,updated_at) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role,active=excluded.active,updated_at=excluded.updated_at").bind(email,role,active==="yes"?1:0,new Date().toISOString()),
  db().prepare("INSERT INTO admin_audit(actor,action,target,created_at,next) VALUES(?,?,?,?,?)").bind(actor,"set staff access",email,new Date().toISOString(),role+":"+active)
 ]);
 return true;
}

export const supportTypes={correction:"Application correction",deletion:"Data deletion request",payment:"Payment question",other:"Other question"} as const;
export type Support={id:string;application_id:string;type:keyof typeof supportTypes;message:string;status:string;response:string;created_at:string;updated_at:string};
export async function openSupport(userId:string,id:string,type:string,raw:string){
 const message=raw.trim(),now=new Date().toISOString();
 if(!Object.hasOwn(supportTypes,type)||!/^SCS-[A-F0-9]{20}$/.test(id)||message.length<3||message.length>1000)return false;
 const r=await db().prepare("INSERT INTO applicant_support(id,application_id,type,message,created_at,updated_at) SELECT ?,id,?,?,?,? FROM applications WHERE id=? AND student_user_id=? AND NOT EXISTS (SELECT 1 FROM applicant_support WHERE application_id=? AND type=? AND status='open')").bind(crypto.randomUUID(),type,message,now,now,id,userId,id,type).run();
 return !!r.meta.changes;
}
export async function studentSupport(userId:string){
 return (await db().prepare("SELECT s.* FROM applicant_support s JOIN applications a ON a.id=s.application_id WHERE a.student_user_id=? ORDER BY s.created_at DESC LIMIT 50").bind(userId).all<Support>()).results;
}
export async function adminSupport(){
 return (await db().prepare("SELECT * FROM applicant_support ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,created_at DESC LIMIT 100").all<Support>()).results;
}
export async function respondSupport(actor:string,id:string,raw:string,status:string){
 const response=raw.trim();
 if(!z.string().uuid().safeParse(id).success||!["open","resolved"].includes(status)||response.length<3||response.length>1000)return false;
 const r=await db().prepare("UPDATE applicant_support SET response=?,status=?,updated_at=? WHERE id=?").bind(response,status,new Date().toISOString(),id).run();
 if(r.meta.changes)await audit(actor,"update support request",id);
 return !!r.meta.changes;
}
