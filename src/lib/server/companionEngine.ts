import "server-only";
import type { CampaignDraft, CampaignRequest } from "./campaign";
import { validateCampaignOutput } from "./campaign";
import type { ResearchResult } from "./serpapi";
import { timeframeLabel } from "@/lib/utils/timeframe";
import { formatGoalTitle } from "@/lib/utils";

type JourneyStep = { title: string; objective: string };
type Topic = { title: string; kind: string; score: number; evidence: string[]; steps?: JourneyStep[]; objective?: string };

const STOP = new Set("about after again also are because become before being between build can could desire does doing during each exam for from goal have help into make more most need only other preparing purpose reach that the their them then this through time want wants with work your i me my to will would shall should".split(" "));
const DOMAIN_RULES: { title: string; kind: string; terms: string[] }[] = [
  { title: "Japanese Foundations", kind: "foundations", terms: ["hiragana", "katakana", "kana", "alphabet", "script", "pronunciation"] },
  { title: "Vocabulary & Kanji", kind: "vocabulary", terms: ["vocabulary", "vocab", "kanji", "words", "lexicon"] },
  { title: "Grammar", kind: "grammar", terms: ["grammar", "particle", "particles", "verb", "verbs", "conjugation", "conjugations", "syntax", "sentence"] },
  { title: "Reading", kind: "reading", terms: ["reading", "read", "comprehension", "passage", "text"] },
  { title: "Listening", kind: "listening", terms: ["listening", "listen", "audio", "hearing", "pronunciation"] },
  { title: "Exam Practice", kind: "exam", terms: ["exam", "test", "jlpt", "certification", "assessment", "mock"] },
  { title: "Programming", kind: "programming", terms: ["python", "javascript", "typescript", "programming", "coding", "code", "software", "algorithm"] },
  { title: "Mathematics", kind: "math", terms: ["mathematics", "math", "algebra", "calculus", "geometry", "statistics", "equation"] },
  { title: "Writing", kind: "writing", terms: ["writing", "write", "essay", "composition", "draft", "editing"] },
  { title: "Research Skills", kind: "research", terms: ["research", "sources", "evidence", "literature", "study"] },
  { title: "Fitness", kind: "fitness", terms: ["fitness", "strength", "training", "workout", "running", "exercise"] },
  { title: "Project Building", kind: "project", terms: ["project", "portfolio", "prototype", "design", "launch", "product"] },
];
const ACTIONS: Record<string, string[]> = {
  foundations: ["Learn", "Understand", "Practice", "Review", "Demonstrate", "Consolidate"],
  vocabulary: ["Learn", "Practice", "Review", "Use", "Recall", "Consolidate"],
  grammar: ["Learn", "Apply", "Practice", "Correct", "Use", "Review"],
  reading: ["Read", "Analyze", "Practice", "Summarize", "Interpret", "Review"],
  listening: ["Listen", "Identify", "Practice", "Interpret", "Respond", "Review"],
  exam: ["Solve", "Review", "Practice", "Analyze", "Complete", "Evaluate"],
  programming: ["Learn", "Build", "Practice", "Debug", "Improve", "Demonstrate"],
  math: ["Learn", "Solve", "Practice", "Explain", "Apply", "Review"],
  writing: ["Plan", "Draft", "Revise", "Edit", "Polish", "Share"],
  research: ["Identify", "Evaluate", "Compare", "Synthesize", "Apply", "Present"],
  fitness: ["Assess", "Learn", "Train", "Practice", "Progress", "Review"],
  project: ["Plan", "Design", "Build", "Test", "Improve", "Present"],
  general: ["Understand", "Plan", "Practice", "Apply", "Review", "Demonstrate"],
};

