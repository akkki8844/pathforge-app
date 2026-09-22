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

// ─── IB language catalogues ────────────────────────────────────────────
//
// Group 1 has two courses and they are NOT offered in the same languages:
// Literature runs in roughly fifty-five, Language & Literature in seventeen.
// Generating both from one list would have invented a Marathi or Sinhala
// language-and-literature course that no school can enter a student for, so
// the two catalogues are kept apart. Writing them out by hand was the original
// problem — the list stopped at a dozen European languages and excluded most
// of the students who actually sit the diploma.

const DP_LITERATURE_LANGUAGES = [
  "Afrikaans",
  "Albanian",
  "Arabic",
  "Armenian",
  "Bengali",
  "Bosnian",
  "Bulgarian",
  "Catalan",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Filipino",
  "Finnish",
  "French",
  "Georgian",
  "German",
  "Gujarati",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Icelandic",
  "Indonesian",
  "Italian",
  "Japanese",
  "Kazakh",
  "Korean",
  "Latvian",
  "Lithuanian",
  "Macedonian",
  "Malay",
  "Malayalam",
  "Mandarin",
  "Marathi",
  "Modern Greek",
  "Mongolian",
  "Nepali",
  "Norwegian",
  "Persian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Serbian",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tamil",
  "Telugu",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
  "Welsh",
];

/** The seventeen languages the Language & Literature course is examined in. */
const DP_LANG_LIT_LANGUAGES = [
  "Arabic",
  "Danish",
  "Dutch",
  "English",
  "French",
  "German",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin",
  "Norwegian",
  "Portuguese",
  "Russian",
  "Spanish",
  "Swedish",
  "Turkish",
];

/** Group 2 language B is a smaller catalogue than Group 1 — not every
 *  literature language has a B course. */
const DP_LANGUAGE_B = [
  "Arabic",
  "Danish",
  "Dutch",
  "English",
  "French",
  "German",
  "Hindi",
  "Indonesian",
  "Italian",
  "Japanese",
  "Korean",
  "Malay",
  "Mandarin",
  "Modern Greek",
  "Norwegian",
  "Portuguese",
  "Russian",
  "Spanish",
  "Swedish",
  "Thai",
  "Turkish",
];

