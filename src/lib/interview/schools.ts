/**
 * Per-school interview formats.
 *
 * The premise of this feature is that a mock interview is only worth sitting if
 * it matches the interview that's actually coming. Georgetown requires an
 * evaluative alumni interview of every first-year applicant and the interviewer
 * files a rated report; Penn runs non-evaluative "Alumni Conversations" that
 * explicitly do not affect the decision; Stanford and Caltech don't interview at
 * all. Practising the same half hour for all three is the exact failure this
 * table exists to prevent.
 *
 * MAINTENANCE: policies change year to year — Columbia paused its alumni
 * program, Dartmouth dropped on-campus interviews, several schools moved to
 * video-only during the pandemic and never went back. Every row carries
 * `source`, and `POLICIES_VERIFIED` below is the date the set was last checked.
 * When a row is corrected, bump that date; the lobby shows it to the student so
 * a stale table is visible rather than silently wrong.
 *
 * Sources consulted for this pass:
 *   https://toptieradmissions.com/top-college-interview-policies/
 *   https://www.collegetransitions.com/dataverse/college-interviews/
 *   https://college.harvard.edu/guides/what-expect-after-you-apply
 *   https://admissions.vanderbilt.edu/faq/
 */
import type { SchoolInterviewProfile } from "./types";

/** When the policy set below was last checked against the schools' own pages. */
export const POLICIES_VERIFIED = "2026-09-17";

