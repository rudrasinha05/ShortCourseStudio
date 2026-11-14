import {authorizedReminderJob,dispatchClassReminders} from "@/lib/class-reminders";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const headers={"Cache-Control":"no-store"};
 if(!await authorizedReminderJob(req))return Response.json({error:"Not found."},{status:404,headers});
 return Response.json(await dispatchClassReminders(),{headers});
}
