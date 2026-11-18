import type {ReactNode} from "react";
import {Frame,type PortalRole} from "./ui";
import {portalLoginPath} from "./site-auth";
import {ArrowRight,KeyRound,LogOut} from "lucide-react";

export function PortalAccount({email,facultyUsername}:{email:string;path:string;facultyUsername?:string}){
 return <div className="portal-account"><span>Signed in as <strong>{facultyUsername??email}</strong>{facultyUsername&&<> · {email}</>}</span><form action="/session/logout" method="post" target="_top"><button className="admin-site-link" type="submit"><LogOut size={16} aria-hidden="true"/> Sign out</button></form></div>;
}
export function PortalFrame({role,heading,description,links,children,account,signInPath}:{role:string;heading:string;description:string;links?:[string,string][];children:ReactNode;account?:{email:string;path:string};signInPath?:string}){
 const portalRole:PortalRole|undefined=role==="Student"||role==="Faculty"||role==="Admin"||role==="Staff"?role:undefined;
 return <Frame portalHeader={portalRole&&(signInPath||account)?{role:portalRole,path:account?.path??signInPath??"/",signedIn:!!account}:undefined}><div className="wrap portal">
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
 const student=role==="Student",faculty=role==="Faculty";
 const facultyLogin="/faculty/login"+(path.includes("?")?"?"+path.split("?")[1]:"");
 const description=student?"Use your Short Course Studio account to sign in as a student.":
  role==="Faculty"?"Sign in with your faculty account or create one using the email registered with your administrator.":
  role==="Admin"?"Only the registered site owner can sign in. Creating an account does not grant admin access.":
  "Sign in with a verified faculty account that your administrator approved for staff access.";
 return <PortalFrame role={role} heading={role+" Portal"} signInPath={path} description={roleInfo[role]??"Sign in to open your dashboard."}>
  <section id="portal-sign-in" className="panel formpanel portal-auth-panel"><div className="admin-icon"><KeyRound size={20} aria-hidden="true"/></div><h2>{student?"Sign in / Sign up":<>Sign in to the {role} Portal</>}</h2><p>{description}</p>
   <a className="btn primary" href={role==="Admin"?"/admin/login":faculty?facultyLogin:portalLoginPath(path)}>{role==="Admin"?"Admin sign in":"Sign in / Sign up"} <ArrowRight size={16} aria-hidden="true"/></a><a className="textlink" href="/help#sign-in">Need help signing in?</a>
  </section>
 </PortalFrame>;
}
export function PortalAccessDenied({role,path,email,children}:{role:string;path:string;email:string;children:ReactNode}){
 return <PortalFrame role={role} heading={role+" Portal"} description="This account does not have access to this portal." account={{email,path}}>
   <div className="panel formpanel portal-auth-panel"><h2>Check your account</h2>{children}<p>To use a different account, sign out above, then choose another account from the sign-in page.</p><a className="textlink" href="/help#sign-in">Get sign-in help</a></div>
 </PortalFrame>;
}
export function PortalNotice({message,ok}:{message?:string;ok:boolean}){
 return message?<p role={ok?"status":"alert"} className={ok?"success":"error"}>{message}</p>:null;
}
export function Stats({items}:{items:[string,string|number][]}){
 return <dl className="portal-stats">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
