import type {Course} from "./courses";
export const SITE_NAME = "Short Course Studio";
export const POWERED_BY = "Powered by GL Bajaj";
export const INSTITUTE = "GL Bajaj Institute of Technology & Management";
export const DEPARTMENT = "Department of Computer Science and Engineering (Artificial Intelligence)";
export const CAREER_DEPARTMENT = "Career Development Center";
export const CAREER_DEPARTMENT_URL = "https://www.glbitm.org/training-placements/cdc-overview/57/298/317/";
export const CAREER_DEPARTMENT_ABOUT = "GL Bajaj’s Career Development Centre helps students build career readiness throughout their degree. Its training covers aptitude, technical and emerging skills, communication and interview preparation to help students move from classroom learning to industry opportunities.";
export const DEPARTMENT_URL = "https://www.glbitm.org/cse-artificial-intelligence/";
export const DEPARTMENT_ABOUT = "The department combines core computer science with artificial intelligence. This proposed short-term training series pairs classroom concepts with guided labs and a final project.";
export const pythonDetails = {
 lecture:[
  "Notebook workflow, variables, data types, lists, dictionaries and simple functions for working with records.",
  "DataFrame structure, CSV import, column selection, filtering, sorting and basic aggregation.",
  "Missing-value decisions, duplicates, date parsing and checks for consistent data types.",
  "Group-by summaries, time trends, chart selection, labels and misleading comparisons.",
  "An end-to-end analysis workflow, how to justify data decisions and how to communicate findings."
 ],
 practical:[
  "Start a Google Colab notebook, explore a sales sample and compute revenue using quantity and unit price.",
  "Load the sales CSV with pandas, filter by date or category and verify a summary against a hand calculation.",
  "Clean missing entries, remove duplicate records, parse dates and report row counts before and after.",
  "Create a sales trend chart and a top-products bar chart. Write a short interpretation for each.",
  "Submit a reproducible notebook with cleaned data, charts and three evidence-backed findings, then explain one limitation."
 ],
 evidence:["Exploration notebook and revenue calculation","Checked CSV summary","Cleaned dataset and cleaning log","Two labelled charts with commentary","Final Colab notebook and project walkthrough"],
 objectives:["Load, inspect and summarise CSV data with Python and pandas.","Apply and explain reproducible rules for cleaning real-world records.","Build appropriate charts and communicate three findings supported by the data."]
};
export function courseBrief(c:Course){
 const isPython=c.slug==="python-for-data-analytics";
 return {
  audience:c.track==="Data Analytics"?"Undergraduate students interested in data analysis, statistics or AI.":"Undergraduate engineering and computing students looking for applied practice in "+c.track+".",
  prerequisite:c.level==="Beginner"?"No prior experience in this topic is required. Bring a laptop with a current browser and internet access.":c.level+". Bring a laptop with a current browser and internet access.",
  objectives:c.objectives??(isPython?pythonDetails.objectives:[
   "Explain and apply the core concepts covered in the first two sessions.",
   "Use the course tools to complete the guided exercises and verify their results.",
   "Produce and explain the final project, including an assumption, limitation or design trade-off."
  ]),
  resources:"Guided exercises and a project brief. Tool setup instructions will be shared with the batch announcement.",
 };
}