const JOURNEYS: Array<{ pattern: RegExp; paths: Omit<Topic, "score" | "evidence">[] }> = [
  { pattern: /\b(jlpt|japanese|hiragana|katakana|kanji)\b/i, paths: [
    { title: "JLPT N5 Understanding", kind: "exam", objective: "Understand the exam destination and the skills needed to reach the stated Japanese goal.", steps: [
      { title: "Understand the JLPT", objective: "Find an authoritative overview of the Japanese-Language Proficiency Test and note what it measures." },
      { title: "Define the N5 Level", objective: "Review what beginner N5 proficiency covers and write down the expected skills." },
      { title: "Map the Exam Sections", objective: "Identify the N5 test sections, question styles, and timing from an official or reputable source." },
      { title: "Review the N5 Syllabus", objective: "Collect the vocabulary, kanji, grammar, reading, and listening areas included in an N5 study plan." },
      { title: "Set an N5 Study Target", objective: "Use the exam scope and your timeframe to set a realistic weekly preparation target." },
    ] },
    { title: "Japanese Foundations", kind: "foundations", objective: "Build the sound and writing foundations needed before expanding beginner Japanese skills.", steps: [
      { title: "Learn Hiragana", objective: "Study the hiragana chart and practice reading and writing each character accurately." },
      { title: "Learn Katakana", objective: "Study katakana and practice recognizing common loanword spellings." },
      { title: "Practice Pronunciation", objective: "Listen to native audio and repeat the basic sounds while checking long vowels and doubled consonants." },
      { title: "Build Basic Sentences", objective: "Use simple Japanese word order to form and read short beginner sentences." },
      { title: "Review the Scripts", objective: "Read a short beginner passage and identify kana you can recognize without a chart." },
    ] },
    { title: "N5 Vocabulary & Kanji", kind: "vocabulary", objective: "Build the beginner word and kanji knowledge needed to understand N5-level material.", steps: [
      { title: "Learn Essential Vocabulary", objective: "Study a beginner word list in small sets and record each word with its meaning and a sample use." },
      { title: "Study Beginner Kanji", objective: "Learn a small N5-level kanji set with common readings and example words." },
      { title: "Practice Word Recall", objective: "Use spaced review or flashcards to recall meanings without looking at the answer." },
      { title: "Use Words in Context", objective: "Read short example sentences and identify how the vocabulary is used." },
      { title: "Review Vocabulary & Kanji", objective: "Test recall across the studied word and kanji sets, then revisit missed items." },
    ] },
    { title: "N5 Grammar", kind: "grammar", objective: "Learn beginner sentence patterns and apply particles, verbs, and adjectives accurately.", steps: [
      { title: "Learn Core Particles", objective: "Study beginner particles and compare their roles in short example sentences." },
      { title: "Practice Verb Forms", objective: "Learn common beginner verb forms and transform simple sentences between them." },
      { title: "Use Adjectives", objective: "Practice beginner adjective forms in descriptions and simple statements." },
      { title: "Build N5 Sentences", objective: "Combine particles, verbs, and adjectives to write and explain basic sentence patterns." },
      { title: "Review Grammar Patterns", objective: "Complete mixed grammar exercises and correct each error using a reference." },
    ] },
    { title: "N5 Reading & Listening", kind: "reading", objective: "Apply beginner vocabulary and grammar to short written and spoken Japanese.", steps: [
      { title: "Read Short N5 Texts", objective: "Read a beginner passage and mark words and grammar patterns you recognize." },
      { title: "Check Reading Comprehension", objective: "Answer questions about a short passage and support each answer with text evidence." },
      { title: "Listen for Key Details", objective: "Listen to beginner audio and note names, times, places, and other clear details." },
      { title: "Practice N5 Listening", objective: "Complete a short listening exercise, review the transcript, and identify missed sounds." },
      { title: "Combine Reading & Listening", objective: "Use a short audio-supported text to summarize its main idea and key facts." },
    ] },
    { title: "N5 Exam Preparation", kind: "exam", objective: "Turn study into exam readiness through practice, feedback, and targeted revision.", steps: [
      { title: "Solve N5 Practice Questions", objective: "Complete a small set of representative N5 questions under focused conditions." },
      { title: "Review Practice Errors", objective: "Group missed questions by vocabulary, grammar, reading, or listening and identify why each was missed." },
      { title: "Take a Timed Mock Test", objective: "Complete a reputable timed mock test and record section-by-section results." },
      { title: "Revise Weak Areas", objective: "Use mock-test results to revisit the weakest topics and complete targeted practice." },
      { title: "Check Exam Readiness", objective: "Compare recent practice results with the N5 sections and make a final study plan." },
    ] },
  ] },
  { pattern: /\b(japan|travel|trip|visit|abroad|vacation|holiday)\b/i, paths: [
    { title: "Destination Understanding", kind: "travel", objective: "Clarify destination requirements and practical needs for the planned trip.", steps: [
      { title: "Research the Destination", objective: "Use current official travel information to list entry conditions and essential local considerations." },
      { title: "Set Dates & Budget", objective: "Choose a target travel window and estimate the trip budget from current sources." },
      { title: "Plan Key Locations", objective: "List the places relevant to the trip and check their travel times and opening details." },
    ] },
    { title: "Travel Documents", kind: "documents", objective: "Prepare the identity and travel documents required for the destination.", steps: [
      { title: "Check Passport Validity", objective: "Check the passport expiry date and confirm validity requirements with an official source." },
      { title: "Gather Travel Documents", objective: "List the documents needed for the trip and identify any missing items." },
      { title: "Secure Important Records", objective: "Store copies of essential travel records safely and make them available offline." },
    ] },
    { title: "Visa Requirements", kind: "visa", objective: "Confirm visa and entry requirements for the traveller's nationality and purpose.", steps: [
      { title: "Check Official Visa Rules", objective: "Use the destination government's current visa guidance for your nationality and trip purpose." },
      { title: "Prepare Application Materials", objective: "Make a checklist from the official visa instructions and gather the required materials." },
      { title: "Confirm Entry Conditions", objective: "Recheck current entry, transit, and stay conditions before making final arrangements." },
    ] },
    { title: "Bookings & Budget", kind: "booking", objective: "Coordinate bookings and costs after confirming the destination and entry requirements.", steps: [
      { title: "Compare Transport Options", objective: "Compare routes, dates, and total costs using current booking information." },
      { title: "Choose Accommodation", objective: "Shortlist accommodation that fits the trip dates, location needs, and budget." },
      { title: "Build a Trip Budget", objective: "Estimate transport, accommodation, food, and local travel costs from current sources." },
    ] },
    { title: "Departure Preparation", kind: "travel", objective: "Prepare a practical checklist for a smooth departure and arrival.", steps: [
      { title: "Plan Local Transport", objective: "Find current official or operator guidance for getting between the airport and your accommodation." },
      { title: "Prepare a Packing List", objective: "Create a destination- and season-appropriate packing checklist from reliable travel guidance." },
      { title: "Confirm Before Departure", objective: "Recheck bookings, documents, entry rules, and essential contact information before departure." },
    ] },
  ] },
  { pattern: /\bpython\b/i, paths: [
    { title: "Python Foundations", kind: "programming", objective: "Set up Python and become comfortable reading and writing basic syntax.", steps: [
      { title: "Set Up Python", objective: "Install or open a trusted Python environment and run a small script." },
      { title: "Learn Python Syntax", objective: "Practice variables, values, expressions, input, and output in short examples." },
      { title: "Use Strings & Numbers", objective: "Write small examples that transform text and calculate with numeric values." },
    ] },
    { title: "Control Flow", kind: "programming", objective: "Use conditions and loops to express decisions and repetition in Python.", steps: [
      { title: "Write Conditional Logic", objective: "Use if, elif, and else to handle several outcomes in a small program." },
      { title: "Practice Loops", objective: "Use for and while loops to repeat work and explain when each is appropriate." },
      { title: "Combine Control Structures", objective: "Build a short program that combines conditions and loops to solve a clear task." },
    ] },
    { title: "Python Functions", kind: "programming", objective: "Break programs into reusable functions with clear inputs and results.", steps: [
      { title: "Define Functions", objective: "Write functions with parameters and return values for small, well-defined tasks." },
      { title: "Use Scope & Defaults", objective: "Practice local variables, default arguments, and clear function interfaces." },
      { title: "Test Functions", objective: "Try representative inputs, check edge cases, and correct unexpected results." },
    ] },
    { title: "Data Structures", kind: "programming", objective: "Choose and manipulate core Python collections to represent information.", steps: [
      { title: "Work with Lists & Tuples", objective: "Store, access, and transform ordered data using lists and tuples." },
      { title: "Use Dictionaries & Sets", objective: "Represent keyed information and unique values with dictionaries and sets." },
      { title: "Process Structured Data", objective: "Combine collections and loops to transform a small structured dataset." },
    ] },
    { title: "Python Projects", kind: "project", objective: "Apply Python foundations to a finished project that demonstrates the target skills.", steps: [
      { title: "Plan a Small Project", objective: "Choose a project that fits the goal, define its inputs and outputs, and split it into tasks." },
      { title: "Build the First Version", objective: "Implement the core behavior using functions and appropriate data structures." },
      { title: "Test & Improve", objective: "Test normal and edge cases, fix issues, and improve the project based on results." },
      { title: "Document the Project", objective: "Write concise setup and usage notes and explain the main design choices." },
    ] },
  ] },
  { pattern: /\b(math|mathematics|algebra|calculus|geometry|statistics)\b/i, paths: [
    { title: "Mathematics Foundations", kind: "math", objective: "Check prerequisite knowledge and organize the concepts required for the stated math goal.", steps: [
      { title: "Check Prerequisite Skills", objective: "Use a short diagnostic set to identify prerequisite concepts that need review." },
      { title: "Organize Core Concepts", objective: "Make a topic map of the concepts and how they connect to the target outcome." },
      { title: "Review Notation & Definitions", objective: "Write and explain the key notation and definitions used in the topic." },
    ] },
    { title: "Core Concepts", kind: "math", objective: "Build conceptual understanding before relying on memorized procedures.", steps: [
      { title: "Explain a Core Concept", objective: "Explain one core idea in your own words and check it against a trusted learning source." },
      { title: "Connect Related Ideas", objective: "Show how two related concepts connect using a worked example or diagram." },
      { title: "Check Concept Understanding", objective: "Answer conceptual questions and correct misunderstandings before moving on." },
    ] },
    { title: "Formulas & Methods", kind: "math", objective: "Select and use the formulas and methods appropriate to the target problems.", steps: [
      { title: "Build a Formula Reference", objective: "Record each relevant formula with its conditions and the meaning of its variables." },
      { title: "Practice Method Selection", objective: "Choose an appropriate formula or method for a set of varied problems." },
      { title: "Check Worked Solutions", objective: "Compare your reasoning with worked solutions and note where each method applies." },
    ] },
    { title: "Guided Practice", kind: "math", objective: "Develop accuracy through worked examples and progressively less guided exercises.", steps: [
      { title: "Follow a Worked Example", objective: "Reproduce a representative worked example and explain each step." },
      { title: "Solve Guided Problems", objective: "Solve a small set of scaffolded problems and check each result." },
      { title: "Correct Practice Errors", objective: "Classify errors and redo missed problems without copying the solution." },
    ] },
    { title: "Problem Solving", kind: "math", objective: "Apply concepts and methods to mixed, unfamiliar problems.", steps: [
      { title: "Solve Mixed Problems", objective: "Solve varied problems without being told which method to use." },
      { title: "Explain Your Reasoning", objective: "Write a clear solution that justifies the chosen method and key steps." },
      { title: "Check Results & Assumptions", objective: "Verify answers and review whether the assumptions and units are appropriate." },
    ] },
    { title: "Revision & Assessment", kind: "exam", objective: "Review weak areas and demonstrate readiness against the goal's assessment.", steps: [
      { title: "Review Weak Topics", objective: "Use recent practice results to choose and revise the weakest topics." },
      { title: "Complete a Timed Set", objective: "Complete a representative timed set and record accuracy and timing." },
      { title: "Check Readiness", objective: "Compare recent results with the target standard and make a final revision plan." },
    ] },
  ] },
];

