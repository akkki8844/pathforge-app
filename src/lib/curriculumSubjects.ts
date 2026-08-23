// Structured subject catalogs and grading scales per curriculum programme.
// Used by Onboarding + Admissions Probability for accurate per-board input.
//
// WHY PROGRAMMES, NOT BOARDS
// "IB" is not one syllabus. A Year-11 MYP student and a Year-13 DP student sit
// entirely different subjects on entirely different level systems — MYP maths
// is Standard/Extended, DP maths is HL/SL, and offering "Mathematics HL" to an
// MYP student is simply wrong. The same is true of CBSE (Class 9-10 secondary
// vs 11-12 senior secondary streams) and of the CISCE boards (ICSE ends at
// Class 10, ISC is the Class 11-12 qualification). So the unit here is the
// programme a student is actually enrolled in, not the board that runs it.
//
// Levels are resolved PER SUBJECT, not per programme: within IGCSE only the
// tiered syllabuses (maths, the sciences, ESL) offer Core/Extended, and within
// CBSE Class 10 only mathematics splits into Standard/Basic. Ask for a level on
// a subject that has none and you are inventing data.
//
// Subject lists are kept ALPHABETICAL within each group for predictable
// scanning; groups are listed in the order the awarding body presents them.

export type CurriculumKey =
  | "IB-DP"
  | "IB-MYP"
  | "IB-CP"
  | "AP"
  | "A-Levels"
  | "IGCSE"
  | "CBSE-10"
  | "CBSE-12"
  | "ICSE"
  | "ISC"
  | "US"
  | "Other";

export interface GradingScale {
  /** Numeric scale label, e.g. "1-7", "1-5", "A*-E", "0-100" */
  label: string;
  /** Min numeric grade for inputs (when numeric) */
  min: number;
  /** Max numeric grade for inputs (when numeric) */
  max: number;
  /** If set, render a Select with these letter/grade options instead of a number field */
  options?: string[];
  /** Step for numeric input */
  step?: number;
}

export interface CurriculumSubject {
  name: string;
  /** Which of the programme's groups this subject belongs to. */
  group: string;
  /**
   * Level options for THIS subject, overriding the programme default.
   * An empty array means the subject is explicitly untiered even though the
   * programme has levels (e.g. IGCSE Art & Design has no Core/Extended split).
   */
  levels?: string[];
  /** Part of the programme's compulsory core (IB TOK/EE, MYP Personal Project). */
  core?: boolean;
  /** Overrides the programme grade scale — DP core is graded A-E, not 1-7. */
  gradeScale?: GradingScale;
}

export interface CurriculumConfig {
  key: CurriculumKey;
  /** Full name, for headings and the Admissions summary line. */
  label: string;
  /** Compact name, for chips and rails. */
  shortLabel: string;
  /** One line explaining who this programme is for, shown in the picker. */
  blurb: string;
  /** School grades this programme normally covers — drives "recommended" hints. */
  typicalGrades: string[];
  gradeScale: GradingScale;
  /** Default level options for subjects that don't override them. */
  levelOptions?: string[];
  /** What this programme calls a level: "Level", "Tier", "Route"... */
  levelLabel?: string;
  /** Grade scale that applies at a given level, when the level changes the range. */
  levelGradeScales?: Record<string, GradingScale>;
  /** Groups in the order the awarding body presents them. */
  groups: string[];
  subjects: CurriculumSubject[];
  /** Selection rule shown above the picker, e.g. "Six subjects: 3 HL + 3 SL". */
  selectionHint?: string;
  /** Soft guidance for the count — used for the progress readout, not enforced. */
  typicalCount?: number;
}

const alpha = (a: CurriculumSubject, b: CurriculumSubject) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

/** Expand a group's subject names into entries, sorted, with shared options. */
function group(
  name: string,
  names: string[],
  shared: Omit<CurriculumSubject, "name" | "group"> = {},
): CurriculumSubject[] {
  return [...new Set(names)]
    .map((n) => ({ name: n, group: name, ...shared }))
    .sort(alpha);
}

// ─── Shared scales ─────────────────────────────────────────────────────

const PERCENT: GradingScale = { label: "0–100 %", min: 0, max: 100, step: 1 };
const IB_SCALE: GradingScale = { label: "1–7", min: 1, max: 7, step: 1 };
/** DP core (TOK, EE) and the CP reflective project are letter-graded. */
const IB_CORE_SCALE: GradingScale = { label: "A–E", min: 0, max: 0, options: ["A", "B", "C", "D", "E"] };

// ─── IB Diploma Programme ──────────────────────────────────────────────

const DP_GROUPS = [
  "Group 1 · Studies in Language & Literature",
  "Group 2 · Language Acquisition",
  "Group 3 · Individuals & Societies",
  "Group 4 · Sciences",
  "Group 5 · Mathematics",
  "Group 6 · The Arts",
  "DP Core",
];

