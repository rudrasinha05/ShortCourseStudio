// Renders organiser-written policy text. Blank lines separate paragraphs; single newlines stay as line breaks.
export function PolicyText({text}:{text:string}){
 const paragraphs=text.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
 return <>{paragraphs.map((p,i)=><p key={i} className="policy-paragraph">{p}</p>)}</>;
}