function goalJourney(goal: string, researchTopics: Topic[]): Topic[] | null {
  const hasTravelIntent = /\b(travel|trip|visit|go to|move to|relocat|abroad|vacation|holiday)\b/i.test(goal);
  const pattern = /\bpython\b/i.test(goal) ? JOURNEYS[2]
    : /\b(math|mathematics|algebra|calculus|geometry|statistics)\b/i.test(goal) ? JOURNEYS[3]
      : /\b(jlpt|n[1-5])\b/i.test(goal) || (/\bjapanese\b/i.test(goal) && /\b(exam|test|certification)\b/i.test(goal)) ? JOURNEYS[0]
        : /\b(japan|travel|trip|visit|abroad|vacation|holiday)\b/i.test(goal) ? JOURNEYS[1]
          : undefined;
  if (!pattern) return null;
  const paths = [...pattern.paths];
  if (pattern.paths.some((path) => path.title === "JLPT N5 Understanding") && hasTravelIntent) {
    paths.push({ title: "Japan Preparation", kind: "travel", objective: "Handle practical preparation for the user's stated plan to go to Japan.", steps: [
      { title: "Research Japan Basics", objective: "Use current official sources to identify practical arrival, local transport, and communication needs." },
      { title: "Check Passport & Documents", objective: "Check passport validity and list travel documents using official guidance for your situation." },
      { title: "Verify Visa Requirements", objective: "Check current visa and entry requirements for your nationality and purpose through official sources." },
      { title: "Plan Travel Logistics", objective: "Compare travel dates, transport, accommodation, and budget using current booking information." },
      { title: "Prepare a Departure Checklist", objective: "Create a checklist for bookings, documents, packing, and arrival arrangements." },
    ] });
  }
  return paths.map((path) => {
    const aligned = researchTopics.filter((topic) => topic.kind === path.kind || words(topic.title).some((word) => words(path.title).includes(word)));
    return {
      ...path,
      score: Math.max(2, ...aligned.map((topic) => topic.score)),
      evidence: aligned.flatMap((topic) => topic.evidence).slice(0, 3),
    };
  });
}