const IB_DP: CurriculumConfig = {
  key: "IB-DP",
  label: "IB Diploma Programme (DP)",
  shortLabel: "IB DP",
  blurb: "The two-year IB diploma. Six subjects at Higher or Standard Level, plus TOK, the Extended Essay and CAS.",
  typicalGrades: ["11th Grade", "12th Grade"],
  gradeScale: IB_SCALE,
  levelOptions: ["HL", "SL"],
  levelLabel: "Level",
  groups: DP_GROUPS,
  selectionHint: "Six subjects — normally three at HL and three at SL — plus the core.",
  typicalCount: 6,
  subjects: [
    ...group(DP_GROUPS[0], [
      "Arabic Literature",
      "English Language & Literature",
      "English Literature",
      "French Literature",
      "German Literature",
      "Hindi Literature",
      "Japanese Literature",
      "Mandarin Language & Literature",
      "Mandarin Literature",
      "Self-Taught Literature (School-Supported)",
      "Spanish Language & Literature",
      "Spanish Literature",
    ]),
    // Literature & Performance is an interdisciplinary Group 1/6 course, SL only.
    { name: "Literature & Performance", group: DP_GROUPS[0], levels: ["SL"] },
    ...group(DP_GROUPS[1], [
      "Arabic B",
      "English B",
      "French B",
      "German B",
      "Hindi B",
      "Italian B",
      "Japanese B",
      "Korean B",
      "Mandarin B",
      "Portuguese B",
      "Russian B",
      "Spanish B",
    ]),
    // ab initio is a beginners' course and exists at SL only. Classical
    // languages run HL/SL like any other Group 2 subject.
    ...group(
      DP_GROUPS[1],
      [
        "French ab initio",
        "German ab initio",
        "Italian ab initio",
        "Japanese ab initio",
        "Mandarin ab initio",
        "Spanish ab initio",
      ],
      { levels: ["SL"] },
    ),
    ...group(DP_GROUPS[1], ["Classical Greek", "Latin"]),
    ...group(DP_GROUPS[2], [
      "Business Management",
      "Digital Society",
      "Economics",
      "Geography",
      "Global Politics",
      "History",
      "Philosophy",
      "Psychology",
      "Social & Cultural Anthropology",
    ]),
    // World Religions is a Group 3 SL-only course.
    { name: "World Religions", group: DP_GROUPS[2], levels: ["SL"] },
    ...group(DP_GROUPS[3], [
      "Biology",
      "Chemistry",
      "Computer Science",
      "Design Technology",
      "Physics",
      "Sports, Exercise & Health Science",
    ]),
    // ESS is the interdisciplinary Group 3/4 course. The 2024 syllabus (first
    // exams 2026) made it the first interdisciplinary DP subject offered at HL.
    { name: "Environmental Systems & Societies (ESS)", group: DP_GROUPS[3] },
    // Further Mathematics HL was withdrawn after the May 2020 session; the two
    // remaining routes are Analysis & Approaches and Applications &
    // Interpretation, each at HL or SL.
    ...group(DP_GROUPS[4], [
      "Mathematics: Analysis & Approaches (AA)",
      "Mathematics: Applications & Interpretation (AI)",
    ]),
    ...group(DP_GROUPS[5], ["Dance", "Film", "Music", "Theatre", "Visual Arts"]),
    {
      name: "Theory of Knowledge (TOK)",
      group: "DP Core",
      core: true,
      levels: [],
      gradeScale: IB_CORE_SCALE,
    },
    {
      name: "Extended Essay (EE)",
      group: "DP Core",
      core: true,
      levels: [],
      gradeScale: IB_CORE_SCALE,
    },
    {
      name: "Creativity, Activity, Service (CAS)",
      group: "DP Core",
      core: true,
      levels: [],
      gradeScale: { label: "Complete / Incomplete", min: 0, max: 0, options: ["Complete", "In progress"] },
    },
  ],
};

// ─── IB Middle Years Programme ─────────────────────────────────────────

const MYP_GROUPS = [
  "Language & Literature",
  "Language Acquisition",
  "Individuals & Societies",
  "Sciences",
  "Mathematics",
  "Arts",
  "Physical & Health Education",
  "Design",
  "MYP Core",
];

/** MYP language acquisition is organised by phase, not by HL/SL. */
const MYP_PHASES = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"];

