"use client";
import {useState} from "react";
import {RefreshCw} from "lucide-react";

export function PaymentStatusCheck({id,token,buttonLabel="Check payment status",receipt,onReceipt}:{id:string;token?:string;buttonLabel?:string;receipt:string;onReceipt?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function check(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/payments/reconcile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,token})});
   const data=await response.json() as {error?:string;paymentState?:string};
   if(!response.ok)throw new Error(data.error||"Payment status could not be checked.");
   if(data.paymentState==="paid"||data.paymentState==="test_paid"){
    if(onReceipt)location.reload();else location.assign(receipt);
    return;
   }
   setMessage(data.paymentState==="pending"?"Razorpay shows the payment is awaiting capture. Please do not pay again.":"No captured payment was found. If your bank shows a debit, contact support before retrying.");
  }catch(e){setMessage(e instanceof Error?e.message:"Payment status could not be checked.");}
  finally{setBusy(false);}
 }
 return <div className="payment-status-check"><button className="btn secondary" type="button" disabled={busy} onClick={check}><RefreshCw size={15} aria-hidden="true"/> {busy?"Checking Razorpay…":buttonLabel}</button>{message&&<p role="status" className="mutedbox">{message}</p>}</div>;
}