function words(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9+#.-]{2,}/g) ?? []).filter((word) => !STOP.has(word) && !/^\d+$/.test(word));
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function goalTitle(goal: string): string {
  return formatGoalTitle(goal);
}

function researchTopics(goal: string, research: ResearchResult[]): Topic[] {
  const goalTerms = new Set(words(goal));
  const stats = new Map<string, Topic>();
  const deduped = new Set<string>();
  for (const result of research) {
    const identity = `${result.source.toLowerCase()}|${result.title.toLowerCase().replace(/\W+/g, " ")}`;
    if (deduped.has(identity)) continue;
    deduped.add(identity);
    const titleTerms = words(result.title), snippetTerms = words(result.snippet);
    const allText = [...titleTerms, ...snippetTerms];
    const matched = DOMAIN_RULES.flatMap((domain) => {
      const hits = domain.terms.filter((term) => allText.includes(term));
      return hits.length ? [{ domain, hits }] : [];
    });
    const concepts = matched.length
      ? matched.map(({ domain, hits }) => ({ key: domain.kind, title: domain.title, kind: domain.kind, hits }))
      : [...new Set(allText.filter((term) => term.length >= 4 && !STOP.has(term)))].map((term) => ({ key: term.replace(/s$/, ""), title: titleCase(term.replace(/s$/, "")), kind: "general", hits: [term] }));
    for (const concept of concepts) {
      const current = stats.get(concept.key) ?? { title: concept.title, kind: concept.kind, score: 0, evidence: [] };
      current.score += concept.hits.reduce((score, term) => score + (titleTerms.includes(term) ? 3 : 1) + (goalTerms.has(term) ? 2 : 0), 0);
      const evidence = `${result.title}: ${result.snippet}`.slice(0, 220);
      if (!current.evidence.includes(evidence) && current.evidence.length < 3) current.evidence.push(evidence);
      stats.set(concept.key, current);
    }
  }
  return [...stats.values()].filter((topic) => topic.score >= 3)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "en"));
}

