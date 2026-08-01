// Structured subject catalogs and grading scales per curriculum board.
// Used by Onboarding + Admissions Probability for accurate per-board input.
// All lists are kept ALPHABETICAL for predictable UI scanning.

export type CurriculumKey =
  | "IB"
  | "AP"
  | "A-Levels"
  | "CBSE"
  | "ICSE"
  | "IGCSE"
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

export interface CurriculumConfig {
  key: CurriculumKey;
  label: string;
  gradeScale: GradingScale;
  /** Suggested catalog of subjects users can pick from. Free addition is allowed via "Other". */
  subjects: string[];
  /** Whether the board commonly uses HL/SL or Standard/Higher tiers */
  hasLevels?: boolean;
  levelOptions?: string[];
}

const sortAlpha = (arr: string[]): string[] =>
  [...new Set(arr)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

const COMMON_HS = sortAlpha([
  "Accounting",
  "Algebra II",
  "AP Capstone",
  "Anthropology",
  "Architecture",
  "Art & Design",
  "Astronomy",
  "Biology",
  "Business Management",
  "Business Studies",
  "Calculus",
  "Chemistry",
  "Civics",
  "Computer Science",
  "Creative Writing",
  "Criminology",
  "Dance",
  "Debate",
  "Design Technology",
  "Drama / Theatre",
  "Earth Science",
  "Economics",
  "Engineering",
  "English",
  "English Language",
  "English Literature",
  "Environmental Science",
  "Ethics",
  "Film Studies",
  "Finance",
  "Foreign Language",
  "Forensic Science",
  "Geography",
  "Geology",
  "Government",
  "Graphic Design",
  "Health Science",
  "History",
  "Humanities",
  "Information Technology",
  "Journalism",
  "Marine Science",
  "Marketing",
  "Mathematics",
  "Media Studies",
  "Music",
  "Music Theory",
  "Performing Arts",
  "Philosophy",
  "Photography",
  "Physical Education",
  "Physics",
  "Political Science",
  "Pre-Calculus",
  "Psychology",
  "Religious Studies",
  "Robotics",
  "Sociology",
  "Speech & Communication",
  "Statistics",
  "Studio Art",
  "Trigonometry",
  "World History",
]);

export const CURRICULA: Record<CurriculumKey, CurriculumConfig> = {
  IB: {
    key: "IB",
    label: "International Baccalaureate (IB)",
    gradeScale: { label: "1–7", min: 1, max: 7, step: 1 },
    hasLevels: true,
    levelOptions: ["HL", "SL"],
    subjects: sortAlpha([
      // Group 1
      "English Language & Literature",
      "English Literature",
      "English Literature & Performance",
      "Spanish Literature",
      "French Literature",
      "German Literature",
      "Hindi Literature",
      "Mandarin Literature",
      "Japanese Literature",
      "Arabic Literature",
      "Self-Taught Literature",
      // Group 2
      "English B",
      "Spanish B",
      "French B",
      "German B",
      "Mandarin B",
      "Hindi B",
      "Japanese B",
      "Arabic B",
      "Italian B",
      "Russian B",
      "Korean B",
      "Portuguese B",
      "Spanish ab initio",
      "French ab initio",
      "Mandarin ab initio",
      "German ab initio",
      "Italian ab initio",
      "Japanese ab initio",
      "Latin",
      "Classical Greek",
      // Group 3
      "Business Management",
      "Economics",
      "History",
      "Geography",
      "Psychology",
      "Global Politics",
      "Philosophy",
      "Social & Cultural Anthropology",
      "World Religions",
      "Information Technology in a Global Society (ITGS)",
      "Digital Society",
      // Group 4
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Science",
      "Environmental Systems & Societies (ESS)",
      "Design Technology",
      "Sports, Exercise & Health Science",
      "Astronomy",
      // Group 5
      "Mathematics: Analysis & Approaches (AA)",
      "Mathematics: Applications & Interpretation (AI)",
      "Further Mathematics",
      // Group 6
      "Visual Arts",
      "Music",
      "Theatre",
      "Film",
      "Dance",
      "Literature & Performance",
      // Core
      "Theory of Knowledge (TOK)",
      "Extended Essay (EE)",
      "Creativity, Activity, Service (CAS)",
      // Interdisciplinary
      "World Studies Extended Essay",
      "Environmental Systems & Societies (Interdisciplinary)",
    ]),
  },
  AP: {
    key: "AP",
    label: "Advanced Placement (AP)",
    gradeScale: { label: "1–5", min: 1, max: 5, step: 1 },
    subjects: sortAlpha([
      // Math & CS
      "AP Calculus AB",
      "AP Calculus BC",
      "AP Statistics",
      "AP Precalculus",
      "AP Computer Science A",
      "AP Computer Science Principles",
      // Sciences
      "AP Physics 1",
      "AP Physics 2",
      "AP Physics C: Mechanics",
      "AP Physics C: Electricity & Magnetism",
      "AP Chemistry",
      "AP Biology",
      "AP Environmental Science",
      // English
      "AP English Language & Composition",
      "AP English Literature & Composition",
      // History & Social Sciences
      "AP US History",
      "AP World History: Modern",
      "AP European History",
      "AP US Government & Politics",
      "AP Comparative Government & Politics",
      "AP Macroeconomics",
      "AP Microeconomics",
      "AP Psychology",
      "AP Human Geography",
      "AP African American Studies",
      // Arts
      "AP Art History",
      "AP Studio Art: 2-D Design",
      "AP Studio Art: 3-D Design",
      "AP Studio Art: Drawing",
      "AP Music Theory",
      // Languages
      "AP Spanish Language & Culture",
      "AP Spanish Literature & Culture",
      "AP French Language & Culture",
      "AP German Language & Culture",
      "AP Italian Language & Culture",
      "AP Chinese Language & Culture",
      "AP Japanese Language & Culture",
      "AP Latin",
      // Capstone
      "AP Research",
      "AP Seminar",
    ]),
  },
  "A-Levels": {
    key: "A-Levels",
    label: "A-Levels",
    gradeScale: {
      label: "A*–E",
      min: 0,
      max: 0,
      options: ["A*", "A", "B", "C", "D", "E", "U"],
    },
    subjects: sortAlpha([
      // Sciences & Math
      "Mathematics",
      "Further Mathematics",
      "Statistics",
      "Pure Mathematics",
      "Mechanics",
      "Physics",
      "Chemistry",
      "Biology",
      "Human Biology",
      "Environmental Science",
      "Geology",
      "Marine Science",
      "Computer Science",
      "Electronics",
      "Engineering",
      // Business & Social Sciences
      "Economics",
      "Business",
      "Business Management",
      "Accounting",
      "Finance",
      "Psychology",
      "Sociology",
      "Anthropology",
      "Government & Politics",
      "Law",
      "Criminology",
      "History",
      "Geography",
      "Philosophy",
      "Religious Studies",
      "Classical Civilisation",
      "Ancient History",
      "Archaeology",
      // English & Languages
      "English Literature",
      "English Language",
      "English Language & Literature",
      "Spanish",
      "French",
      "German",
      "Italian",
      "Mandarin",
      "Japanese",
      "Arabic",
      "Russian",
      "Portuguese",
      "Latin",
      "Greek",
      "Urdu",
      "Hindi",
      // Arts
      "Art & Design",
      "Photography",
      "Textiles",
      "Fine Art",
      "Music",
      "Music Technology",
      "Drama & Theatre",
      "Film Studies",
      "Media Studies",
      "Design & Technology",
      "Product Design",
      "Physical Education",
      "Dance",
    ]),
  },
  CBSE: {
    key: "CBSE",
    label: "CBSE (India)",
    gradeScale: { label: "0–100 %", min: 0, max: 100, step: 1 },
    subjects: sortAlpha([
      // Languages
      "English Core",
      "English Elective",
      "Hindi Core",
      "Hindi Elective",
      "Sanskrit",
      "Punjabi",
      "Tamil",
      "Telugu",
      "Bengali",
      "Marathi",
      "Gujarati",
      "Kannada",
      "Malayalam",
      "Odia",
      "Assamese",
      "Urdu",
      "French",
      "German",
      "Spanish",
      "Japanese",
      "Mandarin (Chinese)",
      "Russian",
      "Arabic",
      "Persian",
      // Sciences
      "Mathematics",
      "Applied Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Biotechnology",
      "Computer Science",
      "Informatics Practices",
      "Engineering Graphics",
      "Multimedia & Web Technology",
      // Commerce
      "Economics",
      "Business Studies",
      "Business Management",
      "Accountancy",
      "Entrepreneurship",
      "Banking",
      "Marketing",
      "Financial Markets Management",
      // Humanities
      "History",
      "Geography",
      "Political Science",
      "Sociology",
      "Psychology",
      "Philosophy",
      "Legal Studies",
      "Knowledge Tradition & Practices of India",
      // Arts & Skill
      "Physical Education",
      "Yoga",
      "Painting",
      "Graphics",
      "Sculpture",
      "Applied Art (Commercial Art)",
      "Music (Vocal — Hindustani)",
      "Music (Vocal — Carnatic)",
      "Music (Instrumental — Melodic)",
      "Music (Instrumental — Percussion)",
      "Dance (Kathak)",
      "Dance (Bharatanatyam)",
      "Dance (Kathakali)",
      "Dance (Manipuri)",
      "Dance (Odissi)",
      "Home Science",
      "Fashion Studies",
      "Mass Media Studies",
      "Food Production",
      "Hospitality & Tourism",
      "Library & Information Science",
      "Heritage Crafts",
    ]),
  },
  ICSE: {
    key: "ICSE",
    label: "ICSE / ISC (India)",
    gradeScale: { label: "0–100 %", min: 0, max: 100, step: 1 },
    subjects: sortAlpha([
      // Languages
      "English",
      "Hindi",
      "Sanskrit",
      "French",
      "Spanish",
      "German",
      "Mandarin",
      "Japanese",
      "Arabic",
      "Bengali",
      "Tamil",
      "Telugu",
      "Marathi",
      "Gujarati",
      "Kannada",
      "Malayalam",
      "Odia",
      "Punjabi",
      "Urdu",
      // Sciences & Math
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Computer Science",
      "Biotechnology",
      "Environmental Science",
      "Geometrical & Mechanical Drawing",
      "Geometrical & Building Drawing",
      "Electricity & Electronics",
      // Commerce
      "Economics",
      "Commerce",
      "Accounts",
      "Business Studies",
      "Business Management",
      // Humanities
      "History",
      "Civics",
      "Political Science",
      "Geography",
      "Sociology",
      "Psychology",
      "Philosophy",
      "Indian Music (Hindustani)",
      "Indian Music (Carnatic)",
      "Western Music",
      // Arts & Skill
      "Art",
      "Performing Arts",
      "Music (Indian)",
      "Music (Western)",
      "Physical Education",
      "Home Science",
      "Cookery",
      "Fashion Designing",
      "Hospitality Management",
      "Mass Media & Communication",
    ]),
  },
  IGCSE: {
    key: "IGCSE",
    label: "IGCSE (Cambridge)",
    gradeScale: {
      label: "A*–G",
      min: 0,
      max: 0,
      options: ["A*", "A", "B", "C", "D", "E", "F", "G", "U"],
    },
    subjects: sortAlpha([
      // English & Languages
      "First Language English",
      "English as a Second Language",
      "Literature in English",
      "World Literature",
      "First Language Hindi",
      "Hindi as a Second Language",
      "First Language Spanish",
      "First Language French",
      "First Language Mandarin",
      "First Language German",
      "First Language Arabic",
      "First Language Portuguese",
      "First Language Russian",
      "First Language Urdu",
      "Foreign Language French",
      "Foreign Language Spanish",
      "Foreign Language German",
      "Foreign Language Mandarin",
      "Foreign Language Arabic",
      "Foreign Language Italian",
      "Foreign Language Japanese",
      "Foreign Language Russian",
      "Foreign Language Portuguese",
      "Latin",
      "Classical Greek",
      // Sciences & Math
      "Mathematics",
      "Additional Mathematics",
      "International Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Combined Science",
      "Co-ordinated Sciences",
      "Marine Science",
      "Environmental Management",
      "Computer Science",
      "Information & Communication Technology (ICT)",
      "Astronomy",
      // Humanities
      "History",
      "Geography",
      "Global Perspectives",
      "Sociology",
      "Religious Studies",
      "Travel & Tourism",
      "Development Studies",
      "Psychology",
      "Philosophy",
      // Business & Economics
      "Economics",
      "Business Studies",
      "Business Management",
      "Accounting",
      "Enterprise",
      // Arts & Skill
      "Art & Design",
      "Music",
      "Drama",
      "Design & Technology",
      "Food & Nutrition",
      "Physical Education",
      "Child Development",
      "Agriculture",
    ]),
  },
  US: {
    key: "US",
    label: "US Standard / Honors",
    gradeScale: { label: "0–100 %", min: 0, max: 100, step: 1 },
    subjects: COMMON_HS,
  },
  Other: {
    key: "Other",
    label: "Other / National Curriculum",
    gradeScale: { label: "0–100 %", min: 0, max: 100, step: 1 },
    subjects: COMMON_HS,
  },
};

export function getCurriculumConfig(key: string | null | undefined): CurriculumConfig {
  if (!key) return CURRICULA.US;
  const normalized = (key as CurriculumKey) in CURRICULA ? (key as CurriculumKey) : "Other";
  return CURRICULA[normalized];
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
  switch (curriculum) {
    case "CBSE":
    case "ICSE":
    case "IGCSE":
    case "A-Levels":
    case "Other":
      return "percentage";
    case "IB":
      return "percentage";
    case "AP":
    case "US":
    default:
      return "gpa-4";
  }
}

// ─── PSAT version by grade ────────────────────────────────────────────

export function psatVersionForGrade(grade: string | null | undefined): { version: string; max: number } {
  const g = (grade || "").toLowerCase();
  if (g.includes("8") || g.includes("9")) return { version: "PSAT 8/9", max: 1440 };
  if (g.includes("10")) return { version: "PSAT 10", max: 1520 };
  return { version: "PSAT/NMSQT", max: 1520 };
}