const IB_MYP: CurriculumConfig = {
  key: "IB-MYP",
  label: "IB Middle Years Programme (MYP 4–5)",
  shortLabel: "IB MYP",
  blurb: "The pre-diploma years. Eight subject groups; maths splits into Standard and Extended, and language acquisition runs by phase.",
  typicalGrades: ["9th Grade", "10th Grade"],
  gradeScale: IB_SCALE,
  levelLabel: "Route",
  groups: MYP_GROUPS,
  selectionHint: "One subject from each of the eight groups, plus the Personal Project.",
  typicalCount: 8,
  subjects: [
    ...group(MYP_GROUPS[0], [
      "Arabic Language & Literature",
      "English Language & Literature",
      "French Language & Literature",
      "German Language & Literature",
      "Hindi Language & Literature",
      "Mandarin Language & Literature",
      "Spanish Language & Literature",
    ]),
    ...group(
      MYP_GROUPS[1],
      ["Arabic", "French", "German", "Japanese", "Mandarin", "Spanish"],
      { levels: MYP_PHASES },
    ),
    ...group(MYP_GROUPS[2], [
      "Civics",
      "Economics",
      "Geography",
      "History",
      "Integrated Humanities",
    ]),
    ...group(MYP_GROUPS[3], [
      "Biology",
      "Chemistry",
      "Integrated Sciences",
      "Physics",
    ]),
    // The one detail people get wrong: MYP has no HL/SL. Years 4-5 maths is
    // Standard or Extended, and the eAssessment papers differ accordingly.
    {
      name: "Mathematics",
      group: MYP_GROUPS[4],
      levels: ["Standard", "Extended"],
    },
    ...group(MYP_GROUPS[5], ["Dance", "Drama", "Film", "Media", "Music", "Visual Arts"]),
    ...group(MYP_GROUPS[6], ["Physical & Health Education"]),
    ...group(MYP_GROUPS[7], ["Digital Design", "Product Design"]),
    { name: "Personal Project", group: "MYP Core", core: true },
    { name: "Interdisciplinary Learning", group: "MYP Core", core: true },
  ],
};

// ─── IB Career-related Programme ───────────────────────────────────────

const CP_GROUPS = ["DP Courses", "Career-related Study", "CP Core"];

const IB_CP: CurriculumConfig = {
  key: "IB-CP",
  label: "IB Career-related Programme (CP)",
  shortLabel: "IB CP",
  blurb: "At least two DP courses combined with a career-related study and the CP core.",
  typicalGrades: ["11th Grade", "12th Grade"],
  gradeScale: IB_SCALE,
  levelOptions: ["HL", "SL"],
  levelLabel: "Level",
  groups: CP_GROUPS,
  selectionHint: "At least two DP courses, your career-related study, and the four core components.",
  typicalCount: 4,
  subjects: [
    // CP students take real DP courses, so the DP catalog is the right source
    // of truth — minus the DP core, which the CP core replaces.
    ...IB_DP.subjects
      .filter((s) => s.group !== "DP Core")
      .map((s) => ({ ...s, group: CP_GROUPS[0] })),
    ...group(CP_GROUPS[1], [
      "Applied Science",
      "Art & Design",
      "Business & Administration",
      "Computing & IT",
      "Culinary Arts",
      "Engineering",
      "Health & Social Care",
      "Hospitality & Tourism",
      "Media & Communications",
      "Sports & Fitness",
    ], { levels: [] }),
    { name: "Personal & Professional Skills", group: CP_GROUPS[2], core: true, levels: [] },
    { name: "Service Learning", group: CP_GROUPS[2], core: true, levels: [] },
    { name: "Language Development", group: CP_GROUPS[2], core: true, levels: [] },
    {
      name: "Reflective Project",
      group: CP_GROUPS[2],
      core: true,
      levels: [],
      gradeScale: IB_CORE_SCALE,
    },
  ],
};

// ─── Advanced Placement ────────────────────────────────────────────────

const AP_GROUPS = [
  "Math & Computer Science",
  "Sciences",
  "English",
  "History & Social Sciences",
  "World Languages & Cultures",
  "Arts",
  "AP Capstone & Career",
];

