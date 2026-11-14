import type {ReactNode} from "react";
import {Frame} from "./ui";
import {chatGPTSignInPath,chatGPTSignOutPath} from "./chatgpt-auth";
import {ArrowRight,KeyRound,LogOut} from "lucide-react";

export function PortalAccount({email,path}:{email:string;path:string}){
 return <div className="portal-account"><span>Signed in as <strong>{email}</strong></span><a className="admin-site-link" href={chatGPTSignOutPath(path)} target="_top"><LogOut size={16} aria-hidden="true"/> Sign out</a></div>;
}
export function PortalFrame({role,heading,description,links,children,account}:{role:string;heading:string;description:string;links?:[string,string][];children:ReactNode;account?:{email:string;path:string}}){
 return <Frame><div className="wrap portal">
  <section className="portal-hero">
   <span className="eyebrow">{role} portal</span><h1>{heading}</h1><p>{description}</p>
   {account&&<PortalAccount {...account}/>}
   {links&&<nav aria-label={role+" dashboard sections"} className="portal-nav">{links.map(([id,label])=><a href={"#"+id} key={id}>{label}</a>)}</nav>}
  </section>{children}
 </div></Frame>;
}
const roleInfo:Record<string,string>={
 Student:"Use the email you applied with to see linked applications, payment status and course materials.",
 Faculty:"Use the account email your administrator registered for teaching assignments and course submissions.",
 Admin:"Use the site owner’s account to manage courses, batches, applications and permissions.",
 Staff:"Use the account your administrator invited. Your dashboard shows tools for your assigned role.",
};
export function PortalSignIn({role,path}:{role:string;path:string}){
 return <PortalFrame role={role} heading={role+" Portal"} description={roleInfo[role]??"Sign in to open your dashboard."}>
  <section className="panel formpanel portal-auth-panel"><div className="admin-icon"><KeyRound size={20} aria-hidden="true"/></div><h2>Sign in to the {role} Portal</h2><p>Your account is verified through ChatGPT. Access depends on your portal role.</p>
   <a className="btn primary" href={chatGPTSignInPath(path)} target="_top">Continue with ChatGPT <ArrowRight size={16} aria-hidden="true"/></a><a className="textlink" href="/help#sign-in">Need help signing in?</a>
  </section>
 </PortalFrame>;
}
export function PortalAccessDenied({role,path,email,children}:{role:string;path:string;email:string;children:ReactNode}){
 return <PortalFrame role={role} heading={role+" Portal"} description="This account does not have access to this portal." account={{email,path}}>
   <div className="panel formpanel portal-auth-panel"><h2>Check your account</h2>{children}<p>To use a different account, sign out above and sign in again.</p><a className="textlink" href="/help#sign-in">Get sign-in help</a></div>
 </PortalFrame>;
}
export function PortalNotice({message,ok}:{message?:string;ok:boolean}){
 return message?<p role={ok?"status":"alert"} className={ok?"success":"error"}>{message}</p>:null;
}
export function Stats({items}:{items:[string,string|number][]}){
 return <dl className="portal-stats">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
