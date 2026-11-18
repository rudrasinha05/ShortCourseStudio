import type {ReactNode} from "react";
import {ArrowLeft,KeyRound,type LucideIcon} from "lucide-react";
import {Frame,type PortalRole} from "./ui";

type Intro={heading:string;description:string;icon:LucideIcon;tasks:readonly (readonly [LucideIcon,string,string])[]};
export function PortalLoginShell({role,path,backHref,intro,label,children}:{role:PortalRole|"Staff";path:string;backHref:string;intro:Intro;label:string;children:ReactNode}){
 const Icon=intro.icon;
 return <Frame portalHeader={{role,path,signedIn:false}}><div className="wrap admin-login-shell">
  <a className="textlink admin-login-back" href={backHref}><ArrowLeft size={16} aria-hidden="true"/> {role} Portal</a>
  <section className="admin-login-panel" id="portal-sign-in">
   <div className="admin-login-intro">
    <div className="admin-login-mark"><Icon size={25} aria-hidden="true"/></div>
    <p className="eyebrow">Short Course Studio</p>
    <h2>{intro.heading}</h2><p>{intro.description}</p>
    <ul>{intro.tasks.map(([TaskIcon,title,description])=><li key={title}><span><TaskIcon size={19} aria-hidden="true"/></span><div><strong>{title}</strong><small>{description}</small></div></li>)}</ul>
   </div>
   <div className="admin-login-main">
    <p className="eyebrow admin-login-lock"><KeyRound size={14} aria-hidden="true"/> {label}</p>
    {children}
   </div>
  </section>
 </div></Frame>;
}
