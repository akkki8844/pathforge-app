/**
 * The counsellor resource library.
 *
 * WHAT THIS REPLACES
 *
 * `Resources.tsx` held twelve hardcoded entries - "Common App Essay Guide",
 * "UK UCAS Guide", "Visa Application Checklist" and so on - each with
 * `url: "#"`. None of them existed. The cards carried `cursor-pointer` and a
 * hover state but no click handler and no link, so the page was twelve
 * descriptions of documents nobody had written, which a counsellor could hover
 * over and never open.
 *
 * Everything below is either a real published page at an organisation that
 * owns the process it describes, or a real route inside Pathforge. Nothing is
 * a description of a document that would have to be written first.
 *
 * RULES FOR ADDING ONE
 *
 *  1. An `external` entry links to the body that actually runs the thing:
 *     UCAS for UCAS, the Department of Education for the FAFSA, the Home
 *     Office for a UK student visa. Not a summary of it on somebody's blog,
 *     and never a ranking site.
 *  2. A `share` entry is a page of this product. It carries the path a student
 *     would open, because a counsellor cannot open it themselves - the student
 *     app bounces a counsellor account back to the workspace - so the action
 *     is to copy the link and send it.
 *  3. If a link dies, delete the entry. A resource library whose links 404 is
 *     worse than a shorter one.
 */

export type ResourceKind = "external" | "share";

export type ResourceCategory =
  | "applications"
  | "essays"
  | "testing"
  | "money"
  | "visas"
  | "data";

export interface CounsellorResource {
  id: string;
  title: string;
  /** What it is and why a counsellor would open it. One or two lines. */
  description: string;
  category: ResourceCategory;
  kind: ResourceKind;
  /** Absolute URL for `external`, in-app path for `share`. */
  url: string;
  /** Who publishes it. Shown so the counsellor knows whose word this is. */
  source: string;
  /** Rough region, where the resource is country-specific. */
  region?: string;
}

export const RESOURCE_CATEGORIES: { id: ResourceCategory; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "essays", label: "Essays" },
  { id: "testing", label: "Testing" },
  { id: "money", label: "Funding" },
  { id: "visas", label: "Visas" },
  { id: "data", label: "College data" },
];

