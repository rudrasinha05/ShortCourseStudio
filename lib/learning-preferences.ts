import {z} from "zod";
import {TRACKS,type Course,type Track} from "./courses";

export const skillLevels=[
 ["starting","Just getting started"],
 ["foundations","Know the basics"],
 ["practiced","Have built projects / practiced regularly"],
] as const;
export const learningPreferencesSchema=z.object({
 interests:z.array(z.enum(TRACKS)).max(TRACKS.length).transform(v=>[...new Set(v)]).default([]),
 skills:z.string().trim().max(400).default(""),
 level:z.union([z.enum(["starting","foundations","practiced"]),z.literal("")]).default(""),
});
export type LearningPreferences=z.infer<typeof learningPreferencesSchema>;
export const emptyLearningPreferences:LearningPreferences={interests:[],skills:"",level:""};
export function preferencesFromForm(form:Pick<FormData,"get"|"getAll">){
 return {
  interests:form.getAll("interests"),
  skills:form.get("skills")??"",
  level:form.get("skillLevel")??"",
 };
}
export function readLearningPreferences(raw:string|null|undefined,fromApplication=false):LearningPreferences|null{
 try{
  const data=JSON.parse(raw||"null");
  const parsed=learningPreferencesSchema.safeParse(fromApplication?data?.details?.preferences:data);
  return parsed.success?parsed.data:null;
 }catch{return null;}
}

const skills=[
 ["Python",/\b(?:python|pandas|numpy|colab)\b/],
 ["Excel / spreadsheets",/\b(?:excel|spreadsheets?|google sheets)\b/],
 ["SQL",/\b(?:sql|sqlite|postgres(?:ql)?|mysql|t[- ]sql)\b/],
 ["Databases",/\b(?:dbms|databases?|relational|normalis[ae]\w*|normaliz[ae]\w*)\b/],
 ["Statistics",/\b(?:statistics|statistical|a\/b test(?:ing)?|regression)\b/],
 ["Probability",/\b(?:probability|stochastic|bayesian|bayes)\b/],
 ["Machine learning",/\b(?:machine learning|ai\/ml|scikit.learn|sklearn|ml)\b/],
 ["Deep learning",/\b(?:deep learning|neural network\w*|pytorch|tensorflow)\b/],
 ["C programming",/\b(?:c programming|programming in c|clang|gcc|c17)\b|(?:^|,\s*|;\s*)c(?:$|[,;])/],
 ["Data structures",/\b(?:dsa|data structures?|linked lists?|sorting algorithms?)\b/],
 ["Networking",/\b(?:networks?|networking|subnet\w*|routing|vlans?|tcp\/ip|packet tracer|wireshark)\b/],
 ["Digital logic",/\b(?:digital logic|logisim|cpu datapath|logic gates)\b/],
 ["Assembly language",/\b(?:assembly|risc-v|riscv|mips)\b/],
 ["Automata and grammars",/\b(?:automata|grammars?|regular expressions?|regex|finite state|turing)\b/],
] as const;
type ReadyCourse=Course&{status:string;intakeConstraint?:string|null;visibility?:string};
const beginnerSlugs=new Set(["python-for-data-analytics","probability-for-data-analytics","statistics-for-data-analytics","dbms","computer-networks","coa","toc-finite-automata","c-by-horesh-sir"]);
const sortLevel=(course:Course)=>{
 if(beginnerSlugs.has(course.slug)||/^(?:beginner|introductory|no prior|none)/i.test(course.level))return 0;
 if(course.exclusive||/^(?:advanced|intensive)/i.test(course.level))return 2;
 return 1;
};
export function matchCourses<T extends ReadyCourse>(courses:T[],preferences:LearningPreferences,preferredSlugs:string[]=[]){
 const stated=preferences.skills.normalize("NFKC").toLowerCase();
 const known=skills.filter(([,pattern])=>pattern.test(stated));
 const requested=new Set<Track>(preferences.interests);
 const level=skillLevels.findIndex(([id])=>id===preferences.level);
 return courses.flatMap(course=>{
  if(course.status==="closed"||course.intakeConstraint||course.visibility&&course.visibility!=="published")return [];
  const content=[course.track,course.title,course.tools,course.blurb,course.level,...course.days.map(([topic])=>topic)].join(" ").normalize("NFKC").toLowerCase();
  const overlap=known.filter(([,pattern])=>pattern.test(content)).map(([label])=>label);
  const interest=requested.has(course.track);
  if(!interest&&!overlap.length)return [];
  const difficulty=sortLevel(course);
  const score=(interest?12:0)+Math.min(overlap.length,3)*4+(level<0?0:3-Math.abs(level-difficulty)*3);
  const reasons=[...(interest?["Interest: "+course.track]:[]),...(overlap.length?["Connects with your skills: "+overlap.slice(0,3).join(", ")]:[])];
  if(level===0&&difficulty===0)reasons.push("Beginner-friendly starting point");
  return [{course,reasons,score}];
 }).sort((a,b)=>{
  const priority=(slug:string)=>{const i=preferredSlugs.indexOf(slug);return i<0?999:i;};
  return b.score-a.score||priority(a.course.slug)-priority(b.course.slug)||a.course.title.localeCompare(b.course.title);
 });
}
