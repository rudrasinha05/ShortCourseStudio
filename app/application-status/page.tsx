import {Frame} from "@/app/ui";
import {refPattern} from "@/lib/form-workflows";
export const dynamic="force-dynamic";
export const metadata={title:"Application recovery",robots:{index:false,follow:false},referrer:"same-origin"};
export default async function ApplicationStatus({searchParams}:{searchParams:Promise<{ref?:string;error?:string}>}){
 const p=await searchParams;
 const id=typeof p.ref==="string"&&refPattern.test(p.ref)?p.ref:"";
 return <Frame><section className="wrap narrow prose"><span className="eyebrow">STUDENT SUPPORT</span><h1>Recover an application</h1>
 <p>If your application is already linked, open it directly in your <a className="textlink" href="/student?view=applications">Student Portal</a>. Otherwise, use the reference and private code from your receipt. If you were sent here right after applying and never received a code, contact support with your reference. Do not submit a duplicate application.</p>
 {p.error&&<p role="alert" className="error">{p.error==="notfound"?"That reference and tracking code did not match.":"Could not complete the request. Try again."}</p>}
 <form className="panel formpanel" action="/forms/status" method="post">
  <label>Application reference<input name="id" defaultValue={id} required maxLength={30} autoComplete="off" spellCheck={false}/></label>
  <label>Private tracking code<input type="password" name="code" required minLength={64} maxLength={64} autoComplete="off"/></label>
  <button className="btn primary">Open application</button><a className="textlink" href="/help">Get help recovering your application</a>
 </form></section></Frame>;
}
