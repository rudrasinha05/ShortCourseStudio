import {ArrowLeft,ArrowRight,Search} from "lucide-react";
import {getSiteContent} from "@/lib/admin-controls";
import {adminTarget,adminUrl} from "@/lib/admin-navigation";
import {contactDetails,directoryPageSize,getStudentHistory,listStudents} from "@/lib/admin-students";
import {hasClassAccess} from "@/lib/class-sessions";
import {cDayNumber} from "@/lib/courses";
import {canApply,getCourses,publicCatalogue} from "@/lib/enrollment";
import {reviewLabels} from "@/lib/form-workflows";
import {matchCourses,skillLevels} from "@/lib/learning-preferences";

type Course=Awaited<ReturnType<typeof getCourses>>[number];
export type DirectoryParams={student?:string;studentQ?:string;studentCourse?:string;studentStatus?:string;studentPage?:string};
const directory=(params:Record<string,string>={})=>adminUrl("students",{view:"roster",...params});
const shortDate=(date:string)=>new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(date));
const yearLabel=(year:string)=>year==="graduate"?"Graduated":year==="other"?"Other":year?"Year "+year:"Not provided";
const paymentLabel=(state:string)=>state==="paid"?"Paid":state==="test_paid"?"Test payment":"Not paid";
const displayDate=(date:string)=>Number.isFinite(Date.parse(date))?shortDate(date):"Not recorded";

