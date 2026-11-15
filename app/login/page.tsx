import {chatGPTSignInPath,getChatGPTUser,portalReturnPath} from "../chatgpt-auth";
import {PortalAccount,PortalSignIn} from "../portal-ui";
import {Frame} from "../ui";

export const dynamic="force-dynamic";
export const metadata={title:"Sign in / Sign up",robots:{index:false,follow:false}};

export default async function LoginPage({searchParams}:{searchParams:Promise<{return_to?:string|string[]}>}){
 const params=await searchParams;
 const path=portalReturnPath(typeof params.return_to==="string"?params.return_to:"/student");
 const pathname=new URL(path,"https://app.local").pathname;
 const role=pathname==="/admin"?"Admin":pathname==="/faculty"?"Faculty":pathname==="/staff"?"Staff":"Student";
 const user=await getChatGPTUser();
 if(!user)return <PortalSignIn role={role} path={path}/>;
 return <Frame><section className="wrap portal prose"><div className="panel formpanel portal-auth-panel">
  <span className="eyebrow">WELCOME BACK</span><h1>Sign in / Sign up</h1>
  <PortalAccount email={user.email} path={path}/>
  <p>Your account is currently signed in. Continue below, or sign out to return to the course catalogue.</p>
  <a className="btn primary" href={path} target="_top">{pathname==="/profile"?"Open my profile":pathname==="/apply"?"Continue application":"Open "+role+" Portal"}</a>
  <a className="textlink" href={chatGPTSignInPath(path)} target="_top">Continue with ChatGPT</a>
 </div></section></Frame>;
}
