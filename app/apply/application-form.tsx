"use client";

import Link from "next/link";
import {useState} from "react";
import {LearningPreferenceFields} from "@/app/learning-preference-fields";
import {ArrowRight} from "lucide-react";

type CourseOption={
 slug:string;
 title:string;
 status:string;
 batch:string;
 schedule:string;
 venue:string;
 open:boolean;
 fee:string;
 unavailable:string;
 checkoutPaused:boolean;
 version?:number;
 fields?:{key:string;label:string;required:boolean}[];
};

export default function ApplicationForm({courses,selected,mode}:{courses:CourseOption[];selected:string;mode:"test"|"live"|null}){
 const [slug,setSlug]=useState(selected||courses.find(c=>c.open)?.slug||"");
 const active=courses.find(c=>c.slug===slug);
 return <form className="panel formpanel" action={active?.open?"/forms/apply":undefined} method="post" aria-label="Course application">
  <div className="apply-form-intro"><span className="eyebrow">ADMISSIONS</span><h2>Course application</h2><p>Fields marked * are required.</p></div>
  <label>Course *<select name="slug" required value={slug} onChange={e=>setSlug(e.target.value)}>
   <option value="">Choose a course</option>
   {courses.map(c=><option key={c.slug} value={c.slug}>{c.title}{c.status==="soon"?" — Batch announcement soon":c.status==="closed"?" — Closed":c.status==="paused"?" — Paused":""}</option>)}
  </select></label>
  {!active?.open?<><div className="mutedbox" role="status">{active?.unavailable||"Applications will open after a batch is announced. No fee is collected before then."}</div><Link className="btn secondary" href="/#courses">Browse course plans <ArrowRight size={16}/></Link></>:<>
   <input type="hidden" name="batch" value={active.batch}/>
   <input type="hidden" name="detailed" value="yes"/>
   <dl className="apply-batch-facts"><div><dt>Schedule</dt><dd>{active.schedule}</dd></div><div><dt>Mode / venue</dt><dd>{active.venue}</dd></div></dl>
   <div className="mutedbox">Course fee <strong>{active.fee}</strong>{mode==="live"&&!active.checkoutPaused?" · Payment methods are shown in Razorpay checkout.":mode==="test"&&!active.checkoutPaused?" · Test checkout only.":" · Online payments are not enabled."} No payment is collected at submission. Billing address and payment are the next steps.</div>
   <fieldset className="apply-fieldset"><legend>1. Contact details</legend>
    <div className="portal-fields">
     <label>Full name *<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
     <label>Email address *<input name="email" type="email" autoComplete="email" required maxLength={160}/><span className="apply-optional">Use your sign-in email if you want this application linked in the Student Portal.</span></label>
     <label>Mobile number <span className="apply-optional">Optional</span><input name="phone" type="tel" autoComplete="tel" maxLength={24} placeholder="+91"/></label>
    </div>
    <label className="check"><input type="checkbox" name="whatsappReminders" value="yes"/><span>Send me class reminders on WhatsApp at this number (optional). Use an Indian mobile number or include the country code.</span></label>
   </fieldset>
   <fieldset className="apply-fieldset"><legend>2. Academic details</legend>
    <label>College or university *<input name="college" autoComplete="organization" required minLength={2} maxLength={140}/></label>
    <div className="portal-fields">
     <label>Programme and branch *<input name="programme" required minLength={2} maxLength={100} placeholder="e.g. B.Tech, CSE (AI)"/></label>
     <label>Current year or status *<select name="year" defaultValue="" required><option value="" disabled>Select your year</option><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option><option value="4">4th year</option><option value="5+">5th year or above</option><option value="graduate">Graduated</option><option value="other">Other</option></select></label>
    </div>
   </fieldset>
   <fieldset className="apply-fieldset"><legend>3. Interests and skills</legend>
    <LearningPreferenceFields/>
   </fieldset>
   {!!active.version&&<input type="hidden" name="formVersion" value={active.version}/>}
   {!!active.fields?.length&&<fieldset className="apply-fieldset"><legend>4. Batch-specific questions</legend>
    {active.fields.map(field=><label key={active.slug+":"+field.key}>{field.label}{field.required?" *":""}<input name={field.key} required={field.required} maxLength={500}/></label>)}
   </fieldset>}
   <label className="check"><input type="checkbox" name="consent" value="yes" required/><span>I agree to submit these details to the organiser for this course application. See the <Link href="/privacy">privacy notice</Link>.</span></label>
   <button className="btn primary">Submit application <ArrowRight size={17}/></button>
  </>}
 </form>;
}