const AP: CurriculumConfig = {
  key: "AP",
  label: "Advanced Placement (AP)",
  shortLabel: "AP",
  blurb: "College Board course-by-course exams, scored 1–5. Take as many or as few as your school offers.",
  typicalGrades: ["9th Grade", "10th Grade", "11th Grade", "12th Grade"],
  gradeScale: { label: "1–5", min: 1, max: 5, step: 1 },
  groups: AP_GROUPS,
  selectionHint: "Add every AP you have taken or are currently taking.",
  subjects: [
    ...group(AP_GROUPS[0], [
      "AP Calculus AB",
      "AP Calculus BC",
      "AP Computer Science A",
      "AP Computer Science Principles",
      "AP Precalculus",
      "AP Statistics",
    ]),
    ...group(AP_GROUPS[1], [
      "AP Biology",
      "AP Chemistry",
      "AP Environmental Science",
      "AP Physics 1: Algebra-Based",
      "AP Physics 2: Algebra-Based",
      "AP Physics C: Electricity & Magnetism",
      "AP Physics C: Mechanics",
    ]),
    ...group(AP_GROUPS[2], [
      "AP English Language & Composition",
      "AP English Literature & Composition",
    ]),
    ...group(AP_GROUPS[3], [
      "AP African American Studies",
      "AP Comparative Government & Politics",
      "AP European History",
      "AP Human Geography",
      "AP Macroeconomics",
      "AP Microeconomics",
      "AP Psychology",
      "AP United States Government & Politics",
      "AP United States History",
      "AP World History: Modern",
    ]),
    ...group(AP_GROUPS[4], [
      "AP Chinese Language & Culture",
      "AP French Language & Culture",
      "AP German Language & Culture",
      "AP Italian Language & Culture",
      "AP Japanese Language & Culture",
      "AP Latin",
      "AP Spanish Language & Culture",
      "AP Spanish Literature & Culture",
    ]),
    // The Studio Art exams were renamed to AP Art and Design in 2019.
    ...group(AP_GROUPS[5], [
      "AP 2-D Art and Design",
      "AP 3-D Art and Design",
      "AP Art History",
      "AP Drawing",
      "AP Music Theory",
    ]),
    // AP Career Kickstart's first two courses reach general availability in the
    // 2026-27 school year, after a 2025-26 pilot.
    ...group(AP_GROUPS[6], [
      "AP Business Principles with Personal Finance",
      "AP Cybersecurity",
      "AP Research",
      "AP Seminar",
    ]),
  ],
};

// ─── A-Levels ──────────────────────────────────────────────────────────

const AL_GROUPS = [
  "Mathematics",
  "Sciences",
  "Social Sciences & Business",
  "Humanities",
  "English & Languages",
  "Arts & Technology",
];

const A_LEVELS: CurriculumConfig = {
  key: "A-Levels",
  label: "A-Levels",
  shortLabel: "A-Levels",
  blurb: "Typically three or four subjects. AS is the standalone first year and cannot be awarded an A*.",
  typicalGrades: ["11th Grade", "12th Grade"],
  gradeScale: { label: "A*–U", min: 0, max: 0, options: ["A*", "A", "B", "C", "D", "E", "U"] },
  levelOptions: ["A-Level", "AS-Level"],
  levelLabel: "Qualification",
  // AS is capped at A — the A* is only awarded for the full A-Level.
  levelGradeScales: {
    "AS-Level": { label: "A–U", min: 0, max: 0, options: ["A", "B", "C", "D", "E", "U"] },
  },
  groups: AL_GROUPS,
  selectionHint: "Most applicants take three or four subjects.",
  typicalCount: 3,
  subjects: [
    ...group(AL_GROUPS[0], ["Further Mathematics", "Mathematics", "Statistics"]),
    ...group(AL_GROUPS[1], [
      "Biology",
      "Chemistry",
      "Computer Science",
      "Electronics",
      "Environmental Science",
      "Geology",
      "Human Biology",
      "Marine Science",
      "Physics",
      "Psychology",
    ]),
    ...group(AL_GROUPS[2], [
      "Accounting",
      "Business",
      "Criminology",
      "Economics",
      "Government & Politics",
      "Law",
      "Sociology",
    ]),
    ...group(AL_GROUPS[3], [
      "Ancient History",
      "Anthropology",
      "Archaeology",
      "Classical Civilisation",
      "Geography",
      "History",
      "Philosophy",
      "Religious Studies",
    ]),
    ...group(AL_GROUPS[4], [
      "Arabic",
      "English Language",
      "English Language & Literature",
      "English Literature",
      "French",
      "German",
      "Greek",
      "Hindi",
      "Italian",
      "Japanese",
      "Latin",
      "Mandarin",
      "Portuguese",
      "Russian",
      "Spanish",
      "Urdu",
    ]),
    ...group(AL_GROUPS[5], [
      "Art & Design",
      "Dance",
      "Design & Technology",
      "Drama & Theatre",
      "Film Studies",
      "Fine Art",
      "Media Studies",
      "Music",
      "Music Technology",
      "Photography",
      "Physical Education",
      "Product Design",
      "Textiles",
    ]),
  ],
};

// ─── IGCSE ─────────────────────────────────────────────────────────────

const IGCSE_GROUPS = [
  "English & Languages",
  "Mathematics",
  "Sciences",
  "Humanities & Social Sciences",
  "Business & Economics",
  "Creative & Technical",
];

/**
 * Only the tiered syllabuses offer a Core/Extended entry. Extended leads
 * because it is both the more common entry and the safer default — defaulting
 * a student to Core would silently cap their selectable grade at a C.
 */
const TIERED = { levels: ["Extended", "Core"] };
/** Explicitly untiered, so the picker doesn't ask for a tier. */
const UNTIERED = { levels: [] as string[] };

