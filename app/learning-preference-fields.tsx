import {TRACKS} from "@/lib/courses";
import {emptyLearningPreferences,skillLevels,type LearningPreferences} from "@/lib/learning-preferences";

export function LearningPreferenceFields({value=emptyLearningPreferences}:{value?:LearningPreferences}){
 return <>
  <fieldset className="interest-fields"><legend>Which topics interest you?</legend>
   <p className="admin-field-hint">Select any topics you want to learn. We use these and your skills to suggest courses.</p>
   <div className="interest-options">{TRACKS.map(track=><label className="check interest-option" key={track}><input type="checkbox" name="interests" value={track} defaultChecked={value.interests.includes(track)}/><span>{track}</span></label>)}</div>
  </fieldset>
  <label>What skills or tools do you already know? <span className="apply-optional">Optional</span><textarea name="skills" maxLength={400} rows={3} defaultValue={value.skills} placeholder="e.g. Python, Excel, basic SQL. Leave blank if you’re new."/></label>
  <label>How much experience do you have? <span className="apply-optional">Optional</span><select name="skillLevel" defaultValue={value.level}><option value="">Select your experience level</option>{skillLevels.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
 </>;
}
