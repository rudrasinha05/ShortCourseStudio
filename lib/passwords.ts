import {pbkdf2,timingSafeEqual} from "node:crypto";

const iterations=600_000,dummySalt="0".repeat(32),dummyHash="0".repeat(64);
const derive=(value:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>{
 pbkdf2(value,Buffer.from(salt,"hex"),iterations,32,"sha256",(err,buf)=>err?reject(err):resolve(buf));
});
export async function passwordHash(value:string){
 const salt=Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("hex");
 return "pbkdf2-sha256:"+salt+":"+(await derive(value,salt)).toString("hex");
}
export async function passwordMatches(value:string,encoded?:string|null){
 const [,salt,stored]=encoded?.match(/^pbkdf2-sha256:([a-f0-9]{32}):([a-f0-9]{64})$/)??[];
 const actual=await derive(value,salt??dummySalt);
 return timingSafeEqual(actual,Buffer.from(stored??dummyHash,"hex"))&&!!stored;
}
