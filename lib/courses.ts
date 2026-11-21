import {facultyTemplates} from "./faculty-templates";

export type Day = [topic: string, practical: string];
export const TRACKS = ["C Programming","Data Analytics","Database Management Systems","Computer Networks","Computer Organisation & Architecture","Theory of Computation"] as const;
export type Track = typeof TRACKS[number];
export const TRACK_DETAILS: Record<Track,{id:string;tag:string;label:string;description:string}> = {
 "Data Analytics":{id:"data-analytics",tag:"DA",label:"Data Analytics",description:"Analyse data with Python, probability, statistics, machine learning and deep learning."},
 "Database Management Systems":{id:"dbms",tag:"DB",label:"DBMS",description:"Design relational databases, write reports, tune queries and build data pipelines."},
 "Computer Networks":{id:"networks",tag:"CN",label:"Computer Networks",description:"Plan networks, configure switching and routing, and troubleshoot in a simulator."},
 "Computer Organisation & Architecture":{id:"coa",tag:"CA",label:"COA",description:"Explore the datapath, assembly language, arithmetic, memory and processor performance."},
 "Theory of Computation":{id:"toc",tag:"TC",label:"TOC",description:"Build automata, design grammars and examine what machines can compute."},
 "C Programming":{id:"c-programming",tag:"C",label:"C Programming",description:"Build tested C programs, from control flow and strings to memory management, file handling and data structures."}
};
export type Course = { slug: string; track: Track; title: string; blurb: string; outcome: string; level: string; tools: string; days: Day[]; objectives?:string[]; instructor?:string; exclusive?:true };
export const FEE = 2500;
export const PAISE = FEE * 100;
const [,a,d,n,c,t]=TRACKS;
const core: Course[] = [
{slug:"python-for-data-analytics",track:a,title:"Python for Data Analytics",blurb:"Turn a raw sales dataset into a project you can show. Build charts, explain what you found and get live feedback.",outcome:"A Colab analysis notebook with charts and three explained findings.",level:"Beginner",tools:"Google Colab, Python, pandas, Matplotlib",days:[
["Start with Python","Open Colab and explore a sample sales dataset."],
["Work with CSV files","Load, filter and summarise data with pandas."],
["Clean messy data","Fix missing values, duplicates and inconsistent dates."],
["Make charts that tell a story","Compare sales trends and top products."],
["Build and present a mini-project","Submit a notebook and explain three findings."]]},
{slug:"probability-for-data-analytics",track:a,title:"Probability for Data Analytics",blurb:"Use simulations to make sense of uncertainty and reason about outcomes before you have all the answers.",outcome:"A simulation notebook comparing an analytical probability with experimental results.",level:"Beginner",tools:"Google Colab, Python, NumPy",days:[
["Events and sample spaces","Simulate dice and coin outcomes and compare frequencies with theory."],
["Conditional probability and independence","Use a two-way table to compare marginal and conditional probabilities."],
["Bayes’ theorem","Build a screening example and explore how base rates affect a positive result."],
["Random variables and distributions","Simulate binomial and normal variables and compare their shapes."],
["Mini-project: make a decision under uncertainty","Model a stockout scenario and explain the sensitivity to assumptions."]]},
{slug:"statistics-for-data-analytics",track:a,title:"Statistics for Data Analytics",blurb:"Move from describing data to drawing conclusions you can defend.",outcome:"An A/B analysis report with an effect estimate, confidence interval and recommendation.",level:"Beginner",tools:"Google Colab, pandas, SciPy",days:[
["Descriptive statistics","Profile a dataset with measures of centre, spread and plots."],
["Samples and sampling variability","Resample data to see how estimates change with sample size."],
["Estimation and confidence intervals","Compute an interval and interpret it in plain language."],
["Hypothesis testing and effect size","Compare two groups and separate significance from practical impact."],
["Mini-project: analyse an A/B test","Report the effect, uncertainty and an action recommendation."]]},
{slug:"ai-ml-for-data-analytics",track:a,title:"AI and ML for Data Analytics",blurb:"Build and evaluate a first machine-learning model with a workflow you can explain.",outcome:"A reproducible prediction notebook with a baseline, model comparison and error analysis.",level:"Basic Python helpful",tools:"Google Colab, pandas, scikit-learn",days:[
["Frame an ML problem","Define the prediction target, metric and a simple baseline."],
["Prepare data without leakage","Create a train/test split and build a preprocessing pipeline."],
["Train supervised models","Fit logistic regression and a decision tree on the same training data."],
["Evaluate and interpret models","Compare precision, recall and confusion matrices and examine errors."],
["Mini-project: customer churn","Present the strongest model, its limitations and a practical recommendation."]]},
{slug:"deep-learning-for-data-analytics",track:a,title:"Deep Learning for Data Analytics",blurb:"Train a small neural network and learn to recognise when it is overfitting.",outcome:"A neural-network notebook with learning curves and a comparison to a simple baseline.",level:"Basic Python and ML helpful",tools:"Google Colab, NumPy, TensorFlow/Keras",days:[
["Neurons, layers and activations","Build a tiny dense network and inspect inputs and outputs."],
["Training, losses and optimisation","Train a classifier and compare learning rates with learning curves."],
["Validation and regularisation","Diagnose overfitting and try dropout or early stopping."],
["Feature representations and comparison","Compare a neural model with a simpler baseline on held-out data."],
["Mini-project: prediction with a neural network","Summarise performance, errors and when the simpler model is enough."]]},
{slug:"dbms",track:d,title:"Database Design & SQL Foundations",blurb:"Design a relational database and answer real questions with SQL.",outcome:"A working database schema, sample data and a reusable SQL query set.",level:"Beginner",tools:"SQLite and a browser or local SQL editor",days:[
["Relational models and ER diagrams","Turn a library scenario into entities, relationships and keys."],
["SQL foundations","Create tables and write SELECT, WHERE and ORDER BY queries."],
["Joins and aggregations","Combine tables and build grouped summary reports."],
["Normalisation, indexes and transactions","Refactor a redundant schema and inspect an indexed query."],
["Mini-project: library database","Submit the schema and queries that answer five operational questions."]]},
{slug:"computer-networks",track:n,title:"Networking Fundamentals",blurb:"Follow a packet from a laptop to a service and learn to diagnose routine connectivity issues.",outcome:"A small simulated network and a troubleshooting worksheet.",level:"Beginner",tools:"Packet Tracer or equivalent network simulator",days:[
["Network layers and addressing","Draw a small LAN and trace encapsulation through the layers."],
["IPv4 and subnetting","Split an address block and assign addresses to two networks."],
["Switching and routing","Connect two LANs in a simulator and verify connectivity."],
["TCP, UDP, DNS and HTTP","Inspect provided example traffic and explain the role of each protocol."],
["Mini-project: design a campus lab network","Build a network in the simulator and document how you verified it."]]},
{slug:"coa",track:c,title:"Digital Logic & CPU Datapath",blurb:"Trace how a computer executes instructions and see what affects performance.",outcome:"A small processor or datapath simulation with an annotated instruction trace.",level:"Beginner",tools:"Logisim Evolution or equivalent simulator",days:[
["Data representation and logic","Convert number formats and build a binary adder."],
["ALU and instruction formats","Wire a small ALU and decode sample instructions."],
["Datapath and control","Trace the fetch–decode–execute cycle in a simulator."],
["Memory hierarchy and pipelining","Compare cache hits and misses and identify a pipeline hazard."],
["Mini-project: instruction execution","Demonstrate a short instruction sequence and explain timing trade-offs."]]},
];
const advanced=(track:Track,slug:string,title:string,blurb:string,outcome:string,level:string,tools:string,days:Day[]):Course=>({track,slug,title,blurb,outcome,level,tools,days});
const additional:Course[]=[
advanced(d,"intermediate-sql","Intermediate SQL & Reporting","Use joins, CTEs and window functions to answer reporting questions without losing track of row counts.","A tested SQL reporting pack with five queries and expected results.","Basic SELECT and JOIN","SQLite or PostgreSQL with a local SQL editor",[
["Join grain and NULLs","Compare INNER and LEFT JOIN results against a hand-checked customer and order sample."],
["Grouping and conditional aggregates","Produce a monthly KPI summary and reconcile it against raw totals."],
["Subqueries and CTEs","Refactor a multi-step report into named stages and validate each result."],
["Window functions","Compute running totals and rank products within regions, handling ties explicitly."],
["Reporting mini-project","Deliver five documented retail queries and verify them on edge cases."]]),
advanced(d,"database-modeling","ER Modelling & Normalisation","Translate business rules into a relational model and remove avoidable update anomalies.","An ER diagram, a 3NF schema and sample inserts that demonstrate constraints.","Beginner","diagrams.net, SQLite",[
["Requirements and cardinality","Annotate enrolment rules and sketch entities, relationships and cardinalities."],
["Keys and dependencies","Identify candidate keys and functional dependencies in a flat enrolment sheet."],
["Normal forms","Decompose the sheet through 1NF, 2NF and 3NF and show a corrected update anomaly."],
["Mapping diagrams to SQL","Implement primary, foreign and unique constraints and test valid and invalid rows."],
["Schema design mini-project","Submit a course-registration schema, test cases and rationale for one design decision."]]),
advanced(d,"database-performance","Transactions, Indexes & Query Plans","Diagnose slow reads and reason about concurrent updates with a local database.","A before/after query-plan comparison and a reproducible transaction lab.","Working SQL knowledge","PostgreSQL or SQLite in a local lab",[
["Query plans and cost","Read EXPLAIN output and compare a scan with a filtered lookup."],
["Index selection","Compare single and composite indexes on seeded data and explain a non-beneficial index."],
["ACID and rollback","Demonstrate commit and rollback with a two-table inventory update."],
["Isolation and concurrent work","Use two local sessions to observe blocking or snapshot behaviour."],
["Performance mini-project","Tune one report, validate unchanged results and document a write-cost trade-off."]]),
advanced(d,"data-warehousing","Data Warehousing & ETL","Build an analytics-ready model by turning source extracts into a small star schema.","A repeatable ETL script, star schema and validation report.","Basic SQL and Python helpful","Python, pandas, SQLite",[
["Fact tables, dimensions and grain","Define daily line-item grain and sketch a sales star schema."],
["Extract and profile source data","Inspect two CSV extracts for duplicate keys, missing values and inconsistent types."],
["Transform and reconcile","Standardise dimensions, resolve duplicates and reconcile totals against the source."],
["Load and validate","Load facts and dimensions in dependency order and test repeatability on rerun."],
["Warehouse mini-project","Run the pipeline and answer three business questions using the loaded model."]]),
advanced(n,"ip-subnetting-routing","IP Addressing, Subnetting & Routing","Design a small routed network and verify each path in a simulator.","An address plan, routing table and working multi-LAN simulation.","Basic networking concepts helpful","Packet Tracer or equivalent simulator",[
["IPv4, prefixes and host ranges","Calculate network, broadcast and usable host ranges for sample prefixes."],
["VLSM planning","Divide a parent block into networks of different sizes without overlaps."],
["Static routes and gateways","Configure two routers in the simulator and trace forwarding between LANs."],
["Route selection and troubleshooting","Compare route specificity and fix a missing route in the lab."],
["Routing mini-project","Submit an address plan and prove reachability with a verification matrix."]]),
advanced(n,"switching-vlans","Switching, VLANs & Campus LANs","Build logically separate networks over shared switching infrastructure.","A simulated VLAN deployment with an annotated topology and verification matrix.","Basic LAN and IP addressing concepts","Packet Tracer or equivalent simulator",[
["MAC learning and forwarding","Observe how a switch learns addresses as simulated hosts exchange traffic."],
["Access VLANs and port membership","Assign lab and administration hosts to separate VLANs and verify isolation."],
["Trunk links","Carry two VLANs between switches and document tag and port settings."],
["Inter-VLAN routing","Configure a simulated gateway and compare reachability before and after routing."],
["Campus LAN mini-project","Build and document a multi-switch lab network with validation tests."]]),
advanced(n,"transport-application-protocols","TCP/IP, DNS & HTTP","Read routine protocol traces and explain how a request reaches a service.","An annotated DNS, TCP and HTTP trace with a short troubleshooting explanation.","Basic networking concepts","Wireshark with provided captures or equivalent simulator",[
["Protocol layers and socket endpoints","Map IP addresses, ports and protocols in a provided trace."],
["TCP lifecycle and reliability","Annotate a handshake, acknowledgements and a retransmission in a sample capture."],
["UDP and DNS","Follow a sample DNS lookup and compare it with a TCP conversation."],
["HTTP request and response","Read status codes, headers and a redirect in a supplied trace."],
["Protocol analysis mini-project","Explain the sequence from name lookup to response and isolate a sample failure."]]),
advanced(n,"network-troubleshooting","Network Troubleshooting Lab","Build a repeatable method for diagnosing connectivity faults in a controlled lab.","A working network plus a fault log, diagnostic evidence and a troubleshooting checklist.","IP addressing and basic routing helpful","Packet Tracer and provided lab traces",[
["Fault isolation by layer","Record expected paths and establish a known-good network baseline."],
["Address and gateway checks","Identify and fix an incorrect prefix and gateway in simulated hosts."],
["Switching and routing checks","Trace a broken link, VLAN mismatch or missing route in the lab."],
["Name resolution and application checks","Separate a supplied DNS failure from an HTTP service failure."],
["Troubleshooting mini-project","Diagnose seeded faults and write a handoff log with evidence for each fix."]]),
advanced(c,"computer-arithmetic","Number Systems & Computer Arithmetic","Understand how machine representations affect arithmetic and overflow.","An arithmetic circuit or simulator worksheet with signed and unsigned test vectors.","Beginner","Logisim Evolution or equivalent",[
["Binary, octal and hexadecimal","Convert values and verify bit-width limits with a small simulator."],
["Signed representation and overflow","Compare sign-magnitude and two’s complement and flag overflow cases."],
["Adders, subtractors and flags","Build a ripple-carry adder and verify carry, zero and overflow outputs."],
["Multiplication and fixed-point scaling","Trace shift-and-add and compare fixed-point rounding errors."],
["Arithmetic mini-project","Demonstrate a configurable arithmetic unit against a documented test table."]]),
advanced(c,"assembly-isa","Instruction Sets & Assembly Programming","Connect assembly instructions with registers, memory and control flow.","A short assembly program with an annotated register and memory trace.","Binary basics helpful","RARS or another RISC-V simulator",[
["Registers and instruction formats","Decode example instructions and predict register changes."],
["Loads, stores and addressing","Read and write a small array while tracing effective addresses."],
["Branches and loops","Write a loop and test empty and non-empty input."],
["Procedures and the stack","Trace calls, returns and saved registers in a small routine."],
["Assembly mini-project","Implement array statistics and show that the program passes boundary cases."]]),
advanced(c,"memory-cache","Memory Hierarchy & Cache Design","Use small traces to explain why memory access patterns affect performance.","A cache simulation notebook and a comparison of two mapping policies.","Binary and basic architecture concepts","Python or a cache simulator",[
["Memory hierarchy and locality","Compare sequential and strided memory references on a small trace."],
["Cache address fields","Split addresses into tag, index and offset and identify hits and misses."],
["Mapping and associativity","Replay the same trace using direct-mapped and set-associative designs."],
["Replacement, writes and latency","Compare two replacement strategies and compute average access time."],
["Cache mini-project","Recommend a configuration for a workload and justify it with trace results."]]),
advanced(c,"pipelining-io","Pipelining, I/O & Performance","Explain timing, hazards and data transfer using small worked examples.","An instruction timing diagram and a short performance report.","CPU datapath fundamentals helpful","Spreadsheet or processor simulator",[
["Clock cycles, CPI and throughput","Calculate execution time and distinguish latency from throughput."],
["Pipeline stages and overlap","Draw an instruction timing chart and compare against sequential execution."],
["Pipeline hazards","Compare stalls and forwarding on the same instruction sequence."],
["Interrupts, polling and DMA","Trace an I/O transfer and compare illustrative CPU overhead."],
["Performance mini-project","Identify the bottleneck in a supplied workload and quantify one improvement."]]),
advanced(t,"toc-finite-automata","Finite Automata & Regular Languages","Translate language rules into state machines and test them on edge cases.","A finite-state model with an acceptance test suite.","Basic set notation helpful","JFLAP or equivalent simulator",[
["Alphabets, strings and languages","Write language specifications and classify sample strings."],
["Deterministic finite automata","Build a DFA for a simple pattern and trace accepted and rejected inputs."],
["NFA and epsilon transitions","Model the same pattern with an NFA and trace possible paths."],
["Subset construction and minimisation","Convert an NFA and reduce equivalent states in the resulting DFA."],
["Automata mini-project","Deliver a tested recogniser for a small input specification."]]),
advanced(t,"toc-regex","Regular Expressions & Language Properties","Link regular expressions to automata and reason about the limits of regular languages.","A regular expression, equivalent automaton and a short proof for a non-regular example.","Finite automata basics","JFLAP and Python for test cases",[
["Regular-expression operators","Build expressions using union, concatenation and repetition."],
["Expressions to automata","Convert a small expression to an epsilon-NFA and verify its accepted examples."],
["Closure and product constructions","Build a product machine for intersection and test boundary strings."],
["Pumping lemma and limitations","Work through why equal-count strings require more than a finite automaton."],
["Language design mini-project","Submit a tested regular recogniser and explain a related non-regular requirement."]]),
advanced(t,"toc-cfg","Context-Free Grammars & Parsing","Specify nested structure with grammars and explain how a parse is constructed.","A grammar for a small expression language, parse trees and a test set.","Basic language notation helpful","JFLAP or a small parser notebook",[
["Productions and derivations","Generate strings and compare leftmost and rightmost derivations."],
["Parse trees and ambiguity","Show two parses for an ambiguous expression and rewrite for precedence."],
["Grammar simplification and normal forms","Remove selected redundant rules and normalise a small grammar."],
["Parsing and recognition","Trace a simple parser on valid and invalid inputs."],
["Grammar mini-project","Design a grammar for arithmetic expressions and demonstrate precedence in tests."]]),
advanced(t,"toc-pda","Pushdown Automata & Context-Free Languages","Model stack-based recognition for nested input and connect it with grammars.","A simulated PDA with documented stack traces and acceptance tests.","Context-free grammars helpful","JFLAP or equivalent simulator",[
["Stacks and transition notation","Trace push and pop operations on short input strings."],
["PDA design","Build a recogniser for balanced parentheses and check malformed input."],
["Acceptance by final state or empty stack","Compare the two acceptance conventions with trace examples."],
["From CFG to PDA","Convert a small grammar and verify it recognises the intended strings."],
["PDA mini-project","Model a nested-delimiter language and document positive and negative test cases."]]),
advanced(t,"toc-computability","Turing Machines & Computability","Distinguish what a machine can recognise from what it can decide.","A small Turing machine simulation and an explanation of a decidability limit.","Finite automata and language notation helpful","JFLAP or equivalent simulator",[
["Tapes, configurations and transitions","Trace a machine step by step on a sample tape."],
["Designing Turing machines","Build a machine for a simple unary computation and test edge cases."],
["Recognisers and deciders","Compare acceptance, rejection and non-termination in example machines."],
["Reductions and undecidability","Walk through the logic of a reduction and explain the halting problem."],
["Computability mini-project","Demonstrate a tested decider and explain a contrasting undecidable problem."]])
];
const cTools="GCC or Clang (C17), a code editor and a terminal";
const cProgramming:Course[]=[
 {...advanced("C Programming","c-programming-foundations","C Programming Foundations","Go from your first compile to a menu-driven program with clean functions and input checks.","A command-line grade calculator with a test table for invalid inputs and boundary scores.","Beginner",cTools,[
 ["Types, expressions and compilation","Compile a temperature converter with warnings enabled and check integer versus floating-point division."],
 ["Input validation and decisions","Read a line with fgets, convert it with strtol and handle invalid values before grading boundary scores."],
 ["Loops and menu design","Build a retryable menu and test its quit, repeat and unknown-command paths."],
 ["Functions and scope","Split validation, grading and display into small functions and test each one."],
 ["Mini-project: grade calculator","Deliver a menu-driven calculator, a build command and tests for empty, malformed and boundary inputs."]
 ]),objectives:["Compile and diagnose a C17 program with compiler warnings enabled.","Validate numeric input before branching or looping.","Split a menu-driven program into reusable functions."]},
 {...advanced("C Programming","c-arrays-and-strings","Arrays & Strings in C","Work with collections and text while keeping array bounds and string termination explicit.","A text analyser that reports line, word and character counts, with a test set for empty and long inputs.","Basic C loops and functions",cTools,[
 ["Arrays, indexing and bounds","Compute min, max and mean for sample readings, including zero and one-element cases."],
 ["Matrices and nested loops","Implement a matrix transpose and verify it on a non-square matrix."],
 ["Strings, buffers and terminators","Read a bounded line, remove its newline when present and detect when the input exceeds the buffer."],
 ["Text scanning and counting","Count whitespace-delimited words and compare results for tabs, repeated spaces and blank lines."],
 ["Mini-project: text analyser","Build a terminal text analyser and verify it with expected outputs for short, empty and long inputs."]
 ]),objectives:["Traverse arrays without reading or writing outside their bounds.","Explain and test null termination and input truncation.","Build and verify a text scanner with clear counting rules."]},
 {...advanced("C Programming","c-pointers-and-memory","Pointers & Dynamic Memory in C","Understand what pointers refer to, who owns allocated memory and how to debug lifetime mistakes.","A reusable resizable integer buffer with a test harness and a documented memory-check run.","C arrays and functions",cTools+", AddressSanitizer where supported",[
 ["Addresses, pointers and output parameters","Write a function that returns min and max through pointers and trace which values it modifies."],
 ["Arrays, pointer arithmetic and const","Walk a bounded array with pointers and compare results with an indexed implementation."],
 ["Allocation and ownership","Allocate an integer buffer, check for failure and document which function must release it."],
 ["Resizing and cleanup","Use a temporary pointer for realloc, guard capacity calculations and test growth across boundaries."],
 ["Mini-project: dynamic integer buffer","Build append, read and destroy operations and run empty, growth and cleanup cases under a memory checker."]
 ]),objectives:["Distinguish an address, the pointed-to value and the lifetime of the underlying object.","Handle allocation and resizing errors without losing ownership of the old buffer.","Use a memory checker to verify bounds and cleanup."]},
 {...advanced("C Programming","c-structures-and-files","Structures & File Handling in C","Model records with structs and build a command-line app that can save and reload its data.","An inventory tracker that round-trips its records and reports malformed entries with line numbers.","C arrays, strings and functions",cTools,[
 ["Structs, enums and record validation","Model an inventory item with an ID, name, category and count, then validate sample records."],
 ["Modular C and header files","Separate record operations from the user interface and compile both source files together."],
 ["Reading and parsing text files","Load a documented tab-separated format and report missing columns and invalid counts."],
 ["Writing files and checking I/O","Save validated records and handle failed opens and writes before reporting success."],
 ["Mini-project: inventory tracker","Implement add, list, search and save operations, then verify a save-reload round trip and malformed input."]
 ]),objectives:["Model and validate related fields with structs and enums.","Read and write a documented record format with explicit error checks.","Separate persistence, validation and the command-line interface."]},
 {...advanced("C Programming","c-data-structures-and-algorithms","Data Structures & Algorithms in C","Implement core data structures and use tests and operation counts to compare your choices.","A command-line task queue with automated tests and a short comparison of array and linked-list operations.","C pointers, structs and dynamic allocation",cTools,[
 ["Searching, sorting and operation counts","Implement insertion sort and binary search, then compare binary and linear searches on sorted data."],
 ["Singly linked lists","Implement insert and remove operations and test the head, tail and empty-list cases."],
 ["Stacks and delimiter checking","Use a stack to validate nested delimiters and report where the first mismatch occurs."],
 ["Queues and circular buffers","Build a bounded ring queue and test FIFO order, wraparound, overflow and underflow."],
 ["Mini-project: command-line task queue","Build enqueue, dequeue and list commands, submit regression tests and explain your storage choice."]
 ]),objectives:["Choose between sequential and binary search based on the ordering requirement.","Implement linked lists, stacks and queues and test their boundary cases.","Explain an array-versus-linked-list design trade-off using operation counts."]}
];
export const CRASH_SLUG="c-by-horesh-sir";
export const C_LAUNCH_START="2026-11-26T20:00";
export const C_LAUNCH_SCHEDULE="Starts 26 November 2026 at 8:00 PM IST";
export const C_LAUNCH_MODE="Online";
export const CRASH_TITLE="C Programming";
export const C_DAY_SLUGS=cProgramming.map(c=>c.slug);
export const cDayNumber=(slug:string)=>C_DAY_SLUGS.indexOf(slug)+1;
export const registrationSlug=(slug:string)=>cDayNumber(slug)?CRASH_SLUG:slug;
export const isCShortCourse=(slug:string)=>registrationSlug(slug)===CRASH_SLUG;
const crash:Course={
 slug:CRASH_SLUG,track:"C Programming",title:CRASH_TITLE,instructor:"Horesh Sir",exclusive:true,
 blurb:"One five-day C programming short-term course, from your first compile to implementing core data structures.",
 outcome:"Five practical exercises and projects covering control flow, text processing, memory, files and data structures.",
 level:"Beginner to intermediate",tools:cTools,
 days:cProgramming.map(c=>[c.title,c.outcome]),
};
export const REGULAR_TRACKS = TRACKS.filter(track=>track!=="C Programming");
const regularCourses=[...core,...additional].map(course=>course.track==="Computer Networks"?{...course,instructor:"Mohit Sharma"}:course);
export const regularModules=(track:Track)=>regularCourses.filter(course=>course.track===track);
const facultyCourses:Course[]=facultyTemplates.map((item)=>{
 const modules=regularModules(item.track);
 return {
  slug:item.slug,track:item.track,title:item.track+" · Intensive "+(facultyTemplates.filter(x=>x.track===item.track).findIndex(x=>x.slug===item.slug)+1),exclusive:true,
  instructor:item.instructor??undefined,
  blurb:"One instructor covers the five regular modules in a single 15-hour course.",
  outcome:"Complete an integrated practical exercise drawing on all five modules.",
  level:"Intensive",tools:[...new Set(modules.map(course=>course.tools))].join("; "),
  days:modules.map(course=>[course.title,course.outcome]),
 };
});
export const COURSES = [...regularCourses, ...cProgramming, crash, ...facultyCourses];
export const getCourse = (slug: string) => COURSES.find(c => c.slug === slug);
export const feeText = "₹2,500";