export const COUNSELLOR_RESOURCES: CounsellorResource[] = [
  // ---------------------------------------------------------------- applications
  {
    id: "commonapp-counselors",
    title: "Common App for counselors and recommenders",
    description:
      "The recommender side of the Common App: school reports, transcripts, counselor recommendations and the forms each member college requires.",
    category: "applications",
    kind: "external",
    url: "https://www.commonapp.org/counselors-and-recommenders",
    source: "Common Application",
    region: "United States",
  },
  {
    id: "ucas-advisers",
    title: "UCAS adviser portal",
    description:
      "Reference writing, predicted grades, managing an application batch and the current cycle's deadlines, from UCAS itself.",
    category: "applications",
    kind: "external",
    url: "https://www.ucas.com/advisers",
    source: "UCAS",
    region: "United Kingdom",
  },
  {
    id: "ouac",
    title: "Ontario Universities' Application Centre",
    description:
      "The single application route for Ontario universities, including the 101 stream for current secondary students.",
    category: "applications",
    kind: "external",
    url: "https://www.ouac.on.ca",
    source: "OUAC",
    region: "Canada",
  },
  {
    id: "uac",
    title: "Universities Admissions Centre",
    description:
      "Undergraduate applications for NSW and ACT institutions, with the ATAR and the current key dates.",
    category: "applications",
    kind: "external",
    url: "https://www.uac.edu.au",
    source: "UAC",
    region: "Australia",
  },
  {
    id: "uni-assist",
    title: "uni-assist",
    description:
      "Where international applications to most German universities are checked and forwarded, and what documents each one needs.",
    category: "applications",
    kind: "external",
    url: "https://www.uni-assist.de/en/",
    source: "uni-assist e.V.",
    region: "Germany",
  },
  {
    id: "studielink",
    title: "Studielink",
    description:
      "The national enrolment system for Dutch higher education, including numerus fixus programmes and their earlier deadlines.",
    category: "applications",
    kind: "external",
    url: "https://www.studielink.nl/en",
    source: "Studielink",
    region: "Netherlands",
  },
  {
    id: "nacac-ethics",
    title: "NACAC Guide to Ethical Practice",
    description:
      "The professional standards college admission counselling in the US is held to, including what may and may not be promised to a student.",
    category: "applications",
    kind: "external",
    url: "https://www.nacacnet.org/guide-to-ethical-practice-in-college-admission/",
    source: "NACAC",
    region: "United States",
  },
  {
    id: "educationusa",
    title: "EducationUSA advising centres",
    description:
      "The US State Department's advising network, with country-by-country centres students can be referred to for free guidance.",
    category: "applications",
    kind: "external",
    url: "https://educationusa.state.gov",
    source: "US Department of State",
  },

  // ---------------------------------------------------------------------- essays
  {
    id: "commonapp-prompts",
    title: "This year's Common App essay prompts",
    description:
      "The current personal statement prompts and word limit, published by the Common App rather than paraphrased from last cycle.",
    category: "essays",
    kind: "external",
    url: "https://www.commonapp.org/apply/essay-prompts",
    source: "Common Application",
    region: "United States",
  },
  {
    id: "ucas-personal-statement",
    title: "UCAS personal statement",
    description:
      "What the personal statement is now asked to cover, the current question structure, and the character limit.",
    category: "essays",
    kind: "external",
    url: "https://www.ucas.com/applying/applying-university/writing-personal-statement",
    source: "UCAS",
    region: "United Kingdom",
  },
  {
    id: "share-essays",
    title: "Essay Builder",
    description:
      "Where a student drafts and revises their essays in Pathforge. Drafts they submit land in your Essays queue.",
    category: "essays",
    kind: "share",
    url: "/essays",
    source: "Pathforge",
  },
  {
    id: "share-exemplars",
    title: "Exemplar essays",
    description:
      "Essays that were part of real successful applications, for a student who needs to see the standard rather than be told about it.",
    category: "essays",
    kind: "share",
    url: "/exemplar-essays",
    source: "Pathforge",
  },

  // --------------------------------------------------------------------- testing
  {
    id: "collegeboard-sat",
    title: "SAT dates and registration",
    description:
      "Test dates, registration deadlines, fee waivers and the digital SAT's current format.",
    category: "testing",
    kind: "external",
    url: "https://satsuite.collegeboard.org/sat",
    source: "College Board",
    region: "United States",
  },
  {
    id: "act-dates",
    title: "ACT dates and registration",
    description: "National test dates, deadlines, fee waivers and accommodations.",
    category: "testing",
    kind: "external",
    url: "https://www.act.org/content/act/en/products-and-services/the-act/registration.html",
    source: "ACT",
    region: "United States",
  },
  {
    id: "ielts-test-dates",
    title: "IELTS test locations and dates",
    description:
      "Where and when IELTS runs, and which version a given university accepts.",
    category: "testing",
    kind: "external",
    url: "https://ielts.org/take-a-test/book-a-test",
    source: "IELTS",
  },
  {
    id: "toefl",
    title: "TOEFL iBT",
    description:
      "Registration, the current test format, and how scores are sent to institutions.",
    category: "testing",
    kind: "external",
    url: "https://www.ets.org/toefl/test-takers/ibt.html",
    source: "ETS",
  },
  {
    id: "share-testprep",
    title: "Test prep",
    description:
      "The student's own test-prep surface in Pathforge, tied to the score they are working towards.",
    category: "testing",
    kind: "share",
    url: "/testprep",
    source: "Pathforge",
  },

  // ----------------------------------------------------------------------- money
  {
    id: "fafsa",
    title: "FAFSA",
    description:
      "Federal student aid: who is eligible, what is needed to file, and this cycle's opening date and deadlines.",
    category: "money",
    kind: "external",
    url: "https://studentaid.gov/h/apply-for-aid/fafsa",
    source: "US Department of Education",
    region: "United States",
  },
  {
    id: "css-profile",
    title: "CSS Profile",
    description:
      "The institutional aid application several hundred colleges require in addition to the FAFSA, including from international applicants.",
    category: "money",
    kind: "external",
    url: "https://cssprofile.collegeboard.org",
    source: "College Board",
    region: "United States",
  },
  {
    id: "student-finance-uk",
    title: "Student finance England",
    description:
      "Tuition and maintenance loans, eligibility, and when an application has to be in by.",
    category: "money",
    kind: "external",
    url: "https://www.gov.uk/student-finance",
    source: "GOV.UK",
    region: "United Kingdom",
  },
  {
    id: "chevening",
    title: "Chevening Scholarships",
    description:
      "The UK government's fully funded scholarship scheme, with eligibility by country and the annual deadline.",
    category: "money",
    kind: "external",
    url: "https://www.chevening.org",
    source: "UK Government",
  },
  {
    id: "fulbright-foreign",
    title: "Fulbright Foreign Student Program",
    description:
      "Funded graduate study in the US, administered country by country through the local commission or US embassy.",
    category: "money",
    kind: "external",
    url: "https://foreign.fulbrightonline.org",
    source: "US Department of State",
  },
  {
    id: "share-scholarships",
    title: "Scholarships",
    description:
      "The scholarship surface a student sees in Pathforge, matched against their own profile.",
    category: "money",
    kind: "share",
    url: "/scholarships",
    source: "Pathforge",
  },

  // ----------------------------------------------------------------------- visas
  {
    id: "study-in-the-states",
    title: "Study in the States",
    description:
      "The F-1 process end to end: I-20, SEVIS fee, the visa interview, and what a student may and may not do while studying.",
    category: "visas",
    kind: "external",
    url: "https://studyinthestates.dhs.gov",
    source: "US Department of Homeland Security",
    region: "United States",
  },
  {
    id: "uk-student-visa",
    title: "UK Student visa",
    description:
      "Eligibility, financial evidence, the CAS, and current processing times.",
    category: "visas",
    kind: "external",
    url: "https://www.gov.uk/student-visa",
    source: "GOV.UK",
    region: "United Kingdom",
  },
  {
    id: "canada-study-permit",
    title: "Canada study permit",
    description:
      "Who needs one, the provincial attestation letter, proof of funds, and how to apply.",
    category: "visas",
    kind: "external",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    source: "Government of Canada",
    region: "Canada",
  },
  {
    id: "australia-student-visa",
    title: "Australia Student visa (subclass 500)",
    description:
      "Requirements, the Genuine Student criterion, and what the visa allows during and after study.",
    category: "visas",
    kind: "external",
    url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
    source: "Australian Department of Home Affairs",
    region: "Australia",
  },

  // ------------------------------------------------------------------ college data
  {
    id: "college-scorecard",
    title: "College Scorecard",
    description:
      "Federal data on cost, completion, debt and post-study earnings by institution and by field of study.",
    category: "data",
    kind: "external",
    url: "https://collegescorecard.ed.gov",
    source: "US Department of Education",
    region: "United States",
  },
  {
    id: "ipeds",
    title: "IPEDS Data Center",
    description:
      "Admission rates, test-score ranges, enrolment and aid, reported by institutions themselves and comparable across them.",
    category: "data",
    kind: "external",
    url: "https://nces.ed.gov/ipeds/",
    source: "National Center for Education Statistics",
    region: "United States",
  },
  {
    id: "discover-uni",
    title: "Discover Uni",
    description:
      "The official UK course comparison: entry requirements, continuation, and graduate outcomes course by course.",
    category: "data",
    kind: "external",
    url: "https://discoveruni.gov.uk",
    source: "Office for Students",
    region: "United Kingdom",
  },
  {
    id: "ncaa-eligibility",
    title: "NCAA Eligibility Center",
    description:
      "Academic and amateurism certification for a student intending to compete in Division I or II.",
    category: "data",
    kind: "external",
    url: "https://web3.ncaa.org/ecwr3/",
    source: "NCAA",
    region: "United States",
  },
  {
    id: "share-past-admits",
    title: "Past admits",
    description:
      "Real accepted profiles in Pathforge, for calibrating a student's list against what actually got in.",
    category: "data",
    kind: "share",
    url: "/past-admits",
    source: "Pathforge",
  },
  {
    id: "share-requirements",
    title: "Requirements",
    description:
      "Per-university requirements a student can work through, so a list is checked against what each one asks for.",
    category: "data",
    kind: "share",
    url: "/requirements",
    source: "Pathforge",
  },
];
