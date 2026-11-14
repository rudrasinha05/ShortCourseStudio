import {db} from "./enrollment";
import {learningPreferencesSchema,readLearningPreferences} from "./learning-preferences";

export async function loadLearningProfile(userId:string){
 const own=await db().prepare("SELECT preferences FROM student_learning_profiles WHERE user_id=?").bind(userId).first<string>("preferences");
 const saved=readLearningPreferences(own);
 if(saved)return saved;
 const previous=await db().prepare("SELECT form_answers FROM applications WHERE student_user_id=? AND json_extract(form_answers,'$.details.preferences') IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 1").bind(userId).first<string>("form_answers");
 return readLearningPreferences(previous,true);
}
export async function writeLearningProfile(userId:string,input:unknown){
 const parsed=learningPreferencesSchema.safeParse(input);
 if(!parsed.success)return false;
 await db().prepare("INSERT INTO student_learning_profiles(user_id,preferences,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET preferences=excluded.preferences,updated_at=excluded.updated_at")
  .bind(userId,JSON.stringify(parsed.data),new Date().toISOString()).run();
 return true;
}