const IGCSE: CurriculumConfig = {
  key: "IGCSE",
  label: "IGCSE (Cambridge)",
  shortLabel: "IGCSE",
  blurb: "Cambridge's pre-A-Level qualification. Maths, the sciences and ESL are tiered — Core caps at a C, Extended reaches A*.",
  typicalGrades: ["9th Grade", "10th Grade"],
  gradeScale: { label: "A*–G", min: 0, max: 0, options: ["A*", "A", "B", "C", "D", "E", "F", "G", "U"] },
  levelOptions: ["Extended", "Core"],
  levelLabel: "Tier",
  // Core entry cannot be awarded above a C; Extended runs A*-E.
  levelGradeScales: {
    Core: { label: "C–G", min: 0, max: 0, options: ["C", "D", "E", "F", "G", "U"] },
    Extended: { label: "A*–E", min: 0, max: 0, options: ["A*", "A", "B", "C", "D", "E", "U"] },
  },
  groups: IGCSE_GROUPS,
  selectionHint: "Most students take eight to ten subjects.",
  typicalCount: 9,
  subjects: [
    ...group(IGCSE_GROUPS[0], ["English as a Second Language"], TIERED),
    ...group(
      IGCSE_GROUPS[0],
      [
        "Classical Greek",
        "First Language Arabic",
        "First Language English",
        "First Language French",
        "First Language German",
        "First Language Hindi",
        "First Language Mandarin",
        "First Language Portuguese",
        "First Language Russian",
        "First Language Spanish",
        "First Language Urdu",
        "Foreign Language Arabic",
        "Foreign Language French",
        "Foreign Language German",
        "Foreign Language Italian",
        "Foreign Language Japanese",
        "Foreign Language Mandarin",
        "Foreign Language Portuguese",
        "Foreign Language Russian",
        "Foreign Language Spanish",
        "Hindi as a Second Language",
        "Latin",
        "Literature in English",
        "World Literature",
      ],
      UNTIERED,
    ),
    ...group(IGCSE_GROUPS[1], ["International Mathematics", "Mathematics"], TIERED),
    // Additional Mathematics is an Extended-only syllabus — there is no Core paper.
    ...group(IGCSE_GROUPS[1], ["Additional Mathematics"], UNTIERED),
    ...group(
      IGCSE_GROUPS[2],
      ["Biology", "Chemistry", "Combined Science", "Co-ordinated Sciences", "Physics"],
      TIERED,
    ),
    ...group(
      IGCSE_GROUPS[2],
      ["Astronomy", "Environmental Management", "Marine Science"],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[3],
      [
        "Development Studies",
        "Geography",
        "Global Perspectives",
        "History",
        "Psychology",
        "Religious Studies",
        "Sociology",
        "Travel & Tourism",
      ],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[4],
      ["Accounting", "Business Studies", "Economics", "Enterprise"],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[5],
      [
        "Agriculture",
        "Art & Design",
        "Child Development",
        "Computer Science",
        "Design & Technology",
        "Drama",
        "Food & Nutrition",
        "Information & Communication Technology (ICT)",
        "Music",
        "Physical Education",
      ],
      UNTIERED,
    ),
  ],
};

// ─── CBSE ──────────────────────────────────────────────────────────────

const CBSE10_GROUPS = ["Languages", "Core Subjects", "Skill & Elective Subjects"];

const CBSE_10: CurriculumConfig = {
  key: "CBSE-10",
  label: "CBSE — Class 9–10 (Secondary)",
  shortLabel: "CBSE 9–10",
  blurb: "The secondary stage. Mathematics is offered at two levels: Standard, which keeps Class 11 science open, and Basic.",
  typicalGrades: ["9th Grade", "10th Grade"],
  gradeScale: PERCENT,
  levelLabel: "Level",
  groups: CBSE10_GROUPS,
  selectionHint: "Two languages plus Mathematics, Science and Social Science, and any electives.",
  typicalCount: 5,
  subjects: [
    ...group(CBSE10_GROUPS[0], [
      "Arabic",
      "Assamese",
      "Bengali",
      "English (Language & Literature)",
      "French",
      "German",
      "Gujarati",
      "Hindi Course A",
      "Hindi Course B",
      "Japanese",
      "Kannada",
      "Malayalam",
      "Mandarin (Chinese)",
      "Marathi",
      "Odia",
      "Punjabi",
      "Russian",
      "Sanskrit",
      "Spanish",
      "Tamil",
      "Telugu",
      "Urdu",
    ]),
    // The one CBSE detail that actually matters for admissions: Class 10 maths
    // is entered as Standard or Basic, and Basic closes off Class 11 science.
    {
      name: "Mathematics",
      group: CBSE10_GROUPS[1],
      levels: ["Standard", "Basic"],
    },
    ...group(CBSE10_GROUPS[1], ["Science", "Social Science"]),
    ...group(CBSE10_GROUPS[2], [
      "Artificial Intelligence",
      "Banking & Insurance",
      "Computer Applications",
      "Elements of Book Keeping & Accountancy",
      "Elements of Business",
      "Home Science",
      "Information Technology",
      "Marketing & Sales",
      "Multimedia",
      "Painting",
      "Physical Education",
      "Retail",
      "Tourism",
    ]),
  ],
};

