import {CRASH_TITLE} from "@/lib/courses";
import {Frame} from "@/app/ui";
import {verifyCertificate} from "@/lib/admin-controls";
export const dynamic="force-dynamic";
export const metadata={title:"Verify a certificate",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function Certificate({searchParams}:{searchParams:Promise<{id?:string}>}){
 const p=await searchParams,id=typeof p.id==="string"?p.id.trim().toUpperCase():"";
 const record=id?await verifyCertificate(id):null;
 return <Frame><section className="wrap narrow prose"><h1>Certificate verification</h1>
 {record?<div className="panel formpanel"><h2>Certificate of Completion</h2><p>This certifies that <strong>{record.issued_name}</strong> completed <strong>{record.issued_course}</strong>.</p><p>Issued {record.issued_at?.slice(0,10)} · {id}</p></div>:<>{id&&<p role="alert">No valid certificate found for this ID.</p>}
 <form className="panel formpanel" method="get"><label>Certificate ID<input name="id" required maxLength={29} defaultValue={id}/></label><button className="btn primary">Verify certificate</button></form></>}
 <section className="panel formpanel" aria-labelledby="sample-certificate-heading">
  <h2 id="sample-certificate-heading">Sample completion certificate</h2>
  <p>See the certificate layout for {CRASH_TITLE}. The sample includes the department and spaces for the programme chairman, head of department and director to sign. It uses a demo name and is not a verified credential.</p>
  <div className="actions"><a className="btn secondary" href="/sample-certificate.pdf?v=signatories" target="_blank" rel="noopener">View sample certificate (PDF)</a></div>
 </section>
 </section></Frame>;
}