/** ab initio is a beginners' course, offered at SL in fewer languages again. */
const DP_AB_INITIO = [
  "Arabic",
  "Danish",
  "Dutch",
  "French",
  "German",
  "Hindi",
  "Indonesian",
  "Italian",
  "Japanese",
  "Mandarin",
  "Portuguese",
  "Russian",
  "Spanish",
  "Swahili",
  "Swedish",
  "Turkish",
];

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
    ...group(
      DP_GROUPS[0],
      DP_LITERATURE_LANGUAGES.map((l) => `${l} Literature`),
    ),
    ...group(
      DP_GROUPS[0],
      DP_LANG_LIT_LANGUAGES.map((l) => `${l} Language & Literature`),
    ),
    ...group(DP_GROUPS[0], ["Self-Taught Literature (School-Supported)"]),
    // Literature & Performance is an interdisciplinary Group 1/6 course, SL only.
    { name: "Literature & Performance", group: DP_GROUPS[0], levels: ["SL"] },
    ...group(
      DP_GROUPS[1],
      DP_LANGUAGE_B.map((l) => `${l} B`),
    ),
    // ab initio is a beginners' course and exists at SL only. Classical
    // languages run HL/SL like any other Group 2 subject.
    ...group(
      DP_GROUPS[1],
      DP_AB_INITIO.map((l) => `${l} ab initio`),
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
    // ITGS ran its final examinations in November 2024 and was replaced by
    // Digital Society, but students who sat it still have the grade on a
    // transcript, so it stays selectable.
    ...group(DP_GROUPS[2], ["Information Technology in a Global Society (ITGS)"]),
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
    // Astronomy and Nature of Science are the school-based syllabus pilots;
    // both are SL-only.
    ...group(DP_GROUPS[3], ["Astronomy", "Nature of Science"], { levels: ["SL"] }),
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
    // MYP language and literature is school-defined rather than centrally
    // examined, so it is not restricted the way DP Language & Literature is:
    // any language the school teaches is legitimate here.
    ...group(
      MYP_GROUPS[0],
      DP_LITERATURE_LANGUAGES.map((l) => `${l} Language & Literature`),
    ),
    ...group(MYP_GROUPS[1], DP_LANGUAGE_B, { levels: MYP_PHASES }),
    ...group(MYP_GROUPS[2], [
      "Business Management",
      "Civics",
      "Economics",
      "Geography",
      "Global Politics",
      "History",
      "Integrated Humanities",
      "Philosophy",
      "Psychology",
      "Sociology",
      "World Religions",
    ]),
    ...group(MYP_GROUPS[3], [
      "Biology",
      "Chemistry",
      "Environmental Science",
      "Integrated Sciences",
      "Life Science",
      "Physical Science",
      "Physics",
      "Sports, Exercise & Health Science",
    ]),
    // The one detail people get wrong: MYP has no HL/SL. Years 4-5 maths is
    // Standard or Extended, and the eAssessment papers differ accordingly.
    {
      name: "Mathematics",
      group: MYP_GROUPS[4],
      levels: ["Standard", "Extended"],
    },
    ...group(MYP_GROUPS[5], [
      "Dance",
      "Drama",
      "Film",
      "Media",
      "Music",
      "Photography",
      "Theatre",
      "Visual Arts",
    ]),
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
    ...group(AL_GROUPS[0], [
      "Further Mathematics",
      "Mathematics",
      "Pure Mathematics",
      "Statistics",
    ]),
    ...group(AL_GROUPS[1], [
      "Applied Science",
      "Biology",
      "Chemistry",
      "Computer Science",
      "Design & Technology: Engineering",
      "Electronics",
      "Environmental Management",
      "Environmental Science",
      "Food Science & Nutrition",
      "Geology",
      "Human Biology",
      "Marine Science",
      "Physics",
      "Psychology",
    ]),
    ...group(AL_GROUPS[2], [
      "Accounting",
      "Applied Business",
      "Business",
      "Criminology",
      "Economics",
      "Global Perspectives & Research",
      "Government & Politics",
      "Health & Social Care",
      "Law",
      "Sociology",
      "Travel & Tourism",
    ]),
    ...group(AL_GROUPS[3], [
      "Ancient History",
      "Anthropology",
      "Archaeology",
      "Classical Civilisation",
      "Divinity",
      "Geography",
      "Hinduism",
      "History",
      "History of Art",
      "Islamic Studies",
      "Philosophy",
      "Religious Studies",
    ]),
    ...group(AL_GROUPS[4], [
      "Afrikaans",
      "Arabic",
      "Bengali",
      "Dutch",
      "English Language",
      "English Language & Literature",
      "English Literature",
      "French",
      "German",
      "Greek",
      "Gujarati",
      "Hindi",
      "Italian",
      "Japanese",
      "Latin",
      "Mandarin",
      "Marathi",
      "Modern Greek",
      "Modern Hebrew",
      "Panjabi",
      "Persian",
      "Polish",
      "Portuguese",
      "Russian",
      "Spanish",
      "Tamil",
      "Telugu",
      "Turkish",
      "Urdu",
    ]),
    ...group(AL_GROUPS[5], [
      "Art & Design",
      "Dance",
      "Design & Technology",
      "Digital Media & Design",
      "Drama",
      "Drama & Theatre",
      "Film Studies",
      "Fine Art",
      "Graphic Communication",
      "Information Technology",
      "Media Studies",
      "Music",
      "Music Technology",
      "Photography",
      "Physical Education",
      "Product Design",
      "Textile Design",
      "Textiles",
      "Three-Dimensional Design",
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
        "Afrikaans as a Second Language",
        "Classical Greek",
        "First Language Afrikaans",
        "First Language Arabic",
        "First Language Chinese",
        "First Language Dutch",
        "First Language English",
        "First Language French",
        "First Language German",
        "First Language Hindi",
        "First Language Italian",
        "First Language Malay",
        "First Language Mandarin",
        "First Language Portuguese",
        "First Language Russian",
        "First Language Spanish",
        "First Language Tamil",
        "First Language Turkish",
        "First Language Urdu",
        "First Language isiZulu",
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
        "Literature in Chinese",
        "Literature in English",
        "Literature in Spanish",
        "Malay as a Foreign Language",
        "Portuguese as a Second Language",
        "Swahili",
        "Urdu as a Second Language",
        "World Literature",
        "isiZulu as a Second Language",
      ],
      UNTIERED,
    ),
    ...group(IGCSE_GROUPS[1], ["International Mathematics", "Mathematics"], TIERED),
    // Additional and Further Pure Mathematics are Extended-only syllabuses —
    // there is no Core paper for either.
    ...group(
      IGCSE_GROUPS[1],
      ["Additional Mathematics", "Further Pure Mathematics"],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[2],
      [
        "Biology",
        "Chemistry",
        "Combined Science",
        "Co-ordinated Sciences",
        "Physical Science",
        "Physics",
      ],
      TIERED,
    ),
    ...group(
      IGCSE_GROUPS[2],
      ["Astronomy", "Environmental Management", "Human Biology", "Marine Science"],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[3],
      [
        "Bangladesh Studies",
        "Development Studies",
        "Geography",
        "Global Perspectives",
        "Hinduism",
        "History",
        "India Studies",
        "Islamiyat",
        "Pakistan Studies",
        "Psychology",
        "Religious Studies",
        "Sociology",
        "Travel & Tourism",
      ],
      UNTIERED,
    ),
    ...group(
      IGCSE_GROUPS[4],
      ["Accounting", "Business Studies", "Commerce", "Economics", "Enterprise"],
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
        "Media Studies",
        "Music",
        "Physical Education",
      ],
      UNTIERED,
    ),
  ],
};

