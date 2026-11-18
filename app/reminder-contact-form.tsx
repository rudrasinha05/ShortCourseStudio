export function ReminderContactForm({role,contact}:{role:"student"|"faculty";contact:{whatsapp:string;enabled:number}|null}){
 return <form className="panel formpanel" action={"/forms/"+role+"/reminder-contact"} method="post">
  <h3>Class reminder preferences</h3><p>Class reminders can be sent to your email when delivery is connected. WhatsApp is optional.</p>
  <label>WhatsApp number <input name="whatsapp" type="tel" maxLength={24} defaultValue={contact?.whatsapp?"+"+contact.whatsapp:""} placeholder="Indian mobile number or +country code"/></label>
  <label className="check"><input type="checkbox" name="enabled" value="yes" defaultChecked={!!contact?.enabled}/><span>Send me class reminders on WhatsApp. Uncheck and save to opt out.</span></label>
  <button className="btn secondary">Save reminder preferences</button>
 </form>;
}