const CBSE12_GROUPS = ["Languages", "Science Stream", "Commerce Stream", "Humanities Stream", "Skill & Elective Subjects"];

const CBSE_12: CurriculumConfig = {
  key: "CBSE-12",
  label: "CBSE — Class 11–12 (Senior Secondary)",
  shortLabel: "CBSE 11–12",
  blurb: "The senior secondary stage. One language plus four or five electives, usually drawn from a single stream.",
  typicalGrades: ["11th Grade", "12th Grade"],
  gradeScale: PERCENT,
  groups: CBSE12_GROUPS,
  selectionHint: "One compulsory language plus four elective subjects (a fifth is optional).",
  typicalCount: 5,
  subjects: [
    ...group(CBSE12_GROUPS[0], [
      "Arabic",
      "Assamese",
      "Bengali",
      "English Core",
      "English Elective",
      "French",
      "German",
      "Gujarati",
      "Hindi Core",
      "Hindi Elective",
      "Japanese",
      "Kannada",
      "Malayalam",
      "Mandarin (Chinese)",
      "Marathi",
      "Odia",
      "Persian",
      "Punjabi",
      "Russian",
      "Sanskrit",
      "Spanish",
      "Tamil",
      "Telugu",
      "Urdu",
    ]),
    ...group(CBSE12_GROUPS[1], [
      "Applied Mathematics",
      "Biology",
      "Biotechnology",
      "Chemistry",
      "Computer Science",
      "Engineering Graphics",
      "Informatics Practices",
      "Mathematics",
      "Physics",
    ]),
    ...group(CBSE12_GROUPS[2], [
      "Accountancy",
      "Business Studies",
      "Economics",
      "Entrepreneurship",
    ]),
    ...group(CBSE12_GROUPS[3], [
      "Fine Arts (Painting)",
      "Geography",
      "History",
      "Legal Studies",
      "Political Science",
      "Psychology",
      "Sociology",
    ]),
    ...group(CBSE12_GROUPS[4], [
      "Artificial Intelligence",
      "Fashion Studies",
      "Financial Markets Management",
      "Home Science",
      "Hospitality & Tourism",
      "Mass Media Studies",
      "Physical Education",
      "Yoga",
    ]),
  ],
};

// ─── CISCE: ICSE (Class 9–10) and ISC (Class 11–12) ────────────────────

const ICSE_GROUPS = ["Group I · Compulsory", "Group II · Electives (pick two)", "Group III · Electives (pick one)"];

const ICSE: CurriculumConfig = {
  key: "ICSE",
  label: "ICSE — Class 9–10 (CISCE)",
  shortLabel: "ICSE",
  blurb: "CISCE's Class 10 certificate. Three compulsory Group I subjects, two from Group II and one from Group III.",
  typicalGrades: ["9th Grade", "10th Grade"],
  gradeScale: PERCENT,
  groups: ICSE_GROUPS,
  selectionHint: "All of Group I, two subjects from Group II, and one from Group III.",
  typicalCount: 6,
  subjects: [
    ...group(ICSE_GROUPS[0], [
      "English",
      "History, Civics & Geography",
      "Second Language",
    ]),
    ...group(ICSE_GROUPS[1], [
      "Biology",
      "Chemistry",
      "Commercial Studies",
      "Economics",
      "Environmental Science",
      "Mathematics",
      "Physics",
      "A Modern Foreign Language",
      "A Classical Language",
    ]),
    ...group(ICSE_GROUPS[2], [
      "Art",
      "Commercial Applications",
      "Computer Applications",
      "Cookery",
      "Drama",
      "Economic Applications",
      "Environmental Applications",
      "Fashion Designing",
      "Home Science",
      "Indian Music (Carnatic)",
      "Indian Music (Hindustani)",
      "Mass Media & Communication",
      "Performing Arts",
      "Physical Education",
      "Western Music",
      "Yoga",
    ]),
  ],
};

const ISC_GROUPS = ["Compulsory", "Sciences & Mathematics", "Commerce", "Humanities", "Arts & Applied"];