// ─── CBSE ──────────────────────────────────────────────────────────────

// CBSE examines far more languages than the metros suggest: the scheduled
// Indian languages, the north-eastern and Himalayan languages, and a set of
// foreign languages. Both stages draw on the same catalogue under different
// paper names, so it is written once.

const CBSE_LANGUAGES = [
  "Arabic",
  "Assamese",
  "Bahasa Melayu",
  "Bengali",
  "Bhutia",
  "Bodo",
  "French",
  "German",
  "Gujarati",
  "Gurung",
  "Japanese",
  "Kannada",
  "Kashmiri",
  "Lepcha",
  "Limboo",
  "Malayalam",
  "Mandarin (Chinese)",
  "Manipuri",
  "Marathi",
  "Mizo",
  "Nepali",
  "Odia",
  "Persian",
  "Punjabi",
  "Rai",
  "Russian",
  "Sherpa",
  "Sindhi",
  "Spanish",
  "Tamang",
  "Tamil",
  "Tangkhul",
  "Telugu",
  "Telugu Telangana",
  "Thai",
  "Tibetan",
];

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
      ...CBSE_LANGUAGES,
      "English (Communicative)",
      "English (Language & Literature)",
      "Hindi Course A",
      "Hindi Course B",
      "Sanskrit",
      "Sanskrit (Communicative)",
      "Urdu Course A",
      "Urdu Course B",
    ]),
    // The one CBSE detail that actually matters for admissions: Class 10 maths
    // is entered as Standard or Basic, and Basic closes off Class 11 science.
    {
      name: "Mathematics",
      group: CBSE10_GROUPS[1],
      levels: ["Standard", "Basic"],
    },
    ...group(CBSE10_GROUPS[1], ["Science", "Social Science"]),
    // The Class 10 skill catalogue is the full NSQF list CBSE publishes, not
    // the handful that happen to be common in metros — a student who took
    // Beauty & Wellness or Physical Activity Trainer had no way to record it.
    ...group(CBSE10_GROUPS[2], [
      "Agriculture",
      "Apparel",
      "Artificial Intelligence",
      "Automotive",
      "Banking & Insurance",
      "Beauty & Wellness",
      "Carnatic Music (Melodic Instruments)",
      "Carnatic Music (Percussion)",
      "Carnatic Music (Vocal)",
      "Coding",
      "Computer Applications",
      "Data Science",
      "Design Thinking & Innovation",
      "Electronics & Hardware",
      "Elements of Book Keeping & Accountancy",
      "Elements of Business",
      "Food Production",
      "Foundation Skills for Sciences",
      "Front Office Operations",
      "Handicrafts",
      "Health Care",
      "Hindustani Music (Melodic Instruments)",
      "Hindustani Music (Percussion)",
      "Hindustani Music (Vocal)",
      "Home Science",
      "Information Technology",
      "Introduction to Financial Markets",
      "Introduction to Tourism",
      "Marketing & Sales",
      "Mass Media Studies",
      "Multi-Skill Foundation Course",
      "Multimedia",
      "National Cadet Corps (NCC)",
      "Painting",
      "Physical Activity Trainer",
      "Physical Education",
      "Retail",
      "Security",
      "Tourism",
      "Typography & Computer Applications",
      "Yoga",
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
      ...CBSE_LANGUAGES,
      "English Core",
      "English Elective",
      "Hindi Core",
      "Hindi Elective",
      "Sanskrit Core",
      "Sanskrit Elective",
      "Urdu Core",
      "Urdu Elective",
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
      "Applied Mathematics",
      "Business Studies",
      "Economics",
      "Entrepreneurship",
      "Informatics Practices",
    ]),
    ...group(CBSE12_GROUPS[3], [
      "Fine Arts (Applied Art / Commercial Art)",
      "Fine Arts (Graphics)",
      "Fine Arts (Painting)",
      "Fine Arts (Sculpture)",
      "Geography",
      "History",
      "Home Science",
      "Knowledge Tradition & Practices of India",
      "Legal Studies",
      "National Cadet Corps (NCC)",
      "Political Science",
      "Psychology",
      "Sociology",
    ]),
    ...group(CBSE12_GROUPS[4], [
      "Agriculture",
      "Air-Conditioning & Refrigeration",
      "Apparel",
      "Artificial Intelligence",
      "Automotive",
      "Banking",
      "Beauty & Wellness",
      "Business Administration",
      "Carnatic Music (Melodic Instruments)",
      "Carnatic Music (Percussion)",
      "Carnatic Music (Vocal)",
      "Cost Accounting",
      "Data Science",
      "Design",
      "Early Childhood Care & Education",
      "Electrical Technology",
      "Electronics & Hardware",
      "Fashion Studies",
      "Financial Markets Management",
      "Food Nutrition & Dietetics",
      "Food Production",
      "Front Office Operations",
      "Geospatial Technology",
      "Health Care",
      "Hindustani Music (Melodic Instruments)",
      "Hindustani Music (Percussion)",
      "Hindustani Music (Vocal)",
      "Home Science",
      "Horticulture",
      "Hospitality & Tourism",
      "Information Technology",
      "Insurance",
      "Library & Information Science",
      "Marketing",
      "Mass Media Studies",
      "Medical Diagnostics",
      "Multi-Media",
      "Office Procedures & Practices",
      "Physical Activity Trainer",
      "Physical Education",
      "Retail",
      "Salesmanship",
      "Shorthand (English)",
      "Shorthand (Hindi)",
      "Taxation",
      "Textile Design",
      "Typography & Computer Applications",
      "Web Application",
      "Yoga",
    ]),
  ],
};

