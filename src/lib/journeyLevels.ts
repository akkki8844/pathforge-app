// Duolingo-style level system + hyper-specific, major-aware task library.
// Each task is a concrete, real-world action — never generic.

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface LevelDef {
  id: LevelId;
  name: string;
  tagline: string;
  unlockScore: number; // overall_score required to unlock
  color: string; // tailwind semantic class fragment
}

// Level hues sweep once through the brand spectrum — sea → brand blue →
// indigo → plum → copper — instead of ten unrelated saturated colours. Every
// stop is tuned to sit on the warm cream `--background` without vibrating, so
// the path reads as one continuous journey rather than a pile of stickers.
// `color` is the Tailwind gradient used for banners/headers; `LEVEL_CLAY` in
// LevelPath carries the matching hex ramp for the 3D nodes.
export const LEVELS: LevelDef[] = [
  { id: 1,  name: "Foundation",      tagline: "Set the academic & test base",     unlockScore: 0,  color: "from-[#3f9e93] to-[#2f7d74]" },
  { id: 2,  name: "Exploration",     tagline: "Discover what excites you",        unlockScore: 12, color: "from-[#3d8fc4] to-[#2f6f9c]" },
  { id: 3,  name: "Building",        tagline: "Ship real projects & roles",       unlockScore: 26, color: "from-[#4465d8] to-[#29439c]" },
  { id: 4,  name: "Differentiation", tagline: "Own a measurable spike",           unlockScore: 42, color: "from-[#5a55cf] to-[#3b3796]" },
  { id: 5,  name: "Elite",           tagline: "Top-tier signal & narrative",      unlockScore: 58, color: "from-[#7150c4] to-[#4d348c]" },
  { id: 6,  name: "Mastery",         tagline: "Become the local expert",          unlockScore: 70, color: "from-[#8a4cb8] to-[#5f3283]" },
  { id: 7,  name: "Pioneer",         tagline: "Create something new",             unlockScore: 80, color: "from-[#a04aa4] to-[#6f3172]" },
  { id: 8,  name: "Authority",       tagline: "Build institutional credibility",  unlockScore: 88, color: "from-[#b24d84] to-[#7c3359]" },
  { id: 9,  name: "Legacy",          tagline: "Build systems that outlast you",   unlockScore: 94, color: "from-[#b85f5a] to-[#823f3b]" },
  { id: 10, name: "Apex",            tagline: "Operate like a college sophomore", unlockScore: 98, color: "from-[#b07d3e] to-[#7d552a]" },
];

export interface MicroStep {
  label: string;
  detail?: string;
}

export interface LevelTask {
  id: string;
  level: LevelId;
  category: "academics" | "activities" | "leadership" | "competitions" | "test_prep" | "research" | "application";
  title: string;
  why: string;            // why it matters for admissions
  outcome: string;        // concrete deliverable
  timeEstimate: string;   // e.g. "4 weeks"
  microSteps: MicroStep[]; // Research → Select → Execute → Present
  link?: string;
  linkLabel?: string;
}

/** Every Journey task now requires evidence (file upload OR public link + note).
 *  Self-attestation alone is no longer accepted — students were checking
 *  boxes without doing the work, so the bar is now uniform across all
 *  categories. */
export const PROOF_ELIGIBLE_CATEGORIES: ReadonlyArray<LevelTask["category"]> = [
  "academics", "activities", "leadership", "competitions",
  "test_prep", "research", "application",
];

/** Proof-gated: all tasks now require an AI-verified or admin-approved
 *  evidence submission (file or link) to count as complete. */
export function taskRequiresProof(_task: LevelTask): boolean {
  return true;
}

