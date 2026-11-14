import {notFound} from "next/navigation";
import CoursePage,{generateMetadata} from "../../courses/[slug]/page";
import {facultyTemplates} from "@/lib/faculty-templates";

export {generateMetadata};
export const dynamic="force-dynamic";
export default async function FacultyCourse({params}:{params:Promise<{slug:string}>}) {
 const slug=(await params).slug;
 if(!facultyTemplates.some(course=>course.slug===slug))notFound();
 return <CoursePage params={params}/>;
}