const ISC: CurriculumConfig = {
  key: "ISC",
  label: "ISC — Class 11–12 (CISCE)",
  shortLabel: "ISC",
  blurb: "CISCE's Class 12 certificate. English is compulsory, alongside three to five elective subjects.",
  typicalGrades: ["11th Grade", "12th Grade"],
  gradeScale: PERCENT,
  groups: ISC_GROUPS,
  selectionHint: "English plus three to five electives.",
  typicalCount: 5,
  subjects: [
    ...group(ISC_GROUPS[0], ["English"]),
    ...group(ISC_GROUPS[1], [
      "Biology",
      "Biotechnology",
      "Chemistry",
      "Computer Science",
      "Geometrical & Building Drawing",
      "Geometrical & Mechanical Drawing",
      "Mathematics",
      "Physics",
    ]),
    ...group(ISC_GROUPS[2], ["Accounts", "Business Studies", "Commerce", "Economics"]),
    ...group(ISC_GROUPS[3], [
      "Geography",
      "History",
      "Legal Studies",
      "Political Science",
      "Psychology",
      "Sociology",
    ]),
    ...group(ISC_GROUPS[4], [
      "Art",
      "Electricity & Electronics",
      "Environmental Science",
      "Fashion Designing",
      "Home Science",
      "Hospitality Management",
      "Indian Music (Carnatic)",
      "Indian Music (Hindustani)",
      "Mass Media & Communication",
      "Physical Education",
      "Western Music",
    ]),
  ],
};

// ─── US high school ────────────────────────────────────────────────────

const US_GROUPS = [
  "Mathematics",
  "Sciences",
  "English",
  "Social Studies",
  "World Languages",
  "Arts & Electives",
];

const US_HS: CurriculumConfig = {
  key: "US",
  label: "US High School",
  shortLabel: "US HS",
  blurb: "A standard US transcript. Mark each course as Regular, Honors, AP, IB or dual enrollment.",
  typicalGrades: ["9th Grade", "10th Grade", "11th Grade", "12th Grade"],
  gradeScale: PERCENT,
  levelOptions: ["Regular", "Honors", "AP", "IB", "Dual Enrollment"],
  levelLabel: "Course level",
  groups: US_GROUPS,
  selectionHint: "Add the courses on your transcript this year.",
  subjects: [
    ...group(US_GROUPS[0], [
      "Algebra I",
      "Algebra II",
      "Calculus",
      "Geometry",
      "Multivariable Calculus",
      "Pre-Calculus",
      "Statistics",
      "Trigonometry",
    ]),
    ...group(US_GROUPS[1], [
      "Anatomy & Physiology",
      "Astronomy",
      "Biology",
      "Chemistry",
      "Computer Science",
      "Earth Science",
      "Engineering",
      "Environmental Science",
      "Forensic Science",
      "Marine Science",
      "Physics",
      "Robotics",
    ]),
    ...group(US_GROUPS[2], [
      "Creative Writing",
      "English Language Arts",
      "English Literature",
      "Journalism",
      "Speech & Communication",
    ]),
    ...group(US_GROUPS[3], [
      "Anthropology",
      "Civics",
      "Economics",
      "Geography",
      "Government",
      "Philosophy",
      "Political Science",
      "Psychology",
      "Sociology",
      "US History",
      "World History",
    ]),
    ...group(US_GROUPS[4], [
      "Arabic",
      "American Sign Language",
      "Chinese",
      "French",
      "German",
      "Italian",
      "Japanese",
      "Latin",
      "Spanish",
    ]),
    ...group(US_GROUPS[5], [
      "Accounting",
      "Architecture",
      "Band",
      "Business Management",
      "Choir",
      "Dance",
      "Debate",
      "Drama / Theatre",
      "Film Studies",
      "Graphic Design",
      "Health Science",
      "Marketing",
      "Music Theory",
      "Orchestra",
      "Photography",
      "Physical Education",
      "Studio Art",
    ]),
  ],
};

// ─── Other / national curricula ────────────────────────────────────────

const OTHER_GROUPS = ["Mathematics", "Sciences", "Languages", "Humanities & Social Sciences", "Arts & Electives"];

const OTHER: CurriculumConfig = {
  key: "Other",
  label: "Other / National Curriculum",
  shortLabel: "Other",
  blurb: "Any national or regional curriculum not listed. Subjects are generic — add whatever you study.",
  typicalGrades: ["9th Grade", "10th Grade", "11th Grade", "12th Grade"],
  gradeScale: PERCENT,
  groups: OTHER_GROUPS,
  subjects: [
    ...group(OTHER_GROUPS[0], ["Advanced Mathematics", "Mathematics", "Statistics"]),
    ...group(OTHER_GROUPS[1], [
      "Biology",
      "Chemistry",
      "Computer Science",
      "Earth Science",
      "Engineering",
      "Environmental Science",
      "Physics",
    ]),
    ...group(OTHER_GROUPS[2], ["Classical Language", "English", "Foreign Language", "Native Language"]),
    ...group(OTHER_GROUPS[3], [
      "Business Studies",
      "Civics",
      "Economics",
      "Geography",
      "History",
      "Philosophy",
      "Political Science",
      "Psychology",
      "Religious Studies",
      "Sociology",
    ]),
    ...group(OTHER_GROUPS[4], [
      "Art & Design",
      "Dance",
      "Drama / Theatre",
      "Information Technology",
      "Music",
      "Physical Education",
    ]),
  ],
};