interface Ctx {
  major: string;
  country: string;
  curriculum: string;
  grade: string;
  level: LevelId;
  targetUniversity?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const gradeNum = (g: string): number => {
  const m = g.match(/\d+/);
  return m ? parseInt(m[0], 10) : 10;
};

const isIndia = (c: string) => c.toLowerCase().includes("india");
const isUS = (c: string) => c.toLowerCase().includes("united states") || c.toLowerCase() === "usa";

const testName = (country: string) =>
  isIndia(country) ? "JEE/NEET (or SAT for global apps)" : isUS(country) ? "SAT/ACT" : "SAT or local equivalent";

// ── Major-specific task generators ──────────────────────────────────────
// Each returns level-specific, concrete tasks.

type MajorKey =
  | "finance" | "computer_science" | "biology" | "engineering" | "business"
  | "economics" | "medicine" | "psychology" | "physics" | "chemistry"
  | "law" | "design" | "generic";

const detectMajor = (major: string): MajorKey => {
  const m = major.toLowerCase();
  if (/(finance|account|invest)/.test(m)) return "finance";
  if (/(computer|software|data|ai|machine learning)/.test(m)) return "computer_science";
  if (/(biolog|biotech|life sci)/.test(m)) return "biology";
  if (/(engineer|mechanical|electrical|civil|aerospace)/.test(m)) return "engineering";
  if (/(business|management|entrepre|mba)/.test(m)) return "business";
  if (/econom/.test(m)) return "economics";
  if (/(medic|pre.?med|health)/.test(m)) return "medicine";
  if (/(psycho|cognitive|neuro)/.test(m)) return "psychology";
  if (/physic/.test(m)) return "physics";
  if (/chem/.test(m)) return "chemistry";
  if (/(law|legal|polit)/.test(m)) return "law";
  if (/(design|architect|art|creative)/.test(m)) return "design";
  return "generic";
};

// ── Task libraries per (major, level) ───────────────────────────────────

const TASKS: Record<MajorKey, Partial<Record<LevelId, (ctx: Ctx) => LevelTask[]>>> = {
  finance: {
    1: (c) => [
      {
        id: `fin-l1-courses-${c.curriculum}`, level: 1, category: "academics",
        title: `Take the most rigorous Math course your school offers (${c.curriculum})`,
        why: "Top finance programs (Wharton, LSE, IIM-Indore IPM) screen on quantitative depth before anything else.",
        outcome: "Enrolled in highest math track + first quarter grade ≥ A-/85%.",
        timeEstimate: "1 semester",
        microSteps: [
          { label: "Research", detail: "List every advanced math option (AP Calc BC, IB HL, A-Level Further Maths, JEE-track)." },
          { label: "Select", detail: "Pick the highest level you can realistically score A in." },
          { label: "Execute", detail: "Lock in 30 min/day practice + weekly past-paper drill." },
          { label: "Present", detail: "Track grades in Outcomes — share screenshot with counsellor." },
        ],
      },
      {
        id: "fin-l1-baseline-test", level: 1, category: "test_prep",
        title: `Take a full-length diagnostic ${testName(c.country)} test`,
        why: "Baseline tells you exactly the gap to your target school's median.",
        outcome: "Diagnostic score logged + 8-week prep plan written.",
        timeEstimate: "1 week",
        microSteps: [
          { label: "Research", detail: "Find official sample test (College Board / NTA)." },
          { label: "Select", detail: "Block one Saturday morning, full timed conditions." },
          { label: "Execute", detail: "Take it, score honestly, identify weakest 2 sections." },
          { label: "Present", detail: "Log score in Outcomes; build prep plan." },
        ],
        link: "/outcomes", linkLabel: "Log Score",
      },
      {
        id: "fin-l1-finance-vocab", level: 1, category: "activities",
        title: "Read one classic finance book + write a 1-page review",
        why: "Demonstrates intellectual initiative; useful in interviews and essays.",
        outcome: "1-page LinkedIn-published review of 'The Intelligent Investor' or 'Liar's Poker'.",
        timeEstimate: "3 weeks",
        microSteps: [
          { label: "Research", detail: "Pick one of: Intelligent Investor, Liar's Poker, Principles (Dalio)." },
          { label: "Select", detail: "Buy/borrow + set 30 min/day reading slot." },
          { label: "Execute", detail: "Take notes per chapter. Write a 1-page review." },
          { label: "Present", detail: "Publish on LinkedIn; tag 1 finance professional you respect." },
        ],
      },
    ],
    2: (c) => [
      {
        id: "fin-l2-stock-portfolio", level: 2, category: "activities",
        title: "Run a paper-trading portfolio of 5 stocks for 8 weeks",
        why: "Shows genuine market interest with a paper trail — far stronger than 'I like finance'.",
        outcome: "Excel/Sheet with weekly P&L, thesis per pick, retro of what went wrong.",
        timeEstimate: "8 weeks",
        microSteps: [
          { label: "Research", detail: "Use Investopedia stock simulator or moneybhai (free)." },
          { label: "Select", detail: "Pick 5 stocks across 3 sectors. Write 1-paragraph thesis each." },
          { label: "Execute", detail: "Update tracker every Sunday for 8 weeks." },
          { label: "Present", detail: "Final retro: which thesis held? What surprised you?" },
        ],
      },
      {
        id: "fin-l2-club", level: 2, category: "leadership",
        title: "Join (or start) your school's Finance/Investment Club",
        why: "Activity list needs a finance-aligned commitment. Founding > joining.",
        outcome: "Active member with one workshop you organised.",
        timeEstimate: "Ongoing",
        microSteps: [
          { label: "Research", detail: "Check if club exists. If yes, join. If no, find 4 co-founders." },
          { label: "Select", detail: "Pick a faculty advisor and a 1-line mission." },
          { label: "Execute", detail: "Run 1 workshop in 6 weeks (e.g., 'How a stock IPO works')." },
          { label: "Present", detail: "Take attendance, photos, post recap on LinkedIn." },
        ],
      },
    ],
    3: (c) => [
      {
        id: "fin-l3-dcf", level: 3, category: "research",
        title: `Build a full DCF valuation of one ${isIndia(c.country) ? "NSE-listed" : "publicly listed"} company`,
        why: "DCF in high school is rare — it's an instant signal-of-seriousness for AdComs.",
        outcome: "2-page PDF report with assumptions, sensitivity table, and target price.",
        timeEstimate: "4 weeks",
        microSteps: [
          { label: "Research", detail: "Pick a company you understand (e.g., HDFC Bank, Apple). Pull 5y financials." },
          { label: "Select", detail: "Choose discount rate (WACC) and growth assumptions — justify each." },
          { label: "Execute", detail: "Build 5y DCF in Sheets. Add sensitivity table on growth/WACC." },
          { label: "Present", detail: "Export 2-page PDF. Post on LinkedIn + share with finance teacher." },
        ],
      },
      {
        id: "fin-l3-comp", level: 3, category: "competitions",
        title: "Enter a national finance/case competition this cycle",
        why: "Competition results are the most objective external validation an applicant can have.",
        outcome: "Submitted entry + finalist or top-quartile placement.",
        timeEstimate: "8-12 weeks",
        microSteps: [
          { label: "Research", detail: "Wharton Global HS Investment Competition / KWHS / SBM National Finance Olympiad (India)." },
          { label: "Select", detail: "Pick one with a deadline 8+ weeks out. Form team if required." },
          { label: "Execute", detail: "Block weekly 2-hr work sessions. Build deck + financial model." },
          { label: "Present", detail: "Submit. Save deck for portfolio." },
        ],
        link: "/activities", linkLabel: "Find Competitions",
      },
    ],
    4: (c) => [
      {
        id: "fin-l4-research-paper", level: 4, category: "research",
        title: `Publish a finance research paper or whitepaper on a ${c.country} market topic`,
        why: "Original research is the #1 differentiator at Ivy/LSE/Oxbridge level.",
        outcome: "10–15 page paper hosted on SSRN, Medium, or your own site.",
        timeEstimate: "10-12 weeks",
        microSteps: [
          { label: "Research", detail: `Pick a narrow question (e.g., 'IPO underpricing on NSE 2020-2024').` },
          { label: "Select", detail: "Find a mentor (professor at local uni / CFA in your network)." },
          { label: "Execute", detail: "Pull data, run analysis, write paper. Iterate with mentor." },
          { label: "Present", detail: "Publish + announce on LinkedIn + email it to target uni admissions." },
        ],
      },
      {
        id: "fin-l4-scale-club", level: 4, category: "leadership",
        title: "Scale your finance club to a regional / inter-school summit",
        why: "Scope of leadership is what separates 'club member' from 'top-school admit'.",
        outcome: "Hosted event with 3+ schools, 50+ attendees, photos & sponsor logos.",
        timeEstimate: "12 weeks",
        microSteps: [
          { label: "Research", detail: "Map 5 schools nearby with finance clubs / interest groups." },
          { label: "Select", detail: "Pick 3 to co-host. Lock venue + date." },
          { label: "Execute", detail: "Get 1 industry speaker. Promote on Instagram. Run the event." },
          { label: "Present", detail: "Post recap reel. Get attendance numbers. Update LinkedIn." },
        ],
      },
    ],
    5: (c) => [
      {
        id: "fin-l5-internship", level: 5, category: "activities",
        title: "Land a real internship at a brokerage, fund, or fintech",
        why: "Real-world experience > anything school-based at the elite tier.",
        outcome: "4–8 week internship with a 1-page summary of what you shipped.",
        timeEstimate: "8 weeks",
        microSteps: [
          { label: "Research", detail: "List 20 local brokerages, PE funds, or fintech startups." },
          { label: "Select", detail: "Cold-email 10 with a tailored 4-line pitch + your DCF report." },
          { label: "Execute", detail: "Show up 5 days/week. Ask for one concrete deliverable." },
          { label: "Present", detail: "Get a recommendation letter + LinkedIn endorsement." },
        ],
      },
    ],
  },

  computer_science: {
    1: (c) => [
      {
        id: "cs-l1-python", level: 1, category: "academics",
        title: "Complete CS50 (Harvard, free) or equivalent intro programming course",
        why: "Foundational rigor. CS50 specifically is recognised by every top CS program.",
        outcome: "Certificate + GitHub repo with all 10 problem sets.",
        timeEstimate: "10 weeks",
        microSteps: [
          { label: "Research", detail: "Visit cs50.harvard.edu — free." },
          { label: "Select", detail: "Block 6 hrs/week (e.g., Sat morning + 2 weeknights)." },
          { label: "Execute", detail: "Submit every problem set. Commit code to GitHub daily." },
          { label: "Present", detail: "Pin the certificate to your LinkedIn." },
        ],
      },
      {
        id: "cs-l1-github", level: 1, category: "activities",
        title: "Set up a public GitHub with 3 small projects (calculator, todo, web scraper)",
        why: "An empty GitHub at application time is a red flag. Start the contribution graph now.",
        outcome: "3 public repos with README, screenshot, live demo where possible.",
        timeEstimate: "4 weeks",
        microSteps: [
          { label: "Research", detail: "Pick stack: Python + Streamlit, or HTML/JS." },
          { label: "Select", detail: "Choose 3 micro-projects you can finish in a weekend each." },
          { label: "Execute", detail: "Build + commit. Write a 5-line README per project." },
          { label: "Present", detail: "Add GitHub URL to LinkedIn + email signature." },
        ],
      },
    ],
    2: (c) => [
      {
        id: "cs-l2-hackathon", level: 2, category: "competitions",
        title: "Compete in 1 hackathon (in-person or online) this term",
        why: "Hackathons show you can ship under pressure — admissions love it.",
        outcome: "Submitted project on Devpost + 30-second demo video.",
        timeEstimate: "1 weekend + 2 weeks prep",
        microSteps: [
          { label: "Research", detail: "Browse mlh.io for upcoming hackathons (many are virtual & free)." },
          { label: "Select", detail: "Pick one within 6 weeks. Form team of 2-3." },
          { label: "Execute", detail: "Build + submit on Devpost." },
          { label: "Present", detail: "Record 30-sec demo + post on LinkedIn." },
        ],
        link: "https://mlh.io/seasons/2025/events", linkLabel: "Browse Hackathons",
      },
    ],
    3: (c) => [
      {
        id: "cs-l3-real-app", level: 3, category: "research",
        title: "Build & launch one real app that has at least 50 real users",
        why: "Proof you can make something people actually want — the strongest single CS signal.",
        outcome: "Deployed app (web/mobile) with analytics showing 50+ users.",
        timeEstimate: "10 weeks",
        microSteps: [
          { label: "Research", detail: "Pick a problem you or peers actually have (school timetable, tutor matcher)." },
          { label: "Select", detail: "Decide stack you can ship in. Set 8-week deadline." },
          { label: "Execute", detail: "Ship MVP in 4 wks. Spend next 4 wks getting users (post in school groups, Reddit)." },
          { label: "Present", detail: "Write a launch post: problem, build, user count, lessons. Pin on LinkedIn." },
        ],
      },
    ],
    4: (c) => [
      {
        id: "cs-l4-research", level: 4, category: "research",
        title: "Co-author or assist on a CS/ML research paper with a university professor",
        why: "Published research at high school level is rare and elite.",
        outcome: "Paper on arXiv / submitted to a workshop, even as 3rd author.",
        timeEstimate: "12-20 weeks",
        microSteps: [
          { label: "Research", detail: "List 10 nearby/online profs in CS/ML you find interesting." },
          { label: "Select", detail: "Cold-email with a 5-line specific pitch + your GitHub link." },
          { label: "Execute", detail: "Take whatever scope they give you. Deliver weekly." },
          { label: "Present", detail: "Get name on paper. Post on LinkedIn." },
        ],
      },
      {
        id: "cs-l4-oss", level: 4, category: "activities",
        title: "Land 5+ merged PRs on a popular open-source repo (>1k stars)",
        why: "Open-source contributions are externally verifiable, code-quality proof.",
        outcome: "GitHub profile shows 5+ merged PRs on a notable repo.",
        timeEstimate: "Ongoing 12 weeks",
        microSteps: [
          { label: "Research", detail: "Find 'good first issue' tags on repos you use (React, Hugging Face, LangChain)." },
          { label: "Select", detail: "Pick one repo. Read CONTRIBUTING.md." },
          { label: "Execute", detail: "Submit 1 PR/week. Iterate on reviewer feedback." },
          { label: "Present", detail: "Pin merged PRs on GitHub profile." },
        ],
      },
    ],
    5: (c) => [
      {
        id: "cs-l5-startup", level: 5, category: "activities",
        title: "Run your launched app as a real product — incorporate or join an accelerator",
        why: "True founder experience is rare and lands top-tier admits.",
        outcome: "Registered company OR accepted into a teen accelerator (e.g., Pioneer, NFX).",
        timeEstimate: "Ongoing",
        microSteps: [
          { label: "Research", detail: "Look at Pioneer, Z Fellows, NFX teen tracks, your country's startup grants." },
          { label: "Select", detail: "Pick 1 to apply. Prepare deck + traction numbers." },
          { label: "Execute", detail: "Apply. Iterate based on feedback." },
          { label: "Present", detail: "Document the journey — essays will write themselves." },
        ],
      },
    ],
  },

  generic: {
    1: (c) => [
      {
        id: "g-l1-rigor", level: 1, category: "academics",
        title: `Enroll in the most rigorous ${c.major}-aligned courses (${c.curriculum})`,
        why: "Course rigor is the strongest single signal in any application.",
        outcome: "Locked into highest-track courses + first grade ≥ A-/85%.",
        timeEstimate: "1 semester",
        microSteps: [
          { label: "Research", detail: `List every advanced course offered relevant to ${c.major}.` },
          { label: "Select", detail: "Pick the highest level you can realistically excel at." },
          { label: "Execute", detail: "Daily practice + weekly review block." },
          { label: "Present", detail: "Log grades in Outcomes." },
        ],
      },
      {
        id: "g-l1-test", level: 1, category: "test_prep",
        title: `Take a diagnostic ${testName(c.country)} test`,
        why: "Establishes baseline — you cannot plan prep without a starting score.",
        outcome: "Score logged + 8-week prep plan.",
        timeEstimate: "1 week",
        microSteps: [
          { label: "Research", detail: "Find official sample test." },
          { label: "Select", detail: "Block a full Saturday." },
          { label: "Execute", detail: "Take it under timed conditions." },
          { label: "Present", detail: "Log + plan." },
        ],
        link: "/outcomes", linkLabel: "Log Score",
      },
      {
        id: "g-l1-explore", level: 1, category: "activities",
        title: `Read one foundational book in ${c.major} + publish a review`,
        why: "Shows intellectual initiative beyond the syllabus.",
        outcome: "1-page LinkedIn-published review.",
        timeEstimate: "3 weeks",
        microSteps: [
          { label: "Research", detail: `Search 'best intro books in ${c.major}'.` },
          { label: "Select", detail: "Pick one. Start reading." },
          { label: "Execute", detail: "30 min/day. Take notes." },
          { label: "Present", detail: "Publish review on LinkedIn." },
        ],
      },
    ],
    2: (c) => [
      {
        id: "g-l2-club", level: 2, category: "leadership",
        title: `Join (or start) a school club aligned with ${c.major}`,
        why: "Activity list needs a major-aligned commitment.",
        outcome: "Active member + 1 event you helped organise.",
        timeEstimate: "Ongoing",
        microSteps: [
          { label: "Research", detail: "Check if a relevant club exists." },
          { label: "Select", detail: "Join, or find 4 co-founders." },
          { label: "Execute", detail: "Run 1 event in 6 weeks." },
          { label: "Present", detail: "Photos + LinkedIn recap." },
        ],
      },
      {
        id: "g-l2-activity-pick", level: 2, category: "activities",
        title: `Pick 2 high-impact activities from the Pathforge database`,
        why: "Activities curated for your major + country produce the highest ROI.",
        outcome: "2 activities started + tracked in Outcomes.",
        timeEstimate: "2 weeks to start",
        microSteps: [
          { label: "Research", detail: "Open Activities page filtered by your major." },
          { label: "Select", detail: "Pick 2 'High' priority activities." },
          { label: "Execute", detail: "Apply / register / start within 2 weeks." },
          { label: "Present", detail: "Log start date in Outcomes." },
        ],
        link: "/activities", linkLabel: "Browse Activities",
      },
    ],
    3: (c) => [
      {
        id: "g-l3-project", level: 3, category: "research",
        title: `Build a substantive ${c.major} project with measurable impact`,
        why: "A real project is the #1 way to demonstrate genuine passion.",
        outcome: "Documented project: problem, process, quantified impact.",
        timeEstimate: "10-12 weeks",
        microSteps: [
          { label: "Research", detail: `Identify a real problem in your community related to ${c.major}.` },
          { label: "Select", detail: "Define scope you can finish in 10 weeks." },
          { label: "Execute", detail: "Weekly milestones. Document everything." },
          { label: "Present", detail: "Publish: write-up + photos + numbers (people helped, $ raised, etc.)." },
        ],
      },
      {
        id: "g-l3-comp", level: 3, category: "competitions",
        title: `Enter a national-level competition in ${c.major}`,
        why: "Competition results are objective external validation.",
        outcome: "Submitted entry + result documented.",
        timeEstimate: "8-12 weeks",
        microSteps: [
          { label: "Research", detail: "Browse Pathforge Activities → Competition filter." },
          { label: "Select", detail: "Pick one with realistic timeline." },
          { label: "Execute", detail: "Weekly prep blocks." },
          { label: "Present", detail: "Submit + log result." },
        ],
        link: "/activities", linkLabel: "Find Competitions",
      },
    ],
    4: (c) => [
      {
        id: "g-l4-mentor", level: 4, category: "research",
        title: `Find a mentor (professor / professional) in ${c.major} and complete a research project`,
        why: "Mentored research is the strongest single signal at the elite tier.",
        outcome: "10+ page write-up co-signed by mentor.",
        timeEstimate: "12 weeks",
        microSteps: [
          { label: "Research", detail: `List 10 profs/pros locally or online in ${c.major}.` },
          { label: "Select", detail: "Cold-email with specific 5-line pitch." },
          { label: "Execute", detail: "Take any scope offered. Deliver weekly." },
          { label: "Present", detail: "Publish write-up + LinkedIn announcement." },
        ],
      },
      {
        id: "g-l4-scale", level: 4, category: "leadership",
        title: `Scale one of your activities — bigger scope, more people`,
        why: "Scope of leadership separates 'member' from 'admit'.",
        outcome: "Documented growth: more attendees, regional reach, or media coverage.",
        timeEstimate: "12 weeks",
        microSteps: [
          { label: "Research", detail: "Pick your strongest activity. Identify how to 10x its impact." },
          { label: "Select", detail: "Set a measurable scaling goal." },
          { label: "Execute", detail: "Run weekly sprints." },
          { label: "Present", detail: "Document numbers + media." },
        ],
      },
    ],
    5: (c) => [
      {
        id: "g-l5-narrative", level: 5, category: "application",
        title: `Lock your application narrative — one thread across all activities`,
        why: "Top-tier admits have a story, not a resume.",
        outcome: "1-page personal statement + activity list mapped to narrative.",
        timeEstimate: "4 weeks",
        microSteps: [
          { label: "Research", detail: `Re-read all your activities. Find the thread.` },
          { label: "Select", detail: "Write a 1-line 'why' for your application." },
          { label: "Execute", detail: "Draft personal statement." },
          { label: "Present", detail: "Use Pathforge Resume Builder to package your story." },
        ],
        link: "/resume", linkLabel: "Resume Builder",
      },
    ],
  },

  biology:        { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  engineering:    { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  business:       { 1:(c)=>TASKS.finance[1]!(c), 2:(c)=>TASKS.finance[2]!(c), 3:(c)=>TASKS.finance[3]!(c), 4:(c)=>TASKS.finance[4]!(c), 5:(c)=>TASKS.finance[5]!(c) },
  economics:      { 1:(c)=>TASKS.finance[1]!(c), 2:(c)=>TASKS.finance[2]!(c), 3:(c)=>TASKS.finance[3]!(c), 4:(c)=>TASKS.finance[4]!(c), 5:(c)=>TASKS.finance[5]!(c) },
  medicine:       { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  psychology:     { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  physics:        { 1:(c)=>TASKS.computer_science[1]!(c), 2:(c)=>TASKS.computer_science[2]!(c), 3:(c)=>TASKS.computer_science[3]!(c), 4:(c)=>TASKS.computer_science[4]!(c), 5:(c)=>TASKS.computer_science[5]!(c) },
  chemistry:      { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  law:            { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
  design:         { 1:(c)=>TASKS.generic[1]!(c), 2:(c)=>TASKS.generic[2]!(c), 3:(c)=>TASKS.generic[3]!(c), 4:(c)=>TASKS.generic[4]!(c), 5:(c)=>TASKS.generic[5]!(c) },
};

export function getLevelTasksForUser(ctx: Ctx): LevelTask[] {
  const key = detectMajor(ctx.major);
  const lib = TASKS[key] || TASKS.generic;
  // Levels 6–10 reuse Level 5 task library (top-tier signal continues to apply).
  const fn = lib[ctx.level] ?? lib[5] ?? TASKS.generic[5]!;
  return fn(ctx);
}

// ── Placement test (deep, weighted, multi-section diagnostic) ───────────────
//
// Goal: replace simple yes/no scoring with a layered evaluation that considers
//   • Depth of achievements          (school → state → national → international)
//   • Consistency / sustained effort (single trial vs. multi-year commitment)
//   • Real-world impact              (audience size, public artifact, recognition)
//   • Breadth across pillars         (academics, activities, leadership, comp.)
//
// All answers are tri-state ("none" | level | NA) and weighted; total raw score
// is mapped to one of 5 levels with a grade-based soft cap.

export type Tier = "none" | "school" | "district" | "state" | "national" | "international";
export type YesNoNA = "yes" | "no" | "na";

export interface PlacementAnswers {
  // ── Section 1 · Academics (7) ─────────────────────────────────────────
  apIbCount: 0 | 1 | 2 | 3 | 4 | 5;          // # of AP/IB/Honors-equivalent courses currently enrolled
  gpaTier: "below_3" | "3_to_3_5" | "3_5_to_3_8" | "3_8_plus" | "na";
  testReadiness: "none" | "prep_started" | "mock_strong" | "official_strong" | "na";
  subjectMastery: YesNoNA;
  selfStudyHabit: YesNoNA;
  mathRigor: "none" | "standard" | "honors" | "ap_ib_hl" | "beyond_calc";   // new
  studyHoursWeek: "lt2" | "2_5" | "5_10" | "10_plus";                         // new

  // ── Section 2 · Activities & Projects (7) ─────────────────────────────
  shippedProjectTier: Tier;
  projectAudience: "none" | "lt10" | "10_100" | "100_1k" | "1k_plus";
  publicArtifact: YesNoNA;
  consistencyMonths: "lt3" | "3_6" | "6_12" | "12_plus";
  publishedExternally: YesNoNA;
  portfolioDepth: "none" | "one" | "two_three" | "four_plus";                 // new
  certCount: "none" | "one" | "two_three" | "four_plus";                      // new

  // ── Section 3 · Competitions (7) ──────────────────────────────────────
  competitionTier: Tier;
  competitionResult: "none" | "participated" | "top50" | "top10" | "winner";
  competitionFrequency: "none" | "one" | "few" | "regular";
  teamCompetition: YesNoNA;
  qualifiedForNext: YesNoNA;
  competitionDomain: YesNoNA;                                                 // new — aligned with major
  yearsCompeting: "none" | "lt1" | "1_2" | "3_plus";                          // new

  // ── Section 4 · Leadership & Impact (7) ───────────────────────────────
  leadershipTier: Tier;
  teamSizeLed: "none" | "lt5" | "5_15" | "15_50" | "50_plus";
  leadershipDurationMonths: "lt3" | "3_6" | "6_12" | "12_plus";
  measurableOutcome: YesNoNA;
  startedSomething: YesNoNA;
  numericOutcome: YesNoNA;                                                    // new — quantified result
  collaboratorsManaged: "none" | "1_2" | "3_5" | "6_plus";                    // new — recurring collaborators

  // ── Section 5 · Research, Internship, External Validation (7) ─────────
  researchTier: "none" | "self_study" | "school_mentor" | "professor_mentored" | "published";
  internshipTier: "none" | "shadowing" | "short" | "structured_4w_plus" | "paid_or_competitive";
  recommenderStrength: "none" | "teacher" | "mentor_external" | "professor_or_industry";
  externalRecognition: YesNoNA;
  reachedNationalOrIntl: YesNoNA;
  professionalNetwork: "none" | "1_5" | "6_15" | "16_plus";                   // new — industry connections
  publicAudience: "none" | "lt100" | "100_1k" | "1k_plus";                    // new — followers/subscribers
}

const tierWeight: Record<Tier, number> = {
  none: 0, school: 1, district: 2, state: 3, national: 5, international: 7,
};

function w(v: number) { return v; } // identity, kept for clarity in score table

/**
 * Weighted scoring across 5 pillars. Each pillar contributes up to ~20 raw points,
 * giving a total of ~100. Depth (tier) and consistency dominate over presence/absence.
 */
export function placeUserAtLevel(a: PlacementAnswers, gradeStr: string, overallScore: number): LevelId {
  let s = 0;

  // ── Academics (max ~26) ──────────────────────────────────────────────
  s += w(a.apIbCount * 1.6);                                          // 0..8
  s += { below_3: 0, "3_to_3_5": 2, "3_5_to_3_8": 4, "3_8_plus": 6, na: 2 }[a.gpaTier];
  s += { none: 0, prep_started: 1, mock_strong: 3, official_strong: 5, na: 1 }[a.testReadiness];
  if (a.subjectMastery === "yes") s += 2;
  if (a.selfStudyHabit === "yes") s += 1;
  s += { none: 0, standard: 1, honors: 2, ap_ib_hl: 4, beyond_calc: 6 }[a.mathRigor];   // new
  s += { lt2: 0, "2_5": 1, "5_10": 2, "10_plus": 3 }[a.studyHoursWeek];                  // new

  // ── Activities & Projects (max ~28) ──────────────────────────────────
  s += tierWeight[a.shippedProjectTier] * 1.2;                        // 0..8.4
  s += { none: 0, lt10: 1, "10_100": 3, "100_1k": 5, "1k_plus": 7 }[a.projectAudience];
  if (a.publicArtifact === "yes") s += 2;
  s += { lt3: 0, "3_6": 1, "6_12": 2, "12_plus": 4 }[a.consistencyMonths];
  if (a.publishedExternally === "yes") s += 2;
  s += { none: 0, one: 1, two_three: 3, four_plus: 5 }[a.portfolioDepth];                // new
  s += { none: 0, one: 1, two_three: 2, four_plus: 3 }[a.certCount];                     // new

  // ── Competitions (max ~24) ───────────────────────────────────────────
  s += tierWeight[a.competitionTier] * 1.1;
  s += { none: 0, participated: 1, top50: 3, top10: 5, winner: 7 }[a.competitionResult];
  s += { none: 0, one: 1, few: 2, regular: 3 }[a.competitionFrequency];
  if (a.teamCompetition === "yes") s += 1;
  if (a.qualifiedForNext === "yes") s += 1.5;
  if (a.competitionDomain === "yes") s += 2;                                              // new
  s += { none: 0, lt1: 0.5, "1_2": 2, "3_plus": 4 }[a.yearsCompeting];                    // new

  // ── Leadership & Impact (max ~25) ────────────────────────────────────
  s += tierWeight[a.leadershipTier] * 1.0;
  s += { none: 0, lt5: 1, "5_15": 3, "15_50": 5, "50_plus": 7 }[a.teamSizeLed];
  s += { lt3: 0, "3_6": 1, "6_12": 2, "12_plus": 3 }[a.leadershipDurationMonths];
  if (a.measurableOutcome === "yes") s += 2;
  if (a.startedSomething === "yes") s += 1;
  if (a.numericOutcome === "yes") s += 2;                                                 // new
  s += { none: 0, "1_2": 1, "3_5": 2, "6_plus": 4 }[a.collaboratorsManaged];              // new

  // ── Research, Internship, Recognition (max ~26) ──────────────────────
  s += { none: 0, self_study: 1, school_mentor: 3, professor_mentored: 6, published: 9 }[a.researchTier];
  s += { none: 0, shadowing: 1, short: 2, structured_4w_plus: 4, paid_or_competitive: 6 }[a.internshipTier];
  s += { none: 0, teacher: 1, mentor_external: 2, professor_or_industry: 3 }[a.recommenderStrength];
  if (a.externalRecognition === "yes") s += 2;
  if (a.reachedNationalOrIntl === "yes") s += 2;
  s += { none: 0, "1_5": 1, "6_15": 2, "16_plus": 4 }[a.professionalNetwork];             // new
  s += { none: 0, lt100: 1, "100_1k": 3, "1k_plus": 5 }[a.publicAudience];                // new

  // Pillar-depth bonus: reward breadth across multiple pillars (up to +10%).
  let pillarsWithDepth = 0;
  if (tierWeight[a.shippedProjectTier] >= 3 || a.publishedExternally === "yes") pillarsWithDepth++;
  if (tierWeight[a.competitionTier] >= 3 || a.competitionResult === "top10" || a.competitionResult === "winner") pillarsWithDepth++;
  if (tierWeight[a.leadershipTier] >= 3 || a.teamSizeLed === "15_50" || a.teamSizeLed === "50_plus") pillarsWithDepth++;
  if (a.researchTier === "professor_mentored" || a.researchTier === "published") pillarsWithDepth++;
  if (a.internshipTier === "structured_4w_plus" || a.internshipTier === "paid_or_competitive") pillarsWithDepth++;
  s = s * (1 + Math.min(0.10, pillarsWithDepth * 0.025));

  // Raw scale now totals ~129 across 35 questions; normalise back to ~100
  // so existing level thresholds (12, 26, 42, 58, 70, 80, 88, 94, 98) hold.
  s = s * (100 / 129);

  // Blend with platform-computed overall score (60/40 toward the test).
  const blended = Math.round(s * 0.6 + overallScore * 0.4);

  // Soft grade cap — earlier grades shouldn't be placed too high.
  const cap: Record<number, LevelId> =
    { 8: 3, 9: 5, 10: 7, 11: 9, 12: 10 } as any;
  const gradeCap = cap[gradeNum(gradeStr)] ?? 10;

  let level: LevelId = 1;
  for (const L of LEVELS) if (blended >= L.unlockScore) level = L.id;
  return Math.min(level, gradeCap) as LevelId;
}

export function getLevelById(id: LevelId): LevelDef {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

export function getCurrentLevel(overallScore: number, placementOverride?: LevelId): LevelId {
  if (placementOverride) return placementOverride;
  let level: LevelId = 1;
  for (const L of LEVELS) if (overallScore >= L.unlockScore) level = L.id;
  return level;
}

// ── Stages: a Duolingo-style sub-level system ─────────────────────────
// Each Level is split into 20 Stages. 5 Levels × 20 Stages = 100 nodes.

export type SubIndex = number; // 1..STAGES_PER_LEVEL

export const STAGES_PER_LEVEL = 20;

export interface StageDef {
  id: string;            // e.g. "1.4"
  index: number;         // 0..99 — global order
  level: LevelId;
  subIndex: SubIndex;    // 1..20 within level
  name: string;          // short verb-led name
  description: string;   // user-facing meaning
  outcome: string;       // what success looks like
  unlockScore: number;   // global score to unlock
}

const STAGE_TEMPLATES: Array<{
  level: LevelId;
  sub: SubIndex;
  name: string;
  description: string;
  outcome: string;
}> = [
  // ── Level 1 — Foundation (Stages 1.1–1.20) ───────────────────────────
  { level: 1, sub: 1,  name: "Orient",            description: "Lock your academic base — pick the highest-rigor courses available and know exactly where you stand academically.", outcome: "Highest math/science track enrolled + first quarter grade ≥ A-/85%." },
  { level: 1, sub: 2,  name: "Diagnose",          description: "Take a full-length diagnostic standardized test under timed conditions to set your baseline.", outcome: "Diagnostic score logged in Outcomes + 8-week prep plan written." },
  { level: 1, sub: 3,  name: "Habits",            description: "Build the daily study + reading habits that compound across four years of high school.", outcome: "Daily 30-min focused study block + 1 foundational book read." },
  { level: 1, sub: 4,  name: "Read Deep",         description: "Read one foundational book in your intended major and publish a 1-page review online.", outcome: "1-page review published on LinkedIn or a personal blog." },
  { level: 1, sub: 5,  name: "Profile",           description: "Set up the public surfaces (LinkedIn, GitHub, portfolio) admissions officers will eventually see.", outcome: "Live LinkedIn profile + at least one public artefact." },
  { level: 1, sub: 6,  name: "Notes System",      description: "Build a personal note-taking system (Notion, Obsidian, paper) you actually use every week.", outcome: "Single source of truth with 4+ weeks of consistent notes." },
  { level: 1, sub: 7,  name: "Track Grades",      description: "Log every quarter grade in Outcomes so you can spot drift in any subject early.", outcome: "Every current subject grade logged with date stamps." },
  { level: 1, sub: 8,  name: "Office Hours",      description: "Visit one teacher's office hours every week for one full term to build real academic rapport.", outcome: "8 consecutive weeks of attended office hours." },
  { level: 1, sub: 9,  name: "Reading List",      description: "Build and start a 12-book reading list for your intended major over the next year.", outcome: "12 books queued + first book finished with notes." },
  { level: 1, sub: 10, name: "Vocabulary",        description: "Master 50 domain-specific terms used by professionals in your field — speak the language.", outcome: "Flashcard deck of 50 terms with self-tested recall." },
  { level: 1, sub: 11, name: "Time Audit",        description: "Audit one full week of your time in 30-min blocks. Cut at least 5 hours of low-value time.", outcome: "Time log + redesigned weekly schedule." },
  { level: 1, sub: 12, name: "Email Hygiene",     description: "Set up a clean student email + professional signature with your real links and pronouns.", outcome: "Signature live on outbound emails + inbox at zero unread." },
  { level: 1, sub: 13, name: "Counsellor Sync",   description: "Book and run your first formal 30-min planning meeting with your school counsellor.", outcome: "Meeting completed + shared 12-month plan written." },
  { level: 1, sub: 14, name: "Curriculum Map",    description: "Map every course you'll take from now until graduation, with rigor level and grade target.", outcome: "Multi-year course map saved in your profile." },
  { level: 1, sub: 15, name: "Test Plan",         description: "Lock the exact dates for your first official standardized test sitting and registration.", outcome: "Test registered + payment confirmation saved." },
  { level: 1, sub: 16, name: "Subject Spike",     description: "Pick one subject to score top-decile in this year — your first academic spike.", outcome: "Subject chosen + weekly extra-practice block scheduled." },
  { level: 1, sub: 17, name: "Tutor or Group",    description: "Join a study group or arrange targeted tutoring for your weakest topic so it stops dragging you.", outcome: "Recurring weekly session locked in calendar." },
  { level: 1, sub: 18, name: "Health Base",       description: "Set a sleep + exercise schedule that actually protects your study capacity, not just intention.", outcome: "Sleep window + 3 workouts/week logged for 4 weeks." },
  { level: 1, sub: 19, name: "Family Brief",      description: "Run a 30-minute structured meeting with parents/guardians on your high-level college plan.", outcome: "1-page shared plan + agreed monthly check-in cadence." },
  { level: 1, sub: 20, name: "Foundation Review", description: "Audit every Level 1 outcome. Identify and close gaps before you unlock Level 2.", outcome: "Written gap review + actions to close each open item." },

  // ── Level 2 — Exploration (Stages 2.1–2.20) ──────────────────────────
  { level: 2, sub: 1,  name: "Discover",          description: "Try 3–5 different activities cheaply. Find what you'd do for free at midnight on a Friday.", outcome: "Shortlist of 2 activities you'll commit to next semester." },
  { level: 2, sub: 2,  name: "Commit",            description: "Join (or co-found) a school club aligned with your intended major. Attend every single meeting.", outcome: "Active member status + 8 consecutive weeks of attendance." },
  { level: 2, sub: 3,  name: "Workshop",          description: "Help organize and run one workshop, event, or session inside your club.", outcome: "1 event run with attendance numbers + photos for portfolio." },
  { level: 2, sub: 4,  name: "Skill Stack",       description: "Pick one tactical skill in your field (Python, DCF, lab technique) and complete a structured online course.", outcome: "Course certificate + small public artefact built using the skill." },
  { level: 2, sub: 5,  name: "First Output",      description: "Produce your first small public output — a paper-portfolio, mini-project, or essay tied to your major.", outcome: "One published artefact linked from LinkedIn." },
  { level: 2, sub: 6,  name: "Shadow",            description: "Shadow one professional in your field for at least half a day and write a debrief.", outcome: "Half-day shadow completed + 1-page reflection saved." },
  { level: 2, sub: 7,  name: "Podcast Stack",     description: "Subscribe to 3 industry-leading podcasts in your major and listen weekly to build fluency.", outcome: "3 subscriptions + listening log for 4 weeks." },
  { level: 2, sub: 8,  name: "Newsletter",        description: "Subscribe to 2 leading newsletters in your field and journal a key takeaway from each edition.", outcome: "2 subscriptions + weekly takeaway journal." },
  { level: 2, sub: 9,  name: "Conference",        description: "Attend one in-person or virtual conference, summit, or seminar in your field.", outcome: "Attendance proof + 1-page notes shared." },
  { level: 2, sub: 10, name: "Skill Two",         description: "Add a second tactical skill course (data, design, lab, finance modeling) to broaden your toolkit.", outcome: "Second certificate + artefact applying both skills." },
  { level: 2, sub: 11, name: "Peer Network",      description: "Connect with 5 students nationally or globally who share your major interest.", outcome: "5 introductions made + recurring chat or call set up." },
  { level: 2, sub: 12, name: "Side Project",      description: "Run a 4-week solo side project to test one hypothesis or curiosity inside your major.", outcome: "Side project shipped + short writeup published." },
  { level: 2, sub: 13, name: "Online Community",  description: "Become an active contributor in one professional online community (Discord, forum, subreddit).", outcome: "20+ meaningful contributions over 4 weeks." },
  { level: 2, sub: 14, name: "Course Map",        description: "Research the actual undergraduate courses your target major requires at 3 universities.", outcome: "Side-by-side course map saved with your notes." },
  { level: 2, sub: 15, name: "Major Stress Test", description: "Draft a 1-page 'why this major' brief. Pressure-test it with two adults who'll push back.", outcome: "Final 1-page brief revised after critique." },
  { level: 2, sub: 16, name: "Outcomes Sync",     description: "Log every current activity, role, and metric into Outcomes for accurate signal.", outcome: "Outcomes profile reflects your real activity stack." },
  { level: 2, sub: 17, name: "Critic",            description: "Find one credible critic of your major and steelman their argument in writing.", outcome: "1-page steelman + your own counter-argument." },
  { level: 2, sub: 18, name: "Demo Day",          description: "Present your first public output to your club or family in a structured 5-minute talk.", outcome: "Talk delivered + 1 page of audience feedback." },
  { level: 2, sub: 19, name: "Pivot Check",       description: "Decide: continue this major direction or switch — and document the reasoning honestly.", outcome: "Written decision memo dated and stored." },
  { level: 2, sub: 20, name: "Exploration Review", description: "Audit Level 2 outcomes. Pick the one activity you'll go truly deep on in Level 3.", outcome: "One chosen anchor activity + commit memo written." },

  // ── Level 3 — Building (Stages 3.1–3.20) ─────────────────────────────
  { level: 3, sub: 1,  name: "Pick Problem",      description: "Choose one real, specific problem in your community or field you'll spend 10+ weeks on.", outcome: "Written 1-page problem brief + scoped 10-week plan." },
  { level: 3, sub: 2,  name: "Ship Project",      description: "Build and ship a substantive project tied to your major, with measurable impact.", outcome: "Documented project: problem, process, and a quantified result." },
  { level: 3, sub: 3,  name: "Compete",           description: "Enter at least one national-tier competition, hackathon, or olympiad this cycle.", outcome: "Submitted entry + verified proof of result uploaded." },
  { level: 3, sub: 4,  name: "Lead",              description: "Step into a real leadership title — captain, founder, or lead — not just member.", outcome: "Title held + one tangible deliverable owned end-to-end." },
  { level: 3, sub: 5,  name: "Document",          description: "Write a public post or case study about what you built and what you learned.", outcome: "Published post with photos and numbers shared on LinkedIn." },
  { level: 3, sub: 6,  name: "User Interviews",   description: "Run 5 structured user interviews to sharpen your project's problem statement.", outcome: "Interview notes + revised problem statement." },
  { level: 3, sub: 7,  name: "Iterate",           description: "Ship version 2 of your project based on real user feedback, not assumptions.", outcome: "v2 deployed with changelog tied to feedback." },
  { level: 3, sub: 8,  name: "Metrics",           description: "Define and start tracking 3 leading metrics that prove your project is working.", outcome: "Dashboard or sheet updating weekly for 4 weeks." },
  { level: 3, sub: 9,  name: "Press",             description: "Pitch one local outlet, newsletter, school paper, or blog to cover your project.", outcome: "Pitch sent + coverage confirmed or follow-up scheduled." },
  { level: 3, sub: 10, name: "Second Comp",       description: "Enter a second competition in a different format (case, hack, olympiad, debate).", outcome: "Submitted + result logged in Outcomes." },
  { level: 3, sub: 11, name: "Recruit",           description: "Recruit and properly onboard 2 collaborators into your project with defined roles.", outcome: "2 collaborators active + 1-page role doc shared." },
  { level: 3, sub: 12, name: "Faculty Sponsor",   description: "Secure a teacher or faculty sponsor who'll vouch for the project formally.", outcome: "Written sponsorship from a named faculty member." },
  { level: 3, sub: 13, name: "Funding",           description: "Apply for one micro-grant, sponsorship, or competition prize budget for the project.", outcome: "Application submitted + outcome logged." },
  { level: 3, sub: 14, name: "Talk",              description: "Give one public talk or workshop on what you've built to an audience of 20+.", outcome: "Talk delivered + recording or slides saved." },
  { level: 3, sub: 15, name: "Open Source",       description: "Open source one artifact (code, dataset, template, playbook) others can reuse.", outcome: "Public repo or doc with README + first external user." },
  { level: 3, sub: 16, name: "Cross-Discipline",  description: "Add one element from outside your major to deepen the project's range.", outcome: "Visible cross-discipline component integrated." },
  { level: 3, sub: 17, name: "Reflection Memo",   description: "Write a private 2-page memo on what's actually working in this project vs noise.", outcome: "Memo dated + 3 next actions identified." },
  { level: 3, sub: 18, name: "Portfolio",         description: "Build a one-page portfolio site that showcases this project and your stack.", outcome: "Live portfolio URL added to LinkedIn." },
  { level: 3, sub: 19, name: "Outcomes Refresh",  description: "Re-log every activity in Outcomes with quantified outcomes and updated roles.", outcome: "Outcomes profile audited and refreshed." },
  { level: 3, sub: 20, name: "Building Review",   description: "Audit Level 3. Lock the one spike that will define everything you do in Level 4.", outcome: "Chosen spike + 12-week deep-work plan drafted." },

  // ── Level 4 — Differentiation (Stages 4.1–4.20) ──────────────────────
  { level: 4, sub: 1,  name: "Spike",             description: "Commit to one specific niche inside your major and go 10× deeper than peers. This becomes your story.", outcome: "Chosen spike + 12-week deep-work plan written." },
  { level: 4, sub: 2,  name: "Mentor",            description: "Cold email 10 professors, researchers, or industry mentors. Secure one.", outcome: "Mentor secured + recurring check-ins set." },
  { level: 4, sub: 3,  name: "Research",          description: "Begin a real research or applied work track under your mentor with a concrete deliverable.", outcome: "First research deliverable shipped and saved." },
  { level: 4, sub: 4,  name: "Scale",             description: "Scale one of your activities beyond your school — regional, multi-school, or press reach.", outcome: "Documented growth: more attendees, broader reach, or media mention." },
  { level: 4, sub: 5,  name: "Recognition",       description: "Earn one external piece of recognition — award, prize, feature, or notable placement.", outcome: "Verified recognition with proof uploaded." },
  { level: 4, sub: 6,  name: "Literature Review", description: "Write a 5-page literature review of your spike's current state-of-the-art.", outcome: "Literature review saved + shared with mentor." },
  { level: 4, sub: 7,  name: "Original Data",     description: "Collect or generate one original dataset relevant to your spike's question.", outcome: "Dataset documented + stored in a citable location." },
  { level: 4, sub: 8,  name: "Methods",           description: "Learn and properly apply one rigorous method (statistics, lab protocol, framework).", outcome: "Method applied + writeup of approach + result." },
  { level: 4, sub: 9,  name: "Critique Loop",     description: "Get 3 expert critiques on your work and revise based on each round of feedback.", outcome: "v3 of work + log of critiques and changes made." },
  { level: 4, sub: 10, name: "Cross-Country",     description: "Reach beyond your country: collaborate with a peer or mentor based abroad.", outcome: "Active collaboration + shared output." },
  { level: 4, sub: 11, name: "Sustained Output",  description: "Publish output every two weeks for one full term to prove durability.", outcome: "6+ public outputs across the term." },
  { level: 4, sub: 12, name: "Speaker",           description: "Get invited (or pitch yourself) to speak at one external event in your spike.", outcome: "Talk delivered + recording / slides preserved." },
  { level: 4, sub: 13, name: "Workshop Series",   description: "Run a 3-part workshop series on your spike for younger students.", outcome: "3 sessions delivered + attendance + feedback collected." },
  { level: 4, sub: 14, name: "Audience",          description: "Build an audience of 500+ on one platform tied to your work (newsletter, IG, GitHub).", outcome: "Audience metric proven with screenshots and growth log." },
  { level: 4, sub: 15, name: "Partnership",       description: "Land a formal partnership with a school, NGO, lab, or company tied to your spike.", outcome: "Signed MOU, letter, or formal acknowledgement." },
  { level: 4, sub: 16, name: "Awards Pipeline",   description: "Identify and submit to 3 award programs aligned with your spike's domain.", outcome: "3 submissions logged with deadlines and outcomes." },
  { level: 4, sub: 17, name: "Long-Form",         description: "Publish one long-form piece (paper, essay, deep video) framing your thesis clearly.", outcome: "Long-form artefact published with shareable link." },
  { level: 4, sub: 18, name: "Mentor Others",     description: "Mentor 2 younger students through their own first project. Teaching deepens mastery.", outcome: "2 mentees with documented progress over 8+ weeks." },
  { level: 4, sub: 19, name: "Outcomes Refresh",  description: "Re-log all spike work in Outcomes with quantitative outcomes and links.", outcome: "Outcomes profile audited; metrics current." },
  { level: 4, sub: 20, name: "Differentiation Review", description: "Audit Level 4. Lock the single narrative thread you'll carry into Level 5.", outcome: "1-line spike thesis + supporting evidence list." },

  // ── Level 5 — Elite (Stages 5.1–5.20) ────────────────────────────────
  { level: 5, sub: 1,  name: "Internship",        description: "Land a real-world internship at an organization in your field. The most powerful single signal you can carry.", outcome: "4–8 week placement secured + supervisor letter." },
  { level: 5, sub: 2,  name: "Publish",           description: "Publish original research, a launched product, or substantial work to a real public audience.", outcome: "Paper on arXiv/Medium OR product with real users + traction numbers." },
  { level: 5, sub: 3,  name: "Endorsements",      description: "Secure 2 strong recommendation letters from people who can speak to your specific spike.", outcome: "2 LORs drafted and reviewed with recommenders." },
  { level: 5, sub: 4,  name: "Narrative",         description: "Lock your application narrative: identify the single thread tying all your work together.", outcome: "1-line 'why' + activity list mapped to a single story." },
  { level: 5, sub: 5,  name: "Submit",            description: "Polish your essays in the Application Builder and submit to your target list.", outcome: "Personal statement + supplements finalized." },
  { level: 5, sub: 6,  name: "Top Internship",    description: "Secure an internship at a top-tier organisation most peers cannot access.", outcome: "Top-tier placement confirmed in writing." },
  { level: 5, sub: 7,  name: "Independent Project", description: "Run a second flagship project entirely independently to prove range.", outcome: "Project shipped + writeup with results." },
  { level: 5, sub: 8,  name: "International",     description: "Reach an international stage: competition finalist, conference speaker, or international publication.", outcome: "Verified international placement, role, or coverage." },
  { level: 5, sub: 9,  name: "Press Coverage",    description: "Land one notable press mention or feature about your work in a real outlet.", outcome: "Link to feature saved + screenshot archived." },
  { level: 5, sub: 10, name: "Awarded",           description: "Win one externally recognised award or top placement in a serious program.", outcome: "Award proof uploaded + listed in Outcomes." },
  { level: 5, sub: 11, name: "Mentor Network",    description: "Cultivate a 5-person mentor circle across academia and industry tied to your spike.", outcome: "5 named mentors + cadence with each one." },
  { level: 5, sub: 12, name: "Voice",             description: "Maintain a public voice (newsletter, podcast, talks) for 8+ consecutive weeks.", outcome: "8+ consecutive weekly outputs with audience metrics." },
  { level: 5, sub: 13, name: "Funding Story",     description: "Have one piece of paid work or a funded project on record — money is a real signal.", outcome: "Paid engagement or grant documented." },
  { level: 5, sub: 14, name: "Translation",       description: "Translate your spike into an essay-ready story arc with characters, conflict, and stakes.", outcome: "1-page story arc + 3 specific anecdotes selected." },
  { level: 5, sub: 15, name: "College List",      description: "Lock 8–12 colleges that align with your spike and your financial fit, not just brand.", outcome: "Final list saved with reach/match/safety labels." },
  { level: 5, sub: 16, name: "Supplements Map",   description: "Map every supplemental essay required across your full college list.", outcome: "Spreadsheet mapping essays per school with word counts." },
  { level: 5, sub: 17, name: "Essay Drafts",      description: "Draft personal statement + 3 supplements inside the Application Builder.", outcome: "4 first drafts saved in Application Builder." },
  { level: 5, sub: 18, name: "Review Loop",       description: "Get 3 outside reviews on every essay; iterate to a confident v3.", outcome: "v3 essays + reviewer notes archived." },
  { level: 5, sub: 19, name: "Apply",             description: "Submit your early-round applications complete and on time.", outcome: "Early-round applications submitted with confirmations." },
  { level: 5, sub: 20, name: "Submit Regular",    description: "Submit all remaining applications and archive a complete portfolio for the record.", outcome: "All applications submitted + portfolio archived." },

  // ── Level 6 — Mastery (Stages 6.1–6.20) ──────────────────────────────
  { level: 6, sub: 1,  name: "Domain Map",        description: "Map your entire field's subfields and pick exactly where you will become the local expert.", outcome: "Annotated map saved + chosen niche written down." },
  { level: 6, sub: 2,  name: "Reading Canon",     description: "Read 10 canonical works in your spike and annotate each one rigorously.", outcome: "10 annotated books logged with takeaways." },
  { level: 6, sub: 3,  name: "Teach Back",        description: "Teach one of your spike's concepts to a non-expert until they can explain it back.", outcome: "Recorded teaching session + listener's correct explanation." },
  { level: 6, sub: 4,  name: "Office Bookings",   description: "Have 3 underclassmen book your time monthly for guidance in your spike.", outcome: "Calendar with recurring monthly bookings for 3+ mentees." },
  { level: 6, sub: 5,  name: "Local Authority",   description: "Become the named go-to person at your school for your spike — formally referenced by teachers.", outcome: "Written or verbal reference from a teacher citing your expertise." },
  { level: 6, sub: 6,  name: "Newsletter v1",     description: "Launch a niche newsletter on your spike and grow it to 100+ subscribers.", outcome: "Live newsletter + 100+ verified subscribers." },
  { level: 6, sub: 7,  name: "Repeated Wins",     description: "Win or place in 3 distinct competitions in your spike to prove repeatable performance.", outcome: "3 placements with verified proof in Outcomes." },
  { level: 6, sub: 8,  name: "Bridge Skill",      description: "Add an adjacent skill (writing, analytics, public speaking) at genuinely fluent level.", outcome: "Public artefact demonstrating the new skill." },
  { level: 6, sub: 9,  name: "Workshop Tour",     description: "Run your workshop at 3 different schools or organizations.", outcome: "3 sessions delivered with attendance proof from each." },
  { level: 6, sub: 10, name: "Council Seat",      description: "Hold a leadership seat in a regional or national student body or association.", outcome: "Official role title + appointment confirmation." },
  { level: 6, sub: 11, name: "Op-Ed",             description: "Publish an op-ed on your spike in a real outlet, not a school paper.", outcome: "Published op-ed with shareable URL." },
  { level: 6, sub: 12, name: "Toolchain",         description: "Build a tool, template, or framework that other people in your field actively use.", outcome: "Tool live + usage metrics from 5+ external users." },
  { level: 6, sub: 13, name: "Audience 2k",       description: "Grow one platform audience to 2,000+ genuinely engaged followers tied to your work.", outcome: "Verified 2k+ followers with engagement screenshots." },
  { level: 6, sub: 14, name: "Curator",           description: "Curate and maintain a public list, library, or directory that becomes a reference.", outcome: "Public resource live + first external reference link." },
  { level: 6, sub: 15, name: "Cross-Train",       description: "Add a complementary domain (econ + cs, bio + ethics) intentionally to broaden your range.", outcome: "Documented project that visibly combines both domains." },
  { level: 6, sub: 16, name: "Master Class",      description: "Take one university-level course (MIT OCW, Coursera, EdX) and ace the final assessment.", outcome: "Course certificate + final score logged." },
  { level: 6, sub: 17, name: "Repeatable Process", description: "Document the exact process you used to build your spike so others can copy it.", outcome: "Step-by-step playbook published or shared." },
  { level: 6, sub: 18, name: "Mentor Reviews",    description: "Get 3 written endorsements from senior people who have observed your spike work.", outcome: "3 written endorsements collected." },
  { level: 6, sub: 19, name: "Visibility Audit",  description: "Audit every public surface (LinkedIn, site, GitHub) and tighten messaging across all of them.", outcome: "Audit checklist done + updates pushed to every surface." },
  { level: 6, sub: 20, name: "Mastery Review",    description: "Audit Level 6. Pick the original contribution you'll attempt in Level 7.", outcome: "Chosen contribution + 1-page brief written." },

  // ── Level 7 — Pioneer (Stages 7.1–7.20) ──────────────────────────────
  { level: 7, sub: 1,  name: "Whitespace",        description: "Identify and document a real gap in your field that you will personally fill.", outcome: "1-page gap analysis with supporting evidence." },
  { level: 7, sub: 2,  name: "Hypothesis",        description: "Write a falsifiable hypothesis or product thesis for your contribution.", outcome: "Hypothesis written + criteria for success / failure." },
  { level: 7, sub: 3,  name: "First Prototype",   description: "Build the roughest possible prototype or draft of your new thing as fast as possible.", outcome: "Functional v1 saved + screenshot or live link." },
  { level: 7, sub: 4,  name: "Test Cohort",       description: "Get 10 real users, readers, or testers to engage with your prototype and respond honestly.", outcome: "10 responses collected + synthesized into 1 page." },
  { level: 7, sub: 5,  name: "Iterate v2",        description: "Ship version 2 with measurable improvements over v1 based on cohort feedback.", outcome: "v2 deployed + changelog tied to specific feedback." },
  { level: 7, sub: 6,  name: "Public Launch",     description: "Publicly launch the contribution with clear positioning and a launch post.", outcome: "Launch live + 1,000 impressions on launch post." },
  { level: 7, sub: 7,  name: "Press Pitch",       description: "Pitch 10 outlets, journalists, or influencers; secure at least 1 mention.", outcome: "10 pitches sent + 1 mention secured." },
  { level: 7, sub: 8,  name: "100 Users",         description: "Reach 100 active users, readers, or participants for your launch.", outcome: "Verified 100+ active users / analytics screenshot." },
  { level: 7, sub: 9,  name: "Revenue Test",      description: "Attempt to monetize even at $1 — see if anyone will actually pay for what you built.", outcome: "First transaction logged + price-point note." },
  { level: 7, sub: 10, name: "Conference Talk",   description: "Speak at one external conference about what you built and what you learned.", outcome: "Confirmed speaker slot + talk delivered." },
  { level: 7, sub: 11, name: "Collaborators",     description: "Recruit 3 collaborators who own specific pieces of the work with you.", outcome: "3 named collaborators + RACI doc shared." },
  { level: 7, sub: 12, name: "Documentation",     description: "Produce world-class documentation or onboarding for your contribution.", outcome: "Docs site or guide live + first user onboarded without your help." },
  { level: 7, sub: 13, name: "Iterate v3",        description: "Ship v3 based on usage data; close the major gaps your users keep hitting.", outcome: "v3 deployed + measurable improvement on one core metric." },
  { level: 7, sub: 14, name: "Distribution",      description: "Establish one repeatable distribution channel that consistently brings new users.", outcome: "Channel identified + new users from it 3 weeks running." },
  { level: 7, sub: 15, name: "Case Study",        description: "Write a 5-page case study of what you built, what worked, and what didn't.", outcome: "Case study published with shareable URL." },
  { level: 7, sub: 16, name: "External Endorsement", description: "Get a serious external voice to publicly endorse the work in writing.", outcome: "Endorsement quote + link saved." },
  { level: 7, sub: 17, name: "1000 Users",        description: "Reach 1,000+ users, readers, or participants through compounding distribution.", outcome: "1,000+ verified users with analytics proof." },
  { level: 7, sub: 18, name: "Press Mention",     description: "Land a mention in a tier-1 outlet, journal, or major publication.", outcome: "Coverage link saved + screenshot archived." },
  { level: 7, sub: 19, name: "Sustainability",    description: "Set up systems so the contribution runs without you actively working on it for 4 weeks.", outcome: "Documented systems + 4 weeks of hands-off operation." },
  { level: 7, sub: 20, name: "Pioneer Review",    description: "Audit Level 7. Define the institution you'll plug into for Level 8.", outcome: "Target institution chosen + outreach plan written." },

  // ── Level 8 — Authority (Stages 8.1–8.20) ────────────────────────────
  { level: 8, sub: 1,  name: "University Lab",    description: "Place yourself formally inside a university lab or research group.", outcome: "Confirmed lab placement + named principal investigator." },
  { level: 8, sub: 2,  name: "Conference Submission", description: "Submit a paper, talk, or poster to a recognized academic or industry conference.", outcome: "Submission receipt + submitted artefact archived." },
  { level: 8, sub: 3,  name: "Peer Review",       description: "Receive substantive peer review on your work and revise based on it.", outcome: "Reviewer notes + revised manuscript saved." },
  { level: 8, sub: 4,  name: "Journal Submission", description: "Submit your work to a real journal or vetted publication outlet.", outcome: "Submission confirmation from a real journal." },
  { level: 8, sub: 5,  name: "Industry Bridge",   description: "Get one industry organization to formally back or use your work.", outcome: "Letter of support, contract, or written partnership." },
  { level: 8, sub: 6,  name: "Standards Body",    description: "Engage with a standards body, association, or council in your field.", outcome: "Membership or contributor status + 1 contribution logged." },
  { level: 8, sub: 7,  name: "Co-Author",         description: "Co-author a public artifact with a credentialed expert in your field.", outcome: "Joint artifact with both names credited publicly." },
  { level: 8, sub: 8,  name: "Real Funding",      description: "Secure real funding ($500+) or a competitive grant for your work.", outcome: "Grant or funding confirmation in writing." },
  { level: 8, sub: 9,  name: "Talk Tour",         description: "Get booked for 3 speaking engagements within one quarter.", outcome: "3 confirmed talks + 1 recording archived." },
  { level: 8, sub: 10, name: "Advisor Council",   description: "Form an advisor council of 3 senior people you meet with regularly.", outcome: "3 advisors + recurring meeting cadence." },
  { level: 8, sub: 11, name: "Press Tour",        description: "Get featured in 3 different outlets within one quarter.", outcome: "3 distinct coverage links saved." },
  { level: 8, sub: 12, name: "Citation",          description: "Get cited or referenced by someone else's serious public work.", outcome: "Citation link archived." },
  { level: 8, sub: 13, name: "Awards Stack",      description: "Win one nationally-recognized award in your spike.", outcome: "Award certificate + announcement link saved." },
  { level: 8, sub: 14, name: "Audience 5k",       description: "Grow audience to 5,000+ on one platform with healthy engagement.", outcome: "5,000+ followers + engagement screenshot." },
  { level: 8, sub: 15, name: "Documented Influence", description: "Show concrete evidence your work changed someone else's decision or behavior.", outcome: "Written testimonial describing the changed decision." },
  { level: 8, sub: 16, name: "Cross-Institution", description: "Collaborate formally with someone from a different institution or country.", outcome: "Joint output + named affiliations on both sides." },
  { level: 8, sub: 17, name: "Publication v2",    description: "Publish your second major piece building on the first.", outcome: "Second publication live + linked to first." },
  { level: 8, sub: 18, name: "Speaker Bureau",    description: "Get listed in a real speaker bureau, directory, or expert database.", outcome: "Public listing live + profile link." },
  { level: 8, sub: 19, name: "Authority Audit",   description: "Audit every external proof point and consolidate into a single professional press kit.", outcome: "Press kit PDF + public landing page." },
  { level: 8, sub: 20, name: "Authority Review",  description: "Audit Level 8. Pick the system you'll build to scale in Level 9.", outcome: "Chosen system + scaling plan written." },

  // ── Level 9 — Legacy (Stages 9.1–9.20) ───────────────────────────────
  { level: 9, sub: 1,  name: "Successor Plan",    description: "Identify and brief 2 underclassmen to inherit your initiative after you leave.", outcome: "2 named successors + handoff plan documented." },
  { level: 9, sub: 2,  name: "Playbook",          description: "Write the full operating playbook for your initiative so anyone can run it.", outcome: "Playbook published internally and accessible." },
  { level: 9, sub: 3,  name: "Foundation",        description: "Formalize your initiative (registered org, nonprofit, LLC, or equivalent entity).", outcome: "Legal entity registered with documentation." },
  { level: 9, sub: 4,  name: "Board Seat",        description: "Have 3 outside adults sit on a real advisory board for your initiative.", outcome: "3 board members + recurring meeting cadence." },
  { level: 9, sub: 5,  name: "Funding Round",     description: "Raise a small funding round ($5k+) for the initiative.", outcome: "$5k+ raised + financial records started." },
  { level: 9, sub: 6,  name: "Permanent Asset",   description: "Build one permanent public asset (site, dataset, library) that will last past your tenure.", outcome: "Asset live + ownership transfer plan documented." },
  { level: 9, sub: 7,  name: "Press Kit",         description: "Create a complete press kit and distribute to 20 outlets in your field.", outcome: "Press kit sent + 20 outreach records logged." },
  { level: 9, sub: 8,  name: "Brand Identity",    description: "Lock the brand identity, voice, and visual language for the initiative.", outcome: "Brand guide PDF + applied across all surfaces." },
  { level: 9, sub: 9,  name: "Multiple Programs", description: "Run 2+ distinct programs under the umbrella of your initiative.", outcome: "2 active programs with separate outcomes." },
  { level: 9, sub: 10, name: "Audience 10k",      description: "Cross 10,000 followers/subscribers on one platform tied to the initiative.", outcome: "10k+ followers verified with screenshots." },
  { level: 9, sub: 11, name: "Annual Event",      description: "Host the first edition of an annual flagship event under the initiative.", outcome: "Event held + attendance numbers + photos." },
  { level: 9, sub: 12, name: "Geographic Reach",  description: "Establish presence in 3+ cities, regions, or countries.", outcome: "3 locations active + lead per location named." },
  { level: 9, sub: 13, name: "Hire Help",         description: "Bring on 1+ paid contractor, intern, or fellow to extend your capacity.", outcome: "Paid agreement signed + 4 weeks of work delivered." },
  { level: 9, sub: 14, name: "Documentation v2",  description: "Update all systems documentation to professional, externally-shareable quality.", outcome: "Docs v2 live + reviewed by an outside reader." },
  { level: 9, sub: 15, name: "Recognition Stack", description: "Win or be nominated for 2 awards in one cycle.", outcome: "2 award nominations or wins documented." },
  { level: 9, sub: 16, name: "Citation Stack",    description: "Be cited or referenced by 5+ external pieces of work.", outcome: "5 external citations archived with links." },
  { level: 9, sub: 17, name: "Permanent Press",   description: "Earn coverage in 2 tier-1 outlets in one cycle.", outcome: "2 tier-1 coverage links archived." },
  { level: 9, sub: 18, name: "Long-Form Book",    description: "Publish a long-form ebook, guide, or report (50+ pages) on your domain.", outcome: "Long-form artefact published with shareable link." },
  { level: 9, sub: 19, name: "Sustainability Audit", description: "Confirm the initiative will continue running for 6+ months without your daily involvement.", outcome: "Audit passed + 4-week founder-absence test." },
  { level: 9, sub: 20, name: "Legacy Review",     description: "Audit Level 9. Lock the personal standard you'll hold yourself to in Level 10.", outcome: "Written standard + accountability partner named." },

  // ── Level 10 — Apex (Stages 10.1–10.20) ──────────────────────────────
  { level: 10, sub: 1,  name: "Original Research",  description: "Run a fully original research project with rigorous methods and pre-defined outcomes.", outcome: "Research protocol approved + study underway." },
  { level: 10, sub: 2,  name: "Pre-Registration",   description: "Pre-register your study in a public registry to commit to your methods upfront.", outcome: "Pre-registration link saved." },
  { level: 10, sub: 3,  name: "Conference Acceptance", description: "Get a paper, poster, or talk accepted at a peer-reviewed conference.", outcome: "Acceptance email saved + program listing." },
  { level: 10, sub: 4,  name: "Journal Acceptance", description: "Get a paper accepted by a peer-reviewed journal in your field.", outcome: "Acceptance letter + DOI." },
  { level: 10, sub: 5,  name: "Patent or IP",       description: "File a patent, copyright, or formal IP filing for your work.", outcome: "Filing receipt + application number." },
  { level: 10, sub: 6,  name: "Industry Contract",  description: "Sign a real contract with an external organization for paid work or partnership.", outcome: "Executed contract archived." },
  { level: 10, sub: 7,  name: "Speaking Fee",       description: "Get paid for one speaking engagement, however small the fee.", outcome: "Paid invoice + payment confirmation." },
  { level: 10, sub: 8,  name: "Mentor 5",           description: "Mentor 5 students who each ship their own real project end-to-end.", outcome: "5 mentee projects shipped with attribution." },
  { level: 10, sub: 9,  name: "Annual Report",      description: "Publish your first annual report on the initiative with metrics and lessons.", outcome: "Annual report PDF published publicly." },
  { level: 10, sub: 10, name: "Audience 25k",       description: "Cross 25,000 followers or subscribers on one platform.", outcome: "25k+ verified with screenshots." },
  { level: 10, sub: 11, name: "Funding Round 2",    description: "Raise a second funding round at a higher amount than the first.", outcome: "Second round closed + amount documented." },
  { level: 10, sub: 12, name: "Replicable System",  description: "Get a second chapter, branch, or instance of your initiative running independently.", outcome: "Second instance live under separate leadership." },
  { level: 10, sub: 13, name: "Real Press",         description: "Be featured in a major national outlet (NYT, Forbes, WSJ, BBC, equivalent).", outcome: "Tier-1 national coverage link saved." },
  { level: 10, sub: 14, name: "Awards Sweep",       description: "Win 2+ national or international awards in one application cycle.", outcome: "2+ awards documented with proof." },
  { level: 10, sub: 15, name: "University Endorsement", description: "Get a formal endorsement from a university department or named faculty member.", outcome: "Signed endorsement letter on letterhead." },
  { level: 10, sub: 16, name: "Final Apps",         description: "Submit applications to your full target list with full confidence in every essay.", outcome: "All target applications submitted." },
  { level: 10, sub: 17, name: "Interview Prep",     description: "Complete 5 mock interviews with structured feedback from different people.", outcome: "5 mocks done + feedback notes archived." },
  { level: 10, sub: 18, name: "Send Materials",     description: "Send supplemental materials (research, code, art) where admissions allows.", outcome: "Submissions tracked per school." },
  { level: 10, sub: 19, name: "Yield Strategy",     description: "Lock financial fit and apply for every major scholarship you qualify for.", outcome: "Scholarship applications submitted + decisions tracked." },
  { level: 10, sub: 20, name: "Apex Review",        description: "Final audit. You're operating like a college sophomore in your field. Pick your seat.", outcome: "Final decision logged + commitment made." },
];

// Score thresholds: Level base + (sub-1) × (range / STAGES_PER_LEVEL)
function stageUnlockScore(level: LevelId, sub: SubIndex): number {
  const base = LEVELS.find((l) => l.id === level)!.unlockScore;
  const next = LEVELS.find((l) => l.id === ((level + 1) as LevelId))?.unlockScore ?? 100;
  const span = (next - base) / STAGES_PER_LEVEL;
  return Math.round(base + (sub - 1) * span);
}

/**
 * Per-level easy → hard ordering. Stages early in each level are low-effort
 * setup; stages later are high-effort, multi-week commitments and capstones.
 * The original `sub` numbers in STAGE_TEMPLATES are ignored — we re-emit
 * sequential subIndex (1..20) based on this ordering so unlockScore rises
 * monotonically with effort within each level.
 */
const EASE_ORDER: Record<LevelId, string[]> = {
  1: ["Profile","Email Hygiene","Notes System","Habits","Health Base","Vocabulary","Reading List","Time Audit","Family Brief","Track Grades","Office Hours","Counsellor Sync","Tutor or Group","Curriculum Map","Read Deep","Test Plan","Diagnose","Orient","Subject Spike","Foundation Review"],
  2: ["Podcast Stack","Newsletter","Online Community","Outcomes Sync","Discover","Course Map","Conference","Peer Network","Shadow","Skill Stack","Critic","Major Stress Test","Commit","Side Project","Skill Two","First Output","Workshop","Demo Day","Pivot Check","Exploration Review"],
  3: ["Outcomes Refresh","Reflection Memo","Pick Problem","Document","Metrics","Cross-Discipline","Portfolio","User Interviews","Faculty Sponsor","Recruit","Open Source","Lead","Funding","Iterate","Talk","Compete","Second Comp","Press","Ship Project","Building Review"],
  4: ["Outcomes Refresh","Awards Pipeline","Literature Review","Spike","Methods","Critique Loop","Mentor","Cross-Country","Mentor Others","Original Data","Workshop Series","Sustained Output","Long-Form","Research","Speaker","Scale","Partnership","Recognition","Audience","Differentiation Review"],
  5: ["College List","Supplements Map","Translation","Narrative","Mentor Network","Voice","Endorsements","Essay Drafts","Review Loop","Independent Project","Internship","Press Coverage","Funding Story","Publish","Awarded","Top Internship","International","Submit","Apply","Submit Regular"],
  6: ["Domain Map","Visibility Audit","Reading Canon","Bridge Skill","Cross-Train","Curator","Teach Back","Repeatable Process","Master Class","Office Bookings","Local Authority","Mentor Reviews","Newsletter v1","Workshop Tour","Op-Ed","Toolchain","Council Seat","Repeated Wins","Audience 2k","Mastery Review"],
  7: ["Whitespace","Hypothesis","First Prototype","Documentation","Case Study","Test Cohort","Iterate v2","Collaborators","Public Launch","Press Pitch","Revenue Test","Iterate v3","Distribution","Conference Talk","External Endorsement","100 Users","Sustainability","1000 Users","Press Mention","Pioneer Review"],
  8: ["Authority Audit","Documented Influence","Standards Body","Speaker Bureau","Advisor Council","University Lab","Co-Author","Cross-Institution","Peer Review","Conference Submission","Talk Tour","Press Tour","Real Funding","Industry Bridge","Journal Submission","Citation","Publication v2","Awards Stack","Audience 5k","Authority Review"],
  9: ["Successor Plan","Brand Identity","Press Kit","Playbook","Documentation v2","Permanent Asset","Board Seat","Foundation","Multiple Programs","Annual Event","Hire Help","Geographic Reach","Long-Form Book","Sustainability Audit","Funding Round","Recognition Stack","Citation Stack","Audience 10k","Permanent Press","Legacy Review"],
  10:["Pre-Registration","Annual Report","Speaking Fee","Mentor 5","Interview Prep","Send Materials","Original Research","Patent or IP","Industry Contract","Conference Acceptance","Yield Strategy","Final Apps","University Endorsement","Replicable System","Funding Round 2","Journal Acceptance","Real Press","Awards Sweep","Audience 25k","Apex Review"],
};

export const STAGES: StageDef[] = (() => {
  const byKey = new Map<string, typeof STAGE_TEMPLATES[number]>();
  STAGE_TEMPLATES.forEach((t) => byKey.set(`${t.level}::${t.name}`, t));
  const out: StageDef[] = [];
  let globalIdx = 0;
  for (const L of LEVELS) {
    const order = EASE_ORDER[L.id] || [];
    order.forEach((name, i) => {
      const t = byKey.get(`${L.id}::${name}`);
      if (!t) return;
      const sub = i + 1;
      out.push({
        id: `${L.id}.${sub}`,
        index: globalIdx++,
        level: L.id,
        subIndex: sub,
        name: t.name,
        description: t.description,
        outcome: t.outcome,
        unlockScore: stageUnlockScore(L.id, sub),
      });
    });
  }
  return out;
})();

export function getStageById(id: string): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getCurrentStageIndex(overallScore: number, placementOverride?: LevelId): number {
  // If placement override exists, place at the first stage of that level
  if (placementOverride) {
    const idx = STAGES.findIndex((s) => s.level === placementOverride);
    return idx >= 0 ? idx : 0;
  }
  let idx = 0;
  STAGES.forEach((s, i) => {
    if (overallScore >= s.unlockScore) idx = i;
  });
  return idx;
}

/**
 * Namespaced task id. A Level only defines a handful of tasks but owns 20
 * stages, so the same task object is reused by several stages. Completion and
 * proof are keyed by task id, so reusing the bare id made one submission
 * satisfy every stage that happened to draw the same task — the cause of
 * "finish one stage, six others tick themselves". Scoping the id to the stage
 * keeps each stage's progress independent.
 */
export function stageTaskId(stage: StageDef, baseTaskId: string): string {
  return `${stage.id}::${baseTaskId}`;
}

/**
 * The concrete tasks shown inside a stage. The stage itself (name, description,
 * outcome — 200 hand-written entries) is the unit of work; these tasks are the
 * Level's reference material for *how* to approach it, re-emitted under
 * stage-scoped ids so two stages never share completion state.
 */
export function getStageTasks(allLevelTasks: LevelTask[], stage: StageDef): LevelTask[] {
  if (allLevelTasks.length === 0) return [];
  const n = allLevelTasks.length;
  const picked =
    n <= STAGES_PER_LEVEL
      ? [allLevelTasks[(stage.subIndex - 1) % n]]
      : allLevelTasks.slice(
          (stage.subIndex - 1) * Math.ceil(n / STAGES_PER_LEVEL),
          (stage.subIndex - 1) * Math.ceil(n / STAGES_PER_LEVEL) + Math.ceil(n / STAGES_PER_LEVEL)
        );
  return picked.filter(Boolean).map((t) => ({ ...t, id: stageTaskId(stage, t.id) }));
}
