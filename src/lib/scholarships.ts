// Derive multiple logo candidates from an application link.
// Clearbit's logo API was sunset, so it's gone — leading with it left every
// logo failing over before anything rendered. We now try unavatar (aggregates
// real brand logos, ?fallback=false so it 404s instead of returning a generic
// avatar), then Google's favicon service, then DuckDuckGo. The <ProviderLogo>
// component walks this list on each <img> error and only falls back to a
// monogram tile after all fail.
function logoCandidatesFromUrl(url: string): string[] {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return [
      `https://unavatar.io/${host}?fallback=false`,
      `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
    ];
  } catch {
    return [];
  }
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  providerLogo?: string; // legacy emoji — kept for back-compat, not rendered
  logoUrl?: string; // primary logo (first candidate)
  logoCandidates?: string[]; // ordered fallback list of logo URLs
  amount: string;
  amountNumeric?: number; // for sorting
  country: string;
  region?: string;
  eligibility: {
    grades: string[];
    nationality?: string;
    fieldOfStudy: string[];
    other?: string;
  };
  deadline: string;
  /**
   * Set when the date above is approximate, rolling, or the cycle had not
   * reopened at the time of verification. Surfaced next to the deadline so a
   * student never treats an estimated date as authoritative.
   */
  deadlineNote?: string;
  /**
   * Which stage of study the award actually funds. A number of entries in this
   * file are postgraduate-only programmes (Chevening, Rhodes, Schwarzman,
   * Erasmus Mundus, DAAD, Fulbright, Aga Khan, QECS) that were previously
   * tagged `grades: ["12"]` — i.e. shown to school students as though they
   * could apply this year. They cannot: they require a completed bachelor's
   * degree, and several require years of work experience.
   */
  studyLevel?: "undergraduate" | "postgraduate";
  description: string;
  applicationProcess: string;
  applicationLink: string;
  type: "merit" | "need-based" | "research" | "competition" | "community" | "diversity";
  featured?: boolean;
  popularity?: number; // 0-100 simulated popularity
  /** ISO date this entry's eligibility, amount and link were last checked. */
  verifiedOn?: string;
  /** Where the facts above came from, for audit. */
  verifiedSource?: string;
}

export const scholarships: Scholarship[] = [
  {
    id: "coca-cola-scholars",
    name: "Coca-Cola Scholars Program",
    provider: "Coca-Cola Scholars Foundation",
    amount: "$20,000",
    amountNumeric: 20000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "Minimum 3.0 GPA" },
    deadline: "2026-10-31",
    description: "An achievement-based scholarship awarded to 150 graduating high school seniors each year. The program recognizes students who demonstrate leadership, academics, and community service.",
    applicationProcess: "Complete the online application by the deadline. Semi-finalists are selected for interviews. 150 scholars are chosen annually.",
    applicationLink: "https://www.coca-colascholarsfoundation.org/apply/",
    type: "merit",
    featured: true,
    popularity: 92,
  },
  {
    id: "gates-scholarship",
    name: "Gates Scholarship",
    provider: "Bill & Melinda Gates Foundation",
    amount: "Full Cost of Attendance",
    amountNumeric: 80000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "Pell-eligible, minority student, 3.3+ GPA" },
    deadline: "2026-09-15",
    description: "A highly selective, full scholarship for outstanding minority high school seniors from low-income households. Covers tuition, fees, room and board, and more.",
    applicationProcess: "Submit application online. Finalists are interviewed. 300 scholars selected annually.",
    applicationLink: "https://www.thegatesscholarship.org/scholarship",
    type: "need-based",
    featured: true,
    popularity: 97,
  },
  {
    id: "regeneron-sts",
    name: "Regeneron Science Talent Search",
    provider: "Society for Science",
    amount: "Up to $250,000",
    amountNumeric: 250000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["STEM"], other: "Must submit original research" },
    deadline: "2026-11-12",
    description: "The nation's oldest and most prestigious science and math competition for high school seniors. Students submit original research projects.",
    applicationProcess: "Submit research report, essays, and recommendations through the online portal.",
    applicationLink: "https://www.societyforscience.org/regeneron-sts/",
    type: "research",
    featured: true,
    popularity: 88,
  },
  {
    id: "elks-mvs",
    name: "Elks Most Valuable Student",
    provider: "Elks National Foundation",
    amount: "Up to $50,000",
    amountNumeric: 50000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen", fieldOfStudy: ["Any"], other: "Must not be related to an Elks member" },
    deadline: "2026-11-05",
    description: "Awarded to students based on scholarship, leadership, and financial need. 500 scholarships awarded annually.",
    applicationProcess: "Apply online. Applications are judged at local, district, and national levels.",
    applicationLink: "https://www.elks.org/scholars/scholarships/mvs.cfm",
    type: "merit",
    popularity: 72,
  },
  {
    id: "qe-commonwealth",
    name: "Queen Elizabeth Commonwealth Scholarships",
    provider: "Association of Commonwealth Universities",
    amount: "Full Tuition + Living Expenses",
    amountNumeric: 60000,
    country: "International",
    region: "Commonwealth Nations",
    eligibility: { grades: ["Postgraduate"], nationality: "Commonwealth citizen", fieldOfStudy: ["Any"], other: "Master's level study" },
    deadline: "2026-06-30",
    description: "Provides fully-funded Master's scholarships at universities across the Commonwealth. Focused on sustainable development themes.",
    applicationProcess: "Apply through the ACU portal. Must be nominated by a Commonwealth university.",
    applicationLink: "https://www.acu.ac.uk/funding-opportunities/for-students/queen-elizabeth-commonwealth-scholarships/",
    studyLevel: "postgraduate",
    type: "merit",
    popularity: 65,
  },
  {
    id: "chevening",
    name: "Chevening Scholarships",
    provider: "UK Government (FCDO)",
    amount: "Full Tuition + Living Costs",
    amountNumeric: 70000,
    country: "International",
    region: "Global (non-UK)",
    eligibility: { grades: ["Postgraduate"], nationality: "Non-UK citizen from eligible country", fieldOfStudy: ["Any"], other: "2+ years work experience, Master's study in UK" },
    deadline: "2026-11-01",
    description: "The UK government's international scholarship programme for future leaders. Fully funded one-year Master's at any UK university.",
    applicationProcess: "Apply online during the application window. Shortlisted candidates are interviewed.",
    applicationLink: "https://www.chevening.org/scholarships/",
    studyLevel: "postgraduate",
    type: "merit",
    featured: true,
    popularity: 90,
  },
  {
    id: "davidson-fellows",
    name: "Davidson Fellows Scholarship",
    provider: "Davidson Institute",
    amount: "Up to $50,000",
    amountNumeric: 50000,
    country: "USA",
    eligibility: { grades: ["9", "10", "11", "12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["STEM", "Arts", "Humanities"], other: "Under 18, significant project required" },
    deadline: "2027-02-12",
    description: "Recognizes young people under 18 who have completed a significant piece of work in science, technology, engineering, mathematics, literature, music, or philosophy.",
    applicationProcess: "Submit project portfolio and application. Reviewed by expert panels.",
    applicationLink: "https://www.davidsongifted.org/gifted-programs/fellows-scholarship/",
    type: "research",
    popularity: 78,
  },
  {
    id: "jack-kent-cooke",
    name: "Jack Kent Cooke College Scholarship",
    provider: "Jack Kent Cooke Foundation",
    amount: "Up to $55,000/year",
    amountNumeric: 55000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "Family income < $95,000, 3.5+ GPA" },
    deadline: "2026-11-18",
    description: "One of the largest scholarships in the US for high-achieving students with financial need. Covers tuition, room, board, and more.",
    applicationProcess: "Complete online application with transcripts, recommendation letters, and financial documentation.",
    applicationLink: "https://www.jkcf.org/our-scholarships/college-scholarship-program/",
    type: "need-based",
    featured: true,
    popularity: 85,
  },
  {
    id: "erasmus-mundus",
    name: "Erasmus Mundus Joint Masters",
    provider: "European Commission",
    amount: "Full Tuition + €1,400/month stipend",
    amountNumeric: 60000,
    country: "International",
    region: "Europe",
    eligibility: { grades: ["Postgraduate"], nationality: "Any", fieldOfStudy: ["Any"], other: "Bachelor's degree required" },
    deadline: "2027-01-15",
    description: "EU-funded scholarships for joint Master's programmes delivered by consortia of higher education institutions across Europe and beyond.",
    applicationProcess: "Apply through the specific EMJMD programme consortium website.",
    applicationLink: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters-scholarships",
    studyLevel: "postgraduate",
    type: "merit",
    popularity: 82,
  },
  {
    id: "terry-fox-humanitarian",
    name: "Terry Fox Humanitarian Award",
    provider: "Terry Fox Humanitarian Award Program",
    amount: "CAD $28,000 (renewable)",
    amountNumeric: 28000,
    country: "Canada",
    eligibility: { grades: ["12"], nationality: "Canadian Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "Demonstrated humanitarian work" },
    deadline: "2027-02-01",
    description: "Awarded to Canadian students who demonstrate the highest ideals of citizenship and contribute to humanitarian efforts in their communities.",
    applicationProcess: "Apply online with essays describing humanitarian contributions.",
    applicationLink: "https://terryfoxawards.ca/",
    type: "community",
    popularity: 68,
  },
  {
    id: "aga-khan",
    name: "Aga Khan Foundation International Scholarship",
    provider: "Aga Khan Foundation",
    amount: "Up to 50% Grant + 50% Loan",
    amountNumeric: 30000,
    country: "International",
    eligibility: { grades: ["Postgraduate"], nationality: "Developing country citizen", fieldOfStudy: ["Any"], other: "Financial need, postgraduate study" },
    deadline: "2027-03-31",
    description: "Provides a limited number of scholarships each year for postgraduate studies to outstanding students from developing countries who have no other means of financing their studies.",
    applicationProcess: "Apply through the local Aga Khan Foundation office in your country.",
    applicationLink: "https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme",
    studyLevel: "postgraduate",
    type: "need-based",
    popularity: 60,
  },
  {
    id: "cameron-impact",
    name: "Cameron Impact Scholarship",
    provider: "Bryan Cameron Education Foundation",
    amount: "Full Tuition (4 years)",
    amountNumeric: 80000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen", fieldOfStudy: ["Any"], other: "Demonstrated leadership, 3.7+ GPA, 1500+ SAT or 34+ ACT" },
    deadline: "2026-09-14",
    description: "A full-ride scholarship for exceptional students who demonstrate academic excellence, community involvement, and leadership.",
    applicationProcess: "Online application followed by regional interviews for finalists.",
    applicationLink: "https://www.bryancameroneducationfoundation.org/scholarship",
    type: "merit",
    popularity: 75,
  },
  {
    id: "schwarzman-scholars",
    name: "Schwarzman Scholars",
    provider: "Schwarzman Scholars Program",
    amount: "Full Tuition + Travel + Living",
    amountNumeric: 75000,
    country: "International",
    region: "Global",
    eligibility: { grades: ["Postgraduate"], nationality: "Any", fieldOfStudy: ["Any"], other: "Bachelor's degree, ages 18-28, Master's at Tsinghua University" },
    deadline: "2026-09-15",
    description: "A one-year fully-funded Master's program at Tsinghua University in Beijing, designed to prepare future global leaders.",
    applicationProcess: "Submit online application with essays, transcripts, and recommendations.",
    applicationLink: "https://www.schwarzmanscholars.org/admissions/",
    studyLevel: "postgraduate",
    type: "merit",
    popularity: 86,
  },
  // REMOVED: "STEM Diversity Scholarship" / "National STEM Foundation".
  // No such programme or provider could be verified. The application link
  // pointed at scholarsapply.org, Scholarship America's generic portal, not at
  // any named award. A student chasing an award that does not exist loses part
  // of an application cycle, so it has been deleted rather than corrected.
  {
    id: "kiit-scholarship-india",
    name: "KIIT University Merit Scholarship",
    provider: "KIIT University",
    amount: "Up to 100% Tuition Waiver",
    amountNumeric: 15000,
    country: "India",
    eligibility: { grades: ["12"], nationality: "Indian Citizen", fieldOfStudy: ["STEM", "Business"], other: "Based on KIITEE exam score" },
    deadline: "2027-04-15",
    description: "Merit-based scholarships for students admitted through KIITEE entrance exam, with waivers ranging from 25% to 100%.",
    applicationProcess: "Appear for KIITEE exam. Scholarships awarded based on rank.",
    applicationLink: "https://kiit.ac.in/scholarship/",
    type: "merit",
    popularity: 55,
  },
  {
    id: "questbridge",
    name: "QuestBridge National College Match",
    provider: "QuestBridge",
    amount: "Full 4-year Scholarship",
    amountNumeric: 320000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (US-based seniors)", fieldOfStudy: ["Any"], other: "Low-income, top academic record" },
    deadline: "2026-09-26",
    description: "Connects exceptional low-income students with full scholarships at 50+ partner colleges including Stanford, Yale, MIT, and Princeton.",
    applicationProcess: "Submit application by late September. Finalists rank partner colleges in October.",
    applicationLink: "https://www.questbridge.org/high-school-students/national-college-match",
    type: "need-based",
    featured: true,
    popularity: 94,
  },
  {
    id: "horatio-alger",
    name: "Horatio Alger National Scholarship",
    provider: "Horatio Alger Association",
    amount: "$25,000",
    amountNumeric: 25000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen", fieldOfStudy: ["Any"], other: "Family income under $65,000, 2.0+ GPA, adversity overcome" },
    deadline: "2026-10-25",
    description: "Recognizes students who have faced and overcome great obstacles. 106 National Scholars selected each year.",
    applicationProcess: "Online application with essays describing adversity and educational goals.",
    applicationLink: "https://scholars.horatioalger.org/scholarships/",
    type: "need-based",
    popularity: 80,
  },
  {
    id: "burger-king-scholars",
    name: "Burger King Scholars Program",
    provider: "Burger King Foundation",
    amount: "$1,000 – $50,000",
    amountNumeric: 50000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US/Canada/Puerto Rico", fieldOfStudy: ["Any"], other: "2.5+ GPA, work or community service" },
    deadline: "2026-12-15",
    description: "Awards thousands of scholarships annually to high school seniors across North America based on academics, work experience, and community service.",
    applicationProcess: "Single online application; recipients selected at regional and national levels.",
    applicationLink: "https://burgerkingfoundation.org/program/burger-king-scholars-program/",
    type: "merit",
    popularity: 78,
  },
  {
    id: "dell-scholars",
    name: "Dell Scholars Program",
    provider: "Michael & Susan Dell Foundation",
    amount: "$20,000 + Laptop",
    amountNumeric: 20000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (US-based)", fieldOfStudy: ["Any"], other: "Pell-eligible, GEAR UP / AVID / TRIO participant, 2.4+ GPA" },
    deadline: "2026-12-01",
    description: "Supports students who have overcome significant obstacles. Includes a laptop, textbook credits, and ongoing mentorship through graduation.",
    applicationProcess: "Online application with essays, transcripts, and financial aid information.",
    applicationLink: "https://www.dellscholars.org",
    type: "need-based",
    popularity: 85,
  },
  {
    id: "ron-brown",
    name: "Ron Brown Scholar Program",
    provider: "Ron Brown Scholar Fund",
    amount: "$40,000",
    amountNumeric: 40000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "African American, financial need, demonstrated leadership" },
    deadline: "2026-11-01",
    description: "Awarded to 10–20 African American high school seniors annually who demonstrate academic excellence, leadership, and a commitment to public service.",
    applicationProcess: "Online application; finalists travel to Virginia for selection weekend.",
    applicationLink: "https://www.ronbrown.org",
    type: "diversity",
    popularity: 82,
  },
  {
    id: "hispanic-scholarship-fund",
    name: "HSF Scholar Program",
    provider: "Hispanic Scholarship Fund",
    amount: "$500 – $5,000",
    amountNumeric: 5000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (US-based)", fieldOfStudy: ["Any"], other: "Hispanic heritage, 3.0+ GPA" },
    deadline: "2027-02-15",
    description: "Renewable scholarship that supports Hispanic students pursuing higher education, plus mentorship, leadership, and career programming.",
    applicationProcess: "Online application with transcripts and FAFSA information.",
    applicationLink: "https://www.hsf.net/scholarship",
    type: "diversity",
    popularity: 86,
  },
  {
    id: "ucb-leadership",
    name: "UC Berkeley Leadership Award",
    provider: "UC Berkeley",
    amount: "$2,000 – $20,000/year",
    amountNumeric: 20000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (admitted to UCB)", fieldOfStudy: ["Any"], other: "Demonstrated leadership in school or community" },
    deadline: "2027-01-08",
    description: "Renewable scholarship for incoming UC Berkeley undergraduates who have shown exceptional leadership in academics, community, or athletics.",
    applicationProcess: "Apply through the UC Berkeley Leadership Award application after admission.",
    applicationLink: "https://financialaid.berkeley.edu/scholarships-2/the-leadership-award/",
    type: "merit",
    popularity: 70,
  },
  {
    id: "amazon-future-engineer",
    name: "Amazon Future Engineer Scholarship",
    provider: "Amazon",
    amount: "$40,000",
    amountNumeric: 40000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "US-based", fieldOfStudy: ["Computer Science", "Engineering"], other: "Underrepresented & under-resourced, pursuing CS" },
    deadline: "2027-01-12",
    description: "Awards $40,000 over four years plus a paid Amazon internship for 250 students from underrepresented and underserved communities pursuing computer science.",
    applicationProcess: "Online application with essays and recommendations.",
    applicationLink: "https://www.amazonfutureengineer.com/scholarships",
    type: "diversity",
    popularity: 88,
  },
  {
    id: "google-lime",
    name: "Google Lime Scholarship",
    provider: "Google",
    amount: "$10,000",
    amountNumeric: 10000,
    country: "International",
    eligibility: { grades: ["12"], nationality: "Any", fieldOfStudy: ["Computer Science", "Engineering"], other: "Students with disabilities pursuing CS" },
    deadline: "2026-12-08",
    description: "Supports students with disabilities pursuing computer science or related fields, with funding and a retreat at Google HQ.",
    applicationProcess: "Submit application with transcripts, essays, and resume.",
    applicationLink: "https://www.limeconnect.com/programs/page/google-lime-scholarship",
    type: "diversity",
    popularity: 74,
  },
  {
    id: "society-women-engineers",
    name: "SWE Scholarships",
    provider: "Society of Women Engineers",
    amount: "$1,000 – $15,000",
    amountNumeric: 15000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (US-based)", fieldOfStudy: ["Engineering", "Computer Science"], other: "Women pursuing engineering/CS" },
    deadline: "2027-03-15",
    description: "Hundreds of awards from one application supporting women pursuing accredited engineering and computer science programs.",
    applicationProcess: "Single online application matches you to multiple awards.",
    applicationLink: "https://swe.org/scholarships/",
    type: "diversity",
    popularity: 80,
  },
  {
    id: "stem-women-scholarship",
    name: "Generation Google Scholarship",
    provider: "Google",
    amount: "$10,000 (US) / $5,000 (Canada)",
    amountNumeric: 10000,
    country: "USA",
    eligibility: { grades: ["12"], nationality: "Any (US/Canada-based)", fieldOfStudy: ["Computer Science", "Engineering"], other: "Underrepresented in tech" },
    deadline: "2026-12-04",
    description: "Helps aspiring technologists from historically underrepresented groups pursue computer science degrees.",
    applicationProcess: "Online application with essays and resume.",
    applicationLink: "https://buildyourfuture.withgoogle.com/scholarships/generation-google-scholarship",
    type: "diversity",
    popularity: 86,
  },
  {
    id: "ayn-rand-essay",
    name: "Ayn Rand Institute Essay Contest",
    provider: "Ayn Rand Institute",
    amount: "Up to $25,000",
    amountNumeric: 25000,
    country: "International",
    eligibility: { grades: ["9", "10", "11", "12"], nationality: "Any", fieldOfStudy: ["Any"], other: "Submit a qualifying essay" },
    deadline: "2026-11-04",
    description: "Annual essay contests on Anthem, The Fountainhead, and Atlas Shrugged with cash prizes for top entries.",
    applicationProcess: "Read prompt, write essay, submit online.",
    applicationLink: "https://aynrand.org/students/essay-contests/",
    type: "competition",
    popularity: 70,
  },
  {
    id: "scholastic-art-writing",
    name: "Scholastic Art & Writing Awards",
    provider: "Alliance for Young Artists & Writers",
    amount: "Up to $10,000",
    amountNumeric: 10000,
    country: "USA",
    eligibility: { grades: ["7", "8", "9", "10", "11", "12"], nationality: "US/Canada", fieldOfStudy: ["Arts", "English/Creative Writing"], other: "Original visual art or writing submission" },
    deadline: "2027-01-10",
    description: "The longest-running recognition program for creative teens. Past alumni include Andy Warhol, Sylvia Plath, and Stephen King.",
    applicationProcess: "Submit original work through regional affiliates.",
    applicationLink: "https://www.artandwriting.org",
    type: "competition",
    popularity: 90,
  },
  {
    id: "national-merit",
    name: "National Merit Scholarship",
    provider: "National Merit Scholarship Corporation",
    amount: "$2,500 – Full Tuition",
    amountNumeric: 40000,
    country: "USA",
    eligibility: { grades: ["11"], nationality: "US Citizen / Permanent Resident", fieldOfStudy: ["Any"], other: "Top PSAT/NMSQT scorers" },
    deadline: "2026-10-15",
    description: "Identifies and honors academically talented students through the PSAT/NMSQT. Finalists may receive corporate, college-sponsored, or NMSC awards.",
    applicationProcess: "Take the PSAT/NMSQT in 11th grade; semifinalists complete a full application.",
    applicationLink: "https://www.nationalmerit.org",
    type: "merit",
    popularity: 95,
  },
  {
    id: "rhodes-trust",
    name: "Rhodes Scholarship",
    provider: "Rhodes Trust",
    amount: "Full Tuition + Living Stipend",
    amountNumeric: 75000,
    country: "International",
    region: "Global",
    eligibility: { grades: ["Postgraduate"], nationality: "Selected countries", fieldOfStudy: ["Any"], other: "For postgraduate study at Oxford" },
    deadline: "2026-10-01",
    description: "The world's oldest and most celebrated international fellowship, funding postgraduate study at the University of Oxford.",
    applicationProcess: "Country-specific application with essays, recommendations, and interviews.",
    applicationLink: "https://www.rhodeshouse.ox.ac.uk/scholarships/",
    studyLevel: "postgraduate",
    type: "merit",
    featured: true,
    popularity: 97,
  },
  {
    id: "fulbright-foreign",
    name: "Fulbright Foreign Student Program",
    provider: "U.S. Department of State",
    amount: "Full Funding",
    amountNumeric: 80000,
    country: "International",
    region: "Global",
    eligibility: { grades: ["Postgraduate"], nationality: "Non-US", fieldOfStudy: ["Any"], other: "For master's/PhD study in the U.S." },
    deadline: "2026-10-15",
    description: "Funds international students to pursue master's or PhD programs in the United States across more than 160 countries.",
    applicationProcess: "Apply through the Fulbright Commission in your home country.",
    applicationLink: "https://foreign.fulbrightonline.org",
    studyLevel: "postgraduate",
    type: "merit",
    popularity: 91,
  },
  {
    id: "daad",
    name: "DAAD Scholarships",
    provider: "German Academic Exchange Service",
    amount: "€861 – €1,200/month",
    amountNumeric: 14400,
    country: "International",
    region: "Europe",
    eligibility: { grades: ["Postgraduate"], nationality: "Any", fieldOfStudy: ["Any"], other: "Study or research in Germany" },
    deadline: "2026-10-31",
    description: "Germany's flagship scholarship for international students and researchers across hundreds of programs.",
    applicationProcess: "Search the DAAD database for a matching program and apply directly.",
    applicationLink: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    studyLevel: "postgraduate",
    type: "merit",
    popularity: 84,
  },
  {
    id: "mext-japan",
    name: "MEXT Scholarship",
    provider: "Government of Japan",
    amount: "Full Tuition + Stipend",
    amountNumeric: 30000,
    country: "International",
    region: "Asia",
    eligibility: { grades: ["12"], nationality: "Non-Japanese", fieldOfStudy: ["Any"], other: "Study at a Japanese university" },
    deadline: "2026-05-31",
    description: "Government of Japan scholarship covering tuition, airfare, and a monthly stipend for undergraduate and graduate study in Japan.",
    applicationProcess: "Apply through the Japanese embassy in your country.",
    applicationLink: "https://www.studyinjapan.go.jp/en/planning/scholarship/government/",
    type: "merit",
    popularity: 83,
  },
  {
    id: "kgsp-korea",
    name: "Global Korea Scholarship (GKS)",
    provider: "National Institute for International Education (Korea)",
    amount: "Full Tuition + ₩900,000/month",
    amountNumeric: 25000,
    country: "International",
    region: "Asia",
    eligibility: { grades: ["12"], nationality: "Non-Korean", fieldOfStudy: ["Any"], other: "Study at a Korean university" },
    deadline: "2026-09-20",
    description: "Korean government scholarship covering tuition, airfare, settlement, and stipend for undergraduate and graduate students.",
    applicationProcess: "Apply through embassy track or university track depending on country.",
    applicationLink: "https://www.studyinkorea.go.kr",
    type: "merit",
    popularity: 80,
  },
  {
    id: "asean-singapore",
    name: "ASEAN Undergraduate Scholarship",
    provider: "Nanyang Technological University / NUS",
    amount: "Full Tuition + Living Allowance",
    amountNumeric: 35000,
    country: "International",
    region: "Asia",
    eligibility: { grades: ["12"], nationality: "ASEAN (non-Singaporean)", fieldOfStudy: ["Any"], other: "Strong academic record" },
    deadline: "2027-03-19",
    description: "Full scholarships for ASEAN students to study at top Singaporean universities, including tuition and living allowance.",
    applicationProcess: "Apply through NUS/NTU undergraduate admissions with scholarship indication.",
    applicationLink: "https://www.nus.edu.sg/oam/scholarships/freshmen-international-students/asean-undergraduate-scholarship",
    type: "merit",
    popularity: 78,
  },
  {
    id: "tata-trust-india",
    name: "Tata Trusts Scholarships",
    provider: "Tata Trusts",
    amount: "Up to ₹6,00,000/year",
    amountNumeric: 7200,
    country: "India",
    eligibility: { grades: ["12"], nationality: "Indian Citizen", fieldOfStudy: ["Any"], other: "Financial need and merit" },
    deadline: "2026-08-31",
    description: "Need-cum-merit scholarships for Indian students pursuing undergraduate and postgraduate study in India and abroad.",
    applicationProcess: "Apply through partner programs listed on the Tata Trusts education portal.",
    applicationLink: "https://www.tatatrusts.org/our-work/individual-grants-programme/education-grants",
    type: "need-based",
    popularity: 75,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Verified additions — August 2026.
  //
  // Every entry below was checked against the awarding body's own pages (or,
  // where the official site was unreachable, against multiple independent
  // sources that agreed). `verifiedOn` / `verifiedSource` record that check.
  // Where a cycle had closed and the next one was not yet published, the
  // deadline is marked estimated in `deadlineNote` rather than guessed at
  // silently — a student must never treat an invented date as authoritative.
  // ─────────────────────────────────────────────────────────────────────

  {
    id: "coolidge-scholarship",
    name: "Coolidge Scholarship",
    provider: "Calvin Coolidge Presidential Foundation",
    amount: "Full ride (tuition, room & board, ~$120,000 over 4 years)",
    amountNumeric: 120000,
    country: "USA",
    eligibility: {
      grades: ["11"],
      nationality: "US Citizen / Lawful Permanent Resident",
      fieldOfStudy: ["Any"],
      other: "Juniors ONLY — seniors are ineligible. No gap year. Must enrol full-time as a first-time undergraduate at an accredited US institution.",
    },
    deadline: "2027-01-31",
    deadlineNote: "Estimated. The next cycle opens in late summer/early autumn 2026; confirm the closing date at coolidgescholars.org/apply.",
    studyLevel: "undergraduate",
    description: "A full-ride scholarship covering tuition, room, board and expenses for four years of undergraduate study, awarded to a very small number of scholars each year. Uniquely among the major US awards, it is open to juniors rather than seniors, so the window closes a year earlier than most students expect.",
    applicationProcess: "Online application with academic record and essays. Coolidge Senators are also recognised at a lower tier. Applications open in late summer of the junior year.",
    applicationLink: "https://coolidgescholars.org/apply/",
    type: "merit",
    featured: true,
    popularity: 82,
    verifiedOn: "2026-08-09",
    verifiedSource: "coolidgescholars.org eligibility and apply pages",
  },
  {
    id: "hagan-scholarship",
    name: "Hagan Scholarship",
    provider: "Hagan Scholarship Foundation",
    amount: "Up to $60,000 ($7,500/semester × 8) + $2,000 stipend",
    amountNumeric: 60000,
    country: "USA",
    eligibility: {
      grades: ["12"],
      nationality: "US high school senior",
      fieldOfStudy: ["Any"],
      other: "3.50 unweighted GPA, household adjusted gross income ≤ $100,000, 240 hours of paid supervised work before the first college semester, must attend a four-year not-for-profit college.",
    },
    deadline: "2026-12-01",
    deadlineNote: "A second application window runs 15 January – 15 March 2027.",
    studyLevel: "undergraduate",
    description: "One of the largest need-and-merit awards available to US seniors, designed to let recipients graduate debt-free. Includes a $2,000 one-time stipend for a laptop and books, a foundation-funded brokerage account, and a funded study-abroad opportunity.",
    applicationProcess: "Online application with transcripts, financial information, and evidence of the required paid work hours.",
    applicationLink: "https://haganscholarships.org/",
    type: "need-based",
    featured: true,
    popularity: 78,
    verifiedOn: "2026-08-09",
    verifiedSource: "haganscholarships.org Q&A; corroborated by multiple scholarship databases",
  },
  {
    id: "stamps-scholars",
    name: "Stamps Scholarship",
    provider: "Stamps Scholars (with 35+ partner universities)",
    amount: "Varies by partner (four-year awards typically $80,000–$392,000) + enrichment funding",
    amountNumeric: 80000,
    country: "USA",
    eligibility: {
      grades: ["12"],
      nationality: "Varies by partner school; international students eligible at some",
      fieldOfStudy: ["Any"],
      other: "Awarded through partner universities to their most exceptional admitted students. Financial need is not considered.",
    },
    deadline: "2026-11-01",
    deadlineNote: "There is no central deadline. Each partner university sets its own, and most consider you automatically via their early admission deadline — check your specific school.",
    studyLevel: "undergraduate",
    description: "A scholarship awarded through more than 35 partner universities to admitted students who show academic merit, leadership potential and character. Scholars also receive a separate enrichment fund for study abroad, research and conferences.",
    applicationProcess: "Most partner universities require no separate application — you are considered on the strength of your admission application, usually if you apply by their early deadline. A minority require a supplemental form.",
    applicationLink: "https://www.stampsscholars.org/",
    type: "merit",
    popularity: 76,
    verifiedOn: "2026-08-09",
    verifiedSource: "stampsscholars.org criteria & eligibility page",
  },
  {
    id: "pearson-toronto",
    name: "Lester B. Pearson International Scholarship",
    provider: "University of Toronto",
    amount: "Full tuition, books, incidental fees and residence for 4 years",
    amountNumeric: 250000,
    country: "Canada",
    region: "International students only",
    eligibility: {
      grades: ["12"],
      nationality: "International student requiring a Canadian study permit",
      fieldOfStudy: ["Any"],
      other: "Must be nominated by your secondary school (one nominee per school), in your final year of secondary school, and starting at U of T in September. Students already in post-secondary study are ineligible.",
    },
    deadline: "2026-11-06",
    deadlineNote: "Two earlier deadlines gate this one: your school must nominate you by 9 October 2026, and you must apply for U of T admission by 16 October 2026.",
    studyLevel: "undergraduate",
    description: "Around 37 scholars are selected each year from a global nominated pool. The award covers the full cost of attendance — tuition, books, incidental fees and full residence support — for four years of undergraduate study.",
    applicationProcess: "Ask your counsellor or head of school to nominate you, then apply for U of T admission and submit the separate scholarship application by the stated deadlines.",
    applicationLink: "https://future.utoronto.ca/pearson-scholarships",
    type: "merit",
    featured: true,
    popularity: 89,
    verifiedOn: "2026-08-09",
    verifiedSource: "future.utoronto.ca/pearson-scholarships",
  },
  {
    id: "jefferson-scholars-uva",
    name: "Jefferson Scholarship",
    provider: "Jefferson Scholars Foundation (University of Virginia)",
    amount: "Up to $405,000 over 8 semesters (non-Virginians); ~$230,000 (Virginians)",
    amountNumeric: 405000,
    country: "USA",
    eligibility: {
      grades: ["12"],
      nationality: "Domestic and international students both eligible",
      fieldOfStudy: ["Any"],
      other: "Must be nominated by an eligible secondary school. Selected on leadership, scholarship and citizenship.",
    },
    deadline: "2026-12-01",
    deadlineNote: "This is the school nomination deadline — nominations must come from an eligible secondary school, so speak to your counsellor well before it.",
    studyLevel: "undergraduate",
    description: "UVA's premier undergraduate award, covering tuition, accommodation, meals, books and enrichment opportunities for four years. International students in their final year of secondary school are eligible provided their school can nominate them.",
    applicationProcess: "Secure a school nomination, then complete the Jefferson Scholars application and progress through regional and final selection rounds.",
    applicationLink: "https://www.jeffersonscholars.org/",
    type: "merit",
    popularity: 80,
    verifiedOn: "2026-08-09",
    verifiedSource: "jeffersonscholars.org overview and selection pages",
  },
  {
    id: "morehead-cain",
    name: "Morehead-Cain Scholarship",
    provider: "Morehead-Cain Foundation (UNC Chapel Hill)",
    amount: "Full cost of attendance for 4 years + funded summer enrichment",
    amountNumeric: 300000,
    country: "USA",
    eligibility: {
      grades: ["12"],
      nationality: "US and international students both eligible",
      fieldOfStudy: ["Any"],
      other: "North Carolina applicants require a school nomination. Out-of-state and international applicants are referred by UNC admissions from the Early Action pool.",
    },
    deadline: "2026-10-15",
    deadlineNote: "Out-of-state and international candidates must apply to UNC-Chapel Hill by the 15 October Early Action deadline to be referred. North Carolina school nominations close 30 June.",
    studyLevel: "undergraduate",
    description: "The oldest merit scholarship programme in the United States. Covers four years of undergraduate education at UNC Chapel Hill plus four funded summers of research, outdoor leadership, public service and private enterprise.",
    applicationProcess: "Nomination (NC) or admissions referral (out-of-state and international), followed by the Morehead-Cain application and interview rounds.",
    applicationLink: "https://www.moreheadcain.org/application-eligibility/",
    type: "merit",
    popularity: 84,
    verifiedOn: "2026-08-09",
    verifiedSource: "moreheadcain.org eligibility and deadlines pages",
  },
  {
    id: "prudential-emerging-visionaries",
    name: "Prudential Emerging Visionaries",
    provider: "Prudential Financial",
    amount: "Up to $15,000",
    amountNumeric: 15000,
    country: "USA",
    eligibility: {
      grades: ["9", "10", "11", "12"],
      nationality: "US-based",
      fieldOfStudy: ["Any"],
      other: "Ages 14–18, leading an existing project addressing a financial or societal challenge in their community.",
    },
    deadline: "2026-11-02",
    studyLevel: "undergraduate",
    description: "Recognises 25 young people each year who are already running projects that tackle financial or community problems. Winners receive $5,000 (with a further $5,000 for one winner in each category), coaching, and an all-expenses-paid trip to the awards summit with a parent or guardian.",
    applicationProcess: "Online application via the Changemakers platform describing your existing project and its measured impact.",
    applicationLink: "https://www.changemakers.com/en/challenge/emergingvisionaries",
    type: "community",
    popularity: 71,
    verifiedOn: "2026-08-09",
    verifiedSource: "changemakers.com Emerging Visionaries challenge page and FAQ",
  },
  {
    id: "vfw-voice-of-democracy",
    name: "Voice of Democracy",
    provider: "Veterans of Foreign Wars (VFW)",
    amount: "$1,000 – $35,000 (national first place $35,000)",
    amountNumeric: 35000,
    country: "USA",
    eligibility: {
      grades: ["9", "10", "11", "12"],
      nationality: "Students in US public, private, parochial or home-study programmes",
      fieldOfStudy: ["Any"],
      other: "Must be in grades 9–12 on the 31 October deadline and be sponsored by a participating local VFW Post.",
    },
    deadline: "2026-10-31",
    studyLevel: "undergraduate",
    description: "An audio-essay competition open to all four high school years — unusually early access to a substantial award. The programme distributes more than $2.3 million in scholarships annually; the national first-place award is $35,000 paid directly to the student's institution.",
    applicationProcess: "Record an audio essay on the year's theme and submit it with the entry form through a participating local VFW Post. Entries progress from Post to District to State to national judging.",
    applicationLink: "https://www.vfw.org/community/youth-and-education/youth-scholarships",
    type: "competition",
    popularity: 68,
    verifiedOn: "2026-08-09",
    verifiedSource: "VFW official entry form and programme pages",
  },
  {
    id: "ge-reagan-foundation",
    name: "GE-Reagan Foundation Scholarship",
    provider: "Ronald Reagan Presidential Foundation & Institute",
    amount: "$40,000 ($10,000/year, renewable for up to 4 years)",
    amountNumeric: 40000,
    country: "USA",
    eligibility: {
      grades: ["12"],
      nationality: "US Citizen",
      fieldOfStudy: ["Any"],
      other: "Minimum 3.0 GPA; must enrol full-time at an accredited four-year US institution the following academic year. Selected on leadership, drive, integrity and citizenship.",
    },
    deadline: "2027-01-05",
    deadlineNote: "Estimated from the previous cycle, which opened 13 October and closed 5 January at noon CST. Confirm on the Reagan Foundation site once the cycle opens.",
    studyLevel: "undergraduate",
    description: "A renewable four-year award for graduating seniors who demonstrate the attributes the Foundation associates with Reagan: leadership, drive, integrity and citizenship. Renewal is conditional on maintaining academic standing.",
    applicationProcess: "Online application with transcripts, essays and recommendations. Recipients are notified by the end of April.",
    applicationLink: "https://www.reaganfoundation.org/education/ge-reagan-foundation-scholarship/",
    type: "merit",
    popularity: 73,
    verifiedOn: "2026-08-09",
    verifiedSource: "reaganfoundation.org scholarship pages; prior-cycle timeline corroborated by school district postings",
  },
  {
    id: "turkiye-burslari",
    name: "Türkiye Bursları (Türkiye Scholarships)",
    provider: "Republic of Türkiye — Presidency for Turks Abroad (YTB)",
    amount: "Full tuition + monthly stipend + accommodation + health insurance + flights",
    amountNumeric: 40000,
    country: "International",
    region: "Global (non-Turkish citizens)",
    eligibility: {
      grades: ["12"],
      nationality: "Non-Turkish citizen; must not have previously studied at undergraduate level in Türkiye",
      fieldOfStudy: ["Any"],
      other: "Undergraduate applicants must be under 21 as of 1 January of the application year. Minimum secondary school average of 70% (85% for science/engineering, 90% for medicine and dentistry).",
    },
    deadline: "2027-02-20",
    deadlineNote: "Estimated. The 2026 window ran 10 January – 25 February 2026 (extended from 20 February). The application window opens each January.",
    studyLevel: "undergraduate",
    description: "A fully funded government scholarship covering undergraduate study in Türkiye, including university placement, tuition, a monthly stipend, accommodation, health insurance, return flights and a year of Turkish language education.",
    applicationProcess: "Single online application through the official portal during the January–February window; shortlisted candidates are interviewed.",
    applicationLink: "https://www.turkiyeburslari.gov.tr/",
    type: "merit",
    popularity: 74,
    verifiedOn: "2026-08-09",
    verifiedSource: "turkiyeburslari.gov.tr scholarship programmes and 2026 announcement pages",
  },
  {
    id: "reliance-foundation-ug",
    name: "Reliance Foundation Undergraduate Scholarships",
    provider: "Reliance Foundation",
    amount: "Up to ₹2,00,000 over the degree",
    amountNumeric: 2400,
    country: "India",
    eligibility: {
      grades: ["12"],
      nationality: "Indian citizen residing in India",
      fieldOfStudy: ["Any"],
      other: "Minimum 60% in Class 12; enrolled in the first year of a full-time UG degree; household income under ₹15 lakh (strong preference below ₹2.5 lakh); the aptitude test is mandatory.",
    },
    deadline: "2026-10-15",
    deadlineNote: "Estimated. The 2025-26 window has closed. The scheme reopens annually — check the official portal for the current cycle before relying on this date.",
    studyLevel: "undergraduate",
    description: "One of the largest private undergraduate scholarship schemes in India, selecting up to 5,000 students a year on a merit-cum-means basis. Funds are disbursed annually by direct benefit transfer.",
    applicationProcess: "Online application plus a mandatory 60-minute, 60-question aptitude test covering verbal, analytical and numerical reasoning. Selection combines the test score with academic and financial information.",
    applicationLink: "https://www.scholarships.reliancefoundation.org/UG_Scholarship.aspx",
    type: "need-based",
    featured: true,
    popularity: 86,
    verifiedOn: "2026-08-09",
    verifiedSource: "scholarships.reliancefoundation.org UG scholarship page",
  },
  {
    id: "csss-india-nsp",
    name: "Central Sector Scheme of Scholarships (CSSS) for College & University Students",
    provider: "Ministry of Education, Government of India (National Scholarship Portal)",
    amount: "₹12,000/year (UG years 1-3); ₹20,000/year (4th/5th professional year & PG)",
    amountNumeric: 145,
    country: "India",
    eligibility: {
      grades: ["12"],
      nationality: "Indian citizen",
      fieldOfStudy: ["Any"],
      other: "Must be in the top 20th percentile of successful candidates in your Class 12 board (CBSE, ICSE or state board) and enrolled in a regular full-time UG course. Family income must be within the published ceiling (₹4.5 lakh at last check).",
    },
    deadline: "2026-10-31",
    deadlineNote: "NSP deadlines move each year and are frequently extended. Confirm the current date and the exact income ceiling on scholarships.gov.in — published figures vary between sources.",
    studyLevel: "undergraduate",
    description: "The Government of India's flagship merit-cum-means scholarship for college students, awarded on Class 12 board percentile. Renewable annually subject to attendance and academic progress. Applied for through the National Scholarship Portal alongside most other central and state schemes.",
    applicationProcess: "Register on the National Scholarship Portal, complete the CSSS application, and have it verified by your institution and the state authority.",
    applicationLink: "https://scholarships.gov.in/",
    type: "need-based",
    popularity: 81,
    verifiedOn: "2026-08-09",
    verifiedSource: "scholarships.gov.in (NSP); scheme parameters corroborated across multiple Indian scholarship databases — income ceiling flagged as inconsistent between sources",
  },
];

// Attach derived logo candidates (Clearbit → Google favicon → DuckDuckGo) to every scholarship
scholarships.forEach((s) => {
  if (!s.logoCandidates || s.logoCandidates.length === 0) {
    s.logoCandidates = logoCandidatesFromUrl(s.applicationLink);
  }
  if (!s.logoUrl && s.logoCandidates.length > 0) {
    s.logoUrl = s.logoCandidates[0];
  }
});

// Helpers
export function getScholarshipStatus(deadline: string): "open" | "closing-soon" | "closed" {
  const now = new Date();
  const dl = new Date(deadline);
  if (dl < now) return "closed";
  const daysLeft = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return "closing-soon";
  return "open";
}

export function getDaysUntilDeadline(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getFieldCategories(): string[] {
  const fields = new Set<string>();
  scholarships.forEach(s => s.eligibility.fieldOfStudy.forEach(f => fields.add(f)));
  return Array.from(fields).sort();
}

export function getScholarshipCountries(): string[] {
  const countries = new Set<string>();
  scholarships.forEach(s => countries.add(s.country));
  return Array.from(countries).sort();
}

export function getScholarshipTypes(): Scholarship["type"][] {
  return ["merit", "need-based", "research", "competition", "community", "diversity"];
}

// Match score based on user profile
export function calculateMatchScore(
  scholarship: Scholarship,
  userProfile?: { country?: string; grade?: string; major?: string }
): number {
  if (!userProfile) return 0;
  let score = 0;
  let factors = 0;

  // Country match
  if (userProfile.country) {
    factors++;
    if (scholarship.country === "International" || scholarship.country === userProfile.country) score++;
  }

  // Grade match
  if (userProfile.grade) {
    factors++;
    if (scholarship.eligibility.grades.includes(userProfile.grade)) score++;
  }

  // Field/Major match
  if (userProfile.major) {
    factors++;
    const majorLower = userProfile.major.toLowerCase();
    const hasAny = scholarship.eligibility.fieldOfStudy.some(f => f === "Any");
    const hasMatch = scholarship.eligibility.fieldOfStudy.some(f =>
      majorLower.includes(f.toLowerCase()) || f.toLowerCase().includes(majorLower)
    );
    if (hasAny || hasMatch) score++;
  }

  return factors > 0 ? Math.round((score / factors) * 100) : 50;
}

/**
 * Success tips. `icon` names a component in `@/components/icons/FlatIcons`
 * rather than carrying an emoji character — emoji rendered as a different
 * drawing on every OS and looked nothing like the rest of the UI.
 */
export type ScholarshipTipIcon = "clock" | "pen" | "calendar" | "chat" | "target";

export const scholarshipTips: {
  title: string;
  description: string;
  icon: ScholarshipTipIcon;
}[] = [
  {
    title: "Start Early",
    description: "Begin your scholarship search in 9th or 10th grade. Many scholarships have early deadlines and require preparation months in advance.",
    icon: "clock",
  },
  {
    title: "Tailor Every Application",
    description: "Generic essays won't cut it. Research each organization's mission and align your narrative with their values.",
    icon: "pen",
  },
  {
    title: "Track Deadlines Religiously",
    description: "Missing a deadline by one day means missing the entire opportunity. Use a calendar system and set multiple reminders.",
    icon: "calendar",
  },
  {
    title: "Get Strong Recommendations",
    description: "Ask recommenders at least 4 weeks in advance. Provide them with your resume and the scholarship's focus areas.",
    icon: "chat",
  },
  {
    title: "Apply Broadly",
    description: "Don't just target the biggest scholarships. Smaller awards ($500–$5,000) have less competition and add up quickly.",
    icon: "target",
  },
];

// World map regions for grouping
export const regionGroups: Record<string, string[]> = {
  "North America": ["USA", "Canada"],
  "Europe": ["International"],
  "South Asia": ["India"],
  "Global": ["International"],
};
