export const adminSections=[
 {id:"overview",label:"Overview",description:"Key numbers and quick actions"},
 {id:"students",label:"Students",description:"Applications, payments and support"},
 {id:"courses",label:"Courses & batches",description:"Syllabus, admissions and batch settings"},
 {id:"classes",label:"Classes",description:"Timetable, recordings and materials"},
 {id:"faculty",label:"Faculty",description:"Profiles, course proposals and assignments"},
 {id:"website",label:"Website",description:"Homepage, banners and student messages"},
 {id:"reports",label:"Reports & access",description:"Reports, staff permissions and history"},
] as const;
export type AdminSection=typeof adminSections[number]["id"];
const anchors:Record<string,AdminSection>={
 "applications":"students","support-requests":"students",
 "enrollment-controls":"courses","batch-rules":"courses","catalogue-controls":"courses","course-management":"courses",
 "class-schedule":"classes","learning-materials":"classes",
 "faculty-directory":"faculty","faculty-proposals":"faculty","assignments":"faculty",
 "website-content":"website","notice-templates":"website","site-controls":"website","crash-banner":"website","course-banner":"website",
 "batch-reports":"reports","staff-access":"reports","change-history":"reports",
};
export const adminViews={
 students:[["applications","Applications"],["support","Support requests"]],
 courses:[["admissions","Open or close applications"],["batch","Fees, deadlines & batches"],["syllabus","Course details & syllabus"],["catalogue","Publish or hide courses"]],
 classes:[["schedule","Timetable & recordings"],["resources","Resources & assignments"]],
 faculty:[["directory","Directory & profiles"],["proposals","Course proposals"],["assignments","Batch assignments & income"]],
 website:[["content","Homepage & student dashboard"],["banners","Course banners"],["messages","Student messages"],["controls","Site-wide settings"]],
 reports:[["summary","Batch & fee reports"],["access","Staff access"],["audit","Change history"]],
} as const;
const anchorViews:Record<string,string>={
 "applications":"applications","support-requests":"support","enrollment-controls":"admissions","batch-rules":"batch",
 "catalogue-controls":"catalogue","course-management":"syllabus","class-schedule":"schedule","learning-materials":"resources",
 "faculty-directory":"directory","faculty-proposals":"proposals","assignments":"assignments",
 "website-content":"content","notice-templates":"messages","site-controls":"controls","crash-banner":"banners","course-banner":"banners",
 "batch-reports":"summary","staff-access":"access","change-history":"audit",
};
export function adminUrl(section:AdminSection,params:Record<string,string>={},anchor=""){
 const query=new URLSearchParams({...(section==="overview"?{}:{section}),...Object.fromEntries(Object.entries(params).filter(([,value])=>value))}).toString();
 return "/admin"+(query?"?"+query:"")+(anchor?"#"+anchor:"");
}
export const adminTarget=(anchor:string,params:Record<string,string>={})=>adminUrl(anchors[anchor]??"overview",{view:anchorViews[anchor]??"",...params},anchor);
export function resolveSection(section?:string,hasStudentFilters=false){
 return adminSections.find(s=>s.id===section)?.id??(hasStudentFilters?"students":"overview");
}