function durationDays(value: number, unit: string): number {
  return value * ({ days: 1, weeks: 7, months: 30, years: 365 }[unit] ?? 1);
}

/** Deterministic, network-free planner. It returns the same CampaignDraft shape as the current campaign generator. */
export function planCampaign(input: Pick<CampaignRequest, "goal" | "timeframe" | "researchResults">): CampaignDraft {
  const goal = input.goal.trim();
  const topics = researchTopics(goal, input.researchResults);
  const goalTerms = words(goal);
  const candidates = goalJourney(goal, topics) ?? (topics.length ? topics : [{ title: titleCase(goalTerms.slice(0, 2).join(" ") || "Goal Skills"), kind: "general", score: 1, evidence: [] }]);
  const days = durationDays(input.timeframe.value, input.timeframe.unit);
  const complexity = Math.min(3, Math.floor(goalTerms.length / 12) + (topics.length >= 5 ? 1 : 0) + (candidates.length >= 6 ? 1 : 0));
  const shortTime = days <= 30;
  const maxPathsForTime = days <= 14 ? 2 : days <= 60 ? 4 : days <= 180 ? 8 : 10;
  const pathCount = Math.max(1, Math.min(candidates.length, maxPathsForTime));
  const selected = candidates.slice(0, pathCount);
  const questCount = Math.min(6, days <= 14 ? 2 : days <= 60 ? 3 : days <= 180 ? 4 : 6);
  const baseDifficulty = complexity >= 2 || (shortTime && complexity >= 1) ? "hard" : complexity === 1 ? "medium" : "easy";
  const intensity = shortTime && complexity >= 1 ? "very_high" : shortTime ? "high" : days <= 90 ? "moderate" : "low";
  const paths = selected.map((topic, pathIndex) => {
    const pathQuestCount = Math.min(questCount, topic.steps?.length ?? questCount);
    const evidence = topic.evidence[0];
    const quests = Array.from({ length: pathQuestCount }, (_, questIndex) => {
      const difficulty = questIndex === 0 && pathIndex === 0 ? "easy"
        : questIndex >= pathQuestCount - 1 || baseDifficulty === "hard" ? baseDifficulty
          : questIndex > 0 ? "medium" : "easy";
      const xpReward = Math.min(150, Math.max(25,
        (difficulty === "easy" ? 40 : difficulty === "medium" ? 75 : 110) + (days <= 30 ? 10 : 0) + Math.min(20, topic.score) + (questIndex === 0 ? 10 : 0)));
      const step = topic.steps?.[questIndex];
      const action = (ACTIONS[topic.kind] ?? ACTIONS.general)[questIndex];
      const title = (step?.title ?? `${action} ${topic.title}`).slice(0, 100);
      return {
        title,
        objective: step?.objective
          ? `${step.objective}${evidence ? ` Research lead: ${evidence}` : ""}`.slice(0, 500)
          : questIndex === 0
            ? `${action} ${topic.title} by completing a focused introductory task.${evidence ? ` Research lead: ${evidence}` : ` Keep the original goal in view: ${goal.slice(0, 150)}.`}`.slice(0, 500)
            : `${action} ${topic.title} with a focused task; record what worked and use the result to advance toward the goal.`.slice(0, 500),
        difficulty, xpReward, prerequisites: questIndex === 0 ? [] : [questIndex - 1],
      };
    });
    return {
      title: `${topic.title} Path`.slice(0, 100),
      objective: `${topic.objective ?? `Develop ${topic.title}`} This Path contributes to: ${goal.slice(0, 180)}.`.slice(0, 500),
      quests,
    };
  });
  const draft = validateCampaignOutput({
    goal: {
      title: goalTitle(goal),
      description: goal.slice(0, 400),
      strategy: `Progress through ${paths.map((path) => path.title.replace(/ Path$/, "")).join(", ")} in prerequisite order, using research themes to guide practice and review.`,
    },
    timeframe: { value: input.timeframe.value, unit: input.timeframe.unit, label: timeframeLabel(input.timeframe), meaning: `Complete this plan within ${timeframeLabel(input.timeframe)}.` },
    smart: {
      specific: `Advance the stated goal: ${goal.slice(0, 180)}.`,
      measurable: `Complete ${paths.length} Paths and their ordered Quests.`,
      achievable: `Complete the ordered Quests in each Path at a pace suited to the supplied timeframe.`,
      relevant: `All planned topics support the original goal: ${goal.slice(0, 150)}.`,
      timeBound: `Finish within ${timeframeLabel(input.timeframe)}.`,
    },
    assessment: { difficulty: baseDifficulty, intensity, recommendedPathCount: paths.length },
    paths,
  }, input.timeframe);
  if (!draft) throw new Error("Companion Engine could not produce a valid campaign draft.");
  return draft;
}
