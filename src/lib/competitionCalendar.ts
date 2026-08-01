// Competition calendar with real registration/competition windows
// Updated for 2025-2026 academic year

export interface CompetitionWindow {
  activityId: string;
  name: string;
  category: string;
  registrationOpen?: string; // ISO date
  registrationClose?: string; // ISO date
  competitionStart?: string; // ISO date
  competitionEnd?: string; // ISO date
  resultDate?: string;
  notes?: string;
  url: string;
  applyUrl?: string;
  country: string[]; // empty = global
  relevantMajors: string[];
  recurring: boolean; // true = annual
  expectedReopenMonth?: string; // e.g. "September" — when registration is expected to reopen
  eligibility?: string; // e.g. "Grades 9-12"
  format?: "online" | "in-person" | "hybrid";
  cost?: "free" | "paid";
  studyResources?: { label: string; url: string }[];
}

// Real competition dates (approximate annual windows)
export const competitionCalendar: CompetitionWindow[] = [
  // ── CS / Math Competitions ──
  {
    activityId: "usaco",
    name: "USACO (USA Computing Olympiad)",
    category: "Computer Science",
    registrationOpen: "2025-11-01",
    registrationClose: "2025-12-15",
    competitionStart: "2025-12-13",
    competitionEnd: "2026-03-28",
    notes: "4 contests: Dec, Jan, Feb, Mar. Open division always available. US Open in March.",
    url: "http://www.usaco.org",
    applyUrl: "http://www.usaco.org/index.php?page=register",
    country: [],
    relevantMajors: ["Computer Science", "Software Engineering", "Data Science", "Mathematics"],
    recurring: true,
    expectedReopenMonth: "November",
    eligibility: "Pre-college students worldwide",
    format: "online",
    cost: "free",
    studyResources: [
      { label: "USACO Guide", url: "https://usaco.guide" },
      { label: "Past Problems", url: "http://www.usaco.org/index.php?page=contests" },
    ],
  },
  {
    activityId: "amc",
    name: "AMC 10/12 (American Mathematics Competition)",
    category: "Mathematics",
    registrationOpen: "2025-09-01",
    registrationClose: "2025-10-15",
    competitionStart: "2025-11-06",
    competitionEnd: "2025-11-12",
    notes: "AMC 10A/12A in Nov, AMC 10B/12B a week later. Register through your school.",
    url: "https://www.maa.org/math-competitions/amc-1012",
    applyUrl: "https://www.maa.org/math-competitions",
    country: ["United States"],
    relevantMajors: ["Mathematics", "Computer Science", "Physics", "Engineering", "Economics"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 10 or below (AMC 10), Grades 12 or below (AMC 12)",
    format: "in-person",
    cost: "paid",
    studyResources: [
      { label: "Art of Problem Solving", url: "https://artofproblemsolving.com/community/c3158_usa_amc" },
      { label: "Past AMC Papers", url: "https://artofproblemsolving.com/wiki/index.php/AMC_Problems_and_Solutions" },
    ],
  },
  {
    activityId: "aime",
    name: "AIME (American Invitational Mathematics Examination)",
    category: "Mathematics",
    competitionStart: "2026-02-05",
    competitionEnd: "2026-02-13",
    notes: "Invitation-only based on AMC scores. No separate registration needed.",
    url: "https://www.maa.org/math-competitions/american-invitational-mathematics-examination-aime",
    country: ["United States"],
    relevantMajors: ["Mathematics", "Computer Science", "Physics", "Engineering"],
    recurring: true,
    expectedReopenMonth: "February",
    eligibility: "By invitation only (top AMC scorers)",
    format: "in-person",
    cost: "free",
    studyResources: [
      { label: "AIME Past Problems", url: "https://artofproblemsolving.com/wiki/index.php/AIME_Problems_and_Solutions" },
    ],
  },
  {
    activityId: "mathkangaroo",
    name: "Math Kangaroo",
    category: "Mathematics",
    registrationOpen: "2025-09-15",
    registrationClose: "2026-03-01",
    competitionStart: "2026-03-19",
    competitionEnd: "2026-03-19",
    url: "https://www.mathkangaroo.org",
    applyUrl: "https://www.mathkangaroo.org/mk/registration.html",
    country: [],
    relevantMajors: ["Mathematics", "Computer Science", "Physics"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 1-12",
    format: "in-person",
    cost: "paid",
  },
  {
    activityId: "imo-selection",
    name: "International Mathematical Olympiad (Selection Process)",
    category: "Mathematics",
    competitionStart: "2026-07-10",
    competitionEnd: "2026-07-20",
    notes: "Selection through national olympiads (e.g., USAMO, RMO/INMO). Begin with AMC/RMO qualifying rounds.",
    url: "https://www.imo-official.org",
    country: [],
    relevantMajors: ["Mathematics", "Computer Science", "Physics"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Pre-college students, selected through national olympiad pipeline",
    format: "in-person",
    cost: "free",
  },
  // ── Science Olympiads ──
  {
    activityId: "scioly",
    name: "Science Olympiad",
    category: "Science",
    registrationOpen: "2025-06-01",
    registrationClose: "2025-10-15",
    competitionStart: "2026-01-15",
    competitionEnd: "2026-05-31",
    notes: "Invitationals Jan-Mar, Regionals Feb-Mar, States Apr, Nationals May.",
    url: "https://www.scioly.org",
    applyUrl: "https://www.scioly.org",
    country: ["United States"],
    relevantMajors: ["Biology", "Chemistry", "Physics", "Engineering", "Environmental Science"],
    recurring: true,
    expectedReopenMonth: "June",
    eligibility: "Grades 9-12 (Div C)",
    format: "in-person",
    cost: "paid",
    studyResources: [
      { label: "Scioly.org Study Guides", url: "https://scioly.org/wiki" },
    ],
  },
  {
    activityId: "ipho",
    name: "International Physics Olympiad (IPhO)",
    category: "Physics",
    competitionStart: "2026-07-12",
    competitionEnd: "2026-07-20",
    notes: "National selections start with F=ma exam (Jan) → USAPhO (Apr) for US students, or NSEP for Indian students.",
    url: "https://www.ipho-new.org",
    country: [],
    relevantMajors: ["Physics", "Engineering", "Astrophysics", "Mathematics"],
    recurring: true,
    expectedReopenMonth: "October",
    eligibility: "Pre-college students, selected through national physics olympiad",
    format: "in-person",
    cost: "free",
  },
  {
    activityId: "icho",
    name: "International Chemistry Olympiad (IChO)",
    category: "Chemistry",
    competitionStart: "2026-07-18",
    competitionEnd: "2026-07-27",
    notes: "Selection via USNCO (US) or NSEC (India). Local/national chemistry olympiad is the entry point.",
    url: "https://www.icho2026.org",
    country: [],
    relevantMajors: ["Chemistry", "Biochemistry", "Chemical Engineering", "Pre-Med"],
    recurring: true,
    expectedReopenMonth: "October",
    eligibility: "Pre-college students, selected through national chemistry olympiad",
    format: "in-person",
    cost: "free",
  },
  {
    activityId: "ibo",
    name: "International Biology Olympiad (IBO)",
    category: "Biology",
    competitionStart: "2026-07-05",
    competitionEnd: "2026-07-13",
    notes: "Selection via USABO (US) or NSEB/INBO (India). Open exam typically in Feb.",
    url: "https://www.ibo-info.org",
    country: [],
    relevantMajors: ["Biology", "Biochemistry", "Pre-Med", "Neuroscience", "Environmental Science"],
    recurring: true,
    expectedReopenMonth: "November",
    eligibility: "Pre-college students, selected through national biology olympiad",
    format: "in-person",
    cost: "free",
  },
  // ── Engineering / Robotics ──
  {
    activityId: "frc",
    name: "FIRST Robotics Competition (FRC)",
    category: "Engineering",
    registrationOpen: "2025-06-01",
    registrationClose: "2025-10-01",
    competitionStart: "2026-01-04",
    competitionEnd: "2026-04-23",
    notes: "Kickoff in Jan, build season Jan-Feb, regional events Mar-Apr, Championships Apr.",
    url: "https://www.firstinspires.org/robotics/frc",
    applyUrl: "https://www.firstinspires.org/robotics/frc/team-registration",
    country: ["United States", "Canada"],
    relevantMajors: ["Engineering", "Computer Science", "Mechanical Engineering", "Electrical Engineering"],
    recurring: true,
    expectedReopenMonth: "June",
    eligibility: "Grades 9-12, team-based",
    format: "in-person",
    cost: "paid",
    studyResources: [
      { label: "Chief Delphi (Community)", url: "https://www.chiefdelphi.com" },
    ],
  },
  // ── Writing / Humanities ──
  {
    activityId: "scholastic",
    name: "Scholastic Art & Writing Awards",
    category: "Writing / Arts",
    registrationOpen: "2025-09-01",
    registrationClose: "2025-12-15",
    competitionStart: "2026-01-15",
    resultDate: "2026-03-15",
    notes: "Submissions open Sep-Dec. Regional results Jan-Feb, national results Mar.",
    url: "https://www.artandwriting.org",
    applyUrl: "https://www.artandwriting.org/submit-your-work/",
    country: ["United States", "Canada"],
    relevantMajors: ["English", "Creative Writing", "Journalism", "Art", "Film Studies"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 7-12",
    format: "online",
    cost: "free",
  },
  {
    activityId: "john-locke",
    name: "John Locke Essay Competition",
    category: "Humanities",
    registrationOpen: "2026-01-01",
    registrationClose: "2026-06-30",
    resultDate: "2026-09-15",
    notes: "Essays due June 30. Open to all students worldwide. Topics in Philosophy, Politics, Economics, History, etc.",
    url: "https://www.johnlockeinstitute.com/essay-competition",
    applyUrl: "https://www.johnlockeinstitute.com/essay-competition",
    country: [],
    relevantMajors: ["Philosophy", "Political Science", "Economics", "History", "Law", "International Relations"],
    recurring: true,
    expectedReopenMonth: "January",
    eligibility: "Ages 18 and under",
    format: "online",
    cost: "free",
  },
  // ── Economics / Business ──
  {
    activityId: "deca",
    name: "DECA (Distributive Education Clubs of America)",
    category: "Business",
    registrationOpen: "2025-09-01",
    registrationClose: "2025-11-30",
    competitionStart: "2026-01-15",
    competitionEnd: "2026-04-30",
    notes: "District Nov-Jan, State Feb-Mar, ICDC (International) Apr.",
    url: "https://www.deca.org",
    applyUrl: "https://www.deca.org/high-school-programs/high-school-competitive-events/",
    country: ["United States", "Canada"],
    relevantMajors: ["Business", "Marketing", "Economics", "Finance", "Entrepreneurship"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 9-12",
    format: "in-person",
    cost: "paid",
  },
  {
    activityId: "fbla",
    name: "FBLA (Future Business Leaders of America)",
    category: "Business",
    registrationOpen: "2025-09-01",
    registrationClose: "2025-12-01",
    competitionStart: "2026-02-01",
    competitionEnd: "2026-06-30",
    notes: "Regional Feb-Mar, State Mar-Apr, NLC (National) June.",
    url: "https://www.fbla.org",
    applyUrl: "https://www.fbla.org/divisions/fbla/",
    country: ["United States"],
    relevantMajors: ["Business", "Accounting", "Finance", "Marketing", "Management"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 9-12",
    format: "in-person",
    cost: "paid",
  },
  // ── India-Specific ──
  {
    activityId: "ioqm",
    name: "IOQM (Indian Olympiad Qualifier in Mathematics)",
    category: "Mathematics",
    registrationOpen: "2025-07-01",
    registrationClose: "2025-08-31",
    competitionStart: "2025-09-14",
    competitionEnd: "2025-09-14",
    notes: "Qualifier for RMO → INMO → IMO training camp. Registration through MTA.",
    url: "https://olympiads.hbcse.tifr.res.in/mathematical-olympiad/",
    applyUrl: "https://olympiads.hbcse.tifr.res.in",
    country: ["India"],
    relevantMajors: ["Mathematics", "Computer Science", "Physics", "Engineering"],
    recurring: true,
    expectedReopenMonth: "July",
    eligibility: "Indian students in Grades 8-12",
    format: "in-person",
    cost: "paid",
    studyResources: [
      { label: "HBCSE Olympiad Resources", url: "https://olympiads.hbcse.tifr.res.in/resources/" },
    ],
  },
  {
    activityId: "nsep",
    name: "NSEP (National Standard Examination in Physics)",
    category: "Physics",
    registrationOpen: "2025-08-01",
    registrationClose: "2025-10-15",
    competitionStart: "2025-11-24",
    competitionEnd: "2025-11-24",
    notes: "Qualifier for INPhO → IPhO. Register through IAPT via your school.",
    url: "https://olympiads.hbcse.tifr.res.in/physics-olympiad/",
    applyUrl: "https://www.iapt.org.in",
    country: ["India"],
    relevantMajors: ["Physics", "Engineering", "Astrophysics"],
    recurring: true,
    expectedReopenMonth: "August",
    eligibility: "Indian students in Grades 11-12",
    format: "in-person",
    cost: "paid",
  },
  {
    activityId: "kvpy",
    name: "KVPY / INSPIRE (Kishore Vaigyanik Protsahan Yojana)",
    category: "Science",
    registrationOpen: "2025-07-01",
    registrationClose: "2025-08-31",
    competitionStart: "2025-11-01",
    competitionEnd: "2025-11-01",
    notes: "Now merged into INSPIRE. Fellowship for science students.",
    url: "https://www.online-inspire.gov.in",
    applyUrl: "https://www.online-inspire.gov.in",
    country: ["India"],
    relevantMajors: ["Biology", "Chemistry", "Physics", "Mathematics"],
    recurring: true,
    expectedReopenMonth: "July",
    eligibility: "Indian students in Grades 11-12",
    format: "in-person",
    cost: "free",
  },
  // ── UK-Specific ──
  {
    activityId: "ukmt",
    name: "UKMT Challenges (Junior/Intermediate/Senior)",
    category: "Mathematics",
    competitionStart: "2025-10-01",
    competitionEnd: "2026-06-15",
    notes: "JMC Apr, IMC Feb, SMC Oct. Followed by Kangaroo/Olympiad rounds for top performers.",
    url: "https://www.ukmt.org.uk",
    country: ["United Kingdom"],
    relevantMajors: ["Mathematics", "Computer Science", "Physics", "Engineering"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "UK students, varies by challenge level",
    format: "in-person",
    cost: "free",
  },
  {
    activityId: "bpho",
    name: "British Physics Olympiad (BPhO)",
    category: "Physics",
    registrationOpen: "2025-09-01",
    registrationClose: "2025-10-31",
    competitionStart: "2025-11-08",
    competitionEnd: "2025-11-08",
    notes: "Round 1 in Nov, Round 2 in Jan for top performers. Leads to IPhO selection.",
    url: "https://www.bpho.org.uk",
    applyUrl: "https://www.bpho.org.uk",
    country: ["United Kingdom"],
    relevantMajors: ["Physics", "Engineering", "Mathematics"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "UK students in Years 12-13",
    format: "in-person",
    cost: "free",
    studyResources: [
      { label: "BPhO Past Papers", url: "https://www.bpho.org.uk/past-papers/" },
    ],
  },
  // ── Research Programs ──
  {
    activityId: "rsi",
    name: "RSI (Research Science Institute)",
    category: "Research",
    registrationOpen: "2025-11-01",
    registrationClose: "2026-01-15",
    competitionStart: "2026-06-22",
    competitionEnd: "2026-08-01",
    notes: "Extremely selective (~80/3000 applicants). Free program at MIT. Apply by mid-Jan.",
    url: "https://www.cee.org/programs/rsi",
    applyUrl: "https://www.cee.org/programs/rsi",
    country: [],
    relevantMajors: ["Computer Science", "Mathematics", "Physics", "Biology", "Chemistry", "Engineering"],
    recurring: true,
    expectedReopenMonth: "November",
    eligibility: "Rising seniors (Grade 11), all nationalities",
    format: "in-person",
    cost: "free",
  },
  {
    activityId: "ssp",
    name: "SSP (Summer Science Program)",
    category: "Research",
    registrationOpen: "2025-11-15",
    registrationClose: "2026-02-07",
    competitionStart: "2026-06-15",
    competitionEnd: "2026-07-31",
    notes: "Astrophysics, Biochemistry, or Genomics tracks. Very selective. Apply by early Feb.",
    url: "https://summerscience.org",
    applyUrl: "https://summerscience.org/apply/",
    country: [],
    relevantMajors: ["Astrophysics", "Physics", "Biology", "Biochemistry", "Computer Science"],
    recurring: true,
    expectedReopenMonth: "November",
    eligibility: "Rising juniors/seniors, all nationalities",
    format: "in-person",
    cost: "free",
  },
  {
    activityId: "regeneron-sts",
    name: "Regeneron Science Talent Search",
    category: "Research",
    registrationOpen: "2025-06-01",
    registrationClose: "2025-11-12",
    resultDate: "2026-01-08",
    notes: "Most prestigious US science competition for high school seniors. Requires original research paper.",
    url: "https://www.societyforscience.org/regeneron-sts/",
    applyUrl: "https://www.societyforscience.org/regeneron-sts/",
    country: ["United States"],
    relevantMajors: ["Biology", "Chemistry", "Physics", "Computer Science", "Mathematics", "Engineering"],
    recurring: true,
    expectedReopenMonth: "June",
    eligibility: "US high school seniors only",
    format: "online",
    cost: "free",
  },
  {
    activityId: "isef",
    name: "Regeneron ISEF (International Science and Engineering Fair)",
    category: "Research",
    competitionStart: "2026-05-10",
    competitionEnd: "2026-05-15",
    notes: "Must qualify through affiliated regional/state science fairs. World's largest pre-college STEM competition.",
    url: "https://www.societyforscience.org/isef/",
    country: [],
    relevantMajors: ["Biology", "Chemistry", "Physics", "Computer Science", "Engineering", "Environmental Science"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 9-12, must qualify through regional fair",
    format: "in-person",
    cost: "free",
  },
  // ── Debate / Model UN ──
  {
    activityId: "debate-nsda",
    name: "NSDA National Speech & Debate",
    category: "Debate",
    registrationOpen: "2025-09-01",
    registrationClose: "2026-03-01",
    competitionStart: "2026-06-14",
    competitionEnd: "2026-06-19",
    notes: "Qualify through local tournaments. Nationals in June.",
    url: "https://www.speechanddebate.org",
    applyUrl: "https://www.speechanddebate.org/join/",
    country: ["United States"],
    relevantMajors: ["Political Science", "Law", "International Relations", "Philosophy", "Communications"],
    recurring: true,
    expectedReopenMonth: "September",
    eligibility: "Grades 9-12",
    format: "in-person",
    cost: "paid",
    studyResources: [
      { label: "NSDA Resources", url: "https://www.speechanddebate.org/resources/" },
    ],
  },
];

// ── Helper functions ──

const today = () => new Date().toISOString().slice(0, 10);

export type CompetitionStatus = "registration_open" | "ongoing" | "upcoming" | "closed";

export interface CompetitionStatusInfo {
  status: CompetitionStatus;
  reopenInfo?: string; // e.g. "Expected to reopen around September 2026"
}

export function getCompetitionStatusInfo(comp: CompetitionWindow): CompetitionStatusInfo {
  const now = today();
  
  // If registration is currently open
  if (comp.registrationOpen && comp.registrationClose && now >= comp.registrationOpen && now <= comp.registrationClose) {
    return { status: "registration_open" };
  }
  
  // If competition is currently ongoing
  if (comp.competitionStart && comp.competitionEnd && now >= comp.competitionStart && now <= comp.competitionEnd) {
    return { status: "ongoing" };
  }
  
  // If competition start is in the future
  if (comp.competitionStart && now < comp.competitionStart) {
    // Check if registration hasn't opened yet
    if (comp.registrationOpen && now < comp.registrationOpen) {
      return { status: "upcoming" };
    }
    // Registration closed but competition hasn't started — still upcoming
    if (!comp.registrationOpen || now >= comp.registrationOpen) {
      // If reg closed and comp hasn't started, it's in-between
      if (comp.registrationClose && now > comp.registrationClose) {
        return { status: "upcoming" }; // between reg close and comp start
      }
      return { status: "upcoming" };
    }
  }
  
  // If registration hasn't started yet
  if (comp.registrationOpen && now < comp.registrationOpen) {
    return { status: "upcoming" };
  }
  
  // Past — build reopen info
  const reopenMonth = comp.expectedReopenMonth;
  const currentYear = new Date().getFullYear();
  const reopenInfo = reopenMonth
    ? `Expected to reopen around ${reopenMonth} ${currentYear + 1}`
    : comp.recurring
      ? `Recurring annual competition — check official website for next cycle`
      : undefined;
  
  return { status: "closed", reopenInfo };
}

// Legacy compat
export function getCompetitionStatus(comp: CompetitionWindow): "registration_open" | "ongoing" | "upcoming" | "past" {
  const info = getCompetitionStatusInfo(comp);
  if (info.status === "closed") return "past";
  return info.status;
}

export function getRelevantCompetitions(
  country: string,
  major: string,
  grade: string
): { ongoing: CompetitionWindow[]; upcoming: CompetitionWindow[]; closed: (CompetitionWindow & { reopenInfo?: string })[] } {
  const relevant = competitionCalendar.filter(comp => {
    // Country filter
    if (comp.country.length > 0 && !comp.country.includes(country)) return false;
    // Major relevance (loose match)
    const majorLower = major.toLowerCase();
    const hasRelevance = comp.relevantMajors.some(m => 
      majorLower.includes(m.toLowerCase()) || m.toLowerCase().includes(majorLower)
    );
    if (!hasRelevance && comp.relevantMajors.length > 0) return false;
    return true;
  });

  const ongoing: CompetitionWindow[] = [];
  const upcoming: CompetitionWindow[] = [];
  const closed: (CompetitionWindow & { reopenInfo?: string })[] = [];

  relevant.forEach(comp => {
    const info = getCompetitionStatusInfo(comp);
    if (info.status === "registration_open" || info.status === "ongoing") {
      ongoing.push(comp);
    } else if (info.status === "upcoming") {
      upcoming.push(comp);
    } else {
      closed.push({ ...comp, reopenInfo: info.reopenInfo });
    }
  });

  // Sort by nearest date
  const sortByDate = (a: CompetitionWindow, b: CompetitionWindow) => {
    const dateA = a.registrationClose || a.competitionStart || "";
    const dateB = b.registrationClose || b.competitionStart || "";
    return dateA.localeCompare(dateB);
  };

  ongoing.sort(sortByDate);
  upcoming.sort(sortByDate);

  return { ongoing, upcoming, closed };
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
