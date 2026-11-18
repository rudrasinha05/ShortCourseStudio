import type {ReactNode} from "react";
import {ArrowRight} from "lucide-react";
import {WishlistButton} from "./wishlist-client";

export function WishlistCourseCard({slug,title,href,label,children,student,id}:{id?:string;student:boolean;slug:string;title:string;href:string;label:string;children:ReactNode}){
 return <article className="course wishlist-course-card" id={id} tabIndex={id?-1:undefined}>
  {children}
  <div className="cardbottom"><a href={href} aria-label={label+" for "+title}>{label} <ArrowRight size={15} aria-hidden="true"/></a><WishlistButton student={student} slug={slug} title={title}/></div>
 </article>;
}
