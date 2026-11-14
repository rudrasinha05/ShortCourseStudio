"use client";
import {CalendarDays} from "lucide-react";
import {useRef,useState} from "react";
import {deliveryModes,readBatchStart,readDeliveryMode} from "@/lib/batch-schedule";

export function BatchScheduleFields({schedule,mode}:{schedule:string;mode:string}){
 const start=readBatchStart(schedule),oldMode=readDeliveryMode(mode);
 const [delivery,setDelivery]=useState<string>(oldMode.delivery);
 const input=useRef<HTMLInputElement>(null);
 const openPicker=()=>{
  const field=input.current;
  if(!field)return;
  field.focus();
  try{field.showPicker?.();}catch{/* The native control stays usable without showPicker. */}
 };
 return <div className="admin-batch-schedule">
  <input type="hidden" name="structuredSchedule" value="1"/>
  <div className="portal-fields">
   <div className="admin-date-field">
    <label>Batch starts (IST)<input type="datetime-local" name="batchStart" ref={input} defaultValue={start} min="2000-01-01T00:00" max="2099-12-31T23:59"/></label>
    <button type="button" className="btn secondary" onClick={openPicker}><CalendarDays size={16} aria-hidden="true"/> Pick date &amp; time</button>
   </div>
   <label>Delivery mode<select name="deliveryMode" value={delivery} onChange={e=>setDelivery(e.target.value)}><option value="">Choose a mode</option>{deliveryModes.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  </div>
  {schedule&&!start&&<p className="mutedbox">Current schedule: {schedule}. Pick a date and time to replace it.</p>}
  {mode&&!oldMode.delivery&&<p className="mutedbox">Current delivery: {mode}. Choose a mode to replace it.</p>}
  <label hidden={delivery!=="offline"&&delivery!=="hybrid"} className={delivery==="offline"||delivery==="hybrid"?undefined:"admin-venue-hidden"}>Campus venue (optional)<input name="venue" maxLength={70} defaultValue={oldMode.venue}/></label>
 </div>;
}