export async function StudentDirectory({courses,params}:{courses:Course[];params:DirectoryParams}){
 const query=params.studentQ?.trim().slice(0,120)??"";
 const course=courses.find(c=>c.slug===params.studentCourse)?.slug??"";
 const status=params.studentStatus==="enrolled"||params.studentStatus==="not-enrolled"?params.studentStatus:"";
 const page=/^[1-9][0-9]{0,4}$/.test(params.studentPage??"")?Number(params.studentPage):1;
 const filters={studentQ:query,studentCourse:course,studentStatus:status};
 const listUrl=(target=page)=>directory({...filters,studentPage:target>1?String(target):""});
 if(params.student)return <StudentProfile courses={courses} reference={params.student} back={listUrl()}/>;
 const {rows,total}=await listStudents({search:query,course,status,page});
 const names=new Map(courses.map(c=>[c.slug,c.title]));
 return <section className="portal-section student-directory" aria-labelledby="student-directory-heading">
  <h2 id="student-directory-heading">Student directory</h2>
  <p>One row per application email. Open a student’s profile for their contact details and complete course history.</p>
  <form className="panel formpanel student-directory-filters" action="/admin" method="get">
   <input type="hidden" name="section" value="students"/><input type="hidden" name="view" value="roster"/>
   <label>Search students<input name="studentQ" maxLength={120} defaultValue={query} placeholder="Name, email, college or mobile"/></label>
   <label>Applied for course<select name="studentCourse" defaultValue={course}><option value="">All courses</option>{courses.map(c=><option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label>
   <label>Enrollment status<select name="studentStatus" defaultValue={status}><option value="">All students</option><option value="enrolled">Enrolled</option><option value="not-enrolled">Not enrolled yet</option></select></label>
   <div className="actions"><button className="btn primary"><Search size={15} aria-hidden="true"/> Search</button>{(query||course||status)&&<a className="textlink" href={directory()}>Clear filters</a>}</div>
  </form>
  {rows.length>0?<><p className="student-directory-count">Showing {(page-1)*directoryPageSize+1}–{(page-1)*directoryPageSize+rows.length} of {total} students</p>
   <div className="panel student-table-wrap" role="region" aria-label="Student directory table" tabIndex={0}><table className="student-table" aria-label="Students">
    <thead><tr><th scope="col">Student</th><th scope="col">Contact</th><th scope="col">College / programme</th><th scope="col">Applications</th><th scope="col">Enrolled courses</th><th scope="col">Last applied</th></tr></thead>
    <tbody>{rows.map(row=>{
     const details=contactDetails(row.form_answers);
     const link=directory({...filters,studentPage:page>1?String(page):"",student:row.id});
     const enrolled=row.course_title_slugs.split(",").filter(Boolean).map(slug=>names.get(slug)??slug);
     return <tr key={row.id}>
      <th scope="row"><a className="textlink student-profile-link" href={link}>{row.name}<ArrowRight size={15} aria-hidden="true"/></a></th>
      <td>{row.email}{details.phone&&<small>{details.phone}</small>}</td>
      <td>{row.college}{details.programme&&<small>{details.programme}</small>}</td>
      <td className="student-cell-count">{row.applications}</td>
      <td><strong>{row.enrollments}</strong><small>{enrolled.length?enrolled.slice(0,2).join(" · ")+(enrolled.length>2?" +"+(enrolled.length-2)+" more":""):"Not enrolled yet"}</small></td>
      <td>{displayDate(row.created_at)}</td>
     </tr>;
    })}</tbody>
   </table></div>
  </>:<p className="mutedbox">{page>1?"No students on this page.":query||course||status?"No students match these filters.":"Students will appear here once they submit an application."}</p>}
  <nav className="actions" aria-label="Student directory pages">{page>1&&<a className="btn secondary" href={listUrl(page-1)}>Previous page</a>}{total>page*directoryPageSize&&<a className="btn secondary" href={listUrl(page+1)}>Next page</a>}</nav>
 </section>;
}
async function StudentProfile({courses,reference,back}:{courses:Course[];reference:string;back:string}){
 const profile=await getStudentHistory(reference);
 if(!profile)return <section className="portal-section"><a className="textlink" href={back}>Back to student directory</a><p className="mutedbox">Student profile not found.</p></section>;
 const {student,rows,phone,programme,year,preferences}=profile;
 const names=new Map(courses.map(c=>[c.slug,c.title]));
 const enrolled=rows.filter(hasClassAccess);
 const pending=rows.filter(r=>r.review_state==="submitted"||r.review_state==="under_review").length;
 const content=preferences?await getSiteContent():null;
 const alreadyApplied=new Set(rows.filter(r=>r.review_state!=="declined").map(r=>r.slug));
 const matches=preferences?matchCourses(publicCatalogue(courses).filter(c=>!cDayNumber(c.slug)&&!alreadyApplied.has(c.slug)),preferences,content?.recommendations).slice(0,4):[];
 const term=skillLevels.find(([value])=>value===preferences?.level)?.[1];
 return <section className="portal-section student-directory" aria-labelledby="student-profile-heading">
  <a className="textlink student-profile-link" href={back}><ArrowLeft size={16} aria-hidden="true"/> Back to student directory</a>
  <div className="panel student-profile-card">
   <span className="eyebrow">STUDENT PROFILE</span><h2 id="student-profile-heading">{student.name}</h2>
   <p>{student.college}{programme?" · "+programme:""}</p>
   <dl className="student-profile-facts">
    <div><dt>Email</dt><dd>{student.email}</dd></div><div><dt>Mobile</dt><dd>{phone||"Not provided"}</dd></div>
    <div><dt>Year or status</dt><dd>{yearLabel(year)}</dd></div><div><dt>Interests</dt><dd>{preferences?.interests.join(", ")||"Not provided"}</dd></div>
    <div><dt>Skills</dt><dd>{preferences?.skills||"Not provided"}</dd></div><div><dt>Experience level</dt><dd>{term||"Not provided"}</dd></div>
   </dl>
  </div>
  <dl className="student-profile-metrics"><div><dt>Applications</dt><dd>{rows.length}</dd></div><div><dt>Confirmed enrollments</dt><dd>{enrolled.length}</dd></div><div><dt>Awaiting review</dt><dd>{pending}</dd></div></dl>
  <section className="student-profile-history">
   <h3>Course history</h3><p>Submitted or accepted applications are shown separately from confirmed enrollment.</p>
   <div className="panel student-table-wrap" role="region" aria-label="Course history table" tabIndex={0}><table className="student-table student-history-table" aria-label="Student course history">
    <thead><tr><th scope="col">Course &amp; batch</th><th scope="col">Application status</th><th scope="col">Payment</th><th scope="col">Enrollment</th><th scope="col">Applied on</th><th scope="col">Details</th></tr></thead>
    <tbody>{rows.map(row=><tr key={row.id}><th scope="row">{names.get(row.slug)??row.slug}<small>{row.batch}</small></th><td>{reviewLabels[row.review_state]??row.review_state}</td><td>{paymentLabel(row.payment_state)}</td>
     <td><span className="student-enrollment" data-enrolled={hasClassAccess(row)||undefined}>{hasClassAccess(row)?"Enrolled":row.review_state==="declined"?"Not enrolled":"Not confirmed"}</span></td><td>{displayDate(row.created_at)}</td>
     <td><a className="textlink" href={adminTarget("applications",{q:row.id})} aria-label={"Review application "+row.id}>Review</a><small>{row.id}</small></td></tr>)}</tbody>
   </table></div>
  </section>
  <section className="panel student-profile-card"><h3>Suggested courses to share</h3>
   <p>Based on the student’s interests and skills. These suggestions are for follow-up, not enrollments.</p>
   {matches.length?<ul className="portal-checklist">{matches.map(({course,reasons})=><li key={course.slug}><a className="textlink" href={"/courses/"+course.slug}>{course.title}</a><small>{canApply(course)?"Applications open":"Batch not open"} · {reasons.join(" · ")}</small></li>)}</ul>:<p className="mutedbox">No matching courses yet. Suggestions appear when there are relevant interests or skills and a matching course.</p>}
  </section>
 </section>;
}
