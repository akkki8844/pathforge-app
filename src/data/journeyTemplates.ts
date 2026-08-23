/**
 * Registry of hand-written, major-specific Journey templates.
 *
 * Background: `src/lib/journeyLevels.ts` previously had a `MajorKey` union of
 * 13 majors but only three real task libraries — `finance`, `computer_science`
 * and `generic`. The other ten were aliases: biology, engineering, medicine,
 * psychology, chemistry, law and design all pointed at `generic`, business and
 * economics at `finance`, and physics at `computer_science` (so a physics
 * student was told to finish CS50 and land merged pull requests).
 *
 * Every template in this registry is written for its own discipline, names
 * real programmes, and produces an artefact specific to that field. Detection
 * is ordered most-specific-first because major strings overlap heavily
 * ("Biomedical Engineering" must not match the generic engineering rule, and
 * "Computer Engineering" must not match plain "Computer Science").
 */

import type { TemplateCtx, TemplateLibrary, TemplateTask } from "./journey/types";
import {
  computerScience,
  dataScienceAI,
  cybersecurity,
  mathematics,
  physics,
  chemistry,
} from "./journey/stem";
import {
  mechanicalEngineering,
  electricalEngineering,
  civilEngineering,
  aerospaceEngineering,
  chemicalEngineering,
  biomedicalEngineering,
} from "./journey/engineering";
import { premed, biology, nursing, psychology } from "./journey/health";
import {
  economics,
  business,
  law,
  politicalScience,
  journalism,
  education,
} from "./journey/humanities";
import {
  design,
  architecture,
  performingArts,
  environmentalScience,
} from "./journey/creative";

export type { TemplateCtx, TemplateLibrary, TemplateTask };

export type MajorTemplateKey =
  | "computer_science"
  | "data_science_ai"
  | "cybersecurity"
  | "mathematics"
  | "physics"
  | "chemistry"
  | "mechanical_engineering"
  | "electrical_engineering"
  | "civil_engineering"
  | "aerospace_engineering"
  | "chemical_engineering"
  | "biomedical_engineering"
  | "premed"
  | "biology"
  | "nursing"
  | "psychology"
  | "economics"
  | "business"
  | "law"
  | "political_science"
  | "journalism"
  | "education"
  | "design"
  | "architecture"
  | "performing_arts"
  | "environmental_science";

export const MAJOR_TEMPLATES: Record<MajorTemplateKey, TemplateLibrary> = {
  computer_science: computerScience,
  data_science_ai: dataScienceAI,
  cybersecurity,
  mathematics,
  physics,
  chemistry,
  mechanical_engineering: mechanicalEngineering,
  electrical_engineering: electricalEngineering,
  civil_engineering: civilEngineering,
  aerospace_engineering: aerospaceEngineering,
  chemical_engineering: chemicalEngineering,
  biomedical_engineering: biomedicalEngineering,
  premed,
  biology,
  nursing,
  psychology,
  economics,
  business,
  law,
  political_science: politicalScience,
  journalism,
  education,
  design,
  architecture,
  performing_arts: performingArts,
  environmental_science: environmentalScience,
};

/** Human-readable label per template, used by the Journey UI and reporting. */
export const MAJOR_TEMPLATE_LABELS: Record<MajorTemplateKey, string> = {
  computer_science: "Computer Science & Software Engineering",
  data_science_ai: "Data Science, AI & Machine Learning",
  cybersecurity: "Cybersecurity",
  mathematics: "Mathematics",
  physics: "Physics & Astrophysics",
  chemistry: "Chemistry",
  mechanical_engineering: "Mechanical Engineering",
  electrical_engineering: "Electrical & Electronics Engineering",
  civil_engineering: "Civil & Structural Engineering",
  aerospace_engineering: "Aerospace Engineering",
  chemical_engineering: "Chemical Engineering",
  biomedical_engineering: "Biomedical Engineering",
  premed: "Pre-Med & Medicine",
  biology: "Biology & Life Sciences",
  nursing: "Nursing",
  psychology: "Psychology, Neuroscience & Cognitive Science",
  economics: "Economics",
  business: "Business, Management & Entrepreneurship",
  law: "Law & Pre-Law",
  political_science: "Political Science, IR & Public Policy",
  journalism: "Journalism, Communications & Media",
  education: "Education & Teaching",
  design: "Art & Design",
  architecture: "Architecture",
  performing_arts: "Performing Arts (Music, Theatre, Dance)",
  environmental_science: "Environmental Science & Sustainability",
};