export const SCHOOL_INTERVIEWS: SchoolInterviewProfile[] = [
  /* ─────────────────────────────────────────────────────────────── Ivies ── */
  {
    id: "harvard",
    name: "Harvard University",
    shortName: "Harvard",
    domain: "harvard.edu",
    color: "#A51C30",
    format: "alumni",
    weight: "light",
    availability: "by-invitation",
    typicalMinutes: 45,
    conductedBy: "A local alumnus from the Harvard Club in your area",
    emphasis: [
      "intellectual curiosity for its own sake, not for the résumé",
      "one thing you've gone unreasonably deep on",
      "how you actually spend an unstructured afternoon",
      "what you'd argue with a professor about",
    ],
    notes:
      "You can't request one — Harvard assigns interviews where alumni are available, and most regions can't cover every applicant. Not getting one is not a signal. It's a conversation, not a test, and it carries less weight than almost anything else in the file.",
    source: "https://college.harvard.edu/guides/what-expect-after-you-apply",
  },
  {
    id: "yale",
    name: "Yale University",
    shortName: "Yale",
    domain: "yale.edu",
    color: "#00356B",
    format: "alumni",
    weight: "evaluative",
    availability: "by-invitation",
    typicalMinutes: 40,
    conductedBy: "A member of the Alumni Schools Committee",
    emphasis: [
      "what kind of community member you'd be at 2am in a common room",
      "collaborative intellect — do you build on other people's ideas",
      "a specific, non-generic answer to 'why Yale'",
      "warmth and humility alongside the achievement",
    ],
    notes:
      "Yale's is genuinely evaluative — the interviewer writes a report that goes into your file. If you're offered one, take it. They are looking as much at how you'd live in a residential college as at what you've done.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "princeton",
    name: "Princeton University",
    shortName: "Princeton",
    domain: "princeton.edu",
    color: "#E77500",
    colorSecondary: "#121212",
    format: "alumni",
    weight: "evaluative",
    availability: "by-invitation",
    typicalMinutes: 45,
    conductedBy: "A Princeton alumnus through the Alumni Schools Committee",
    emphasis: [
      "service and civic engagement — 'in the nation's service' is not a slogan here",
      "academic rigour: can you defend a position under pushback",
      "a difficult conversation you've actually had across a difference",
      "depth in one activity over a list of eight",
    ],
    notes:
      "Princeton aims to offer an interview to as many applicants as it can, and interviewer comments do inform the committee. Not being matched isn't held against you, but if you're offered one it counts.",
    source: "https://paw.princeton.edu/article/alumni-interview-endures",
  },
  {
    id: "penn",
    name: "University of Pennsylvania",
    shortName: "Penn",
    domain: "upenn.edu",
    color: "#011F5B",
    colorSecondary: "#990000",
    format: "alumni",
    weight: "informational",
    availability: "by-invitation",
    typicalMinutes: 30,
    conductedBy: "A Penn alumnus, through the Secondary School Committee",
    emphasis: [
      "why this specific school within Penn — Wharton, SEAS, Nursing, College",
      "how you'd use Penn's cross-school flexibility concretely",
      "pre-professional drive without sounding transactional",
      "what you want to ask them",
    ],
    notes:
      "Penn renamed these 'Alumni Conversations' and states plainly that they do not influence the admission decision — they exist so you can work out whether Penn fits. Treat it as a genuine two-way conversation and spend real time on your questions.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "brown",
    name: "Brown University",
    shortName: "Brown",
    domain: "brown.edu",
    color: "#4E3629",
    colorSecondary: "#C00404",
    format: "alumni",
    weight: "light",
    availability: "by-invitation",
    typicalMinutes: 45,
    conductedBy: "A Brown alumnus in your region",
    emphasis: [
      "the Open Curriculum — what would you actually do with no requirements",
      "intellectual risk: a class you'd take that scares you",
      "self-direction, because nobody at Brown will structure your degree for you",
      "how you've handled something with no syllabus",
    ],
    notes:
      "Offered where alumni volunteers are available, so coverage varies a lot by region. Brown interviewers tend to be genuinely curious rather than adversarial — the conversation usually goes wherever your interests go.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "dartmouth",
    name: "Dartmouth College",
    shortName: "Dartmouth",
    domain: "dartmouth.edu",
    color: "#00693E",
    format: "alumni",
    weight: "light",
    availability: "by-invitation",
    typicalMinutes: 45,
    conductedBy: "A Dartmouth alumnus who lives near you",
    emphasis: [
      "why a small residential college in rural New Hampshire, specifically",
      "how you contribute to a tight community, not just a class",
      "outdoorsiness or not — they're checking fit, not selling it",
      "the D-Plan: what you'd do with an off-term",
    ],
    notes:
      "Dartmouth ended on-campus interviews in 2007, so alumni interviews are the only kind. Early Decision applicants are typically interviewed October to mid-November, Regular Decision December to mid-February, and only where there's an alumnus in your area.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "cornell",
    name: "Cornell University",
    shortName: "Cornell",
    domain: "cornell.edu",
    color: "#B31B1B",
    format: "video",
    weight: "light",
    availability: "optional",
    typicalMinutes: 25,
    conductedBy: "Varies by undergraduate college — most run none at all",
    emphasis: [
      "why this specific Cornell college, in its own vocabulary",
      "how your intended major connects to work you've already done",
      "'any person, any study' — breadth with a spine through it",
    ],
    notes:
      "Cornell is really seven admissions processes. Arts & Sciences, Engineering, Human Ecology and ILR don't interview. Architecture (in AAP) requires a video interview. Check your specific college before you prep — the answer for one is not the answer for another.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "columbia",
    name: "Columbia University",
    shortName: "Columbia",
    domain: "columbia.edu",
    color: "#0072CE",
    colorSecondary: "#9BCBEB",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "Columbia phased out its alumni interview programme and is not interviewing applicants in the current cycle. Your application speaks entirely for itself — which makes the essays and the activities list carry proportionally more. You can still run a general alumni-style session here to practise.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },

  /* ─────────────────────────────────────────────────── other US privates ── */
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    shortName: "MIT",
    domain: "mit.edu",
    color: "#A31F34",
    colorSecondary: "#8A8B8C",
    format: "alumni",
    weight: "evaluative",
    availability: "strongly-recommended",
    typicalMinutes: 45,
    conductedBy: "An Educational Counselor — an MIT alumni volunteer",
    emphasis: [
      "what you've built, broken and rebuilt with your own hands",
      "how you work with other people on hard problems",
      "a technical thing you can explain to someone outside the field",
      "'mens et manus' — evidence you make things, not just learn about them",
    ],
    notes:
      "MIT tries to offer an interview to every applicant it can and the Educational Counselor's write-up genuinely goes into the file. You request it through your MIT portal once you've started an application — don't wait to be found.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "stanford",
    name: "Stanford University",
    shortName: "Stanford",
    domain: "stanford.edu",
    color: "#8C1515",
    format: "alumni",
    weight: "light",
    availability: "by-invitation",
    typicalMinutes: 45,
    conductedBy: "A Stanford alumnus, where the region is covered",
    emphasis: [
      "intellectual vitality — what genuinely excites you, unprompted",
      "playfulness and range, not just achievement",
      "a specific idea you've chased down a rabbit hole",
      "concise answers; Stanford interviewers dislike a rehearsed monologue",
    ],
    notes:
      "Stanford has no on-campus interviews. Alumni interviews are offered in regions with enough volunteers, by invitation only, and are not available everywhere.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "caltech",
    name: "California Institute of Technology",
    shortName: "Caltech",
    domain: "caltech.edu",
    color: "#FF6C0C",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "Caltech does not interview undergraduate applicants. Everything rests on the written application and your recommenders. A general technical-alumni session here is still useful practice for other schools.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "georgetown",
    name: "Georgetown University",
    shortName: "Georgetown",
    domain: "georgetown.edu",
    color: "#041E42",
    colorSecondary: "#63666A",
    format: "alumni",
    weight: "evaluative",
    availability: "required",
    typicalMinutes: 45,
    conductedBy: "An Alumni Admissions Program interviewer",
    emphasis: [
      "service and 'women and men for others' — what you've actually done for someone else",
      "why Georgetown's specific school: SFS, McDonough, College, NHS",
      "current affairs — they will expect you to hold an informed opinion",
      "moral reasoning: how you decided something hard",
    ],
    notes:
      "The strictest interview policy of any top-ten US university: Georgetown requires an alumni interview of every first-year applicant, and your interviewer files a detailed rated report that becomes a formal part of your file. You arrange it yourself after applying. This is the one to over-prepare for.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "duke",
    name: "Duke University",
    shortName: "Duke",
    domain: "duke.edu",
    color: "#012169",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 40,
    conductedBy: "A Duke alumnus in your region",
    emphasis: [
      "how you balance intensity with actually enjoying yourself",
      "concrete leadership — what changed because you were there",
      "interdisciplinary instinct: two fields you'd put together",
      "why Duke over the obvious alternatives",
    ],
    notes:
      "Optional and offered where alumni volunteers are available. Duke interviewers tend to probe on leadership claims — expect to be asked what actually happened, not what your title was.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "northwestern",
    name: "Northwestern University",
    shortName: "Northwestern",
    domain: "northwestern.edu",
    color: "#4E2A84",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 40,
    conductedBy: "A Northwestern alumnus",
    emphasis: [
      "why Northwestern specifically — demonstrated interest matters here",
      "the quarter system and what you'd do with the pace",
      "a school-specific answer: Medill, McCormick, Bienen, Weinberg, SESP",
      "how you combine two unrelated interests",
    ],
    notes:
      "Optional, alumni-conducted, and Northwestern does track demonstrated interest — so taking the interview is itself a small signal.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "vanderbilt",
    name: "Vanderbilt University",
    shortName: "Vanderbilt",
    domain: "vanderbilt.edu",
    color: "#866D4B",
    colorSecondary: "#121212",
    format: "alumni",
    weight: "evaluative",
    availability: "optional",
    typicalMinutes: 40,
    conductedBy: "A Vanderbilt alumnus",
    emphasis: [
      "fit with a collaborative, non-cutthroat culture",
      "what you'd do outside class in Nashville specifically",
      "a real answer on why the South, if you're not from it",
      "depth in the thing you care about most",
    ],
    notes:
      "Entirely optional and declining it won't hurt you — but the alumnus does submit an evaluative report that goes into your file, so it's not purely informational either.",
    source: "https://admissions.vanderbilt.edu/faq/",
  },
  {
    id: "rice",
    name: "Rice University",
    shortName: "Rice",
    domain: "rice.edu",
    color: "#00205B",
    format: "alumni",
    weight: "light",
    availability: "strongly-recommended",
    typicalMinutes: 35,
    conductedBy: "A Rice alumnus, or a Rice senior for on-campus interviews",
    emphasis: [
      "the residential college system — how you'd be in a small, fixed community",
      "unconventional wisdom: Rice likes a genuinely odd interest",
      "small-school intimacy vs. a big research university, and why you want both",
      "collaboration over competition",
    ],
    notes:
      "Strongly recommended and applicant-initiated — you request it. Conducted by alumni in most regions, and by current Rice seniors for on-campus slots.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "uchicago",
    name: "University of Chicago",
    shortName: "UChicago",
    domain: "uchicago.edu",
    color: "#800000",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 45,
    conductedBy: "A UChicago alumnus or a current student",
    emphasis: [
      "an idea you'll argue for and then argue against",
      "the Core: what you'd want to be forced to read",
      "genuine intellectual playfulness, the same register as the essay prompts",
      "how you handle being wrong in public",
    ],
    notes:
      "Optional and informational, conducted by alumni or current students. UChicago interviewers are the most likely of any school to just start debating with you — that's the point, not a trap.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "jhu",
    name: "Johns Hopkins University",
    shortName: "Johns Hopkins",
    domain: "jhu.edu",
    color: "#002D72",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "Hopkins does not offer evaluative admissions interviews. Your written application and recommendations carry it. A research-heavy alumni session here is still good practice for MIT or Georgetown.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "notre-dame",
    name: "University of Notre Dame",
    shortName: "Notre Dame",
    domain: "nd.edu",
    color: "#0C2340",
    colorSecondary: "#C99700",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "Notre Dame does not run admissions interviews. Community and service come through the essays instead. Practise here as a general alumni session.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "washu",
    name: "Washington University in St. Louis",
    shortName: "WashU",
    domain: "wustl.edu",
    color: "#A51417",
    colorSecondary: "#007360",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 35,
    conductedBy: "A WashU alumnus or an admissions staff member",
    emphasis: [
      "why WashU over schools of similar profile",
      "the flexibility to cross schools — what would you combine",
      "sustained interest rather than a late add to the list",
    ],
    notes:
      "Applicant-initiated and encouraged. Both alumni and, in some regions, admissions staff conduct them — the staff version is noticeably more formal.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "emory",
    name: "Emory University",
    shortName: "Emory",
    domain: "emory.edu",
    color: "#012169",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 35,
    conductedBy: "An Emory alumnus",
    emphasis: [
      "Emory College vs. Oxford College — you should know the difference",
      "pre-health or pre-business intent without sounding purely instrumental",
      "what Atlanta gives you that a college town wouldn't",
    ],
    notes: "Optional alumni interviews where volunteers are available. Informational in practice.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "cmu",
    name: "Carnegie Mellon University",
    shortName: "Carnegie Mellon",
    domain: "cmu.edu",
    color: "#C41230",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "CMU does not interview for most undergraduate programmes; the arts programmes run auditions and portfolio reviews instead, which are a different thing entirely. Use a technical alumni session here for practice.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "nyu",
    name: "New York University",
    shortName: "NYU",
    domain: "nyu.edu",
    color: "#57068C",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "NYU does not offer admissions interviews. Tisch and Steinhardt run auditions and portfolio reviews, which are assessed on the work, not the conversation.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "tufts",
    name: "Tufts University",
    shortName: "Tufts",
    domain: "tufts.edu",
    color: "#3E8EDE",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 35,
    conductedBy: "A Tufts alumnus or a current senior",
    emphasis: [
      "internationalism — Tufts genuinely cares how you see the world",
      "the quirky, specific interest you almost left off the list",
      "how you'd use a small university with a big research footprint",
    ],
    notes:
      "Optional, conducted by alumni and, on campus, by current seniors. Tufts interviewers ask unusually open questions — they're looking for range.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "bc",
    name: "Boston College",
    shortName: "Boston College",
    domain: "bc.edu",
    color: "#98002E",
    colorSecondary: "#BC9B6A",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Boston College alumnus",
    emphasis: [
      "Jesuit formation — 'men and women for others' in your own words",
      "service that predates the application",
      "reflection: what you learned about yourself, not just what you did",
    ],
    notes: "Optional alumni interviews, offered where volunteers are available.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },

  /* ────────────────────────────────────────────── liberal arts colleges ── */
  {
    id: "williams",
    name: "Williams College",
    shortName: "Williams",
    domain: "williams.edu",
    color: "#4F2D7F",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Williams alumnus, or admissions staff on campus",
    emphasis: [
      "tutorials — could you hold a two-student seminar for a semester",
      "why a college of 2,000 people in the Berkshires",
      "intellectual give-and-take rather than presentation",
    ],
    notes:
      "Optional, and interviews are offered both on campus with staff and off campus with alumni. The tutorial system is the thing to have an opinion about.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "amherst",
    name: "Amherst College",
    shortName: "Amherst",
    domain: "amherst.edu",
    color: "#3F1F69",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "An Amherst alumnus",
    emphasis: [
      "the open curriculum — no distribution requirements, so what would you do",
      "how you'd use the Five College consortium",
      "a position you hold and can defend",
    ],
    notes: "Optional alumni interviews, informational, offered where volunteers exist.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "bowdoin",
    name: "Bowdoin College",
    shortName: "Bowdoin",
    domain: "bowdoin.edu",
    color: "#111417",
    colorSecondary: "#B8A06A",
    format: "admissions",
    weight: "light",
    availability: "strongly-recommended",
    typicalMinutes: 30,
    conductedBy: "Admissions staff or a trained senior interviewer",
    emphasis: [
      "the Common Good — service as an orientation, not a line item",
      "why a small coastal Maine college specifically",
      "genuine give-and-take: they want a conversation, not answers",
    ],
    notes:
      "You get one interview — on campus or virtual, not both — and Bowdoin strongly encourages it. They describe it explicitly as a 'give and take' conversation rather than a Q&A.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "swarthmore",
    name: "Swarthmore College",
    shortName: "Swarthmore",
    domain: "swarthmore.edu",
    color: "#8B1A3A",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Swarthmore alumnus or admissions staff",
    emphasis: [
      "intellectual seriousness without performance",
      "the honors programme and whether you'd want that workload",
      "Quaker values: consensus, social responsibility, plain speech",
    ],
    notes: "Optional, informational, alumni or staff depending on region.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "pomona",
    name: "Pomona College",
    shortName: "Pomona",
    domain: "pomona.edu",
    color: "#0057B8",
    colorSecondary: "#F2A900",
    format: "student",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A trained Pomona senior interviewer",
    emphasis: [
      "the Claremont consortium — five colleges, one campus, what would you do",
      "a peer-level conversation, because your interviewer is a student",
      "curiosity that isn't pre-professional",
    ],
    notes:
      "Conducted by current Pomona seniors rather than alumni, which makes it noticeably more peer-shaped. Optional and informational.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "wellesley",
    name: "Wellesley College",
    shortName: "Wellesley",
    domain: "wellesley.edu",
    color: "#002D62",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Wellesley alumna",
    emphasis: [
      "why a women's college, in your own words and not a brochure's",
      "the MIT cross-registration and what you'd take",
      "ambition you're willing to name out loud",
    ],
    notes: "Optional alumnae interviews, informational, widely available.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "middlebury",
    name: "Middlebury College",
    shortName: "Middlebury",
    domain: "middlebury.edu",
    color: "#0D395F",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Middlebury alumnus or admissions staff",
    emphasis: [
      "languages and international work — Midd's signature strength",
      "the winter term: what would you spend January on",
      "outdoor and community life in rural Vermont",
    ],
    notes: "Optional, informational, alumni or staff.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "davidson",
    name: "Davidson College",
    shortName: "Davidson",
    domain: "davidson.edu",
    color: "#9E1B32",
    format: "alumni",
    weight: "light",
    availability: "optional",
    typicalMinutes: 30,
    conductedBy: "A Davidson alumnus",
    emphasis: [
      "the Honor Code — an unproctored exam culture, and what that asks of you",
      "service and civic life in a small town",
      "how you'd contribute to a community you can't hide in",
    ],
    notes: "Optional alumni interviews. Informational, but a genuine fit conversation.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },

  /* ─────────────────────────────────────────────────── public flagships ── */
  {
    id: "berkeley",
    name: "University of California, Berkeley",
    shortName: "UC Berkeley",
    domain: "berkeley.edu",
    color: "#003262",
    colorSecondary: "#FDB515",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "No UC campus interviews applicants. The Personal Insight Questions do all the work an interview would. Practise here as a general session.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "ucla",
    name: "University of California, Los Angeles",
    shortName: "UCLA",
    domain: "ucla.edu",
    color: "#2774AE",
    colorSecondary: "#FFD100",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "No UC campus interviews applicants. Everything rides on the Personal Insight Questions and the academic record.",
    source: "https://toptieradmissions.com/top-college-interview-policies/",
  },
  {
    id: "michigan",
    name: "University of Michigan",
    shortName: "Michigan",
    domain: "umich.edu",
    color: "#00274C",
    colorSecondary: "#FFCB05",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "Michigan does not interview for general admission. Ross (business) and a few specialised programmes run their own processes with separate requirements.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "uva",
    name: "University of Virginia",
    shortName: "UVA",
    domain: "virginia.edu",
    color: "#232D4B",
    colorSecondary: "#E57200",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "UVA does not interview applicants. Student self-governance and the Honor System come through in the supplements instead.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "unc",
    name: "University of North Carolina at Chapel Hill",
    shortName: "UNC",
    domain: "unc.edu",
    color: "#4B9CD3",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "UNC does not interview for general admission. Morehead-Cain and other named scholarships run their own, very different, interview rounds.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },
  {
    id: "gatech",
    name: "Georgia Institute of Technology",
    shortName: "Georgia Tech",
    domain: "gatech.edu",
    color: "#003057",
    colorSecondary: "#B3A369",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes: "Georgia Tech does not interview undergraduate applicants.",
    source: "https://www.collegetransitions.com/dataverse/college-interviews/",
  },

  /* ────────────────────────────────────────────────────── outside the US ── */
  {
    id: "oxford",
    name: "University of Oxford",
    shortName: "Oxford",
    domain: "ox.ac.uk",
    color: "#002147",
    format: "panel",
    weight: "evaluative",
    availability: "by-invitation",
    typicalMinutes: 25,
    conductedBy: "Two or three tutors from the college, in the subject you applied for",
    emphasis: [
      "thinking out loud under pressure on an unseen problem",
      "your subject and almost nothing else — no 'tell me about yourself'",
      "being wrong, being corrected, and carrying on",
      "whatever you claimed to have read in your personal statement",
    ],
    notes:
      "Nothing like a US interview. Shortlisted candidates get two or more subject interviews with actual tutors, and it is the single most decisive stage. They will push you until you're stuck — that's the assessment, not a failure.",
    source: "https://www.ox.ac.uk/admissions/undergraduate/interviews",
  },
  {
    id: "cambridge",
    name: "University of Cambridge",
    shortName: "Cambridge",
    domain: "cam.ac.uk",
    color: "#A3C1AD",
    colorSecondary: "#0072CE",
    format: "panel",
    weight: "evaluative",
    availability: "by-invitation",
    typicalMinutes: 25,
    conductedBy: "College Directors of Studies and subject supervisors",
    emphasis: [
      "supervision-style discussion: two people, one problem, no slides",
      "deriving something you haven't been taught",
      "precision — they will ask you to define your terms",
      "your written work and any submitted assessment",
    ],
    notes:
      "Subject-specific and decisive, usually with a written assessment attached. Expect to be handed a problem you haven't seen and to work it through out loud.",
    source: "https://www.undergraduate.study.cam.ac.uk/applying/interviews",
  },
  {
    id: "imperial",
    name: "Imperial College London",
    shortName: "Imperial",
    domain: "imperial.ac.uk",
    color: "#003E74",
    format: "panel",
    weight: "evaluative",
    availability: "by-invitation",
    typicalMinutes: 30,
    conductedBy: "Departmental academics, often two at once",
    emphasis: [
      "technical depth in maths, physics or the relevant science",
      "motivation for a single-subject degree with no breadth requirement",
      "problem-solving on paper, in front of them",
    ],
    notes:
      "Interviews are department-run and technical. Medicine uses an MMI-style circuit instead. Both are assessed and both matter.",
    source: "https://www.imperial.ac.uk/study/apply/undergraduate/interviews/",
  },
  {
    id: "lse",
    name: "London School of Economics",
    shortName: "LSE",
    domain: "lse.ac.uk",
    color: "#E6007E",
    format: "none",
    weight: "informational",
    availability: "not-offered",
    typicalMinutes: 0,
    conductedBy: "—",
    emphasis: [],
    notes:
      "LSE does not interview for the large majority of its undergraduate programmes — the personal statement and predicted grades decide it.",
    source: "https://www.lse.ac.uk/study-at-lse/undergraduate/how-to-apply",
  },
  {
    id: "toronto",
    name: "University of Toronto",
    shortName: "Toronto",
    domain: "utoronto.ca",
    color: "#002A5C",
    format: "video",
    weight: "light",
    availability: "optional",
    typicalMinutes: 15,
    conductedBy: "A recorded video response, reviewed by admissions",
    emphasis: [
      "short, timed answers with no chance to restart",
      "why this specific programme and campus",
      "concision — you get minutes, not a conversation",
    ],
    notes:
      "Several U of T programmes use a recorded video component rather than a live interview. There's no interviewer to read, so structure matters more than rapport.",
    source: "https://future.utoronto.ca/apply/",
  },
];

/**
 * The shape used when a student picks a school we have no row for.
 *
 * Deliberately an honest default rather than an invented policy: it says what a
 * typical alumni interview looks like and tells the student to check the
 * school's own page, instead of asserting a format we don't know.
 */
export const GENERIC_SCHOOL: SchoolInterviewProfile = {
  id: "generic",
  name: "General practice interview",
  shortName: "General",
  domain: "",
  color: "#4465D8",
  format: "alumni",
  weight: "light",
  availability: "optional",
  typicalMinutes: 35,
  conductedBy: "An experienced alumni interviewer",
  emphasis: [
    "a clear, specific answer to 'tell me about yourself'",
    "one activity you can talk about for ten minutes without repeating yourself",
    "why this school, in terms that couldn't be pasted into another application",
    "a question of your own that isn't on the website",
  ],
  notes:
    "A general alumni-style interview — the shape most US schools use. We don't have a verified policy on file for this school, so check its admissions page for whether it interviews at all and who conducts it.",
};

const BY_ID = new Map(SCHOOL_INTERVIEWS.map((s) => [s.id, s]));

/** Exact-id lookup. Returns undefined rather than the generic profile. */
export function schoolInterviewById(id: string): SchoolInterviewProfile | undefined {
  return BY_ID.get(id);
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bthe\b|\buniversity\b|\bcollege\b|\bof\b|\bat\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Resolve whatever the student has stored — a college id, a full official name,
 * or something they typed themselves — onto a profile.
 *
 * Target schools come from onboarding as free text, so "UPenn", "University of
 * Pennsylvania" and "penn" all have to land on the same row. Falls back to
 * {@link GENERIC_SCHOOL} with the student's own wording preserved, so the room
 * still says the name they recognise.
 */
export function resolveSchoolInterview(input: string): SchoolInterviewProfile {
  const raw = (input ?? "").trim();
  if (!raw) return GENERIC_SCHOOL;

  const direct = BY_ID.get(raw.toLowerCase());
  if (direct) return direct;

  const needle = normalise(raw);
  if (!needle) return GENERIC_SCHOOL;

  const exact = SCHOOL_INTERVIEWS.find(
    (s) => normalise(s.name) === needle || normalise(s.shortName) === needle,
  );
  if (exact) return exact;

  // Substring either way, longest match wins — so "Penn" doesn't beat
  // "Pennsylvania State" to the Penn row on a two-character overlap.
  const partial = SCHOOL_INTERVIEWS.filter((s) => {
    const name = normalise(s.name);
    const short = normalise(s.shortName);
    return name.includes(needle) || needle.includes(short) || short === needle;
  }).sort((a, b) => normalise(b.shortName).length - normalise(a.shortName).length)[0];

  if (partial) return partial;

  return { ...GENERIC_SCHOOL, name: raw, shortName: raw };
}

/** Does this school actually interview? Drives the "heads up" banner. */
export function interviewsApplicants(profile: SchoolInterviewProfile): boolean {
  return profile.format !== "none" && profile.availability !== "not-offered";
}

export const FORMAT_LABEL: Record<SchoolInterviewProfile["format"], string> = {
  alumni: "Alumni interview",
  admissions: "Admissions interview",
  panel: "Panel interview",
  student: "Student interviewer",
  video: "Recorded video",
  none: "No interview",
};

export const WEIGHT_LABEL: Record<SchoolInterviewProfile["weight"], string> = {
  evaluative: "Evaluative — goes in your file",
  light: "Lightly considered",
  informational: "Informational only",
};

export const AVAILABILITY_LABEL: Record<SchoolInterviewProfile["availability"], string> = {
  required: "Required",
  "strongly-recommended": "Strongly recommended",
  optional: "Optional",
  "by-invitation": "By invitation",
  "not-offered": "Not offered",
};
