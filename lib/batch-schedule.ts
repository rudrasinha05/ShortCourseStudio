const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
export const deliveryModes=[["online","Online"],["offline","Offline"],["hybrid","Online and offline"]] as const;
export function validBatchStart(value:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return false;
 const time=new Date(value+"Z");
 return Number.isFinite(time.valueOf())&&time.toISOString().slice(0,16)===value;
}
export function formatBatchSchedule(value:string){
 const [date,time]=value.split("T"),[year,month,day]=date.split("-"),[h,min]=time.split(":");
 const hour=Number(h);
 return `Starts ${Number(day)} ${months[Number(month)-1]} ${year} at ${hour%12||12}:${min} ${hour<12?"AM":"PM"} IST`;
}
export function readBatchStart(schedule:string){
 if(validBatchStart(schedule))return schedule;
 const parts=schedule.match(/^Starts (\d{1,2}) ([A-Za-z]+) (20\d{2}) at (\d{1,2}):(\d{2}) (AM|PM) IST$/i);
 if(!parts)return "";
 const [,d,m,y,h,min,period]=parts,month=months.findIndex(x=>x.toLowerCase()===m.toLowerCase())+1;
 const hour=Number(h);
 if(!month||hour<1||hour>12)return "";
 const two=(i:number)=>String(i).padStart(2,"0");
 const prior=`${y}-${two(month)}-${two(Number(d))}T${two(hour%12+(period.toUpperCase()==="PM"?12:0))}:${min}`;
 return validBatchStart(prior)?prior:"";
}
export function readDeliveryMode(mode:string){
 const [head,...rest]=mode.split(" · "),name=head.trim().toLowerCase();
 const matching=deliveryModes.find(([id,label])=>name===label.toLowerCase()||name===id);
 if(matching)return {delivery:matching[0],venue:rest.join(" · ")};
 return {delivery:"",venue:mode};
}

export function readAdminSchedule(read:(key:string)=>string,saved:{schedule:string;mode:string},structured:boolean){
 // Older admin/API clients still use the original two string fields.
 if(!structured)return {schedule:read("schedule"),mode:read("mode")};
 const start=read("batchStart").trim(),delivery=read("deliveryMode"),venue=read("venue").trim();
 if(start&&!validBatchStart(start))return null;
 const selected=deliveryModes.find(([id])=>id===delivery);
 if(delivery&&!selected||venue.length>70||/[\u0000-\u001f\u007f]/.test(venue))return null;
 // Keep an older free-text schedule or mode when editing unrelated fields.
 const schedule=start?formatBatchSchedule(start):(!readBatchStart(saved.schedule)?saved.schedule:"");
 const mode=selected?selected[1]+(selected[0]!=="online"&&venue?" · "+venue:""):(!readDeliveryMode(saved.mode).delivery?saved.mode:"");
 return {schedule,mode};
}
