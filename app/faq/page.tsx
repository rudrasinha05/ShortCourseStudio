import Link from "next/link";
import {Frame} from "@/app/ui";
import {getSiteContent} from "@/lib/admin-controls";

export const dynamic="force-dynamic";
export const metadata={title:"Frequently asked questions"};
const questions=[
 ["When can I apply?","You can submit an application only when the organiser opens the batch. Check the course page for its status, date and delivery mode."],
 ["Does submitting the form confirm my seat?","No. An application is a request to join. Review, payment verification where applicable and access to classes are shown separately."],
 ["Do I pay when I submit?","No payment is collected with the form. When checkout is enabled for your batch, open your application to see payment options."],
 ["Where do I see my application status?","Sign in to the Student Portal with the application email and open Applications. If you used a different email or applied without signing in, use your receipt to recover or link it."],
 ["How do I join a class or watch a recording?","Once the organiser grants class access, open My courses in the Student Portal for class links, recordings and resources."],
 ["What is the difference between regular and exclusive courses?","A regular course covers one module over five days. An exclusive course covers five modules in a single 15-hour intensive."],
];
export default async function FAQ(){
 const {faq}=await getSiteContent();
 return <Frame><section className="wrap narrow prose info-page"><span className="eyebrow">STUDENT GUIDE</span><h1>Frequently asked questions</h1><p>Answers about applying, payment, and joining a course.</p>
 <div className="info-questions">{questions.map(([question,answer])=><details className="panel portal-panel portal-details" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
 {faq&&<section className="panel portal-panel"><h2>Programme notes</h2><p className="info-preline">{faq}</p></section>}
 <div className="portal-links"><a className="btn primary" href="/help">Get help</a><Link className="btn secondary" href="/#courses">Explore courses</Link></div>
 </section></Frame>;
}
