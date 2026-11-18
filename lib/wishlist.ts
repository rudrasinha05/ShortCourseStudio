import {portalRoleHeader} from "./portal-session";
import {requestIdentity} from "./portals";
import {facultyTemplates} from "./faculty-templates";
import {applicationsStatus,intakeStatus,publicCatalogue,getCourses} from "./enrollment";
export const courseHref=(slug:string)=>(facultyTemplates.some(c=>c.slug===slug)?"/faculty-courses/":"/courses/")+slug;
export const wishlistCourseSummary=(c:Awaited<ReturnType<typeof getCourses>>[number])=>({slug:c.slug,title:c.title,track:c.track,href:courseHref(c.slug),status:applicationsStatus(intakeStatus(c))});
export async function wishlistCatalogue(){
 return publicCatalogue(await getCourses()).map(wishlistCourseSummary);
}

export const wishlistStudentIdentity=(headers:Pick<Headers,"get">)=>headers.get(portalRoleHeader)==="student"?requestIdentity(headers):null;
