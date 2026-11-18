"use client";
import {PaymentStatusCheck} from "./payment-status-check";
import {useState} from "react";
import {ArrowRight,CreditCard,Landmark,Smartphone,Wallet} from "lucide-react";

type Checkout=new (options:Record<string,unknown>)=>{open:()=>void;on:(event:string,cb:()=>void)=>void};
const methods=[
 {id:"upi",label:"UPI",help:"Pay with a supported UPI app",icon:Smartphone},
 {id:"card",label:"Debit or credit card",help:"Use an eligible card",icon:CreditCard},
 {id:"netbanking",label:"Net banking",help:"Pay through your bank",icon:Landmark},
 {id:"wallet",label:"Wallet",help:"Use an available wallet",icon:Wallet},
] as const;
type Method=typeof methods[number]["id"];

async function post<T extends object>(path:string,body:unknown){
 const res=await fetch("/api/payments/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await res.json() as T&{error?:string};if(!res.ok)throw new Error(data.error??"Payment service unavailable.");return data;
}
async function loadCheckout(){
 const w=window as Window & {Razorpay?:Checkout};
 if(!w.Razorpay)await new Promise<void>((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error("Could not load checkout."));};document.head.appendChild(script);
 });
 if(!w.Razorpay)throw new Error("Checkout is unavailable.");return w.Razorpay;
}
export default function PaymentCheckout({id,token,mode,fee,receipt}:{id:string;token?:string;mode:"test"|"live";fee:string;receipt:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[method,setMethod]=useState<Method>("upi");
 const ref={id,token};
 async function start(){
  setBusy(true);setError("");
  try{
   const o=await post<{paymentState?:string;key?:string;amount?:number;orderId?:string;course?:string}>("order",ref);
   if(o.paymentState){location.assign(receipt);return;}
   const Razorpay=await loadCheckout();
   const chosen=methods.find(option=>option.id===method)!;
   const config={display:{blocks:{selected:{name:chosen.label,instruments:[{method}]}},sequence:["block.selected"],preferences:{show_default_blocks:true}}};
   const instance=new Razorpay({key:o.key,order_id:o.orderId,amount:o.amount,currency:"INR",name:"Short Course Studio",description:o.course,config,theme:{color:"#234c7b"},modal:{ondismiss:()=>setBusy(false)},handler:async(payload:Record<string,string>)=>{
    try{const p=await post<{paymentState:string}>("verify",{...ref,...payload});if(p.paymentState==="pending")setError("Payment is awaiting confirmation. Check application status shortly.");else location.assign(receipt);}
    catch(e){setError(e instanceof Error?e.message:"Could not verify payment.");}finally{setBusy(false);}
   }});
   instance.on("payment.failed",()=>{setError("Payment did not complete. Check your application status before retrying.");setBusy(false);});instance.open();
  }catch(e){setError(e instanceof Error?e.message:"Checkout is unavailable.");setBusy(false);}
 }
 return <div className="checkout-picker">
  {mode==="test"&&<p className="mutedbox">Test checkout only. No real money is collected.</p>}
  <fieldset className="checkout-methods" disabled={busy}><legend>Choose your preferred method</legend>
   {methods.map(({id,label,help,icon:Icon})=><label className="checkout-method" key={id}><input type="radio" name="paymentMethod" value={id} checked={method===id} onChange={()=>setMethod(id)}/><Icon size={20} aria-hidden="true"/><span><strong>{label}</strong><small>{help}</small></span></label>)}
  </fieldset>
  <p>Razorpay shows the methods available for your account and device. You can change your choice in checkout.</p>
  <button type="button" className="btn primary" onClick={start} disabled={busy}>{busy?"Opening checkout…":mode==="test"?"Run test checkout":"Pay "+fee} <ArrowRight size={16} aria-hidden="true"/></button>
  {error&&<p role="alert" className="error">{error}</p>}
  <PaymentStatusCheck id={id} token={token} receipt={receipt}/>
 </div>;
}
