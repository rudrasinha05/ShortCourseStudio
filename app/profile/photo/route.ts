import {cfg} from "@/lib/enrollment";
import {requestIdentity} from "@/lib/portals";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
async function key(id:string){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(id));return "profile-photos/"+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");}
const placeholder='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#eaf0fa"/><circle cx="64" cy="47" r="22" fill="#284e83"/><path d="M22 117a42 42 0 0 1 84 0" fill="#284e83"/></svg>';
export async function GET(req:Request){
 const user=requestIdentity(req.headers);if(!user)return new Response(null,{status:401,headers});
 const photo=await cfg.BUCKET?.get(await key(user.id));
 return photo?new Response(photo.body,{headers:{...headers,"Content-Type":photo.httpMetadata?.contentType??"image/png"}}):new Response(placeholder,{headers:{...headers,"Content-Type":"image/svg+xml"}});
}
export async function POST(req:Request){
 const user=requestIdentity(req.headers);if(!user)return new Response("Sign in first",{status:401,headers});
 if(req.headers.get("origin")!==new URL(req.url).origin)return new Response("Invalid origin",{status:403,headers});
 if(!cfg.BUCKET)return new Response("Photo storage is unavailable. Try again later.",{status:503,headers});
 if(Number(req.headers.get("content-length")??0)>2*1024*1024)return new Response("Photo is too large",{status:413,headers});
 const reader=req.body?.getReader();if(!reader)return new Response("Photo required",{status:400,headers});
 const chunks:Uint8Array[]=[];let total=0;
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>2*1024*1024){await reader.cancel();return new Response("Photo is too large",{status:413,headers});}chunks.push(value);}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const png=[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
 if(!png||total<24||req.headers.get("content-type")!=="image/png")return new Response("Choose a valid image",{status:400,headers});
 const view=new DataView(bytes.buffer);if(view.getUint32(16)>1024||view.getUint32(20)>1024||!view.getUint32(16)||!view.getUint32(20))return new Response("Image dimensions are invalid",{status:400,headers});
 await cfg.BUCKET.put(await key(user.id),bytes,{httpMetadata:{contentType:"image/png"}});
 return new Response(null,{status:204,headers});
}
export async function DELETE(req:Request){
 const user=requestIdentity(req.headers);if(!user)return new Response(null,{status:401,headers});
 if(req.headers.get("origin")!==new URL(req.url).origin)return new Response(null,{status:403,headers});
 if(!cfg.BUCKET)return new Response("Photo storage unavailable",{status:503,headers});
 await cfg.BUCKET.delete(await key(user.id));return new Response(null,{status:204,headers});
}