export const CURRICULA: Record<CurriculumKey, CurriculumConfig> = {
  "IB-DP": IB_DP,
  "IB-MYP": IB_MYP,
  "IB-CP": IB_CP,
  AP,
  "A-Levels": A_LEVELS,
  IGCSE,
  "CBSE-10": CBSE_10,
  "CBSE-12": CBSE_12,
  ICSE,
  ISC,
  US: US_HS,
  Other: OTHER,
};

/** Picker order: most-used programmes first, then the catch-all. */
export const CURRICULUM_ORDER: CurriculumKey[] = [
  "IB-DP",
  "IB-MYP",
  "IB-CP",
  "AP",
  "A-Levels",
  "IGCSE",
  "CBSE-10",
  "CBSE-12",
  "ICSE",
  "ISC",
  "US",
  "Other",
];

/**
 * Values written by older builds, when a board was stored without its
 * programme. Existing rows must keep resolving to something sensible.
 */
const LEGACY_ALIASES: Record<string, CurriculumKey> = {
  IB: "IB-DP",
  "IB DP": "IB-DP",
  "IB MYP": "IB-MYP",
  "IB CP": "IB-CP",
  CBSE: "CBSE-12",
  "A Levels": "A-Levels",
  "A-Level": "A-Levels",
  ALevels: "A-Levels",
  GCSE: "IGCSE",
};

export function getCurriculumConfig(key: string | null | undefined): CurriculumConfig {
  if (!key) return CURRICULA.US;
  if (key in CURRICULA) return CURRICULA[key as CurriculumKey];
  const aliased = LEGACY_ALIASES[key];
  return aliased ? CURRICULA[aliased] : CURRICULA.Other;
}

export function findSubject(
  config: CurriculumConfig,
  subjectName: string,
): CurriculumSubject | undefined {
  return config.subjects.find((s) => s.name === subjectName);
}

/**
 * Level options for one subject. Returns [] when the subject takes no level,
 * which is the case for every subject in an untiered programme AND for the
 * untiered subjects inside a tiered one.
 */
export function levelsForSubject(config: CurriculumConfig, subjectName: string): string[] {
  const subject = findSubject(config, subjectName);
  if (!subject) return config.levelOptions ?? [];
  if (subject.levels) return subject.levels;
  return config.levelOptions ?? [];
}

/**
 * The grade scale that applies to a subject at a given level. Subject
 * overrides win (DP core is A-E), then level overrides (IGCSE Core caps at C),
 * then the programme default.
 */
export function gradeScaleFor(
  config: CurriculumConfig,
  subjectName: string,
  level?: string,
): GradingScale {
  const subject = findSubject(config, subjectName);
  if (subject?.gradeScale) return subject.gradeScale;
  if (level && config.levelGradeScales?.[level]) return config.levelGradeScales[level];
  return config.gradeScale;
}

/** Subjects belonging to one group, already alphabetical. */
export function subjectsInGroup(config: CurriculumConfig, groupName: string): CurriculumSubject[] {
  return config.subjects.filter((s) => s.group === groupName);
}

/** Programmes normally taken in a given school grade, for "recommended" hints. */
export function curriculaForGrade(grade: string | null | undefined): CurriculumKey[] {
  if (!grade) return [];
  return CURRICULUM_ORDER.filter((k) => CURRICULA[k].typicalGrades.includes(grade));
}

// ─── GPA scales ────────────────────────────────────────────────────────

export type GpaSystem = "gpa-4" | "gpa-10" | "percentage";

export const GPA_SYSTEMS: { value: GpaSystem; label: string; min: number; max: number; step: number; suffix?: string }[] = [
  { value: "gpa-4", label: "GPA (4.0 scale)", min: 0, max: 4, step: 0.01 },
  { value: "gpa-10", label: "GPA (10.0 scale)", min: 0, max: 10, step: 0.01 },
  { value: "percentage", label: "Percentage (0–100%)", min: 0, max: 100, step: 0.1, suffix: "%" },
];

/** Recommend default GPA system from curriculum */
export function defaultGpaSystem(curriculum: string | null | undefined): GpaSystem {
  switch (getCurriculumConfig(curriculum).key) {
    case "AP":
    case "US":
      return "gpa-4";
    default:
      return "percentage";
  }
}

// ─── PSAT version by grade ────────────────────────────────────────────

export function psatVersionForGrade(grade: string | null | undefined): { version: string; max: number } {
  const g = (grade || "").toLowerCase();
  if (g.includes("8") || g.includes("9")) return { version: "PSAT 8/9", max: 1440 };
  if (g.includes("10")) return { version: "PSAT 10", max: 1520 };
  return { version: "PSAT/NMSQT", max: 1520 };
}
