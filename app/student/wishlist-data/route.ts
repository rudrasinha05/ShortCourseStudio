import {db,getCourses,publicCatalogue} from "@/lib/enrollment";
import {wishlistStudentIdentity} from "@/lib/wishlist";

export const dynamic="force-dynamic";
const reply=(payload:unknown,status=200)=>Response.json(payload,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
export async function GET(req:Request){
 const user=wishlistStudentIdentity(req.headers);
 if(!user)return reply({account:false,slugs:[]});
 const {results}=await db().prepare("SELECT slug FROM student_wishlist WHERE student_id=? ORDER BY created_at DESC,slug").bind(user.id).all<{slug:string}>();
 return reply({account:true,slugs:results.map(r=>r.slug)});
}
export async function POST(req:Request){
 const origin=req.headers.get("origin"),site=req.headers.get("sec-fetch-site");
 if((origin!==new URL(req.url).origin&&(origin!==null||site!=="same-origin"))||site==="cross-site")return reply({error:"Invalid request origin"},403);
 const user=wishlistStudentIdentity(req.headers);
 if(!user)return reply({error:"Student sign-in required"},401);
 const reader=req.body?.getReader();
 if(!reader||req.headers.get("content-type")?.split(";")[0]!=="application/json")return reply({error:"Expected JSON"},415);
 let raw="",bytes=0;
 const decoder=new TextDecoder();
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>8192){await reader.cancel();return reply({error:"Request too large"},413);}raw+=decoder.decode(value,{stream:true});}
  raw+=decoder.decode();
 }finally{reader.releaseLock();}
 let payload;
 try{payload=JSON.parse(raw);}catch{return reply({error:"Invalid request"},400);}
 const slugPattern=/^[a-z0-9][a-z0-9-]{0,99}$/;
 const d=db();
 if(payload?.action==="import"&&Array.isArray(payload.slugs)&&payload.slugs.length<=100&&payload.slugs.every((slug:unknown)=>typeof slug==="string"&&slugPattern.test(slug))){
  const known=new Set(publicCatalogue(await getCourses()).map(c=>c.slug));
  const slugs=[...new Set(payload.slugs as string[])].filter(slug=>known.has(slug));
  if(slugs.length)await d.batch(slugs.map(slug=>d.prepare("INSERT INTO student_wishlist (student_id,slug,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING").bind(user.id,slug,Date.now())));
  return reply({slugs});
 }
 const {slug,saved}=payload??{};
 if(typeof slug!=="string"||!slugPattern.test(slug)||typeof saved!=="boolean")return reply({error:"Invalid course selection"},400);
 if(saved){
  if(!publicCatalogue(await getCourses()).some(c=>c.slug===slug))return reply({error:"Course is not available"},404);
  await d.prepare("INSERT INTO student_wishlist (student_id,slug,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING").bind(user.id,slug,Date.now()).run();
 }else await d.prepare("DELETE FROM student_wishlist WHERE student_id=? AND slug=?").bind(user.id,slug).run();
 return reply({saved});
}