/**
 * Ordered detection rules. Order is load-bearing: the first match wins, so the
 * compound majors ("biomedical engineering", "computer engineering") must be
 * tested before the single-word rules they contain.
 */
const DETECTION_RULES: ReadonlyArray<readonly [RegExp, MajorTemplateKey]> = [
  // ── Compound / easily-confused first ──────────────────────────────────
  // NOTE: these use `eng\w*` rather than `eng\b` — "Mechanical Engineering"
  // does not have a word boundary after "eng", so `eng\b` silently matched
  // nothing and every branch fell through to the generic library.
  [/\b(bio-?medical|bio-?engineering|biomedical\s+eng\w*|bme)\b/i, "biomedical_engineering"],
  [/\b(chemical\s+eng\w*|chem\s*e\b|process\s+eng\w*|petrochemical)\b/i, "chemical_engineering"],
  [/\b(aero(space|nautic\w*)|astronautic\w*|avionics|aviation\s+eng\w*)\b/i, "aerospace_engineering"],
  [/\b(civil\s+eng\w*|structural\s+eng\w*|construction\s+eng\w*|geotechnical|urban\s+planning|transportation\s+eng\w*)\b/i, "civil_engineering"],
  [/\b(mechanical\s+eng\w*|mechatronic\w*|manufactur\w*\s+eng\w*|automotive\s+eng\w*|robotics\s+eng\w*)\b/i, "mechanical_engineering"],
  // "Electronics and Communication Engineering" (ECE) is one of the most
  // common majors in India and must beat the `communicat\w*` journalism rule,
  // so `electronic` is matched on its own rather than only as "... Eng".
  [/\b(electrical\s+eng\w*|electronics?\b|computer\s+eng\w*|power\s+eng\w*|vlsi|embedded\s+system|instrumentation\s+eng\w*)\b/i, "electrical_engineering"],

  // ── Environmental — before biology, so ecology/conservation land here ──
  [/\b(environment\w*|ecolog\w*|sustainab\w*|climate|conservation|earth\s+scien\w*|geolog\w*|oceanograph\w*|marine\s+scien\w*|forestr\w*|atmospheric)\b/i, "environmental_science"],

  // ── Health ────────────────────────────────────────────────────────────
  [/\b(pre-?med|medicine|medical|mbbs|md\b|surgeon|physician|dentist\w*|dental|veterinar\w*|pharmac\w*)\b/i, "premed"],
  [/\b(nurs\w*|midwif\w*|bsn\b)\b/i, "nursing"],
  [/\b(psycholog\w*|neuroscien\w*|cognitive\s+scien\w*|behavio\w*\s+scien\w*|counsel?l?ing)\b/i, "psychology"],
  [/\b(biolog\w*|biotech\w*|life\s+scien\w*|genetic\w*|microbiolog\w*|zoolog\w*|botan\w*|biochem\w*|public\s+health|epidemiolog\w*)\b/i, "biology"],

  // ── Computing ─────────────────────────────────────────────────────────
  [/\b(cyber\s?securit\w*|information\s+securit\w*|infosec|network\s+securit\w*)\b/i, "cybersecurity"],
  [/\b(data\s+scien\w*|machine\s+learning|artificial\s+intelligence|\bai\b|deep\s+learning|data\s+analytic\w*|statistics\s+and\s+data)\b/i, "data_science_ai"],
  [/\b(computer\s+scien\w*|software|programming|information\s+technolog\w*|\bcs\b|comp\s?sci)\b/i, "computer_science"],

  // ── Physical sciences & maths ─────────────────────────────────────────
  [/\b(math\w*|applied\s+math\w*|pure\s+math\w*|actuarial)\b/i, "mathematics"],
  [/\b(physic\w*|astrophysic\w*|astronom\w*|quantum)\b/i, "physics"],
  [/\b(chemist\w*|chemical\s+scien\w*|materials\s+scien\w*)\b/i, "chemistry"],

  // ── Creative — architecture before design ("landscape architecture") ──
  [/\b(architect\w*|landscape\s+architect\w*|urban\s+design)\b/i, "architecture"],
  [/\b(music|theat\w*|drama|dance|acting|performing\s+arts|vocal|conservato\w*|film\s+production|screen\s?acting)\b/i, "performing_arts"],
  [/\b(design|fine\s+arts?|studio\s+art|illustrat\w*|animation|graphic\w*|fashion|industrial\s+design|interior\s+design|visual\s+arts?|photograph\w*)\b/i, "design"],

  // ── Social sciences, business, humanities ─────────────────────────────
  [/\b(econom\w*|econometric\w*|political\s+econom\w*)\b/i, "economics"],
  [/\b(law|legal|pre-?law|jurisprudence|llb|barrister|solicitor)\b/i, "law"],
  [/\b(politic\w*|international\s+relations|public\s+polic\w*|government|diplomac\w*|public\s+administration)\b/i, "political_science"],
  [/\b(journalis\w*|communicat\w*|media\s+studies|broadcast\w*|public\s+relations)\b/i, "journalism"],
  [/\b(education|teaching|pedagog\w*|early\s+childhood)\b/i, "education"],
  [/\b(business|management|entrepreneur\w*|marketing|commerce|\bmba\b|supply\s+chain|hospitality)\b/i, "business"],
];