// ─── CISCE: ICSE (Class 9–10) and ISC (Class 11–12) ────────────────────

/**
 * CISCE examines its second languages and modern foreign languages by name,
 * and a student has to be able to say which one they sat: "Second Language"
 * on its own is not a subject anybody is graded in.
 */
const CISCE_INDIAN_LANGUAGES = [
  "Assamese",
  "Bengali",
  "Gujarati",
  "Hindi",
  "Kannada",
  "Kashmiri",
  "Malayalam",
  "Manipuri",
  "Marathi",
  "Nepali",
  "Odia",
  "Punjabi",
  "Sindhi",
  "Tamil",
  "Telugu",
  "Urdu",
];

const CISCE_FOREIGN_LANGUAGES = [
  "Arabic",
  "Chinese",
  "French",
  "German",
  "Japanese",
  "Modern Armenian",
  "Portuguese",
  "Spanish",
  "Thai",
  "Tibetan",
];

const CISCE_CLASSICAL_LANGUAGES = ["Classical Arabic", "Latin", "Sanskrit"];

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
    ...group(ICSE_GROUPS[0], ["English", "History, Civics & Geography"]),
    ...group(
      ICSE_GROUPS[0],
      CISCE_INDIAN_LANGUAGES.map((l) => `Second Language: ${l}`),
    ),
    ...group(ICSE_GROUPS[1], [
      "Biology",
      "Chemistry",
      "Commercial Studies",
      "Economics",
      "Environmental Science",
      "Mathematics",
      "Physics",
    ]),
    ...group(
      ICSE_GROUPS[1],
      CISCE_FOREIGN_LANGUAGES.map((l) => `Modern Foreign Language: ${l}`),
    ),
    ...group(
      ICSE_GROUPS[1],
      CISCE_CLASSICAL_LANGUAGES.map((l) => `Classical Language: ${l}`),
    ),
    ...group(ICSE_GROUPS[2], [
      "Agriculture",
      "Art",
      "Commercial Applications",
      "Computer Applications",
      "Cookery",
      "Drama",
      "Economic Applications",
      "Environmental Applications",
      "Fashion Designing",
      "French",
      "German",
      "Hindustani Music",
      "Home Science",
      "Indian Music (Carnatic)",
      "Indian Music (Hindustani)",
      "Mass Media & Communication",
      "Performing Arts",
      "Physical Education",
      "Spanish",
      "Technical Drawing Applications",
      "Western Music",
      "Yoga",
    ]),
  ],
};

