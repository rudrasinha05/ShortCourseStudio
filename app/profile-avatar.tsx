import {UserRound} from "lucide-react";
export function ProfileAvatar({name,signedIn=true}:{name:string;signedIn?:boolean}){
 return signedIn?<img className="profile-avatar" src="/profile/photo" alt={name+" profile photo"} width={64} height={64}/>:<span className="profile-avatar profile-placeholder" aria-label="Default profile image"><UserRound size={28}/></span>;
}
