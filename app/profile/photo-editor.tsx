"use client";
import {useState} from "react";
export function PhotoEditor(){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(file:File){
  setBusy(true);setError("");let bitmap:ImageBitmap|undefined;
  try{
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8*1024*1024)throw Error("Choose a JPG, PNG or WebP image up to 8 MB.");
   bitmap=await createImageBitmap(file);const size=Math.min(bitmap.width,bitmap.height);
   const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
   canvas.getContext("2d")!.drawImage(bitmap,(bitmap.width-size)/2,(bitmap.height-size)/2,size,size,0,0,512,512);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Could not process this image.")),"image/png"));
   const r=await fetch("/profile/photo",{method:"POST",headers:{"Content-Type":"image/png"},body:blob});if(!r.ok)throw Error(await r.text());
   window.location.assign("/profile?photo=saved");
  }catch(e){setError(e instanceof Error?e.message:"Could not save photo.");}finally{bitmap?.close();setBusy(false);}
 }
 async function remove(){setBusy(true);setError("");try{const r=await fetch("/profile/photo",{method:"DELETE"});if(!r.ok)throw Error("Could not remove your photo.");window.location.assign("/profile?photo=removed");}catch(e){setError((e as Error).message);setBusy(false);}}
 return <div className="photo-editor"><label>Upload profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void save(f);e.target.value="";}}/></label><small>JPG, PNG or WebP · up to 8 MB. Saved as a square photo. This photo is private to your account.</small><button type="button" className="btn secondary" disabled={busy} onClick={remove}>Remove photo</button>{busy&&<p role="status">Updating photo…</p>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
