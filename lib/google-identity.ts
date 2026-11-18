const utf8=new TextEncoder();

export async function googleJson(url:string,init:RequestInit={}){
 const r=await fetch(url,{...init,redirect:"manual",signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error("Google verification unavailable");
 return r.json();
}
type GoogleClaims={iss?:unknown;aud?:unknown;azp?:unknown;exp?:unknown;iat?:unknown;nonce?:unknown;sub?:unknown;email?:unknown;email_verified?:unknown;hd?:unknown;name?:unknown};
export async function verifiedClaims(jwt:string,client:string,nonce:string){
 if(jwt.length>8192||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(jwt))return null;
 const [head,payload,sig]=jwt.split(".");
 const h=JSON.parse(Buffer.from(head,"base64url").toString()) as {alg?:unknown;kid?:unknown};
 if(h.alg!=="RS256"||typeof h.kid!=="string"||!h.kid)return null;
 const keys=await googleJson("https://www.googleapis.com/oauth2/v3/certs") as {keys?:Array<JsonWebKey&{kid?:string;alg?:string}>};
 const jwk=keys.keys?.find(key=>key.kid===h.kid&&key.kty==="RSA"&&(!key.alg||key.alg==="RS256")&&(!key.use||key.use==="sig"));
 if(!jwk)return null;
 const publicKey=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
 if(!await crypto.subtle.verify("RSASSA-PKCS1-v1_5",publicKey,new Uint8Array(Buffer.from(sig,"base64url")),utf8.encode(head+"."+payload)))return null;
 const v=JSON.parse(Buffer.from(payload,"base64url").toString()) as GoogleClaims,now=Math.floor(Date.now()/1000);
 if((v.iss!=="accounts.google.com"&&v.iss!=="https://accounts.google.com")||v.aud!==client||(v.azp!==undefined&&v.azp!==client)||typeof v.exp!=="number"||v.exp<=now||typeof v.iat!=="number"||v.iat>now+60||v.iat<now-600||v.nonce!==nonce)return null;
 return v;
}