/**
 * Returns the template key for a free-text major, or `null` when nothing
 * matches — the caller then falls back to the existing library in
 * `journeyLevels.ts` (which still owns `finance` and `generic`).
 *
 * Finance is deliberately NOT matched here: `journeyLevels.ts` already has a
 * strong, level-complete finance library and we do not want to shadow it.
 */
export function detectTemplateMajor(major: string): MajorTemplateKey | null {
  const m = (major || "").trim();
  if (!m) return null;
  // Finance keeps its existing dedicated library in journeyLevels.ts.
  if (/\b(financ\w*|account\w*|investment\s+banking|wealth\s+management)\b/i.test(m)) return null;
  for (const [pattern, key] of DETECTION_RULES) {
    if (pattern.test(m)) return key;
  }
  return null;
}

/**
 * Tasks for a (major, level) pair. Levels 6-10 reuse the Level 5 library,
 * matching the existing engine behaviour — the Elite-tier signals stay
 * relevant, and the 20 hand-written stages per level supply the progression.
 */
export function getTemplateTasks(key: MajorTemplateKey, ctx: TemplateCtx): TemplateTask[] {
  const lib = MAJOR_TEMPLATES[key];
  const raw = Math.max(1, Math.min(5, Math.round(ctx.level || 1)));
  const level = raw as 1 | 2 | 3 | 4 | 5;
  return lib[level](ctx);
}

/** Count of hand-written tasks across every template — used in reporting/tests. */
export function templateTaskCount(): number {
  const ctx: TemplateCtx = {
    major: "",
    country: "",
    curriculum: "",
    grade: "11",
    level: 1,
  };
  let total = 0;
  for (const key of Object.keys(MAJOR_TEMPLATES) as MajorTemplateKey[]) {
    for (const lvl of [1, 2, 3, 4, 5] as const) {
      total += MAJOR_TEMPLATES[key][lvl]({ ...ctx, level: lvl }).length;
    }
  }
  return total;
}