const ISC_GROUPS = [
  "Compulsory",
  "Languages",
  "Sciences & Mathematics",
  "Commerce",
  "Humanities",
  "Arts & Applied",
];

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
    // Elective English and the language papers are electives in their own
    // right at ISC, not a single unnamed "second language" slot.
    ...group(ISC_GROUPS[1], ["Elective English"]),
    ...group(ISC_GROUPS[1], CISCE_INDIAN_LANGUAGES),
    ...group(ISC_GROUPS[1], CISCE_FOREIGN_LANGUAGES),
    ...group(ISC_GROUPS[1], CISCE_CLASSICAL_LANGUAGES),
    ...group(ISC_GROUPS[2], [
      "Biology",
      "Biotechnology",
      "Chemistry",
      "Computer Science",
      "Engineering Science",
      "Geometrical & Building Drawing",
      "Geometrical & Mechanical Drawing",
      "Mathematics",
      "Physics",
    ]),
    ...group(ISC_GROUPS[3], ["Accounts", "Business Studies", "Commerce", "Economics"]),
    ...group(ISC_GROUPS[4], [
      "Geography",
      "History",
      "Legal Studies",
      "Political Science",
      "Psychology",
      "Sociology",
    ]),
    ...group(ISC_GROUPS[5], [
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
      "Yoga",
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
      "Differential Equations",
      "Discrete Mathematics",
      "Geometry",
      "Integrated Math I",
      "Integrated Math II",
      "Integrated Math III",
      "Linear Algebra",
      "Multivariable Calculus",
      "Pre-Algebra",
      "Pre-Calculus",
      "Probability & Statistics",
      "Quantitative Reasoning",
      "Statistics",
      "Trigonometry",
    ]),
    ...group(US_GROUPS[1], [
      "Anatomy & Physiology",
      "Astronomy",
      "Biology",
      "Biotechnology",
      "Botany",
      "Chemistry",
      "Computer Science",
      "Earth Science",
      "Engineering",
      "Environmental Science",
      "Forensic Science",
      "Genetics",
      "Geology",
      "Marine Science",
      "Meteorology",
      "Microbiology",
      "Organic Chemistry",
      "Physical Science",
      "Physics",
      "Robotics",
      "Zoology",
    ]),
    ...group(US_GROUPS[2], [
      "American Literature",
      "British Literature",
      "Composition & Rhetoric",
      "Creative Writing",
      "English Language Arts",
      "English Literature",
      "Journalism",
      "Speech & Communication",
      "World Literature",
    ]),
    ...group(US_GROUPS[3], [
      "African American Studies",
      "Anthropology",
      "Civics",
      "Comparative Government",
      "Economics",
      "Ethnic Studies",
      "European History",
      "Geography",
      "Government",
      "Human Geography",
      "Law & Justice",
      "Philosophy",
      "Political Science",
      "Psychology",
      "Sociology",
      "US History",
      "World History",
      "World Religions",
    ]),
    ...group(US_GROUPS[4], [
      "American Sign Language",
      "Arabic",
      "Chinese",
      "French",
      "German",
      "Greek",
      "Hebrew",
      "Hindi",
      "Italian",
      "Japanese",
      "Korean",
      "Latin",
      "Portuguese",
      "Russian",
      "Spanish",
      "Vietnamese",
    ]),
    ...group(US_GROUPS[5], [
      "Accounting",
      "Agriculture",
      "Architecture",
      "Automotive Technology",
      "Band",
      "Business Management",
      "Ceramics",
      "Choir",
      "Computer Applications",
      "Culinary Arts",
      "Dance",
      "Debate",
      "Drama / Theatre",
      "Engineering Design",
      "Entrepreneurship",
      "Fashion Design",
      "Film Studies",
      "Graphic Design",
      "Health & Wellness",
      "Health Science",
      "Jazz Ensemble",
      "Marketing",
      "Music Theory",
      "Orchestra",
      "Personal Finance",
      "Photography",
      "Physical Education",
      "Sculpture",
      "Studio Art",
      "Web Design",
      "Woodworking",
      "Yearbook",
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
    ...group(OTHER_GROUPS[0], [
      "Advanced Mathematics",
      "Applied Mathematics",
      "Further Mathematics",
      "Mathematics",
      "Statistics",
    ]),
    ...group(OTHER_GROUPS[1], [
      "Agricultural Science",
      "Astronomy",
      "Biology",
      "Chemistry",
      "Computer Science",
      "Earth Science",
      "Engineering",
      "Environmental Science",
      "General Science",
      "Health Science",
      "Physics",
    ]),
    ...group(OTHER_GROUPS[2], [
      "Classical Language",
      "English",
      "Foreign Language",
      "Literature",
      "Native Language",
      "Second Language",
    ]),
    ...group(OTHER_GROUPS[3], [
      "Accounting",
      "Anthropology",
      "Business Studies",
      "Civics",
      "Commerce",
      "Economics",
      "Geography",
      "History",
      "Law",
      "Philosophy",
      "Political Science",
      "Psychology",
      "Religious Studies",
      "Sociology",
    ]),
    ...group(OTHER_GROUPS[4], [
      "Art & Design",
      "Computer Applications",
      "Dance",
      "Design & Technology",
      "Drama / Theatre",
      "Film Studies",
      "Graphic Design",
      "Home Economics",
      "Information Technology",
      "Media Studies",
      "Music",
      "Photography",
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

/**
 * Subjects belonging to one group, alphabetical.
 *
 * A group is assembled from several `group()` calls - the tiered syllabuses
 * and the untiered ones, the language B courses and the ab initio ones - and
 * each call sorts only its own names. Sorting here is what makes the rendered
 * list alphabetical end to end rather than a run of separately sorted blocks.
 */
export function subjectsInGroup(config: CurriculumConfig, groupName: string): CurriculumSubject[] {
  return config.subjects.filter((s) => s.group === groupName).sort(alpha);
}

/** Programmes normally taken in a given school grade, for "recommended" hints. */
export function curriculaForGrade(grade: string | null | undefined): CurriculumKey[] {
  if (!grade) return [];
  return CURRICULUM_ORDER.filter((k) => CURRICULA[k].typicalGrades.includes(grade));
}

// ─── GPA scales ────────────────────────────────────────────────────────

export type GpaSystem = "gpa-4" | "gpa-10" | "percentage" | "ib-45" | "ib-7";

export const GPA_SYSTEMS: { value: GpaSystem; label: string; min: number; max: number; step: number; suffix?: string }[] = [
  { value: "gpa-4", label: "GPA (4.0 scale)", min: 0, max: 4, step: 0.01 },
  { value: "gpa-10", label: "GPA (10.0 scale)", min: 0, max: 10, step: 0.01 },
  { value: "percentage", label: "Percentage (0–100%)", min: 0, max: 100, step: 0.1, suffix: "%" },
  // DP's diploma score is the number every student and admissions office
  // actually quotes — 6 subjects at 1-7 plus up to 3 TOK/EE core points.
  { value: "ib-45", label: "IB Diploma (out of 45)", min: 1, max: 45, step: 1 },
  // MYP has no diploma-style total; students report a subject-grade average
  // on the same 1-7 band every IB subject (DP included) is graded on.
  { value: "ib-7", label: "IB grade average (1–7 scale)", min: 1, max: 7, step: 0.1 },
];

/** Recommend default GPA system from curriculum */
export function defaultGpaSystem(curriculum: string | null | undefined): GpaSystem {
  switch (getCurriculumConfig(curriculum).key) {
    case "AP":
    case "US":
      return "gpa-4";
    case "IB-DP":
      return "ib-45";
    case "IB-MYP":
    case "IB-CP":
      return "ib-7";
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
