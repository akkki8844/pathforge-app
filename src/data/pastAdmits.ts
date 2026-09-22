/**
 * Past Admits — real, publicly documented admissions outcomes.
 *
 * SOURCING RULES — read before adding an entry:
 *
 * 1. Every profile must come from reporting by a named, reputable outlet
 *    (or the student's own public record), where the student went public
 *    voluntarily. We do NOT scrape private admissions databases, forum
 *    posts, or paywalled competitor sites — those students did not consent
 *    to being republished here.
 * 2. Every factual field must be traceable to `sources`. If a number wasn't
 *    reported, leave it undefined — the UI renders "Not publicly reported"
 *    rather than us inventing a plausible-looking figure.
 * 3. SAT is stored on the current 1600 scale only. Students who sat the
 *    pre-March-2016 test were reported out of 2400; those scores are converted
 *    here and flagged with `satConverted` so the page never shows a student a
 *    number they can't compare against their own. The original figure stays in
 *    `satOriginal` for traceability against the sources.
 *
 * Verified July 2026.
 */

export interface AdmitSource {
  label: string;
  url: string;
}

export interface PastAdmit {
  id: string;
  name: string;
  highSchool: string;
  location: string;
  /** Year they applied / graduated high school. */
  gradYear: number;
  /** One-line summary of what made the outcome notable. */
  headline: string;
  /** Field they applied in — drives the major filter. */
  major: string;
  /** Country they applied from. */
  country: string;
  /** Reported background/heritage. Omit unless the sources state it. */
  ethnicity?: string;
  /** Inferred only from the pronouns reporting uses. Omit if unclear. */
  gender?: "Male" | "Female";
  gpa?: string;
  /** Always on the 1600 scale. See the header note on conversion. */
  sat?: number;
  /** True when `sat` was converted from the pre-2016 2400 scale. */
  satConverted?: boolean;
  /** The figure as originally reported, e.g. "2250 / 2400". */
  satOriginal?: string;
  act?: number;
  acceptedTo: string[];
  /** Other named schools they were reported admitted to. Named schools only. */
  alsoAccepted?: string[];
  /** Named schools that reporting says turned them down. */
  rejectedFrom?: string[];
  /**
   * Total reported acceptances, when the real figure is higher than the number
   * of schools we can name individually (e.g. "15 acceptances in total" where
   * only 9 were named). Leave undefined to just count the lists.
   */
  totalAccepted?: number;
  /** Free-text caveat about the acceptance list, e.g. unnamed extras. */
  acceptancesNote?: string;
  chose: string;
  /** Why they picked that school, where reported. */
  choiceReason?: string;
  intendedFocus?: string;
  activities: string[];
  awards?: string[];
  background?: string;
  /** What is publicly known about their application essay, if anything. */
  essayNote?: string;
  sources: AdmitSource[];
}

export const pastAdmits: PastAdmit[] = [
  {
    id: "kwasi-enin-2014",
    name: "Kwasi Enin",
    highSchool: "William Floyd High School",
    location: "Shirley, NY",
    gradYear: 2014,
    headline: "Accepted to all eight Ivy League schools — the case that started the genre.",
    major: "Engineering",
    country: "United States",
    ethnicity: "Ghanaian-American",
    gender: "Male",
    sat: 1500,
    satConverted: true,
    satOriginal: "2250 / 2400",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["Duke", "Stony Brook", "SUNY Binghamton", "SUNY Geneseo"],
    chose: "Yale",
    choiceReason:
      "Cited Yale's atmosphere, its financial aid package, and its reputation in both music and medicine.",
    intendedFocus: "Biology / neuroscience / biomedical engineering — aiming for cardiology",
    activities: ["Viola", "A cappella singing", "Track and field"],
    background:
      "First-generation son of Ghanaian immigrants; his father Ebenezer is a registered nurse. He took the SAT three times.",
    essayNote:
      "His Common App essay, \"A Life in Music,\" was published and opens: \"A wrong decision can be the beginning or end to a lifestyle.\" He wrote that \"music has become the spark of my intellectual curiosity,\" and that performing immersed him \"in the conversations between performers and the audience.\" Excerpt only — read the full essay at the source below.",
    sources: [
      {
        label: "Kwasi Enin's Common Application essay, \"A Life in Music\" (full text, PDF)",
        url: "https://akinsechs.austinschools.org/sites/akinsechs.austinschools.org/files/inline-files/EninKCommonApplicationEssay2014.pdf",
      },
      {
        label: "CBS New York — L.I. Teen Accepted To All 8 Ivy League Schools",
        url: "https://www.cbsnews.com/newyork/news/l-i-teen-kwasi-enin-accepted-to-all-8-ivy-league-schools/",
      },
      {
        label: "TIME — Kwasi Enin Picks Yale",
        url: "https://time.com/83203/kwasi-enin-ivy-league-yale/",
      },
    ],
  },
  {
    id: "harold-ekeh-2015",
    name: "Harold Ekeh",
    highSchool: "Elmont Memorial High School",
    location: "Elmont, NY",
    gradYear: 2015,
    headline: "Applied to 13 schools. Admitted to all 13, including every Ivy.",
    major: "Biological Sciences",
    country: "United States",
    ethnicity: "Nigerian-American",
    gender: "Male",
    gpa: "100.55 (weighted %)",
    sat: 1510,
    satConverted: true,
    satOriginal: "2270 / 2400",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    totalAccepted: 13,
    acceptancesNote:
      "He applied to 13 schools and was admitted to all 13. Only the eight Ivies were named individually in reporting.",
    chose: "Yale",
    intendedFocus: "Neurobiology or chemistry — aiming to become a neurosurgeon",
    activities: [
      "Class salutatorian",
      "Alzheimer's research on the school's science research team",
      "Editor-in-chief of the school newspaper",
      "Model United Nations",
      "World Language Honor Society",
      "Key Club",
      "Founded a college mentoring program at his school",
      "Directed the youth choir at his church, and played the drums",
      "Elected to the homecoming court",
    ],
    awards: [
      "2015 Intel Science Talent Search semifinalist — research on how DHA may slow Alzheimer's",
    ],
    background:
      "Born in Nigeria, moved to the U.S. at age eight. His grandmother was diagnosed with Alzheimer's when he was 11, which motivated his research.",
    essayNote:
      "He has said his main Common App essay was about the struggle to adjust after immigrating — including feeling lost in U.S. history classes.",
    sources: [
      {
        label: "CNN Money — Elmont student accepted by all 8 Ivy League schools",
        url: "https://money.cnn.com/2015/04/04/pf/college/immigrant-accepted-all-ivy-league-schools-harold-ekeh/index.html",
      },
      {
        label: "CNN Money — Teen chooses Yale",
        url: "https://money.cnn.com/2015/05/08/pf/college/accepted-all-ivy-league-schools-yale/",
      },
      {
        label: "Long Island Herald — Elmont's salutatorian picks Yale",
        url: "https://www.liherald.com/stories/elmonts-salutatorian-picks-yale,67821",
      },
    ],
  },
  {
    id: "munira-khalif-2015",
    name: "Munira Khalif",
    highSchool: "Mounds Park Academy",
    location: "St. Paul, MN",
    gradYear: 2015,
    headline: "All eight Ivies plus Stanford and Georgetown — later a U.S. Youth Observer to the UN.",
    major: "Economics",
    country: "United States",
    ethnicity: "Somali-American",
    gender: "Female",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["Stanford", "Georgetown", "University of Minnesota"],
    chose: "Harvard",
    intendedFocus: "Economics and government",
    activities: [
      "Co-founded Lighting the Way, a youth-run nonprofit expanding girls' access to education in East Africa",
      "Advisor with GirlUp (United Nations Foundation)",
      "Speech and debate team, which she credits for the public speaking",
      "Performed her own spoken-word poetry at a United Nations event for Malala Yousafzai in 2013",
      "Constitutional law project in her final year: argued a live case before a panel of practitioners at the Minnesota Supreme Court",
      "Commencement speaker",
    ],
    awards: [
      "UN Special Envoy for Global Education's Youth Courage Award (one of nine chosen worldwide)",
      "Invited twice to the White House Iftar dinner",
      "6th U.S. Youth Observer to the United Nations (2017–2018)",
    ],
    background:
      "First-generation Somali-American, born in Minneapolis in 1996. She and her siblings started the nonprofit " +
      "in her first year of high school, which is to say the thing her application was built on ran for four years " +
      "before anyone read about it.",
    sources: [
      {
        label: "NBC News — Minnesota Teen Accepted to All Eight Ivy League Schools",
        url: "https://www.nbcnews.com/news/us-news/minnesota-teen-munira-khalif-accepted-all-eight-ivy-league-schools-n338661",
      },
      {
        label: "Wikipedia — Munira Khalif",
        url: "https://en.wikipedia.org/wiki/Munira_Khalif",
      },
      {
        label: "Minnesota Monthly — 2015 Student of the Year: Munira Khalif",
        url: "https://www.minnesotamonthly.com/lifestyle/2015-student-of-the-year-munira-khalif/",
      },
      {
        label: "MPR News — One chooses Harvard, the other snubs the Ivy League",
        url: "https://www.mprnews.org/story/2015/05/18/one-chooses-harvard-the-other-snubs-the-ivy-league",
      },
    ],
  },
  {
    id: "ronald-nelson-2015",
    name: "Ronald Nelson",
    highSchool: "Houston High School",
    location: "Germantown, TN",
    gradYear: 2015,
    headline: "Turned down all eight Ivies for a full ride — the counter-example worth studying.",
    major: "Pre-Med",
    country: "United States",
    gender: "Male",
    gpa: "4.58 (weighted)",
    sat: 1510,
    satConverted: true,
    satOriginal: "2260 / 2400",
    act: 34,
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "Stanford", "Johns Hopkins", "NYU",
      "Vanderbilt", "Washington University in St. Louis", "University of Alabama",
    ],
    chose: "University of Alabama",
    choiceReason:
      "In his words: \"I chose the University of Alabama because not only was I accepted into their top honors program, the University Fellows Experience, I also received generous amounts of scholarship money.\" The Ivies offer no merit scholarships, and he wanted to preserve funds for medical school.",
    intendedFocus: "Pre-med — planned to attend medical school",
    activities: [
      "15 AP courses",
      "Senior class president",
      "Alto saxophone, at a standard recognised at state level",
      "Admitted to Alabama's University Fellows Experience honors program",
    ],
    awards: [
      "National Merit Scholar",
      "National Achievement Scholar",
    ],
    background:
      "His decision drew national attention as a challenge to the assumption that the most selective admit is " +
      "automatically the right one. The arithmetic behind it was plain: the Ivies award no merit money, and he " +
      "wanted medical school paid for.",
    sources: [
      {
        label: "Action News 5 — Houston High senior turns down Ivy League for Alabama",
        url: "https://www.actionnews5.com/story/29087604/houston-high-senior-turns-down-ivy-league-for-university-of-alabama/",
      },
      {
        label: "Good Black News — full stats and acceptance list",
        url: "https://goodblacknews.org/2015/05/14/kid-who-got-in-to-every-ivy-league-college/",
      },
    ],
  },
  {
    id: "ifeoma-white-thorpe-2017",
    name: "Ifeoma White-Thorpe",
    highSchool: "Morris Hills High School",
    location: "Rockaway, NJ",
    gradYear: 2017,
    headline: "All eight Ivies plus Stanford, on the strength of writing.",
    major: "Public Health",
    country: "United States",
    gender: "Female",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["Stanford"],
    chose: "Harvard",
    choiceReason:
      "Admitted to Harvard early action; after the rest came in she weighed financial aid packages and program fit before returning to Harvard.",
    ethnicity: "Nigerian-American",
    intendedFocus: "Global health policy — went on to study chemistry and government",
    activities: [
      "Student government president",
      "Poet and writer",
      "Near the top of her year in a full Advanced Placement course load",
    ],
    awards: [
      "First place, National Liberty Museum Selma Speech & Essay Contest ($5,000 prize)",
      "2017 Coca-Cola Scholar — one of 150 chosen from about 86,000 applicants",
    ],
    essayNote:
      "Her award-winning contest essay argued that \"education is essential for change, and I aspire to be that change\" — a theme that ran through her application.",
    sources: [
      {
        label: "CBS News — 17-year-old NJ teen accepted into all 8 Ivy League schools",
        url: "https://www.cbsnews.com/news/teen-gets-accepted-into-all-8-ivy-league-schools/",
      },
      {
        label: "Mic — Ifeoma White-Thorpe gets accepted to all the Ivies, plus Stanford",
        url: "https://www.mic.com/articles/173049/remarkable-teen-ifeoma-white-thorpe-gets-accepted-to-all-the-ivies-plus-stanford",
      },
      {
        label: "Punch (Nigeria) — Nigerian teenager admitted by eight Ivy League schools in US",
        url: "https://punchng.com/nigerian-teenager-admitted-by-eight-ivy-league-schools-in-us/",
      },
    ],
  },
  {
    id: "ashley-adirika-2022",
    name: "Ashley Adirika",
    highSchool: "Miami Beach Senior High School",
    location: "Miami Beach, FL",
    gradYear: 2022,
    headline: "Fifteen acceptances including every Ivy — built around a nonprofit she founded.",
    major: "Government",
    country: "United States",
    ethnicity: "Nigerian-American",
    gender: "Female",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    totalAccepted: 15,
    acceptancesNote:
      "Fifteen acceptances in total — the eight Ivies plus seven further universities that reporting did not name individually.",
    chose: "Harvard",
    choiceReason: "Attended on a full scholarship.",
    intendedFocus:
      "Government, then law school — with the long-term aim of working in policy rather than practising",
    activities: [
      "Founded Our Story, Our Worth in her sophomore year — a mentoring organization providing mentorship, confidence-building and sisterhood to girls and young women of color in Miami",
      "Student government president at Miami Beach Senior High School",
      "Speech and debate competitor since eighth grade, and planned to keep debating at Harvard",
      "Carried an advanced course load alongside the debate season",
    ],
    background:
      "First-generation Nigerian-American; 17 at the time of her acceptances. She credits her mother and older sisters as the reason any of it happened. A teacher, Bess Rodriguez, recruited her " +
      "onto the debate team in eighth grade at Carol City Middle School; by senior year opposing teams were " +
      "reported as saying \"Oh no, we have to debate Ashley.\"",
    essayNote:
      "Her application centered on the nonprofit she founded. The essay text itself was not published, so we don't reproduce it.",
    sources: [
      {
        label: "CNN — Ashley Adirika was accepted into all eight Ivy League universities",
        url: "https://www.cnn.com/2022/06/12/us/ashley-adirika-ivy-league-colleges-cec",
      },
      {
        label: "Local 10 News — South Florida grad honored after acceptance to all 8 Ivies",
        url: "https://www.local10.com/news/local/2022/07/19/south-florida-high-school-grad-honored-after-getting-accepted-into-all-8-ivy-league-schools/",
      },
      {
        label: "Good Morning America — Miami teen accepted into all 8 Ivy League universities",
        url: "https://www.goodmorningamerica.com/living/story/miami-teen-accepted-ivy-league-universities-85266365",
      },
    ],
  },
  {
    id: "thinh-pham-2025",
    name: "Thinh Pham",
    highSchool: "George Bush High School",
    location: "Houston, TX",
    gradYear: 2025,
    headline: "All eight Ivies and MIT — chose MIT on a full ride.",
    major: "Computer Science",
    country: "United States",
    ethnicity: "Vietnamese-American",
    gender: "Male",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["MIT", "Stanford", "Rice"],
    acceptancesNote:
      "Also reported admitted to several other universities nationally, which were not named individually.",
    chose: "MIT",
    choiceReason:
      "In his words, \"MIT has a very quirky community that I love. It's full of problem solvers, collaborators\" — plus a scholarship package reported at $2.8 million across his offers, with a full ride to MIT.",
    intendedFocus: "Computer science and engineering",
    essayNote:
      "Said: \"I want to attribute my success not only to myself, but to other people around me.\"",
    background:
      "His teacher Rebecca Darling said of him: \"He always asks more questions. He pushed me as a teacher.\"",
    activities: [
      "Valedictorian of the class of 2025",
      "Captain of the school robotics team",
      "Known by teachers for relentless questioning — one noted he \"always asks more questions\" until the answers require original research",
    ],
    awards: [
      "Yale's award for outstanding achievement in science and mathematics, given to fewer than 100 applicants a year",
    ],
    sources: [
      {
        label: "Gray News — Teenager accepted to all 8 Ivy League schools",
        url: "https://www.wsaz.com/2025/04/11/teenager-was-accepted-all-8-ivy-league-schools-he-didnt-choose-any-them/",
      },
      {
        label: "ABC — Houston teen accepted into all eight Ivy League schools, offered full ride to MIT",
        url: "https://abc7amarillo.com/news/local/houston-teen-accepted-into-all-eight-ivy-league-schools-offered-full-ride-to-mit-local-news-near-me-education-college-university-common-app-apply-texas",
      },
      {
        label: "ABC13 Houston — Bush High School student accepted to every Ivy, chooses MIT",
        url: "https://abc13.com/post/george-bush-high-school-student-thinh-pham-accepted-nations-ivy-league-schools-chooses-mit/16154882/",
      },
      {
        label: "VnExpress International — Vietnamese American student gets into all 8 Ivy League schools, but turns them down",
        url: "https://e.vnexpress.net/news/news/education/vietnamese-american-student-gets-into-all-8-ivy-league-schools-but-turn-them-down-4875332.html",
      },
    ],
  },
  {
    id: "augusta-uwamanzu-nna-2016",
    name: "Augusta Uwamanzu-Nna",
    highSchool: "Elmont Memorial High School",
    location: "Elmont, NY",
    gradYear: 2016,
    headline:
      "Second Elmont student in two years to sweep the Ivies — on the back of oil-well cement research.",
    major: "Engineering",
    country: "United States",
    ethnicity: "Nigerian-American",
    gender: "Female",
    gpa: "101.64 (weighted %)",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "Johns Hopkins", "MIT", "NYU", "Rensselaer Polytechnic Institute",
    ],
    chose: "Harvard",
    choiceReason:
      "She pointed to Harvard's \"dedication to excellence … in all students,\" and said the strength of the Black and Nigerian communities there made her feel she could realise her potential as an African-American woman.",
    intendedFocus: "A science major — she went on to take an engineering degree at Harvard",
    activities: [
      "Class valedictorian",
      "Independent materials research on cement slurries — she found that adding the nanoclay attapulgite improves the seals that keep offshore oil wells from leaking",
      "Presented her work at the White House Science Fair, where she met President Obama",
    ],
    awards: [
      "2016 Intel Science Talent Search finalist — \"Rheological Characterization of Attapulgite Nanoclay Modified Cement Slurries for Oil Well Cementing Applications\", work aimed at stopping offshore oil wells leaking",
    ],
    background:
      "Daughter of Nigerian immigrants. She followed Harold Ekeh, from the same Long Island high school, who had swept the Ivies the year before.",
    sources: [
      {
        label: "NBC News — Accepted to All 8 Ivies, Long Island Valedictorian Chooses Harvard",
        url: "https://www.nbcnews.com/feature/college-game-plan/accepted-all-8-ivies-long-island-valedictorian-chooses-harvard-n566821",
      },
      {
        label: "NBC News — How a love for cement led 17-year-old Augusta Uwamanzu-Nna to the White House",
        url: "https://www.nbcnews.com/news/nbcblk/her-love-cement-led-17-year-old-augusta-uwamanzu-nna-n555631",
      },
      {
        label: "CNN — Teen accepted to all 8 Ivy League schools decides",
        url: "https://edition.cnn.com/2016/05/02/us/ny-teen-chooses-school/index.html",
      },
    ],
  },
  {
    id: "victor-agbafe-2015",
    name: "Victor Agbafe",
    highSchool: "Cape Fear Academy",
    location: "Wilmington, NC",
    gradYear: 2015,
    headline: "Applied to 14 schools, admitted to all 14 — then chose Harvard after a campus pitch.",
    major: "Law/Pre-Law",
    country: "United States",
    ethnicity: "Nigerian-American",
    gender: "Male",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["Stanford", "Duke", "Emory"],
    totalAccepted: 14,
    acceptancesNote:
      "He applied to 14 universities and was admitted to all of them; only 11 were named individually in reporting.",
    chose: "Harvard",
    choiceReason:
      "Reporting says he was swayed by a presentation from Harvard's president and dean during the admitted-students visit.",
    intendedFocus:
      "Planned to double-major in microbiology with government or economics, aiming at neurosurgery; " +
      "he later enrolled at Michigan's medical school and Yale Law School",
    activities: [
      "Class valedictorian at Cape Fear Academy",
      "Played on the school basketball team — he was at practice when Harvard's decision arrived",
      "Member of the school's diversity club",
      "Took part in the Day of Silence, the student protest against anti-LGBTQ bullying",
    ],
    background:
      "Son of Nigerian immigrants, who he credits with the habit the family motto describes: " +
      "\"Good, better, best. Let us never rest, 'til our good is better and our better best.\" " +
      "He has since pursued an MD and a JD concurrently, which is what drew renewed coverage in 2023.",
    essayNote:
      "His application essay was about discrimination in the modern age and the duty to speak against prejudice, " +
      "drawing a line from his own experience as an African-American student to LGBTQ equality. " +
      "The full text was not published, so it is not reproduced here.",
    sources: [
      {
        label: "WNYC — The Path to Success: How One Student Got Accepted to all 8 Ivy League Schools",
        url: "https://wnyc.org/story/accepted-all-8-ivy-league-schools-victor-agbafe/",
      },
      {
        label: "Business Insider — Student who got into all 8 Ivy League schools shares 4 keys to success",
        url: "https://www.businessinsider.in/High-school-student-who-just-got-into-all-8-Ivy-League-schools-shares-4-keys-to-success/articleshow/46881008.cms",
      },
      {
        label: "WMBF News — NC student accepted to all eight Ivy League schools graduates from Harvard",
        url: "https://www.wmbfnews.com/2019/05/30/i-feel-like-luckiest-man-world-nc-student-accepted-all-eight-ivy-league-schools-graduates-harvard/",
      },
      {
        label: "GBH News — How Victor Agbafe's immigrant parents taught him the lessons to get into all eight Ivies",
        url: "https://www.wgbh.org/news/2015-05-23/how-victor-agbafes-immigrant-parents-taught-him-the-lessons-to-get-into-all-eight-ivies",
      },
      {
        label: "WECT — Wilmington senior accepted to all Ivy League schools",
        url: "https://www.wect.com/story/28733797/wilmington-senior-accepted-to-all-ivy-league-schools/",
      },
    ],
  },
  {
    id: "pooja-chandrashekar-2015",
    name: "Pooja Chandrashekar",
    highSchool: "Thomas Jefferson High School for Science and Technology",
    location: "Alexandria, VA",
    gradYear: 2015,
    headline: "Fourteen applications, fourteen acceptances — built around a nonprofit for girls in CS.",
    major: "Biomedical Engineering",
    country: "United States",
    ethnicity: "Indian-American",
    gender: "Female",
    gpa: "4.57",
    sat: 1590,
    satConverted: true,
    satOriginal: "2390 / 2400",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "MIT", "Stanford", "Duke", "Georgia Tech",
      "University of Virginia", "University of Michigan",
    ],
    totalAccepted: 14,
    chose: "Harvard",
    choiceReason:
      "Reporting says the final decision came down to Stanford versus Harvard.",
    intendedFocus: "Biomedical engineering, global health and health policy",
    activities: [
      "Founder and CEO of ProjectCSGIRLS, a nonprofit running a national computer-science competition for middle-school girls",
      "Built a mobile app that analyses a person's speech and predicts Parkinson's disease, reported at 96% accuracy",
      "Worked at the MITRE Corporation alongside professional engineers on a new method of diagnosing concussions",
      "Sat 13 Advanced Placement exams, passing all of them",
    ],
    background:
      "Both her parents are engineers, and reporting says they were more excited about the acceptances than she was. " +
      "She narrowed the decision to Harvard, Stanford and Brown before choosing Harvard, and later received a " +
      "Paul & Daisy Soros Fellowship for New Americans. Her advice to the reporters who asked: " +
      "\"Do what you love and try to excel in it\" " +
      "— while remembering to have fun in the middle of the work.",
    sources: [
      {
        label: "The Washington Post — Accepted to all eight Ivies, Virginia student makes her decision: Harvard",
        url: "https://www.washingtonpost.com/local/education/accepted-to-all-eight-ivies-virginia-student-makes-her-decision-harvard/2015/05/04/e6457454-f25f-11e4-b2f3-af5479e6bbdd_story.html",
      },
      {
        label: "Harvard SEAS — Cultivating STEM success",
        url: "https://www.seas.harvard.edu/news/2017/11/cultivating-stem-success",
      },
      {
        label: "WTOP — Local girl gets into 8 Ivy League schools",
        url: "https://wtop.com/loudoun-county/2015/04/hold-fri-local-girl-gets-8-ivy-league-schools/",
      },
    ],
  },
  {
    id: "cassandra-hsiao-2017",
    name: "Cassandra Hsiao",
    highSchool: "Orange County School of the Arts",
    location: "Walnut, CA",
    gradYear: 2017,
    headline: "Swept the Ivies with an essay about her mother's English — and chose theatre.",
    major: "Drama/Theater",
    country: "United States",
    ethnicity: "Malaysian-Taiwanese American",
    gender: "Female",
    gpa: "4.67 (weighted)",
    sat: 1540,
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    chose: "Yale",
    choiceReason:
      "She picked Yale to study writing for theatre, planning to work on playwriting before a career in the arts in Los Angeles or New York.",
    intendedFocus: "Theatre and playwriting — with an interest in Asian representation on stage and in Hollywood",
    activities: [
      "Creative Writing conservatory student at OCSA",
      "Editor-in-chief of the school magazine and editor of the literary magazine Inkblot",
      "One of two student body presidents",
      "Working entertainment journalist and film critic while still in high school",
    ],
    awards: [
      "Winner, California Young Playwrights Contest (2016)",
      "Scholastic Art & Writing Awards recognition",
      "National Student Poets Program recognition",
    ],
    background:
      "Born in Johor Bahru, Malaysia to a Taiwanese father and Malaysian mother; moved to the United States at about five.",
    essayNote:
      "Her Common App essay about growing up bilingual was published and went viral. It opens: \"In our house, English is not English. Not in the phonetic sense, like short a is for apple, but rather in the pronunciation — in our house, snake is snack.\" She also wrote: \"My mother asked me to teach her proper English so old white ladies at Target wouldn't laugh at her pronunciation… As my mother's vocabulary began to grow, I mended my own English.\"",
    sources: [
      {
        label: "Malay Mail — Malaysia-born picks Yale out of eight Ivy League offers",
        url: "https://www.malaymail.com/news/malaysia/2017/05/01/malaysia-born-picks-yale-out-of-eight-ivy-league-offers/1367541",
      },
      {
        label: "South China Morning Post — The Malaysian-Taiwanese teen who cracked every Ivy League school",
        url: "https://www.scmp.com/week-asia/society/article/2087046/malaysian-taiwanese-teen-who-cracked-every-ivy-league-school-wants",
      },
      {
        label: "Good Morning America / ABC News — 8 Ivy Leagues accept 1st-generation immigrant with exceptional writing talent",
        url: "https://www.goodmorningamerica.com/news/story/ivy-leagues-accept-generation-immigrant-exceptional-writing-talent-46629177",
      },
      {
        label: "NBC Los Angeles — First-Generation Immigrant Teen From LA Accepted to All Ivy League Schools",
        url: "https://www.nbclosangeles.com/news/local/ivy-league-los-angeles-girl-teen-accepted-all-immigrant-walnut/11506/",
      },
    ],
  },
  {
    id: "micheal-brown-2018",
    name: "Micheal Brown",
    highSchool: "Lamar High School",
    location: "Houston, TX",
    gradYear: 2018,
    headline: "Applied to 20 top colleges. Got in — with a full ride — to all 20.",
    major: "Political Science",
    country: "United States",
    gender: "Male",
    gpa: "4.68 (weighted)",
    acceptedTo: [
      "Stanford", "Harvard", "Yale", "Princeton",
      "Northwestern", "University of Texas at Austin",
    ],
    totalAccepted: 20,
    acceptancesNote:
      "Twenty applications, twenty acceptances, each with a full-ride offer; reporting named six of the twenty individually. He was reported to have won roughly $260,000 in outside scholarships on top of that.",
    chose: "Stanford",
    choiceReason: "Stanford was his stated dream school; his reaction to the acceptance went viral.",
    intendedFocus:
      "Political science, aiming at law or politics — he graduated from Stanford in 2023 with honours in African and African American Studies and a political science minor",
    activities: [
      "IB Diploma programme at Lamar High School",
      "Joined Houston ISD's EMERGE college-access programme as a sophomore",
      "Lamar's varsity debate team",
      "Key Club",
      "Young Democrats",
      "100 Black Men of Houston",
      "Worked on Mayor Sylvester Turner's election campaign",
    ],
    background:
      "From Houston's Third Ward. His story was later used on college-access billboards across Houston.",
    sources: [
      {
        label: "Forbes — How A Houston High Schooler Won $260,000 In Scholarships And Swept Admissions At 20 Top Colleges",
        url: "https://www.forbes.com/sites/susanadams/2018/04/18/how-a-houston-high-schooler-won-260000-in-scholarships-and-swept-admissions-at-20-top-colleges/",
      },
      {
        label: "CNN — He applied to 20 of the best colleges and got a full ride to all of them",
        url: "https://www.cnn.com/2018/03/30/health/teen-college-20-acceptances-trnd/index.html",
      },
      {
        label: "Houston Public Media — Houston Teen Accepted to 20 Colleges, Gets Full Rides To Each",
        url: "https://www.houstonpublicmedia.org/articles/news/2018/04/02/276362/third-ward-teen-accepted-to-20-colleges-gets-full-rides-to-each/",
      },
      {
        label: "KHOU — Third Ward teen offered full ride to 20 universities, including four Ivy Leagues",
        url: "https://www.khou.com/article/news/third-ward-teen-offered-full-ride-to-20-universities-including-four-ivy-leagues/285-533417660",
      },
    ],
  },
  {
    id: "ahmed-muhammad-2021",
    name: "Ahmed Muhammad",
    highSchool: "Oakland Technical High School",
    location: "Oakland, CA",
    gradYear: 2021,
    headline: "First Black male valedictorian in his school's 107-year history — 11 applications, 11 acceptances.",
    major: "Engineering",
    country: "United States",
    gender: "Male",
    gpa: "4.73 (weighted)",
    acceptedTo: [
      "Stanford", "Harvard", "Princeton", "Columbia",
      "USC", "Howard",
    ],
    totalAccepted: 11,
    acceptancesNote:
      "Eleven applications, eleven acceptances. The other five were University of California campuses, which reporting did not always name individually.",
    chose: "Stanford",
    intendedFocus: "Engineering — he said he wanted to explore several disciplines before committing",
    activities: [
      "Co-founded Kits Cubed, a nonprofit making cheap DIY science kits from household items for Oakland schoolchildren",
      "Varsity basketball",
      "Volunteer tutor",
      "Oakland Youth Advisory Commission",
      "13 AP classes plus community-college courses",
    ],
    awards: [
      "First Black male valedictorian at Oakland Tech in the school's 107-year history",
    ],
    background:
      "First in his family to attend college. On juggling commitments: \"All the stuff that I do is stuff that I love, so it doesn't feel like a chore.\"",
    sources: [
      {
        label: "Good Morning America / ABC News — Student is 1st Black male valedictorian in school's history",
        url: "https://www.goodmorningamerica.com/living/story/student-1st-black-male-valedictorian-schools-106-year-77515048",
      },
      {
        label: "CBS San Francisco — Ahmed Muhammad Becomes First Black Male Valedictorian In Oakland Tech's 107-Year History",
        url: "https://www.cbsnews.com/sanfrancisco/news/ahmed-muhammad-first-black-male-valedictorian-oakland-tech/",
      },
      {
        label: "KTVU FOX 2 — Oakland Technical High's first Black male valedictorian reveals his college decision",
        url: "https://www.ktvu.com/news/oakland-technical-highs-first-black-male-valedictorian-reveals-his-college-decision-on-ktvu",
      },
    ],
  },
  {
    id: "malena-galletto-2024",
    name: "Malena Galletto",
    highSchool: "The Bronx High School of Science",
    location: "Bronx, NY",
    gradYear: 2024,
    headline: "Applied to 28 colleges. Got into all 28, including every Ivy.",
    major: "Political Science",
    country: "United States",
    gender: "Female",
    gpa: "97 (unweighted %)",
    sat: 1560,
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "University of Michigan", "NYU", "Boston University",
      "Georgetown", "Barnard", "Vassar", "University at Albany",
    ],
    totalAccepted: 28,
    acceptancesNote:
      "She applied to 28 colleges and was admitted to all 28; reporting named 15 of them individually.",
    chose: "Harvard",
    choiceReason: "In her words: \"Deep down, it was always Harvard for me.\"",
    intendedFocus: "A double major in government and physics",
    activities: [
      "Captain of the Speech and Debate Club",
      "Founded the Gender Equity Board, a student group working on misogyny in STEM classrooms",
      "Senior Council secretary",
      "Student Diversity Committee",
      "11 AP classes, across European and US history, art history, English language and literature, Latin, Spanish literature, physics, economics, calculus and comparative government",
      "Dances and teaches in New York's tango community, which is her parents' work",
    ],
    background:
      "First-generation college student. Her parents emigrated from Argentina to Washington Heights in 2000 and teach tango.",
    essayNote:
      "She has said she spent roughly 200 hours writing about 70 supplemental essays across her 28 applications, and used College Board fee waivers to cover application fees of $50–$85 each.",
    sources: [
      {
        label: "The Science Survey (Bronx Science student newspaper) — Living the Dream: Malena Galletto '24",
        url: "https://thesciencesurvey.com/spotlight/2024/07/10/living-the-dream-malena-galletto-24-was-accepted-into-all-eight-ivy-league-schools/",
      },
      {
        label: "New York Daily News (via Yahoo News) — Bronx Science graduate accepted into all 28 colleges she applied to",
        url: "https://www.yahoo.com/news/bronx-science-hs-graduate-accepted-150008531.html",
      },
    ],
  },
  {
    id: "dylan-chidick-2019",
    name: "Dylan Chidick",
    highSchool: "Henry Snyder High School",
    location: "Jersey City, NJ",
    gradYear: 2019,
    headline: "Seventeen acceptances after years in and out of homelessness — and he picked the state school.",
    major: "Political Science",
    country: "United States",
    gender: "Male",
    acceptedTo: ["The College of New Jersey"],
    alsoAccepted: ["Albright College", "Ramapo College", "Caldwell University"],
    totalAccepted: 17,
    acceptancesNote:
      "Seventeen acceptances in total; reporting named four of them, and focused on The College of New Jersey, his top choice.",
    chose: "The College of New Jersey",
    choiceReason:
      "TCNJ was his stated top choice; staff surprised him at school with the acceptance letter after a long wait.",
    activities: [
      "Senior class president",
      "National Honor Society",
      "Jersey City's city-wide student council",
      "In his own description, tried to \"float around\" every club the school had",
    ],
    intendedFocus: "Political science, with a history minor",
    background:
      "Born in Trinidad and came to the U.S. at seven. His family moved in and out of homelessness while his twin younger brothers were treated for serious heart defects; a local nonprofit, Women Rising, eventually placed them in permanent supportive housing. He is the first in his family to go to college.",
    sources: [
      {
        label: "Good Morning America / ABC News — Teen gets accepted to 17 colleges after overcoming homelessness",
        url: "https://www.goodmorningamerica.com/living/story/teen-accepted-17-colleges-overcoming-homelessness-61679226",
      },
      {
        label: "CBS News — New Jersey teen gets 17 college acceptance letters, overcomes homelessness",
        url: "https://www.cbsnews.com/news/new-jersey-teen-college-acceptance-homelessness-dylan-chidick/",
      },
      {
        label: "NBC News — N.J. teen overcomes homelessness, gets accepted to 17 colleges",
        url: "https://www.nbcnews.com/news/us-news/n-j-teen-overcomes-homelessness-gets-accepted-17-college-n983476",
      },
    ],
  },
  {
    id: "victory-yinka-banjo-2021",
    name: "Victory Yinka-Banjo",
    highSchool: "Lagos, Nigeria (secondary school; Cambridge IGCSE curriculum)",
    location: "Lagos, Nigeria",
    gradYear: 2021,
    headline: "Nineteen full scholarship offers across the US and Canada, worth over $5 million.",
    major: "Biochemistry",
    country: "Nigeria",
    gender: "Female",
    sat: 1540,
    acceptedTo: [
      "MIT", "Harvard", "Yale", "Princeton", "Brown",
      "Stanford", "Johns Hopkins", "University of Virginia",
      "University of Toronto", "University of British Columbia",
    ],
    totalAccepted: 19,
    acceptancesNote:
      "Nineteen offers in total, all with full scholarships, together worth more than $5 million; reporting named ten individually. Toronto's came via the Lester B. Pearson scholarship and UBC's via the Karen McKellin International Leader of Tomorrow award.",
    chose: "MIT",
    intendedFocus: "Computational biology — she graduated from MIT in molecular and computational biology",
    activities: [
      "Tutored university-admission candidates on the radio in mathematics, English, biology, chemistry and physics",
    ],
    awards: [
      "Rated \"Top in the World\" for English as a Second Language (speaking endorsement) by Cambridge International Examinations",
      "A* in all six Cambridge IGCSE subjects",
      "A1 in all nine WASSCE subjects",
    ],
    background:
      "Daughter of Chika Yinka-Banjo, a senior lecturer at the University of Lagos, and Adeyinka Banjo, a procurement and supply-chain executive.",
    sources: [
      {
        label: "CNN — Victory Yinka-Banjo gets 19 scholarship offers from US and Canadian universities",
        url: "https://www.cnn.com/2021/04/30/africa/nigerian-teen-19-scholarships-intl",
      },
      {
        label: "P.M. News Nigeria — Nigerian teen gets scholarship offers from 19 top U.S. universities",
        url: "https://pmnewsnigeria.com/2021/04/30/nigerian-teen-victory-yinka-banjo-gets-scholarship-offers-from-19-top-u-s-universities/",
      },
      {
        label: "AfroTech — Nigerian teen earns 19 full-ride scholarships worth over $5M",
        url: "https://afrotech.com/victory-yinka-banjo-earns-19-scholarship-offers-5m",
      },
    ],
  },
  {
    id: "malvika-raj-joshi-2016",
    name: "Malvika Raj Joshi",
    highSchool: "Unschooled — no formal secondary schooling after age 12",
    location: "Mumbai, India",
    gradYear: 2016,
    headline: "No Class X or XII certificate. Admitted to MIT on three Informatics Olympiad medals.",
    major: "Computer Science",
    country: "India",
    gender: "Female",
    acceptedTo: ["MIT"],
    chose: "MIT",
    choiceReason:
      "Without Indian board certificates she was ineligible for the IITs; MIT admits International Olympiad medallists regardless of formal schooling, and offered her a scholarship.",
    intendedFocus: "Computer science and mathematics",
    activities: [
      "Left formal school at 12 and studied independently",
      "Spent three years at the Chennai Mathematical Institute building the maths and algorithms background for Olympiad work",
      "In India's four-person International Olympiad in Informatics team three years running",
      "Trained by the national coordinator of the Indian Computing Olympiad",
    ],
    awards: [
      "Silver at the International Olympiad in Informatics in 2014 (rank 34), 2015 (rank 28) and 2016 (rank 111), per the IOI's own results",
    ],
    background:
      "Her mother took her out of conventional schooling in Class 7; CMI admitted her on the strength of her " +
      "mathematics despite her lacking board certificates. An assistant director of admission at MIT emailed her " +
      "and told her to apply. Press reports described her medals as two silver and a bronze; the IOI's own " +
      "results record three silvers, which is what is listed above.",
    sources: [
      {
        label: "The Better India — 17-year-old home-schooled Mumbai girl Malvika Joshi gets scholarship to MIT",
        url: "https://thebetterindia.com/66709/malvika-joshi-homeschooling-mit/",
      },
      {
        label: "Onmanorama — 17-year-old 'unschooled' Malvika Joshi makes it to MIT",
        url: "https://www.onmanorama.com/news/nation/17-year-old-unschooled-malvika-joshi-makes-it-to-mit.html",
      },
      {
        label: "YourStory — Ineligible for IIT, 17-year-old 'unschooled' Malvika Joshi",
        url: "https://yourstory.com/2016/08/malvika-raj-joshi",
      },
      {
        label: "International Olympiad in Informatics — official results for India",
        url: "https://stats.ioinformatics.org/results/IND",
      },
    ],
  },
  {
    id: "jamaal-willis-2021",
    name: "Jamaal Willis",
    highSchool: "Barstow High School",
    location: "Barstow, CA",
    gradYear: 2021,
    headline: "Sixteen acceptances, two rejections, four waitlists — a full outcome sheet, publicly reported.",
    major: "Political Science",
    country: "United States",
    ethnicity: "Jamaican-American",
    gender: "Male",
    acceptedTo: [
      "Harvard", "Stanford", "Princeton", "Columbia", "Penn",
      "Dartmouth", "Cornell", "Duke", "Georgetown", "UCLA",
      "UC Berkeley", "UC San Diego", "University of Virginia",
      "Chapman University", "University of Oregon", "Penn State",
    ],
    rejectedFrom: ["NYU", "Northwestern"],
    acceptancesNote:
      "He was also waitlisted at Yale, Brown, the University of Chicago and UC Irvine. Most of his acceptances came with near-full-ride offers.",
    chose: "Harvard",
    intendedFocus:
      "Government — he went on to concentrate in government and African and African American Studies, aiming at civil rights litigation and elected office",
    activities: [
      "Associated Student Body president",
      "President of his California Scholarship Federation chapter",
      "Captain of the mock trial team",
      "Varsity captain in track and field, and a varsity footballer",
      "Organiser with the ACLU and the NAACP",
      "Staff member for Hugh O'Brian Youth Leadership",
      "Volunteered at the Barstow library, the Veterans Home of California, and with Student Voices / R.E.A.C.H.",
      "AP coursework",
    ],
    awards: [
      "AP Scholar Award",
      "Rotary Youth Leadership Award",
      "Certificate of Commendation from the California State Assembly",
      "South Region finalist, California Scholarship Federation Seymour Award",
    ],
    background:
      "Born in Kingston, Jamaica and moved to the U.S. four years before applying; from a low-income household. In his words: \"I was just taught at a young age by my mom and grandma that education is the key to success.\"",
    sources: [
      {
        label: "ABC7 Los Angeles — Barstow High School senior Jamaal Willis accepted to 6 Ivy League universities",
        url: "https://abc7.com/post/harvard-barstow-high-school-senior-jamaal-willis-ivy-league-schools/10550122/",
      },
      {
        label: "Jamaica Observer — Jamaican-born teen gets scholarship to 6 Ivy League universities",
        url: "https://www.jamaicaobserver.com/latest-news/jamaican-born-teen-gets-scholarship-to-6-ivy-league-universities/",
      },
      {
        label: "Radcliffe Institute, Harvard — Student Spotlight: Jamaal (Jama) Willis '25",
        url: "https://www.radcliffe.harvard.edu/news-and-ideas/jamaal-jama-willis",
      },
    ],
  },
  {
    id: "kyle-lambert-2020",
    name: "Kyle Lambert",
    highSchool: "Ardenne High School",
    location: "Kingston, Jamaica",
    gradYear: 2020,
    headline: "Six Ivy League offers from Jamaica — and he took Stanford instead.",
    major: "Neuroscience",
    country: "Jamaica",
    gender: "Male",
    acceptedTo: [
      "Yale", "Columbia", "Dartmouth", "Penn", "Brown", "Cornell", "Stanford",
    ],
    chose: "Stanford",
    intendedFocus: "A double major in neuroscience and global health",
    activities: [
      "Founded Med For All Global in 2018, a student organization on medical inequality in underserved communities and developing countries",
      "Completed Harvard's free online courses in global public health",
      "Trained in Mental Health First Aid",
      "Earlier schooling at Columbus Preparatory School, St Ann's Bay",
    ],
    background:
      "He moved from Jamaica to the United States in 2017 and is the first in his family to attend a four-year " +
      "college. He wants to practise medicine and be, in his words, \"a force of change for medically underserved " +
      "communities worldwide.\"",
    sources: [
      {
        label: "Jamaica Star — Jamaica-born teen accepted by six Ivy League schools",
        url: "http://jamaica-star.com/article/news/20200331/jamaica-born-teen-accepted-six-ivy-league-schools",
      },
      {
        label: "Stabroek News — Jamaica-born teen accepted by six US Ivy League schools",
        url: "https://www.stabroeknews.com/2020/03/31/news/regional/jamaica/jamaica-born-teen-accepted-by-six-us-ivy-league-schools/",
      },
      {
        label: "The Stanford Daily — Kyle Lambert '24 takes on global medical inequalities",
        url: "https://stanforddaily.com/kyle-lambert-24-takes-on-global-medical-inequalities-anti-blackness-during-quarantine/",
      },
    ],
  },
  {
    id: "daya-brown-2023",
    name: "Daya Brown",
    highSchool: "Westlake High School",
    location: "Atlanta, GA",
    gradYear: 2023,
    headline: "Over 50 acceptances and $1.3m in scholarships — for film and media, not STEM.",
    major: "Film/Television",
    country: "United States",
    gender: "Female",
    totalAccepted: 54,
    acceptedTo: ["Duke"],
    alsoAccepted: [
      "Spelman College", "University of Maryland", "Louisiana State University",
      "Loyola University Chicago", "Ohio University", "Virginia State University",
    ],
    acceptancesNote:
      "She applied to 70 colleges and was admitted to 54, with more than $1.3 million in scholarship offers " +
      "between them; seven were named individually in reporting.",
    chose: "Duke",
    choiceReason:
      "She described \"a sense of home\" on campus and a welcoming community of Black students with similar ambitions.",
    intendedFocus: "Visual media studies with a journalism minor",
    activities: [
      "Student council president for all four years of high school",
      "Founded Elom & Co. Productions, a production company focused on emerging creators",
      "Started The Scholar Social, a nonprofit podcast",
      "Harvard Diversity Project",
      "Poetry, spoken word and film production",
      "Three hours a day for four months on the applications themselves",
    ],
    awards: [
      "Finalist for The Gates Scholarship, awarded to 300 students a year",
    ],
    background:
      "She began working on applications in her sophomore year during the pandemic, curating a list of schools strong in mass communications and film and spending a few hours a day on them.",
    sources: [
      {
        label: "Good Morning America / ABC News — Teen accepted to more than 50 colleges, receives over $1.3 million in scholarships",
        url: "https://www.goodmorningamerica.com/living/story/teen-accepted-50-colleges-receives-13-million-scholarships-97722969",
      },
      {
        label: "The Washington Post — She was accepted by 54 colleges and got $1.3 million in scholarship offers",
        url: "https://www.washingtonpost.com/lifestyle/2023/03/24/college-application-acceptance-daya-brown/",
      },
      {
        label: "WRAL — Accepted to over 50 colleges, teen chooses Duke University",
        url: "https://www.wral.com/archive/20790582/",
      },
    ],
  },
  {
    id: "dennis-maliq-barnes-2023",
    name: "Dennis Maliq Barnes",
    highSchool: "International High School of New Orleans",
    location: "New Orleans, LA",
    gradYear: 2023,
    headline: "Graduated two years early at 16 with 180 acceptances and a Guinness-record scholarship haul.",
    major: "Computer Science",
    country: "United States",
    gender: "Male",
    gpa: "4.98 (weighted)",
    acceptedTo: ["Cornell"],
    totalAccepted: 180,
    acceptancesNote:
      "He applied to roughly 200 schools and was admitted to about 180, with scholarship offers reported at more than $10 million — reported as breaking the Guinness World Record previously held by another Louisiana student. Cornell, the school he chose, was the one consistently named.",
    chose: "Cornell",
    intendedFocus: "Computer science",
    activities: [
      "Leadership roles in the National Honor Society",
      "Enrolled concurrently at Southern University at New Orleans for two years, earning college credit",
      "Finished high school in two years rather than four",
      "Applied to around 200 universities, starting in August of his final year",
    ],
    awards: [
      "Formal certification of Spanish fluency from the Instituto Cervantes",
    ],
    background:
      "He graduated two years early, at 16, and said he began applying in August 2022 with no intention of setting " +
      "a record. Afterwards the mayor of New Orleans issued a proclamation in his name and Representative Troy " +
      "Carter offered him an internship in his Washington office.",
    sources: [
      {
        label: "CNN — Louisiana teen offered admission at more than 170 colleges and $9 million in scholarships",
        url: "https://www.cnn.com/2023/04/27/us/louisiana-teen-gets-over-170-college-offers-reaj",
      },
      {
        label: "NOLA.com / The Times-Picayune — New Orleans senior with $10M in scholarships chooses Cornell",
        url: "https://www.nola.com/news/education/new-orleans-senior-with-185-college-offers-chooses-cornell/article_cdde034c-eb56-11ed-9f33-2f84c4544752.html",
      },
      {
        label: "ABC News — High school senior accepted into 180 colleges, awarded $9 million in scholarships",
        url: "https://abcnews.com/GMA/Living/high-school-senior-accepted-180-colleges-awarded-9/story?id=98827121",
      },
    ],
  },
  {
    id: "makenzie-thompson-2022",
    name: "Makenzie Thompson",
    highSchool: "Westlake High School",
    location: "Atlanta, GA",
    gradYear: 2022,
    headline: "Applied to 51 schools, got 49 — and chose an HBCU to become a vet.",
    major: "Veterinary Science/Animal Science",
    country: "United States",
    gender: "Female",
    acceptedTo: [
      "Tuskegee University", "Delaware State University",
      "Xavier University of Louisiana", "Wingate University",
      "University of Georgia", "Ohio State University", "Purdue University",
    ],
    totalAccepted: 49,
    acceptancesNote:
      "She applied to 51 universities — collecting application fee waivers at college fairs — and was admitted to 49, with scholarship offers totalling more than $1.3 million. Seven were named individually.",
    chose: "Tuskegee University",
    choiceReason:
      "Tuskegee is the historically Black university best known for training Black veterinarians, which is the career she is aiming at.",
    intendedFocus: "Animal science, on the way to veterinary medicine",
    activities: [
      "Senior class president",
      "Captain of the dance team",
      "Vice-president of the Beta Club",
      "Manager of the baseball team",
      "National Honor Society",
      "National Honor Society for Dance Arts",
      "Work-based learning placement and volunteering at a veterinary clinic",
      "Collected application fee waivers at college fairs, which is how she could apply to 51 schools",
    ],
    sources: [
      {
        label: "WSB-TV Channel 2 Atlanta — Teen gets accepted into nearly 50 colleges, offered more than $1 million in scholarships",
        url: "https://www.wsbtv.com/news/local/teen-gets-accepted-into-nearly-50-colleges-offered-more-than-1-million-scholarships/LFDA3OFFQJA6DHYEFHH7Q34XBI/",
      },
      {
        label: "EBONY — A Georgia teen has been accepted to almost 50 colleges",
        url: "https://www.ebony.com/georgia-teen-has-been-accepted-to-almost-50-colleges/",
      },
      {
        label: "BET — Black teenager receives $1.3 million in college scholarships",
        url: "https://www.bet.com/article/wjonx7/atlanta-teen-makenzie-thompson-50-colleges-1-million-scholarships",
      },
    ],
  },
  {
    id: "shanya-robinson-owens-2021",
    name: "Shanya Robinson-Owens",
    highSchool: "George Washington Carver High School of Engineering and Science",
    location: "Philadelphia, PA",
    gradYear: 2021,
    headline: "Eighteen acceptances and $1,074,260 in scholarships — she picked an HBCU in Atlanta.",
    major: "Psychology",
    country: "United States",
    gender: "Female",
    gpa: "3.2",
    acceptedTo: ["Clark Atlanta University"],
    alsoAccepted: [
      "Temple University", "La Salle University", "Moravian College",
      "Lincoln University", "Cabrini University",
    ],
    totalAccepted: 18,
    acceptancesNote:
      "She applied to between 25 and 30 schools and was admitted to 18, with scholarship offers totalling $1,074,260. Clark Atlanta, her choice, was the one consistently named.",
    chose: "Clark Atlanta University",
    choiceReason:
      "She wanted an HBCU and wanted to be in Atlanta; Clark Atlanta felt like the right distance from home in Philadelphia.",
    intendedFocus: "Psychology",
    activities: [
      "Robotics",
      "Journalism",
      "Studied Chinese, and helped her Chinese teacher mark papers",
      "Applied to between 25 and 30 colleges",
    ],
    background:
      "From West Philadelphia. Chemistry and physics were her strongest subjects, and her family tracked the " +
      "acceptances as they arrived under the hashtag #KeepingUpWithNya.",
    sources: [
      {
        label: "CNN — This teen was offered over $1 million in scholarships when she applied to colleges",
        url: "https://www.cnn.com/2021/03/06/us/teen-one-million-in-scholarships-trnd/index.html",
      },
      {
        label: "Good Morning America / ABC News — Teen awarded over $1 million in scholarships from 18 colleges",
        url: "https://www.goodmorningamerica.com/living/story/teen-awarded-million-scholarships-18-colleges-76186041",
      },
      {
        label: "FOX 29 Philadelphia — Philadelphia student who received more than $1 million in scholarships selects her school",
        url: "https://www.fox29.com/news/philadelphia-student-who-received-more-than-1-million-dollars-in-scholarships-selects-her-school",
      },
    ],
  },
  {
    id: "verda-tetteh-2021",
    name: "Verda Tetteh",
    highSchool: "Fitchburg High School",
    location: "Fitchburg, MA",
    gradYear: 2021,
    headline: "Harvard-bound — then gave her $40,000 school scholarship away at graduation.",
    major: "Chemistry",
    country: "United States",
    ethnicity: "Ghanaian-American",
    gender: "Female",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Chemistry on a pre-med track",
    activities: [
      "Straight-A student at Fitchburg High School",
      "Class speaker at her graduation — which is how she came to be at the lectern when she gave the award away",
    ],
    awards: [
      "Fitchburg High School's General Excellence award — $10,000 a year for four years",
      "Christian A. Herter Memorial Scholarship, covering up to half of calculated need at any U.S. college",
    ],
    background:
      "Her mother brought her from Ghana as a child and worked 80-hour weeks; she earned her own bachelor's degree from a community college at 47. At graduation Verda returned to the podium minutes after accepting the $40,000 award and asked that it go to a student headed to community college instead: \"It is such a great honor, but I also know that I am not the most in need of it.\"",
    sources: [
      {
        label: "The Boston Globe — Fitchburg High graduate asks school to award $40,000 scholarship to another student",
        url: "https://www.bostonglobe.com/2021/06/08/metro/fitchburg-high-graduate-asks-school-award-40000-scholarship-another-student/",
      },
      {
        label: "The Washington Post — Harvard-bound Verda Tetteh asks Fitchburg High School to give her $40,000 award to someone else",
        url: "https://www.washingtonpost.com/education/2021/06/08/verda-tetteh-scholarship-graduation/",
      },
      {
        label: "WBUR Here & Now — She won a $40,000 scholarship. 10 minutes later, she donated it",
        url: "https://www.wbur.org/hereandnow/2021/06/15/verda-tetteh-scholarship",
      },
    ],
  },
  {
    id: "viraj-dhanda-2025",
    name: "Viraj Dhanda",
    highSchool: "Brookline, Massachusetts public schools",
    location: "Brookline, MA",
    gradYear: 2025,
    headline: "MIT's first non-speaking autistic undergraduate, admitted on the strength of his maths.",
    major: "Mathematics",
    country: "United States",
    gender: "Male",
    act: 35,
    acceptedTo: ["MIT"],
    chose: "MIT",
    choiceReason: "He deferred a year and starts at MIT in autumn 2026, moving to Cambridge with his father.",
    intendedFocus: "Mathematics — calculus is his strongest subject",
    activities: [
      "Writing a memoir, Twice Exceptional, with his father — described as \"a guide for parents, educators, and health care professionals that outlines how non-speaking autistics can realize their full potential\"",
      "Writes poetry and essays about the inner life of non-speaking autistic people",
      "Worked through college-level mathematics at Fusion Academy in Newton, one-to-one, once he was re-assessed",
      "Celebrity ambassador for the Neurodiversity Alliance",
    ],
    background:
      "Diagnosed with autism at two and assessed for years as intellectually disabled. He is non-speaking and has apraxia; he began communicating at about ten and now types roughly 8–10 words a minute on a tablet using only his right thumb. Reporting notes his ACT score of 35 out of 36 is on the mathematics section specifically.",
    sources: [
      {
        label: "The Boston Globe — Against the odds, nonverbal autistic Brookline teen gets accepted into MIT",
        url: "https://www.bostonglobe.com/2025/06/18/metro/nonverbal-autistic-student-mit/",
      },
      {
        label: "CBS Boston — Brookline teen with autism accepted to MIT",
        url: "https://www.cbsnews.com/boston/news/brookline-teen-autism-viraj-dhanda-mit",
      },
      {
        label: "WBUR Here & Now — Non-speaking teen with autism accepted at MIT",
        url: "https://www.wbur.org/hereandnow/2025/08/26/mit-non-verbal-autism-student",
      },
    ],
  },
  {
    id: "emily-hunter-2025",
    name: "Emily Hunter",
    highSchool: "St. Michael Catholic High School",
    location: "Niagara Falls, Ontario",
    gradYear: 2025,
    headline: "One of 938 early-action admits worldwide — applying from a Canadian Catholic high school.",
    major: "Biology/Pre-Med",
    country: "Canada",
    gender: "Female",
    gpa: "97–98 (Ontario average %)",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    choiceReason:
      "She was drawn to Harvard's outreach to low-income, international and under-represented students. In her words, \"It's my dream school.\"",
    intendedFocus: "Medicine",
    activities: [
      "Sat on the Mayor's Advisory Committee in Niagara Falls",
      "Tutored her classmates in mathematics and science",
      "Volunteered in the Niagara Health System",
    ],
    background:
      "She will be the first person in her family to earn a post-secondary degree. She was one of 938 students worldwide admitted early action that cycle.",
    sources: [
      {
        label: "CTV News — 'It's my dream school': Ontario teen earns early acceptance to Harvard University",
        url: "https://www.ctvnews.ca/lifestyle/article/its-my-dream-school-ontario-teen-earns-early-acceptance-to-harvard-university/",
      },
      {
        label: "The Catholic Register — Niagara teen excels on all fronts to gain Harvard admission",
        url: "https://www.catholicregister.org/features/item/25020-niagara-teen-excels-on-all-fronts-to-gain-harvard-admission",
      },
    ],
  },
  {
    id: "victor-idowu-2019",
    name: "Victor Idowu",
    highSchool: "Brampton Manor Academy",
    location: "Newham, London",
    gradYear: 2019,
    headline: "A*A*A* from a Newham state school, straight to Cambridge medicine.",
    major: "Biology/Pre-Med",
    country: "United Kingdom",
    gender: "Male",
    gpa: "A*A*A* at A-level",
    acceptedTo: ["University of Cambridge"],
    chose: "University of Cambridge",
    intendedFocus: "Medicine, at Selwyn College",
    activities: [],
    background:
      "From a single-parent family, on free school meals, and the first in his family to attend university. Brampton Manor, in one of London's poorest boroughs, produced 41 Oxbridge offers that year. In his words: \"This is something that I have wanted my whole life. It's made my family really proud.\" Brampton Manor's sixth form runs its own Oxbridge preparation programme, with interview practice from a team of Oxbridge graduates, and asks for seven GCSEs at grade 7 or above to enter; 41 of its students were offered Oxbridge places that year.",
    sources: [
      {
        label: "Brampton Manor Academy — what the sixth form offers",
        url: "https://www.bramptonmanor.org/What-We-Offier/index.asp",
      },
      {
        label: "Global Citizen — Meet Some of the 41 Pupils Offered Oxbridge Places at a State School in One of London's Poorest Areas",
        url: "https://www.globalcitizen.org/en/content/brampton-manor-students-offers-oxbridge/",
      },
    ],
  },
  {
    id: "dorcas-shodeinde-2019",
    name: "Dorcas Shodeinde",
    highSchool: "Brampton Manor Academy",
    location: "Newham, London",
    gradYear: 2019,
    headline: "In the care system since 14 — and offered a place to read Law at Oxford.",
    major: "Law/Pre-Law",
    country: "United Kingdom",
    gender: "Female",
    acceptedTo: ["University of Oxford"],
    chose: "University of Oxford",
    intendedFocus: "Law, at St Catherine's College",
    activities: [],
    background:
      "She had been in care since the age of 14. In her words: \"Brampton made me believe I was good enough to go to Oxford.\" Brampton Manor's sixth form runs its own Oxbridge preparation programme, with interview practice from a team of Oxbridge graduates, and asks for seven GCSEs at grade 7 or above to enter; 41 of its students were offered Oxbridge places that year.",
    sources: [
      {
        label: "Brampton Manor Academy — what the sixth form offers",
        url: "https://www.bramptonmanor.org/What-We-Offier/index.asp",
      },
      {
        label: "Global Citizen — Meet Some of the 41 Pupils Offered Oxbridge Places at a State School in One of London's Poorest Areas",
        url: "https://www.globalcitizen.org/en/content/brampton-manor-students-offers-oxbridge/",
      },
    ],
  },
  {
    id: "baker-lubwama-2019",
    name: "Baker Lubwama",
    highSchool: "Brampton Manor Academy",
    location: "Newham, London",
    gradYear: 2019,
    headline: "Told at his old school he wasn't Oxbridge material. Offered Cambridge medicine anyway.",
    major: "Biology/Pre-Med",
    country: "United Kingdom",
    gender: "Male",
    acceptedTo: ["University of Cambridge"],
    chose: "University of Cambridge",
    intendedFocus: "Medicine, at Clare College",
    activities: [],
    background:
      "He has said teachers at his previous secondary school discouraged him despite his results: \"One of the biggest things was being in an environment where I felt teachers believed I could do it.\" Brampton Manor's sixth form runs its own Oxbridge preparation programme, with interview practice from a team of Oxbridge graduates, and asks for seven GCSEs at grade 7 or above to enter; 41 of its students were offered Oxbridge places that year.",
    sources: [
      {
        label: "Brampton Manor Academy — what the sixth form offers",
        url: "https://www.bramptonmanor.org/What-We-Offier/index.asp",
      },
      {
        label: "Global Citizen — Meet Some of the 41 Pupils Offered Oxbridge Places at a State School in One of London's Poorest Areas",
        url: "https://www.globalcitizen.org/en/content/brampton-manor-students-offers-oxbridge/",
      },
    ],
  },
  {
    id: "bria-rives-2023",
    name: "Bria Rives",
    highSchool: "Fayette County High School",
    location: "Fayetteville, GA",
    gradYear: 2023,
    headline: "Double bass to Juilliard, by way of the National Youth Orchestra.",
    major: "Music/Musicology",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Juilliard"],
    chose: "Juilliard",
    intendedFocus:
      "Double bass — studying under Rex Surany, principal bass of the Metropolitan Opera Orchestra",
    activities: [
      "National Youth Orchestra for three consecutive summers, including international touring",
      "Atlanta Symphony Orchestra Talent Development Program from seventh grade",
    ],
    awards: ["Georgia All-State orchestra, 2021–22 and 2022–23"],
    background: "She has played double bass since she was eleven.",
    sources: [
      {
        label: "The Citizen (Fayette County, GA) — FCHS's Rives accepted to Juilliard School of Music",
        url: "https://thecitizen.com/2023/04/25/fchss-rives-accepted-to-juilliard-school-of-music/",
      },
      {
        label: "Atlanta Symphony Orchestra — artist profile, Bria Rives",
        url: "https://www.aso.org/artists/detail/bria-rives",
      },
    ],
  },
  {
    id: "arthur-gee-2024",
    name: "Arthur Gee",
    highSchool: "Detroit School of Arts",
    location: "Detroit, MI",
    gradYear: 2024,
    headline: "Started in hip-hop, danced through scoliosis, ended up at Juilliard.",
    major: "Dance/Performing Arts",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Juilliard"],
    chose: "Juilliard",
    intendedFocus:
      "BFA in dance — aiming to join a company and eventually choreograph",
    activities: [
      "Trained at Angie Hanh's Academy of Dance, starting in hip-hop before moving into ballet",
      "Teaching assistant at his dance school",
      "Academic honour student",
    ],
    awards: ["$52,000 Juilliard scholarship toward tuition and housing"],
    background:
      "Known as L.A. Gee. He had not planned on college at all and was considering moving to Los Angeles. He was diagnosed with scoliosis during the pandemic, and the back pain sometimes stopped him dancing. In his words: \"There's really no point of stopping when there's so much further to go.\"",
    sources: [
      {
        label: "FOX 2 Detroit — Metro Detroit teen dancer accepted to The Juilliard School",
        url: "https://www.fox2detroit.com/news/metro-detroit-teen-dancer-accepted-juilliard-school",
      },
    ],
  },
  {
    id: "mekhi-johnson-2018",
    name: "Mekhi Johnson",
    highSchool: "Gilman School",
    location: "Baltimore, MD",
    gradYear: 2018,
    headline: "Set the goal at age six after hearing a radio story. Ten years later, admitted to all eight Ivies.",
    major: "Political Science",
    country: "United States",
    gender: "Male",
    gpa: "98.1 (weighted average)",
    acceptedTo: ["Harvard"],
    totalAccepted: 9,
    acceptancesNote:
      "Reporting confirms admission to all eight Ivy League schools plus the University of Chicago, but only Harvard — the school he chose — was individually named in coverage.",
    chose: "Harvard",
    intendedFocus: "Political science",
    activities: [
      "Diversity Council president",
      "Yearbook and literary magazine editor",
      "Hand bell choir, jazz band, and drum line member",
      "Singer with the Traveling Men (school a cappella group)",
      "Cast and crew member for musical theater productions",
      "Volunteer with Bridges, an academic and cultural enrichment program for Title I elementary students",
    ],
    awards: ["National Merit Scholarship Program Commended Student"],
    background:
      "A Gilman School student since first grade. Said he decided at age six, after hearing a radio segment about a student admitted to every Ivy League school, that he would do the same.",
    essayNote:
      "He told reporters the final choice between two schools came down to instinct, describing having tried everything from horoscopes to a coin flip before deciding.",
    sources: [
      {
        label: "CBS News Baltimore — Baltimore Scholar Accepted To All 8 Ivy League Schools",
        url: "https://www.cbsnews.com/baltimore/news/student-accepted-to-all-ivy-league-schools/",
      },
      {
        label: "FOX45 Baltimore — Gilman School Student is Accepted by All Eight Ivy League Colleges",
        url: "https://foxbaltimore.com/news/local/gilman-school-student-is-accepted-by-all-eight-ivy-league-colleges",
      },
      {
        label: "WMAR-2 News — Gilman School senior makes a big decision",
        url: "https://www.wmar2news.com/news/region/baltimore-city/gilman-school-senior-makes-a-big-decision",
      },
    ],
  },
  {
    id: "khadijah-williams-2009",
    name: "Khadijah Williams",
    highSchool: "Jefferson High School",
    location: "Los Angeles, CA",
    gradYear: 2009,
    headline: "Homeless for most of her life, attended 12 schools in 12 years, and graduated fourth in her class before choosing Harvard.",
    // The source gives the career, not a concentration.
    major: "Law/Pre-Law",
    country: "United States",
    gender: "Female",
    gpa: "Just below 4.0; ranked fourth in her graduating class",
    acceptedTo: ["Harvard"],
    alsoAccepted: ["Brown", "Columbia", "Amherst", "Williams"],
    totalAccepted: 20,
    acceptancesNote:
      "Reporting says she was accepted to more than 20 universities nationwide; only these five were individually named.",
    chose: "Harvard",
    choiceReason: "Chose a full scholarship to Harvard.",
    intendedFocus: "Plans to become an education attorney",
    activities: [
      "Academic Decathlon",
      "Debate team",
      "Led the school's track and field team",
      "Took summer classes at a community college while still in high school",
      "Sought out Upward Bound, Higher Edge L.A., Experience Berkeley and South Central Scholars for mentoring, computer access and help with applications",
    ],
    background:
      "Homeless throughout her childhood with her mother and younger sister, moving between shelters, motels, and armories across California and attending 12 schools in 12 years. Identified as gifted in third grade after scoring in the 99th percentile on a state exam. Woke at 4 a.m. to bus in from an Orange County armory, getting back to the shelter by 11 p.m.",
    essayNote:
      "Told reporters: \"I have felt the anger of having to catch up in school, being bullied because they knew I was poor, different, and read too much.\"",
    sources: [
      {
        label: "The Milwaukee Courier — Claiming destiny on skid row, gifted scholar finds home at Harvard",
        url: "https://milwaukeecourier.com/news/2012/12/14/claiming-destiny-on-skid-row-gifted-scholar-finds-home-at-harvard",
      },
      {
        label: "The Seattle Times — From homeless to Harvard: graduate sets sight on success",
        url: "https://www.seattletimes.com/seattle-news/education/from-homeless-to-harvard-graduate-sets-sight-on-success/",
      },
      {
        label: "Harvard Alumni — Telling her story: Khadijah Williams '13",
        url: "https://alumni.harvard.edu/community/stories/telling-her-story",
      },
    ],
  },
  {
    id: "dawn-loggins-2012",
    name: "Dawn Loggins",
    highSchool: "Burns High School",
    location: "Lawndale, NC",
    gradYear: 2012,
    headline: "Abandoned by her parents senior year and worked as her school's janitor before being accepted to Harvard.",
    major: "Biology",
    country: "United States",
    gender: "Female",
    gpa: "3.9",
    sat: 1470,
    satConverted: true,
    satOriginal: "2110 / 2400",
    acceptedTo: ["Harvard"],
    alsoAccepted: ["Davidson", "NC State", "UNC-Chapel Hill", "Warren Wilson College"],
    chose: "Harvard",
    intendedFocus: "Biology — \"I want to help with new discoveries\"",
    activities: [
      "AP U.S. History, AP Calculus, and Honors English coursework",
      "Worked as her high school's custodian, arriving two hours before class",
      "Governor's School of North Carolina — a six-week residential summer program in natural science at Meredith College",
    ],
    background:
      "Her parents abandoned the family and moved to Tennessee without her during the summer before senior year, after years of poverty that had already forced the family to do homework by candlelight and cook on a wood stove. She couch-surfed for months before a friend's mother, school custodian Sheryl Kolton, took her in. School staff pooled money to fund her Harvard campus visit.",
    sources: [
      {
        label: "ABC News — Abandoned Teen Dawn Loggins Graduates from Homeless Custodian to Harvard University",
        url: "https://abcnews.com/US/abandoned-teen-dawn-loggins-graduates-homeless-custodian-harvard/story?id=16520080",
      },
      {
        label: "WBTV — From a life of hell to Harvard University",
        url: "https://www.wbtv.com/story/18121186/from-a-life-of-hell-to-harvard-university/",
      },
      {
        label: "CNN — From scrubbing floors to Ivy League: homeless student to go to dream college",
        url: "https://www.cnn.com/2012/06/07/us/from-janitor-to-harvard",
      },
    ],
  },
  {
    id: "richard-jenkins-2018",
    name: "Richard Jenkins",
    highSchool: "Girard College",
    location: "Philadelphia, PA",
    gradYear: 2018,
    headline: "Bullied and nicknamed \"Harvard\" as a homeless kid for being a bookworm — then he actually got in, on a full ride.",
    major: "Computer Science",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    choiceReason:
      "Discovered Harvard through a promotional email during his junior year and was drawn to its program covering full tuition for households earning under $65,000 a year.",
    intendedFocus: "Computer science, with an interest in building a more intuitive virtual assistant",
    activities: [
      "Valedictorian of his graduating class, with straight As",
      "Took college classes while still at Girard College",
      "Held an internship at a technology startup",
      "Went through Mighty Writers, the Philadelphia writing program that helped him win a place at Girard",
    ],
    background:
      "He and his two younger brothers were homeless for two years after their mother lost their home to foreclosure, " +
      "moving to Tennessee and then Florida before returning to a shelter in Germantown, Philadelphia. Bullies " +
      "nicknamed him \"Harvard\" for being a bookworm, and he was in and out of hospital with a medical condition " +
      "through the same years. He found out about his Harvard acceptance while on a school trip to Paris, and said " +
      "he wanted to take Japanese and learn kendo once he got there.",
    essayNote:
      "Told reporters: \"I was so embarrassed to say I lived in a shelter. But that's when I realized I've got to buckle in because I can't have my potential kids going through what I'm going through now.\"",
    sources: [
      {
        label: "ABC13 Houston — Philadelphia teen who was once homeless gets full ride to Harvard",
        url: "https://abc13.com/harvard-homeless-teen-bound-richard-jenkins/3520020",
      },
      {
        label: "CNN — He slept in homeless shelters as a kid. Now he's going to Harvard on a full ride",
        url: "https://edition.cnn.com/2018/05/24/us/philadelphia-teen-accepted-to-harvard-trnd/index.html",
      },
    ],
  },
  {
    id: "athena-capo-battaglia-2018",
    name: "Athena Capo-Battaglia",
    highSchool: "Fiorello H. LaGuardia High School",
    location: "New York, NY",
    gradYear: 2018,
    headline: "Lived in a homeless shelter with her mother while applying to 25 colleges — and got into Harvard on a full scholarship.",
    major: "Neuroscience",
    country: "United States",
    gender: "Female",
    gpa: "4.0",
    acceptedTo: ["Harvard"],
    totalAccepted: 25,
    acceptancesNote: "Reporting says she applied to 25 colleges; only Harvard was individually named.",
    chose: "Harvard",
    intendedFocus:
      "Cognitive science or computer science — undecided between them — alongside Russian",
    activities: [
      "Captain of the gymnastics team",
      "Held a 4.0 average at LaGuardia while living in the shelter",
      "Applied to 25 colleges through the shelter's computer access",
    ],
    background:
      "Lived in a New York City homeless shelter with her mother, Lorraine, a dance teacher who lost her job and their home after a cancer diagnosis. Was recognized by the NYC Mayor's Office along with more than 100 other college-bound students living in shelters.",
    essayNote:
      "Told CBS News: \"I didn't feel like there was an option of failing,\" and described her mother and herself as \"each other's rock.\"",
    sources: [
      {
        label: "CBS News — Homeless to Harvard: Teen shares her \"surreal\" journey",
        url: "https://www.cbsnews.com/news/homeless-to-harvard-teen-athena-capo-battaglia-shares-her-surreal-journey-2019-06-08/",
      },
      {
        label: "PBS Chasing the Dream — This homeless high school grad is Harvard-bound",
        url: "https://www.pbs.org/wnet/chasing-the-dream/2018/11/this-homeless-high-school-grad-is-harvard-bound",
      },
    ],
  },
  {
    id: "craig-mcfarland-2020",
    name: "Craig McFarland",
    highSchool: "Stanton College Preparatory School",
    location: "Jacksonville, FL",
    gradYear: 2020,
    headline: "Accepted to all eight Ivy League schools, committed to Yale, then switched to Harvard weeks later.",
    major: "Pre-Med",
    country: "United States",
    ethnicity: "Black and Filipino-American",
    gender: "Male",
    gpa: "4.98 (never received a B on his high school report card)",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "Stanford", "Duke", "Emory", "Georgia Tech",
      "Florida State", "University of Florida",
    ],
    totalAccepted: 17,
    acceptancesNote: "Reporting says he was accepted to 17 schools in total; these were the ones individually named.",
    chose: "Harvard",
    choiceReason:
      "Initially committed to Yale, then switched to Harvard, citing concerns about being \"isolated\" in a small city during the pandemic versus the social and activism opportunities in Boston. Harvard covered full tuition and housing plus $15,000 for living expenses.",
    intendedFocus: "Medicine or linguistics, with an interest in incorporating social justice themes",
    activities: [
      "Valedictorian of his class",
      "Debate club",
      "Varsity track and field",
      "Took French, Spanish and Arabic in the same final year, on top of everything else",
    ],
    awards: [
      "Gamma Beta Boulé Award for top African American students ($3,500)",
      "National Merit Scholar",
      "Comcast Leaders and Achievers Scholarship",
      "Ron Brown Scholar finalist — one of 24, worth $40,000 at the college of his choice",
    ],
    background:
      "Fluent in five languages. Son of Donabel Santiago, a Filipina immigrant and registered cardiac sonographer who raised Craig and two siblings as a single parent.",
    sources: [
      {
        label: "The Daily Beast — Florida Student Craig McFarland Accepted at All 8 Ivy League Schools",
        url: "https://www.thedailybeast.com/florida-student-craig-mcfarland-accepted-at-all-8-ivy-league-schools/",
      },
      {
        label: "News4Jax — Stanton valedictorian accepted into all 8 Ivy League schools",
        url: "https://www.news4jax.com/news/local/2020/04/22/stanton-valedictorian-accepted-into-all-8-ivy-league-schools/",
      },
      {
        label: "Asian Journal — Fil-Am student accepted to all 8 Ivy League schools switches from Yale to Harvard",
        url: "https://asianjournal.com/usa/dateline-usa/fil-am-student-accepted-to-all-8-ivy-league-schools-switches-from-yale-to-harvard/",
      },
    ],
  },
  {
    id: "coby-hayes-2024",
    name: "Coby Hayes",
    highSchool: "Marion High School",
    location: "Marion, AR",
    gradYear: 2024,
    headline: "Named a Gates Scholar from a pool of more than 53,000 applicants, covering the full cost of his dream school, Harvard.",
    // The article never states a field of study, so neither does this.
    major: "Not publicly reported",
    country: "United States",
    gender: "Male",
    gpa: "4.32",
    acceptedTo: ["Harvard"],
    totalAccepted: 20,
    acceptancesNote: "Reporting says he was accepted to more than 20 colleges; only Harvard was individually named.",
    chose: "Harvard",
    choiceReason:
      "Cited Boston's location and the networking reach of the colleges around it, and said the Black community felt welcoming when he visited: \"They made me feel welcome. It felt like home.\"",
    activities: [
      "Student Council president",
      "National Honor Society",
      "Mu Alpha Theta",
      "Interact",
      "Tennis",
      "Quiz bowl team",
      "Band",
    ],
    awards: ["Gates Scholar (2024 class, selected from over 53,000 applicants)"],
    background:
      "The Gates Scholarship, combined with Harvard's own financial aid, covers all of Hayes's college expenses.",
    essayNote:
      "Told reporters: \"Between the financial aid I'm getting from Harvard and the support of the Gates Scholarship, all of my expenses will be taken care of. It's a huge weight off of me and my mom's shoulders.\"",
    sources: [
      {
        label: "Action News 5 — Marion High student going to Harvard",
        url: "https://www.actionnews5.com/2024/04/24/marion-high-student-going-harvard/",
      },
    ],
  },
  {
    id: "fernando-rojas-2015",
    name: "Fernando Rojas",
    highSchool: "Fullerton Union High School",
    location: "Fullerton, CA",
    gradYear: 2015,
    headline: "Son of Mexican immigrants with only middle-school educations, admitted to all eight Ivies plus Stanford.",
    major: "International Affairs",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Male",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: ["Stanford", "UC Irvine", "Cal State Fullerton"],
    chose: "Yale",
    choiceReason:
      "Said that on his visit he \"felt I was a part of that community ... it was really just an inclusive environment.\"",
    intendedFocus: "Latin American studies and international affairs, with plans to attend law school",
    activities: ["National speech and debate champion", "Co-valedictorian"],
    background:
      "Son of Mexican immigrant parents, neither of whom studied beyond eighth grade. His speech and debate coach, Sal Tinajero, said: \"It couldn't have happened to a nicer person and a harder working student.\"",
    sources: [
      {
        label: "ABC News — California Student Accepted to All 8 Ivy League Schools Makes His Pick",
        url: "https://abcnews.com/US/california-student-accepted-ivy-league-schools-makes-pick/story?id=31612498",
      },
      {
        label: "ABC7 Los Angeles — Fullerton student, son of Mexican immigrants, accepted to all 8 Ivy League schools",
        url: "https://abc7.com/fullerton-union-high-school-student-accepted-to-all-ivy-league-schools-leagues/662595/",
      },
    ],
  },
  {
    id: "kelly-hyles-2016",
    name: "Kelly Hyles",
    highSchool: "High School for Math, Science and Engineering at City College of New York",
    location: "New York, NY",
    gradYear: 2016,
    headline: "Immigrated from Guyana at 11; accepted to all eight Ivies among 21 total college offers.",
    major: "Biochemistry",
    country: "United States",
    ethnicity: "Guyanese-American",
    gender: "Female",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    totalAccepted: 21,
    acceptancesNote:
      "She was accepted to 21 colleges in total, including all eight Ivies; only the Ivies were named individually in reporting.",
    chose: "Harvard",
    intendedFocus: "Biochemistry and neuroscience, with a secondary interest in political science and race relations",
    activities: [
      "Two years of research at the Diabetes, Obesity and Metabolism Institute, Mount Sinai Hospital, on how one gene affects diabetes",
      "Tutoring and mentoring through the DREAM program at her former Brooklyn middle school, preparing students for the specialised-school entrance exam",
      "Co-founded her school's Black Student Union, which she thanked in her valedictory speech",
      "Took college-level classes alongside her school timetable",
    ],
    awards: [
      "Class valedictorian, on a 99.63 average",
      "First recipient of the Guyanese Girls Rock Award, 2016",
    ],
    background:
      "Immigrated from a small town in Guyana at age 11 with her mother, Anette Hyles, who worked 15-hour days as a home health aide and certified nursing assistant. Commuted an hour and a half each way to her specialized high school.",
    sources: [
      {
        label: "TODAY — Meet Kelly Hyles, who was accepted to all 8 Ivy League schools after moving from Guyana",
        url: "https://www.today.com/parents/meet-kelly-hyles-who-was-accepted-all-8-ivy-league-t88051",
      },
      {
        label: "NBC News — Budding Neuroscientist Chooses Harvard After 21 College Offers",
        url: "https://www.nbcnews.com/feature/college-game-plan/budding-neuroscientist-chooses-harvard-after-21-college-offers-n572246",
      },
    ],
  },
  {
    id: "hunter-mollett-2017",
    name: "Hunter Mollett",
    highSchool: "Enterprise High School",
    location: "Enterprise, MS",
    gradYear: 2017,
    headline: "Abandoned by his parents and homeless through much of high school, admitted to Harvard with near-full aid.",
    major: "Biomedical Engineering",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Biomedical engineering, aiming toward cardiothoracic surgery",
    activities: ["Trumpet in the school band", "National Honor Society"],
    background:
      "Lived in a trailer without power or water, slept on park benches one summer, and said the longest he went without food was four days, after being abandoned by his parents junior year. Took shelter with extended family, friends, and school staff, including band director Mark Edwards, in whose household he lived. Teachers Jacqueline Lewis and Sharon Prater and guidance counselor Kathy Dedwylder helped him through the process; the school raised money to fund his Harvard campus visit.",
    sources: [
      {
        label: "The News Courier — Homeless to Harvard: Mississippi senior bound for Ivy League in Massachusetts",
        url: "https://enewscourier.com/2017/05/14/homeless-to-harvard-mississippi-senior-bound-for-ivy-league-in-massachusetts/",
      },
    ],
  },
  {
    id: "carl-audric-guia-2023",
    name: "Carl Audric Guia",
    highSchool: "UP Rural High School",
    location: "Los Baños, Laguna, Philippines",
    gradYear: 2023,
    headline: "From a family too poor to afford tuition, admitted to Harvard, Yale, Princeton and Stanford with full aid.",
    major: "Astrophysics",
    country: "Philippines",
    gender: "Male",
    sat: 1540,
    acceptedTo: ["Harvard", "Yale", "Princeton", "Stanford"],
    alsoAccepted: ["Ohio University", "University of Notre Dame"],
    chose: "Harvard",
    intendedFocus: "Astronomy and astrophysics",
    activities: [
      "International science competition research on the Martian atmosphere; traveled to Arizona State University for a related conference in 2022",
      "Self-taught astronomy and astrophysics through online resources, joining astronomy groups and competitions",
    ],
    awards: [
      "Won an international astronomy competition held in the United States in 2022",
      "Qualified for the Glynn Family Honors Program and the Stamps Scholars Program at Notre Dame",
      "Among the first graduates of a Philippine public high school admitted to Harvard",
    ],
    background:
      "One of four siblings; his mother is a homemaker and his father a dispatcher at an electric company. His parents said they could not afford his college education even if they sold their house and possessions. He traced his interest in astronomy to reading encyclopedias as a child. Harvard said it was impressed by his initiative pursuing astronomy despite the lack of facilities at his school. All four Ivy-or-above schools offered full financial support covering tuition, housing, food, travel, and health insurance.",
    essayNote:
      "Told reporters, in a mix of English and Tagalog, that people just need \"a little push\" to pursue their dreams and should trust that it can make all the difference.",
    sources: [
      {
        label: "Coconuts Manila — Filipino student gets accepted into Harvard, Yale, Princeton, and Stanford with full financial aid",
        url: "https://coconuts.co/manila/news/filipino-student-gets-accepted-into-harvard-yale-princeton-and-stanford-with-full-financial-aid/",
      },
      {
        label: "Philstar — Laguna HS student who passed in 6 US universities chooses Harvard",
        url: "https://www.philstar.com/lifestyle/on-the-radar/2023/08/18/2289511/laguna-hs-student-who-passed-6-us-universities-chooses-harvard",
      },
      {
        label: "PEP.ph — How Pinoy student Carl Audric Guia impressed Harvard University",
        url: "https://www.pep.ph/lifestyle/extraordinary/175245/carl-audric-guia-harvard-university-a717-20230817-lfrm",
      },
    ],
  },
  {
    id: "emmanuel-gitu-2024",
    name: "Emmanuel Gitu",
    highSchool: "Springfield High School",
    location: "Springfield, PA",
    gradYear: 2024,
    headline: "US-born son of Kenyan immigrants, accepted to 31 colleges including four Ivies, drawn to neuroscience by his brother's autism.",
    major: "Neuroscience",
    country: "United States",
    ethnicity: "Kenyan-American",
    gender: "Male",
    acceptedTo: ["Harvard", "Princeton", "Yale", "Cornell"],
    totalAccepted: 31,
    acceptancesNote:
      "Accepted to 31 colleges in total; only Harvard, Princeton, Yale, and Cornell were named individually in reporting.",
    chose: "Harvard",
    intendedFocus: "Neuroscience — researching the biological basis of autism spectrum disorder",
    activities: [
      "Violin",
      "Applied to and was accepted by 31 colleges in one cycle",
    ],
    awards: [
      "National Merit Semifinalist",
    ],
    background:
      "His older brother Ian has autism spectrum disorder, which motivated his interest in neuroscience research; their mother is Anne Gitu. His school's chief academic officer said he got into more Ivy League universities than any other student the school has had, and separate reporting said no Springfield High School student in the past 15 years had received as many total college acceptances as his 31.",
    essayNote:
      "Said: \"I believe if we can understand the key biological changes in the brain and physiology of people with autism spectrum disorder, I think we can give them better specialized therapy treatment.\"",
    sources: [
      {
        label: "CBS News Philadelphia — Springfield High School student plans to study neuroscience at Harvard, inspired by his brother",
        url: "https://www.cbsnews.com/philadelphia/news/springfield-pennsylvania-student-harvard-neuroscience-autism/",
      },
      {
        label: "The Kenya Times — Emmanuel Gitu Accepted In 31 Universities, 4 Are Ivy League",
        url: "https://thekenyatimes.com/latest-kenya-times-news/kenyan-accepted-in-31-colleges-4-ivy-league-universities/",
      },
      {
        label: "NTV Kenya — Boy with Kenyan roots accepted to 4 US Ivy League universities",
        url: "https://ntvkenya.co.ke/news/boy-with-kenyan-roots-accepted-to-4-us-ivy-league-universities/",
      },
    ],
  },
  {
    id: "reya-nikole-siojo-2026",
    name: "Reya Nikole Maryella Maligro Siojo",
    highSchool: "Philippine Science High School – Cordillera Administrative Region Campus",
    location: "Baguio City, Philippines",
    gradYear: 2026,
    headline: "First in her family admitted to an Ivy League school, on a full Harvard scholarship after losing her mother young.",
    major: "Chemistry",
    country: "Philippines",
    gender: "Female",
    acceptedTo: ["Harvard"],
    alsoAccepted: [
      "Washington and Lee University", "Oral Roberts University",
      "National Sun Yat-sen University", "De La Salle University",
      "University of the Philippines",
    ],
    acceptancesNote:
      "She was waitlisted rather than rejected at Princeton, Notre Dame and Amherst, and qualified for the " +
      "University of the Philippines' Integrated Liberal Arts and Medicine programme, its accelerated route to a " +
      "medical degree.",
    chose: "Harvard",
    intendedFocus: "Chemistry, with a likely double concentration in economics",
    awards: ["Valedictorian, PSHS-CARC Batch 2026 (83 graduates)"],
    activities: [
      "Managed her international university application process independently",
      "Competitive Mobile Legends: Bang Bang player, reaching Mythical Glory rank — and wrote about it in her Harvard essay rather than leaving it off",
      "Five-week Summer Science Program in Oklahoma, where other students told her to apply abroad",
    ],
    background:
      "Lost her mother in an accident on her seventh birthday; her mother had left a written message encouraging her children to surpass her accomplishments, which Siojo has cited as her motivation for staying focused on her academic goals. Harvard's scholarship covers tuition, housing, living expenses, and annual airfare.",
    sources: [
      {
        label: "Daily Tribune — PhilSci Cordillera Valedictorian Wins Full Harvard Scholarship, Inspires Filipino Students With Ivy League Success",
        url: "https://tribune.net.ph/2026/06/04/philsci-cordillera-valedictorian-earns-full-harvard-scholarship",
      },
      {
        label: "GMA Regional TV — La Union valedictorian, MLBB gamer earns full Harvard scholarship",
        url: "https://www.gmanetwork.com/regionaltv/youngminds/114774/la-union-valedictorian-mlbb-gamer-earns-full-harvard-scholarship/story/",
      },
    ],
  },
  {
    id: "dario-guerrero-meneses-2011",
    name: "Dario Guerrero-Meneses",
    highSchool: "California Academy of Mathematics and Science",
    location: "Carson, CA",
    gradYear: 2011,
    headline: "Told Harvard he was undocumented. They gave him a full scholarship anyway.",
    major: "Not publicly reported",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Male",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    activities: ["Worked construction with his father, an experience that shaped his college essay"],
    background:
      "Came to the United States from Mexico at age two and a half after his grandparents were targeted by crime — his mother's father was kidnapped twice, and a drug cartel extorted his father's father. He applied to every Ivy League school plus College of the Atlantic, Georgetown, the University of Chicago, Washington and Lee, and Wesleyan; MIT and Williams told him not to bother applying because of his immigration status. Later received DACA status.",
    essayNote:
      "Wrote a Washington Post op-ed, \"I told Harvard I was an undocumented immigrant. They gave me a full scholarship,\" about disclosing his status on his application.",
    sources: [
      {
        label: "The Washington Post — I told Harvard I was an undocumented immigrant. They gave me a full scholarship.",
        url: "https://www.washingtonpost.com/posteverything/wp/2014/09/24/i-told-harvard-i-was-an-undocumented-immigrant-they-gave-me-a-full-scholarship/",
      },
      {
        label: "The Harvard Crimson — 5 Questions With Dario Guerrero-Meneses",
        url: "https://www.thecrimson.com/article/2014/10/9/5q-guerrero-meneses/",
      },
      {
        label: "The Boston Globe — He just graduated from Harvard. He's also undocumented. Will he be deported?",
        url: "https://www.bostonglobe.com/magazine/2018/01/19/just-graduated-from-harvard-also-undocumented-will-deported/2eRDU8zArzOWINIFl8741M/story.html",
      },
    ],
  },
  {
    id: "kate-stevens-2020",
    name: "Kate Stevens",
    highSchool: "Rye High School",
    location: "Rye, NY",
    gradYear: 2020,
    headline: "Survived childhood leukemia and a bone marrow transplant, then chose Harvard for pre-med.",
    major: "Pre-Med",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Pre-med",
    awards: ["Salutatorian", "Student body president"],
    activities: [
      "Field hockey team captain",
      "Founded a Light the Night fundraising team for the Leukemia and Lymphoma Society at age 15",
      "Cycled 3,200 miles from Charleston, SC to Santa Monica, CA in 2018 to raise money for pediatric leukemia research",
      "2019 summer internship in research and patient care at Memorial Sloan Kettering",
    ],
    background:
      "Diagnosed with acute monocytic leukemia at age five in 2007 after swollen gums failed to improve; achieved remission through chemotherapy, then received a bone marrow transplant from her four-year-old sister Caroline, a compatible donor. Missed a year of school during treatment and celebrated her Ivy League acceptance with a special ceremony at Memorial Sloan Kettering, where she had been treated.",
    sources: [
      {
        label: "Memorial Sloan Kettering — How Leukemia Spurred Kate to Find Her Mission",
        url: "https://www.mskcc.org/experience/hear-from-patients/how-leukemia-spurred-kate-find-her-mission",
      },
      {
        label: "News 12 Westchester — Harvard-bound cancer survivor partakes in virtual graduation ceremony at Sloan Kettering",
        url: "https://westchester.news12.com/harvardbound-cancer-survivor-partakes-in-virtual-graduation-ceremony-at-sloan-kettering-42239179",
      },
    ],
  },
  {
    id: "cielo-echegoyen-2021",
    name: "Cielo Echegoyen",
    highSchool: "Santa Ana High School",
    location: "Santa Ana, CA",
    gradYear: 2021,
    headline: "Only the fourth student from her Santa Ana high school ever accepted to Harvard.",
    major: "Molecular and Cell Biology",
    country: "United States",
    gender: "Female",
    gpa: "4.83",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Molecular and cell biology, aiming to become an oncologist",
    activities: [
      "Chair of Santa Ana Student Representatives",
      "Tutor at the Santa Ana Public Library's Teen Space, where she also studied every day",
      "Achievement Institute of Scientific Studies",
      "Youth Science Fellow at the UCI Cancer Research Institute",
      "Her story caught the attention of Dr. Gloria Montiel, the first known Santa Ana High School alumna to graduate from Harvard, who has since offered her support and inspiration",
    ],
    background:
      "She was diagnosed in middle school with pectus excavatum, a caved-in sternum pressing on her heart and " +
      "lungs; the surgeon who treated her was a Harvard graduate, and that is where the interest in medicine " +
      "started. She wants to be an oncologist because her maternal grandmother died of colon cancer and her " +
      "paternal grandfather developed a carcinoma. One of six children of immigrant parents who did not graduate high school. Her father was detained by ICE for about six months during her junior year; she wrote her college essay about the detention's impact on her family. Her acceptance video, filmed with her family, drew coverage from NBC4, KTLA, ABC7, and Fox 11 in Los Angeles. She was one of three Santa Ana High School seniors headed to Harvard that fall, alongside classmates Oziel Flores and Stephany Gutiérrez.",
    sources: [
      {
        label: "OCDE Newsroom — Santa Ana High School senior accepted to Harvard University",
        url: "https://newsroom.ocde.us/in-the-news-santa-ana-high-school-senior-accepted-to-harvard-university/",
      },
      {
        label: "NBC Los Angeles — 'I'm Very Proud to Be First Generation': Santa Ana High School Senior Accepted to Harvard University",
        url: "https://www.nbclosangeles.com/news/local/hispanic-student-from-santa-ana-is-accepted-into-the-prestigious-harvard-university/2493651/",
      },
      {
        label: "Spectrum News 1 — Santa Ana Teen Credits Parents' Support for Harvard Acceptance",
        url: "https://spectrumnews1.com/ca/la-west/human-interest/2021/01/14/santa-ana-teen-credits-parents--support-for-harvard-acceptance",
      },
      {
        label: "CBS News Los Angeles — 3 Santa Ana High School seniors headed to Harvard in the fall",
        url: "https://www.cbsnews.com/losangeles/news/3-santa-ana-high-school-seniors-headed-to-harvard-in-the-fall",
      },
    ],
  },
  {
    id: "sofia-santos-de-oliveira-2022",
    name: "Sofia Santos de Oliveira",
    highSchool: "Colégio Santo Antônio",
    location: "Belo Horizonte, Brazil",
    gradYear: 2022,
    headline: "Lost a scholarship to her father's layoff in fifth grade; admitted to Harvard, Yale and Stanford in Harvard's most competitive cycle ever.",
    major: "Chemistry",
    country: "Brazil",
    gender: "Female",
    acceptedTo: ["Harvard", "Yale", "Stanford"],
    chose: "Harvard",
    choiceReason: "Said she saw Harvard as having stronger ties to Brazil.",
    intendedFocus: "Chemistry and social sciences, with a focus on education and public health",
    activities: [
      "Founded a social project supporting low-income students",
      "Taught free English classes to low-income youth after teaching herself English",
      "Member of the New York Academy of Sciences",
      "Independent scientific research recognized at roughly ten national and international fairs",
      "Participated in the Brazilian Youth Parliament and Chamber of Deputies programming",
    ],
    background:
      "Lost a scholarship at a private school in fifth grade after her father, a steel industry worker, was laid off, and moved to public school. Later won a scholarship through Ismart (Instituto Social para Motivar, Apoiar e Reconhecer Talentos) to attend Colégio Santo Antônio, waking at 5 a.m. and taking two buses to get there, then returning home around 8 p.m. Was admitted in March 2022, when Harvard's acceptance rate was 3.19% (1,954 of 61,220 applicants) — its most selective cycle to date. Harvard's aid package, worth about R$2 million, covers tuition, housing, meals, transportation, health insurance, and personal expenses for four years.",
    essayNote:
      "Said: \"Desde o ensino fundamental, eu já cogitava a ideia de ir estudar no exterior, mas era quase uma utopia\" (\"Since elementary school, I had already considered studying abroad, but it was almost a utopia\").",
    sources: [
      {
        label: "CNN Brasil — Aluna de baixa renda de BH conquista bolsa integral na Universidade de Harvard",
        url: "https://www.cnnbrasil.com.br/nacional/aluna-de-baixa-renda-de-bh-conquista-bolsa-integral-na-universidade-de-harvard/",
      },
      {
        label: "Estado de Minas — Estudante de BH de baixa renda conquista bolsa de estudos em Harvard",
        url: "https://www.em.com.br/app/noticia/educacao/2022/06/03/internas_educacao,1370989/estudante-de-bh-de-baixa-renda-conquista-bolsa-de-estudos-em-harvard.shtml",
      },
      {
        label: "BH Post Notícias — Estudante mineira ganha bolsa de R$ 2 milhões para estudar nos EUA",
        url: "https://bhpostnoticias.com/2022/06/14/estudante-mineira-ganha-bolsa-de-r-2-milhoes-para-estudar-nos-eua/",
      },
    ],
  },
  {
    id: "yasmim-barros-2025",
    name: "Yasmim Barros",
    highSchool: "East Side High School",
    location: "Newark, NJ",
    gradYear: 2025,
    headline: "Arrived from a Brazilian village of under 100 people not speaking English; left with a full ride to Harvard.",
    major: "Government",
    country: "United States",
    ethnicity: "Brazilian-American",
    gender: "Female",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Government, with a focus on political science; plans to attend Harvard Law School",
    activities: [
      "Captain of varsity cross-country, indoor track, and outdoor track and field",
      "President of yearbook and student council",
      "Street cleanups, fundraising efforts, and community walks",
    ],
    awards: ["National Honor Society", "Mu Alpha Theta"],
    background:
      "Immigrated at age 11 from a rural Brazilian village of fewer than 100 residents to Newark's Ironbound neighborhood, without speaking English. Lives with her mother, a house cleaner, her stepfather, a hardwood flooring installer, and her older brother. Credits a freshman world history class with sparking her interest in \"global affairs and the role of government in shaping justice and opportunity.\"",
    sources: [
      {
        label: "News 12 New Jersey — Newark high school student gets full scholarship to Harvard University",
        url: "https://newjersey.news12.com/newark-high-school-student-gets-full-scholarship-to-harvard-university",
      },
      {
        label: "Newark Board of Education — East Side High School Senior Yasmim Barros Earns Full Scholarship to Harvard University",
        url: "https://www.nps.k12.nj.us/schools/east-side-high-school/east-side-high-school-senior-yasmim-barros-earns-full-scholarship-to-harvard-university/",
      },
    ],
  },
  {
    id: "kathleen-self-2026",
    name: "Kathleen Self",
    highSchool: "Cherokee High School",
    location: "Rogersville, TN",
    gradYear: 2026,
    headline: "Grew up on her grandparents' farm in rural Tennessee; leaves for Harvard's joint program with Berklee on a full-tuition scholarship.",
    major: "Music",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus:
      "Undeclared — music through the Berklee half of the program, with law and education the other two she wants to try",
    activities: [
      "Marching band",
      "Concert band",
      "Choir",
      "Beta Club",
      "FFA",
      "Worked her family's farm, and took over her father's share of it during his cancer treatment",
    ],
    awards: [
      "Admitted to the Harvard—Berklee joint studies program after a saxophone audition in Nashville",
    ],
    background:
      "Grew up in Hawkins County, Tennessee, helping out on her grandparents' farm; had wanted to attend an Ivy League university since middle school. In 2025, her father was diagnosed with Stage 3 cancer, and she stepped up to fill his farm duties while he went through treatment — an experience her mother said taught her that \"finding community is where true strength lies, not in trying to do it all by yourself.\" She was accepted into the Harvard-Berklee Joint Studies Program, which lets students pursue a Harvard degree while also taking classes at Berklee College of Music, and requires independent acceptance to both schools.",
    sources: [
      {
        label: "Kingsport Times News — Cherokee High School graduate goes from hayfields to Harvard",
        url: "https://timesnews.net/news/374957/cherokee-high-school-graduate-goes-from-hayfields-to-harvard/",
      },
      {
        label: "WBIR — From the farm to Harvard: Hawkins County student earns full scholarship",
        url: "https://www.wbir.com/article/news/local/hawkins-county-student-earns-full-scholarship-harvard-after-challenging-year/51-205f8a0c-99bc-4ce4-bcf6-74f4f7e153fd",
      },
    ],
  },
  {
    id: "avery-coffey-2014",
    name: "Avery Coffey",
    highSchool: "Benjamin Banneker Academic High School",
    location: "Washington, DC",
    gradYear: 2014,
    headline: "Commuted an hour from DC's Ward 8 to school; five Ivies wanted him, and he chose Harvard.",
    major: "Finance",
    country: "United States",
    ethnicity: "Black",
    gender: "Male",
    gpa: "4.3 (IB-weighted)",
    acceptedTo: ["Harvard", "Princeton", "Yale", "Penn", "Brown"],
    chose: "Harvard",
    intendedFocus: "Finance, aiming to become CEO of an investment or management consulting firm",
    activities: [
      "Four team sports — tennis, baseball, basketball and soccer",
      "Internship at the U.S. Naval Research Laboratory, where he built a robot",
      "Commuted about an hour each way, across the city, to get to school",
    ],
    background:
      "Grew up in a single-parent household in Ward 8, one of the poorest parts of Washington, DC, raised by his mother, a technician at Children's Hospital. Commuted about an hour each way by bus and metro to school in Northwest DC. Said of his neighborhood: \"There are so many stereotypes about people who are from where I come from. These things happen every year it's just that people don't really know about it, in my case I got into five so I've gotten this kind of exposure and people should start to realize that those types of stereotypes should be eradicated.\"",
    sources: [
      {
        label: "Good Black News — Five Ivy League Colleges Vie for DC Student Avery Coffey",
        url: "https://goodblacknews.org/2014/03/29/five-ivy-league-colleges-vie-for-dc-student-avery-coffey/",
      },
      {
        label: "USA TODAY High School Sports — Banneker's Avery Coffey chooses Harvard",
        url: "https://usatodayhss.com/2014/bannekers-avery-coffey-chooses-harvard-3",
      },
      {
        label: "HuffPost — Avery Coffey, teen accepted to 5 Ivy League schools",
        url: "https://huffingtonpost.com/2014/03/31/avery-coffey-student-accepted-to-5-ivy-leagues_n_5063782.html",
      },
    ],
  },
  {
    id: "jessica-alexander-2020",
    name: "Jessica Alexander",
    highSchool: "Clifton High School",
    location: "Clifton, NJ",
    gradYear: 2020,
    headline: "First-generation twin sister accepted to five Ivies; she and her twin both chose Harvard.",
    major: "Political Science",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard", "Princeton", "Yale", "Penn", "Dartmouth"],
    chose: "Harvard",
    intendedFocus: "Political science",
    activities: [
      "Senior class president",
      "Singing",
      "Volunteer work",
      "Student-athlete",
    ],
    background:
      "First-generation college student; she and her twin sister Nicole were each independently accepted to the same five Ivy League schools and both chose Harvard. The sisters credited parental support and pursuing activities out of genuine interest rather than application strategy.",
    sources: [
      {
        label: "CBS News — New Jersey twin sisters who got in to five Ivy League schools choose Harvard",
        url: "https://www.cbsnews.com/news/new-jersey-twin-sisters-ivy-league-harvard/",
      },
    ],
  },
  {
    id: "nicole-alexander-2020",
    name: "Nicole Alexander",
    highSchool: "Clifton High School",
    location: "Clifton, NJ",
    gradYear: 2020,
    headline: "First-generation twin sister accepted to five Ivies; she and her twin both chose Harvard.",
    major: "Not publicly reported",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard", "Princeton", "Yale", "Penn", "Dartmouth"],
    chose: "Harvard",
    activities: [
      "Student council president",
      "Singing",
      "Volunteer work",
      "Student-athlete",
    ],
    background:
      "First-generation college student; she and her twin sister Jessica were each independently accepted to the same five Ivy League schools and both chose Harvard. Said: \"I've often thought, well, we've put in the time, the hard work, and we have the grades.\"",
    sources: [
      {
        label: "CBS News — New Jersey twin sisters who got in to five Ivy League schools choose Harvard",
        url: "https://www.cbsnews.com/news/new-jersey-twin-sisters-ivy-league-harvard/",
      },
    ],
  },
  {
    id: "francisca-lamini-2022",
    name: "Francisca Lamini",
    highSchool: "Keta Senior High Technical School (KETASCO)",
    location: "Keta, Ghana",
    gradYear: 2022,
    headline: "National quiz-show finalist, one of the only women in the contest's grand final in eight years, admitted to Harvard on a full ride.",
    major: "Pre-Med",
    country: "Ghana",
    gender: "Female",
    acceptedTo: ["Harvard"],
    alsoAccepted: ["Stanford"],
    acceptancesNote:
      "Reporting in Ghana noted that no student from a public Ghanaian high school had been admitted to both " +
      "Harvard and Stanford in the same cycle for more than twenty years.",
    chose: "Harvard",
    intendedFocus: "Pre-med, with a goal of Harvard Medical School or another Ivy League medical school",
    awards: ["Most Outstanding Student, 2021 National Science and Maths Quiz (NSMQ)"],
    activities: [
      "Represented KETASCO in the 2021 National Science and Maths Quiz grand finale, the only woman in the final in eight years",
      "Sat the November/December WAEC exams in her second year and came out with eight As",
      "Scored straight As on both the private November/December WAEC exams and the WASSCE",
    ],
    background:
      "Ranked at the top of her class from primary school through junior high. Her Harvard admission, confirmed by Sangu Delle (Chair of Harvard Interviews in Ghana) and announced with the American Chamber of Commerce, Ghana, generated widespread attention in Ghana.",
    sources: [
      {
        label: "MyJoyOnline — NSMQ star Francisca Lamini gains admission to Harvard University",
        url: "https://www.myjoyonline.com/nsmq-star-francisca-lamini-gains-admission-to-harvard-university/",
      },
      {
        label: "MyJoyOnline — Ketasco's Francisca Lamini scores another straight As in WASSCE",
        url: "https://www.myjoyonline.com/ketascos-francisca-lamini-scores-another-straight-as-in-wassce/",
      },
      {
        label: "Citi Newsroom — Lead NSMQ stars for Prempeh, PRESEC and Keta gain admission into world's top universities",
        url: "https://www.citinewsroom.com/2022/04/lead-nsmq-stars-for-prempeh-presec-and-keta-gain-admission-into-worlds-top-universities/",
      },
    ],
  },
  {
    id: "nama-babikier-2023",
    name: "Nama Babikier",
    highSchool: "Altoona Area High School",
    location: "Altoona, PA",
    gradYear: 2023,
    headline: "Immigrated from Sudan in second grade; deferred, then admitted to Princeton, while her twin went to Penn.",
    major: "Public Policy",
    country: "United States",
    ethnicity: "Sudanese-American",
    gender: "Female",
    acceptedTo: ["Princeton"],
    alsoAccepted: ["Johns Hopkins", "Northwestern", "University of Virginia"],
    chose: "Princeton",
    choiceReason: "Cited Princeton's public policy program as one of the best in the country.",
    intendedFocus: "Public policy",
    activities: [
      "AP world history, Spanish, chemistry, calculus and computer science",
      "Speaks three languages",
      "Changed schools three times, in three different places, before her final year",
    ],
    background:
      "Immigrated from Sudan in second grade, first to Baltimore, Maryland, then to State College, Pennsylvania in seventh grade, before finishing high school in Altoona. Was initially deferred during Princeton's early decision round before being admitted. Her twin sister Neama was admitted to and chose the University of Pennsylvania in the same cycle; the twins separated for the first time in 18 years. Their AP Spanish teacher noted they brought a \"rich background and wealth of cultural knowledge relating to their Sudanese roots.\"",
    sources: [
      {
        label: "Mountain Echo (Altoona Area High School) — Twins separate after 18 years to study at separate Ivy League schools",
        url: "https://aahsmountainecho.com/26327/features/twins-separate-after-18-years-to-study-at-separate-ivy-league-schools/",
      },
    ],
  },
  {
    id: "neama-babikier-2023",
    name: "Neama Babikier",
    highSchool: "Altoona Area High School",
    location: "Altoona, PA",
    gradYear: 2023,
    headline: "Immigrated from Sudan in second grade; committed early to Penn while her twin went to Princeton.",
    major: "Public Health",
    country: "United States",
    ethnicity: "Sudanese-American",
    gender: "Female",
    acceptedTo: ["Penn"],
    chose: "Penn",
    choiceReason: "Applied only to Penn through early decision, citing it as one of the best schools in the nation for public health.",
    intendedFocus: "Public health",
    activities: [
      "AP world history, Spanish, chemistry, calculus and computer science",
      "Speaks three languages",
      "Changed schools three times, in three different places, before her final year",
      "Applied early decision to one university and nowhere else",
    ],
    background:
      "Immigrated from Sudan in second grade, first to Baltimore, Maryland, then to State College, Pennsylvania in seventh grade, before finishing high school in Altoona. Her twin sister Nama was admitted to Princeton in the same cycle after an early-decision deferral; the twins separated for the first time in 18 years.",
    sources: [
      {
        label: "Mountain Echo (Altoona Area High School) — Twins separate after 18 years to study at separate Ivy League schools",
        url: "https://aahsmountainecho.com/26327/features/twins-separate-after-18-years-to-study-at-separate-ivy-league-schools/",
      },
    ],
  },
  {
    id: "arianna-alexander-2015",
    name: "Arianna Alexander",
    highSchool: "Kenwood Academy",
    location: "Chicago, IL",
    gradYear: 2015,
    headline: "Valedictorian with a 5.1 GPA, accepted to 26 colleges including six Ivies, picked Wharton to become a restaurateur.",
    major: "Business",
    country: "United States",
    ethnicity: "Black",
    gender: "Female",
    gpa: "5.1 (weighted)",
    acceptedTo: ["Penn"],
    totalAccepted: 26,
    acceptancesNote:
      "Accepted to 26 colleges in total, including six of the eight Ivies; reporting did not name all of them individually.",
    chose: "Penn",
    choiceReason: "Chose Penn's Wharton School of Business after a teacher, Paul Brush, introduced her to it.",
    intendedFocus: "Business, at the Wharton School, with plans to become an entrepreneur and open four restaurants",
    awards: ["Valedictorian", "Gates Millennium Scholar"],
    activities: [
      "Already drafting restaurant menus while in high school",
      "Chicago Scholars, the city's college-access program, through the whole application process",
    ],
    background:
      "Youngest of four children, from Chicago's Hyde Park neighborhood; her father, Pierre Alexander, was inspired to push her after another Kenwood Academy student had received over $1 million in scholarships years earlier. Received more than $3 million in total scholarship offers. Her father's advice: \"Work hard, pray on it, and don't give up.\"",
    sources: [
      {
        label: "Chicago Sun-Times — Arianna Alexander, Kenwood Academy valedictorian, accepted to college – 26 times",
        url: "https://chicago.suntimes.com/2015/6/15/18415792/arianna-alexander-kenwood-academy-valedictorian-accepted-to-college-26-times",
      },
      {
        label: "ABC7 Chicago — Kenwood Academy student accepted to 26 universities, offered more than $3M in scholarships",
        url: "https://abc7chicago.com/778961/",
      },
      {
        label: "The Daily Pennsylvanian — Pre-frosh accepted to 26 colleges chooses Penn",
        url: "https://thedp.com/article/2015/06/pre-frosh-accepted-to-26-colleges-chooses-penn",
      },
    ],
  },
  {
    id: "ismail-ajjawi-2019",
    name: "Ismail Ajjawi",
    highSchool: "UNRWA-run school",
    location: "Tyre, Lebanon",
    gradYear: 2019,
    headline: "Palestinian refugee-camp student won a full Harvard scholarship, then was deported at Boston's airport days before classes started.",
    major: "Not publicly reported",
    country: "Lebanon",
    ethnicity: "Palestinian",
    gender: "Male",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    activities: ["Selected for a U.S. college scholarship program run by AMIDEAST"],
    background:
      "A 17-year-old Palestinian resident of Tyre, Lebanon, educated in UNRWA-run schools for Palestinian refugees. Won a scholarship from AMIDEAST, a U.S.-based nonprofit supporting educational opportunities, to attend Harvard College. On arrival at Boston Logan International Airport days before the start of the fall 2019 semester, U.S. Customs and Border Protection questioned him for roughly eight hours, searched his phone and laptop, challenged him over friends' social media posts critical of U.S. policy, and canceled his visa, deporting him back to Lebanon. Harvard and the U.S. Embassy in Beirut worked to resolve the matter, and he arrived on campus in time for the start of classes on September 3, 2019.",
    sources: [
      {
        label: "The Harvard Crimson — Incoming Harvard Freshman Deported After Visa Revoked",
        url: "https://www.thecrimson.com/article/2019/8/27/incoming-freshman-deported/",
      },
      {
        label: "Al Jazeera — Palestinian Harvard student denied entry to US finally arrives",
        url: "https://www.aljazeera.com/news/2019/9/3/palestinian-harvard-student-denied-entry-to-us-finally-arrives",
      },
    ],
  },
  {
    id: "yonas-nuguse-2025",
    name: "Yonas Nuguse",
    highSchool: "Kalamino Special High School",
    location: "Mekelle, Tigray, Ethiopia",
    gradYear: 2025,
    headline: "War, internet blackouts, and COVID delayed his schooling for years; he was the only student from his school admitted to Harvard.",
    major: "Economics",
    country: "Ethiopia",
    gender: "Male",
    acceptedTo: ["Harvard"],
    alsoAccepted: ["Columbia", "Amherst"],
    chose: "Harvard",
    intendedFocus: "Economics",
    activities: [
      "Took a gap year to independently study for and save money to take the TOEFL exam in Addis Ababa",
      "Travelled to Addis Ababa to sit the TOEFL, since it could not be taken where he lived",
    ],
    awards: [
      "675 out of 700 on the Ethiopian school-leaving examination",
      "A near-perfect TOEFL score",
    ],
    background:
      "The Tigray conflict, internet and phone shutdowns, and the COVID-19 pandemic made it impossible for him to finish high school on time, and he took a gap year to study and save money for his TOEFL exam, which he took in Addis Ababa. Kalamino Special High School, in Tigray's capital Mekelle, serves gifted students from underprivileged backgrounds across the region; he was the only student from his school admitted to Harvard that year. When the Trump administration signed a June 2025 directive seeking to block Harvard's international students from entering the U.S., his ability to enroll for the fall term was thrown into uncertainty even after he had already received a visa and admission offer.",
    essayNote:
      "Said: \"The war affected me a great deal and when I found out the news that I was accepted to Harvard, I was ecstatic.\"",
    sources: [
      {
        label: "WCAX — A Harvard acceptance fulfilled a dream for a student in Ethiopia. Trump's order stands in his way",
        url: "https://www.wcax.com/2025/06/05/harvard-acceptance-fulfilled-dream-student-ethiopia-trumps-order-stands-his-way/",
      },
      {
        label: "Click On Detroit (AP) — A Harvard acceptance fulfilled a dream for a student in Ethiopia. Trump's order stands in his way",
        url: "https://www.clickondetroit.com/news/politics/2025/06/05/a-harvard-acceptance-fulfilled-a-dream-for-a-student-in-ethiopia-trumps-order-stands-in-his-way/",
      },
    ],
  },
  {
    id: "nigel-wade-2017",
    name: "Nigel Wade",
    highSchool: "Lakota East High School",
    location: "Liberty Township, OH",
    gradYear: 2017,
    headline: "One of four quadruplet brothers, all accepted to Harvard and Yale, who all chose Yale together.",
    major: "Not publicly reported",
    country: "United States",
    ethnicity: "Black",
    gender: "Male",
    acceptedTo: ["Yale", "Harvard", "Johns Hopkins", "Vanderbilt"],
    chose: "Yale",
    choiceReason:
      "Their father, Darrin Wade, said Yale \"won\" on financial aid: \"They made the best offer, and it was the benchmark for my sons.\" Nigel added that \"the school treated us like family.\"",
    activities: ["Track", "Football", "Soccer"],
    background:
      "One of quadruplet brothers Nigel, Nick, Aaron, and Zach Wade, all seniors at Lakota East High School who found out about their acceptances together at track practice. Their mother, Kim Wade, is a junior high school principal; their father, Darrin Wade, is an engineer at General Electric. Said: \"I was just stunned. I was speechless because I didn't think, I couldn't believe that it was actually happening and I actually got in.\"",
    essayNote:
      "All four brothers wrote about growing up as one of four, each from his own side of it. The four of them " +
      "had 59 offers between them, and took Yale together.",
    sources: [
      {
        label: "TIME — This Set of Quadruplet Brothers Were All Accepted to Ivy League Colleges",
        url: "https://time.com/4732328/quadruplet-brothers-ivy-league-colleges/",
      },
      {
        label: "Inside Edition — Quadruplets Who All Got Accepted to Ivy League Schools: 'We Pick Yale!'",
        url: "https://www.insideedition.com/headlines/23117-quadruplets-who-all-got-accepted-to-ivy-league-schools-we-pick-yale",
      },
      {
        label: "NBC News — Ivy League Quads: Boys Get Accepted Into Elite Colleges",
        url: "https://www.nbcnews.com/news/nbcblk/ivy-league-quads-boys-get-accepted-elite-colleges-n743516",
      },
    ],
  },
  {
    id: "nick-wade-2017",
    name: "Nick Wade",
    highSchool: "Lakota East High School",
    location: "Liberty Township, OH",
    gradYear: 2017,
    headline: "One of four quadruplet brothers, all accepted to Harvard and Yale, who all chose Yale together.",
    major: "Not publicly reported",
    country: "United States",
    ethnicity: "Black",
    gender: "Male",
    acceptedTo: ["Yale", "Harvard", "Duke", "Georgetown", "Stanford"],
    chose: "Yale",
    choiceReason:
      "Their father, Darrin Wade, said Yale \"won\" on financial aid: \"They made the best offer, and it was the benchmark for my sons.\" Nigel added that \"the school treated us like family.\"",
    activities: ["Track", "Football", "Soccer"],
    background:
      "One of quadruplet brothers Nigel, Nick, Aaron, and Zach Wade, all seniors at Lakota East High School who found out about their acceptances together at track practice. Their mother, Kim Wade, is a junior high school principal; their father, Darrin Wade, is an engineer at General Electric.",
    essayNote:
      "All four brothers wrote about growing up as one of four, each from his own side of it. The four of them " +
      "had 59 offers between them, and took Yale together.",
    sources: [
      {
        label: "TIME — This Set of Quadruplet Brothers Were All Accepted to Ivy League Colleges",
        url: "https://time.com/4732328/quadruplet-brothers-ivy-league-colleges/",
      },
      {
        label: "Inside Edition — Quadruplets Who All Got Accepted to Ivy League Schools: 'We Pick Yale!'",
        url: "https://www.insideedition.com/headlines/23117-quadruplets-who-all-got-accepted-to-ivy-league-schools-we-pick-yale",
      },
      {
        label: "NBC News — Ivy League Quads: Boys Get Accepted Into Elite Colleges",
        url: "https://www.nbcnews.com/news/nbcblk/ivy-league-quads-boys-get-accepted-elite-colleges-n743516",
      },
    ],
  },
  {
    id: "aaron-wade-2017",
    name: "Aaron Wade",
    highSchool: "Lakota East High School",
    location: "Liberty Township, OH",
    gradYear: 2017,
    headline: "One of four quadruplet brothers, all accepted to Harvard and Yale, who all chose Yale together.",
    major: "Not publicly reported",
    country: "United States",
    ethnicity: "Black",
    gender: "Male",
    acceptedTo: ["Yale", "Harvard", "Stanford"],
    chose: "Yale",
    choiceReason:
      "Visited Stanford's campus and said, \"I loved it as well,\" but chose Yale, saying, \"Yale made sense logistically, and it's an amazing school.\"",
    activities: ["Track", "Football", "Soccer"],
    background:
      "One of quadruplet brothers Nigel, Nick, Aaron, and Zach Wade, all seniors at Lakota East High School who found out about their acceptances together at track practice. Their mother, Kim Wade, is a junior high school principal; their father, Darrin Wade, is an engineer at General Electric.",
    essayNote:
      "All four brothers wrote about growing up as one of four, each from his own side of it. The four of them " +
      "had 59 offers between them, and took Yale together.",
    sources: [
      {
        label: "TIME — This Set of Quadruplet Brothers Were All Accepted to Ivy League Colleges",
        url: "https://time.com/4732328/quadruplet-brothers-ivy-league-colleges/",
      },
      {
        label: "Inside Edition — Quadruplets Who All Got Accepted to Ivy League Schools: 'We Pick Yale!'",
        url: "https://www.insideedition.com/headlines/23117-quadruplets-who-all-got-accepted-to-ivy-league-schools-we-pick-yale",
      },
      {
        label: "NBC News — Ivy League Quads: Boys Get Accepted Into Elite Colleges",
        url: "https://www.nbcnews.com/news/nbcblk/ivy-league-quads-boys-get-accepted-elite-colleges-n743516",
      },
    ],
  },
  {
    id: "zach-wade-2017",
    name: "Zach Wade",
    highSchool: "Lakota East High School",
    location: "Liberty Township, OH",
    gradYear: 2017,
    headline: "One of four quadruplet brothers, all accepted to Harvard and Yale, who all chose Yale together.",
    major: "Not publicly reported",
    country: "United States",
    ethnicity: "Black",
    gender: "Male",
    acceptedTo: ["Yale", "Harvard", "Cornell"],
    chose: "Yale",
    choiceReason:
      "Their father, Darrin Wade, said Yale \"won\" on financial aid: \"They made the best offer, and it was the benchmark for my sons.\" Nigel added that \"the school treated us like family.\"",
    activities: ["Track", "Football", "Soccer"],
    background:
      "One of quadruplet brothers Nigel, Nick, Aaron, and Zach Wade, all seniors at Lakota East High School who found out about their acceptances together at track practice. Said he preferred individual recognition to being grouped together: \"I like to have my own name and have my own identity. I like being able to have a responsibility for my own actions and people to see me for who I am and not just part of a bigger group.\"",
    essayNote:
      "All four brothers wrote about growing up as one of four, each from his own side of it. The four of them " +
      "had 59 offers between them, and took Yale together.",
    sources: [
      {
        label: "TIME — This Set of Quadruplet Brothers Were All Accepted to Ivy League Colleges",
        url: "https://time.com/4732328/quadruplet-brothers-ivy-league-colleges/",
      },
      {
        label: "Inside Edition — Quadruplets Who All Got Accepted to Ivy League Schools: 'We Pick Yale!'",
        url: "https://www.insideedition.com/headlines/23117-quadruplets-who-all-got-accepted-to-ivy-league-schools-we-pick-yale",
      },
      {
        label: "NBC News — Ivy League Quads: Boys Get Accepted Into Elite Colleges",
        url: "https://www.nbcnews.com/news/nbcblk/ivy-league-quads-boys-get-accepted-elite-colleges-n743516",
      },
    ],
  },
  {
    id: "ziad-ahmed-2017",
    name: "Ziad Ahmed",
    highSchool: "Princeton Day School",
    location: "Princeton, NJ",
    gradYear: 2017,
    headline: "Answered Stanford's \"What matters to you, and why?\" by writing #BlackLivesMatter one hundred times.",
    major: "Political Science",
    country: "United States",
    ethnicity: "Bangladeshi-American",
    gender: "Male",
    acceptedTo: ["Stanford", "Yale", "Princeton"],
    chose: "Yale",
    intendedFocus: "Politics and social media's effect on policy-making",
    activities: [
      "Founded Redefy, a youth organization built to challenge stereotypes and advance equality",
      "Co-founded JUV Consulting, a Gen Z marketing agency, while still at school",
      "Worked on Hillary Clinton's presidential campaign and on Martin O'Malley's youth campaign",
      "Gave a TEDx talk in 2015 on the damage stereotypes do",
    ],
    awards: [
      "Recognised by the Obama administration as a Muslim-American change-maker and invited to the White House Iftar dinner",
    ],
    background:
      "A Bangladeshi-American Muslim student in New Jersey. He graduated from Yale in 2021, where his research was on " +
      "social media's effect on policy-making, and was named to the Forbes 30 Under 30 list at 19.",
    essayNote:
      "Stanford's supplement asks \"What matters to you, and why?\" and sets a 100-word minimum. He answered with " +
      "\"#BlackLivesMatter\" written one hundred times and nothing else. Asked why, he said his faith was the reason " +
      "— \"To me, to be Muslim is to be a BLM ally\" — and of the acceptance, that it was " +
      "\"quite refreshing to see that they view my unapologetic activism as an asset rather than a liability.\"",
    sources: [
      {
        label: "The Stanford Daily — Admit's outside-the-box essay says #BlackLivesMatter — 100 times",
        url: "https://stanforddaily.com/2017/04/05/admits-outside-the-box-essay-says-blacklivesmatter-100-times/",
      },
      {
        label: "TIME — Teen writes #BlackLivesMatter 100 times on his Stanford application. He got in",
        url: "https://time.com/4728113/ziad-ahmed-stanford-black-lives-matter/",
      },
      {
        label: "NBC News — Teen accepted to Stanford after writing #BlackLivesMatter 100 times on application",
        url: "https://www.nbcnews.com/news/us-news/teen-accepted-stanford-after-writing-blacklivesmatter-100-times-application-n742586",
      },
      {
        label: "Ziad Ahmed — full biography (his own site)",
        url: "https://www.ziadahmed.me/full-bio",
      },
    ],
  },
  {
    id: "abigail-mack-2021",
    name: "Abigail Mack",
    highSchool: "Cardinal Spellman High School",
    location: "Brockton, MA",
    gradYear: 2021,
    headline: "An essay that opens \"I hate the letter S\" — about losing one parent — and 20 million views for it.",
    major: "International Relations",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard"],
    chose: "Harvard",
    intendedFocus: "Foreign relations, alongside theatre and political work",
    activities: [
      "Valedictorian of Cardinal Spellman High School",
      "Theatre — rehearsals and performance, the activity the essay turns on",
      "Volleyball and dance",
      "Fellow on Senator Ed Markey's re-election campaign",
      "Phone-banked for Joe Biden's presidential campaign",
    ],
    background:
      "Her mother, Julie-Ann, a dance teacher, died of cancer in 2014 when Abigail was 12. She filled the months after " +
      "with as many activities as would fit, and the essay is about which of them turned out to be more than " +
      "distraction. Her TikTok account explaining the essay passed 100,000 followers, with one clip near 16.5 million " +
      "views, and she has since made college-application guidance the subject of it.",
    essayNote:
      "It begins \"I hate the letter S\" — the letter that separates \"parents\" from \"parent\". She wrote: " +
      "\"I used to have two parents, but now I have one, and the S in parents isn't going anywhere.\" The essay ends on " +
      "the other word the letter gave her, the double S in \"passion\". Excerpt only; the full text is in her own videos.",
    sources: [
      {
        label: "The Boston Globe — Bridgewater student's Harvard admissions essay goes viral on TikTok",
        url: "https://www.bostonglobe.com/2021/05/12/metro/bridgewater-students-harvard-admissions-essay-about-finding-passion-life-after-losing-her-mother-cancer-goes-viral-tiktok/",
      },
      {
        label: "Boston.com — \"I hate the letter S\": the essay that helped a Bridgewater teen into Harvard",
        url: "https://www.boston.com/news/local-news/2021/05/13/i-hate-the-letter-s-this-college-essay-on-the-loss-of-a-parent-helped-a-bridgewater-teen-into-harvard-and-went-viral/",
      },
      {
        label: "NBC Boston — Harvard-bound student's emotional admissions essay goes viral",
        url: "https://www.nbcboston.com/news/local/harvard-bound-high-school-students-emotional-admissions-essay-goes-viral/2378904/",
      },
    ],
  },
  {
    id: "brittany-stinson-2016",
    name: "Brittany Stinson",
    highSchool: "Concord High School",
    location: "Wilmington, DE",
    gradYear: 2016,
    headline: "Wrote her Common App essay about Costco and was admitted to five Ivies and Stanford.",
    major: "Neuroscience",
    country: "United States",
    gender: "Female",
    gpa: "4.0",
    acceptedTo: ["Yale", "Columbia", "Penn", "Dartmouth", "Cornell"],
    alsoAccepted: [
      "Stanford", "Johns Hopkins", "Northwestern",
      "Boston University", "New York University",
    ],
    chose: "Stanford",
    choiceReason:
      "She told an interviewer she wanted the interdisciplinary side of it as much as the science: " +
      "\"Stanford is more known for STEM, but many of its humanities departments are some of the best in the world.\"",
    intendedFocus: "Neuroscience, on a pre-med track, without dropping the humanities",
    activities: [
      "First in her class at Concord High School, on the most demanding course load the school offered",
      "Eight Advanced Placement classes",
      "President of the National Honor Society",
      "Vice-president of the Science Honor Society",
      "Genetics research with a University of Delaware professor",
      "Volunteered at a local hospital",
      "Dance — the subject of the other essay she drafted and abandoned",
    ],
    background:
      "An only child of Terry and Joe Stinson; her mother emigrated from Brazil and had become a U.S. citizen a few " +
      "years earlier. Neither parent attended an Ivy or Stanford.",
    essayNote:
      "The Common App prompt asks for a background or interest so meaningful the application would be incomplete " +
      "without it, and she used a warehouse store as the shape of her own curiosity: \"I sampled calculus, " +
      "cross-country running, scientific research, all of which are now household favorites.\" On why she did not " +
      "play it safe: \"I couldn't afford to go via the traditional route. I would actually be more worried about " +
      "taking a traditional route at the risk of blending in.\" Excerpt only — the full essay is at the sources.",
    sources: [
      {
        label: "NBC News — Essay about love for Costco wins student admission to five Ivies",
        url: "https://www.nbcnews.com/feature/college-game-plan/essay-about-love-costco-wins-student-admission-five-ivies-n551601",
      },
      {
        label: "ABC News — Student accepted into 5 Ivy League schools after penning essay about her love of Costco",
        url: "https://abcnews.com/Lifestyle/student-accepted-ivy-league-schools-penning-essay-love/story?id=38255470",
      },
      {
        label: "Essay Hell — How Brittany Stinson wrote her Costco essay (interview)",
        url: "https://www.essayhell.com/2016/05/brittany-stinson-wrote-costco-essay/",
      },
    ],
  },
  {
    id: "carolina-williams-2017",
    name: "Carolina Williams",
    highSchool: "Ravenwood High School",
    location: "Brentwood, TN",
    gradYear: 2017,
    headline: "Got into Yale with 200 words about ordering Papa John's — and turned Yale down.",
    major: "Business",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Yale"],
    alsoAccepted: ["Auburn"],
    chose: "Auburn",
    choiceReason:
      "She picked Auburn's honors college over Yale: she wanted to stay in the South, liked the school spirit, and " +
      "the cost was the practical half of it. She also noted that Auburn has a Papa John's in the student center.",
    intendedFocus: "Business, in Auburn's honors college",
    activities: [
      "Top ten in her graduating class at Ravenwood High School",
      "Model United Nations",
      "Youth in Government",
      "Member of several honor societies",
    ],
    background:
      "From Brentwood, Tennessee, and the first in her family to go to college. Papa John's sent her gift cards after " +
      "the story spread.",
    essayNote:
      "Yale's supplement asked her to describe something she loves to do in 200 words or fewer, and she wrote about " +
      "ordering Papa John's. The admissions officer wrote back on the acceptance: \"As a fellow lover of pizza, I " +
      "laughed out loud (then ordered pizza) after reading your application.\" Her advice afterwards: \"Just write " +
      "about what's reflective of you... Try to be creative and think outside the box but just do what comes " +
      "naturally too.\"",
    sources: [
      {
        label: "ABC News — Girl gets into Yale after penning essay on Papa John's pizza",
        url: "https://abcnews.com/Lifestyle/girl-yale-penning-essay-papa-johns-pizza/story?id=47765374",
      },
      {
        label: "The Washington Post — Yale loved her Papa John's pizza college application essay, but she chose Auburn",
        url: "https://www.washingtonpost.com/news/grade-point/wp/2017/06/04/the-papa-johns-pizza-admissions-essay-that-yale-loved/",
      },
    ],
  },
  {
    id: "eden-obeng-kyei-2022",
    name: "Eden Nana Obeng Kyei",
    highSchool: "Prempeh College",
    location: "Kumasi, Ghana",
    gradYear: 2022,
    headline: "Anchored the team that won Ghana's national science quiz, then became the first student from a public Ghanaian school in years to get into Caltech.",
    major: "Computer Science",
    country: "Ghana",
    gender: "Male",
    acceptedTo: ["Caltech"],
    alsoAccepted: ["NYU Abu Dhabi"],
    chose: "Caltech",
    intendedFocus: "Computer science",
    activities: [
      "Anchor of Prempeh College's 2021 National Science and Maths Quiz team, which won the school's fifth national title with 53 points in the final",
    ],
    awards: [
      "Eight As in the West African Senior School Certificate Examination",
      "NSMQ national champion, 2021",
    ],
    background:
      "Caltech admitted 235 of 8,367 applicants that year, 6.7%. Ghana's NSMQ organisers said he was the first " +
      "student from a public Ghanaian high school in years to be admitted there. He went on to study computer " +
      "science at Caltech.",
    sources: [
      {
        label: "MyJoyOnline — Prempeh College's NSMQ 2021 finalist gains admission to California Institute of Technology",
        url: "https://www.myjoyonline.com/prempeh-colleges-nsmq-2021-finalist-gains-admission-to-california-institute-of-technology/",
      },
      {
        label: "Citi Newsroom — Lead NSMQ stars for Prempeh, PRESEC and Keta gain admission into world's top universities",
        url: "https://www.citinewsroom.com/2022/04/lead-nsmq-stars-for-prempeh-presec-and-keta-gain-admission-into-worlds-top-universities/",
      },
    ],
  },
  {
    id: "prince-debrah-2022",
    name: "Prince Appiah Debrah Jr.",
    highSchool: "Presbyterian Boys' Senior High School (PRESEC-Legon)",
    location: "Legon, Ghana",
    gradYear: 2022,
    headline: "Fourteen American universities in one cycle from a public Ghanaian school — MIT among them.",
    major: "Computer Science",
    country: "Ghana",
    gender: "Male",
    acceptedTo: [
      "MIT", "Stanford", "Columbia", "Cornell", "Penn",
      "Northwestern", "Carnegie Mellon", "University of Michigan",
    ],
    totalAccepted: 14,
    acceptancesNote:
      "Fourteen U.S. universities admitted him with financial support in the 2022 cycle; reporting named eight of them.",
    chose: "MIT",
    intendedFocus:
      "Mathematics and computer science, with an interest in algorithmic reasoning, artificial intelligence and human-computer interaction",
    activities: [
      "Anchor of PRESEC-Legon's 2021 National Science and Maths Quiz team, which reached the national final",
      "School prefect at The Light Academy, Adenta",
    ],
    awards: [
      "Second-best candidate in the Adenta district in the 2018 Basic Education Certificate Examination",
      "National Science and Maths Quiz finalist, 2021",
    ],
    background:
      "MIT admitted 1,365 of 33,240 applicants that year, 4.1%. He graduated from MIT with a computer science " +
      "degree in 2026.",
    sources: [
      {
        label: "MyJoyOnline — PRESEC's NSMQ finalist receives admission to 14 universities in US",
        url: "https://www.myjoyonline.com/presecs-nsmq-finalist-receives-admission-to-14-universities-in-us/",
      },
      {
        label: "The Business & Financial Times — Presec's 2021 NSMQ finalist courted by 14 top US schools",
        url: "https://thebftonline.com/2022/04/13/presecs-2021-nsmq-finalist-courted-by-14-top-us-schools/",
      },
      {
        label: "MyJoyOnline — NSMQ participant and Presec-Legon alumnus Prince Debrah graduates from MIT",
        url: "https://www.myjoyonline.com/nsmq-participant-and-presec-legon-alumnus-prince-debrah-graduates-from-mit/",
      },
    ],
  },
  {
    id: "jeramy-botwe-2019",
    name: "Jeramy Botwe",
    highSchool: "Harmony School of Advancement",
    location: "Houston, TX",
    gradYear: 2019,
    headline: "Fifteen applications, fifteen acceptances, raised by a single father who came from Ghana to join the Air Force.",
    major: "Biology/Pre-Med",
    country: "United States",
    ethnicity: "Ghanaian-American",
    gender: "Male",
    gpa: "4.51 (weighted)",
    acceptedTo: [
      "Brown", "Columbia", "Cornell", "Dartmouth",
      "Harvard", "Princeton", "Penn", "Yale",
    ],
    alsoAccepted: [
      "Stanford", "MIT", "Duke", "Rice",
      "University of Chicago", "University of Texas at Austin", "University of Houston",
    ],
    totalAccepted: 15,
    chose: "Stanford",
    intendedFocus:
      "Pre-med, aiming at treatments for multiple sclerosis and ALS; he graduated from Stanford in human biology with a minor in African and African American studies",
    activities: [
      "Valedictorian of his graduating class",
      "Studied at least two hours a day, every day, which is what he says the results came from",
    ],
    background:
      "Raised by his father Kenneth, a single parent who moved from Ghana to the United States as a teenager to " +
      "join the Air Force. He now works as a clinical research coordinator at Texas Children's Hospital.",
    sources: [
      {
        label: "ABC13 Houston — Jeramy Botwe of Houston accepted into 8 Ivy League schools",
        url: "https://abc13.com/teen-accepted-into-college-ivy-league-leave-15-colleges/5230483/",
      },
      {
        label: "KHOU — Tomball teen accepted to 15 colleges, credits dad for discipline and motivation",
        url: "https://www.khou.com/article/features/tomball-teen-accepted-to-15-colleges-credits-dad-for-discipline-motivation/285-cadf0fac-1a96-490b-93dc-569bebb03c37",
      },
      {
        label: "Stanford Profiles — Jeramy Botwe",
        url: "https://profiles.stanford.edu/jeramy-botwe",
      },
    ],
  },
  {
    id: "femi-ositade-2024",
    name: "Oluwafemi Ositade",
    highSchool: "The Ambassadors College, Ota",
    location: "Ota, Ogun State, Nigeria",
    gradYear: 2024,
    headline: "Fourteen offers across three countries worth $3.5m, on a perfect SAT maths score and the second-best UTME in Nigeria.",
    major: "Physics",
    country: "Nigeria",
    gender: "Male",
    sat: 1560,
    acceptedTo: ["Harvard", "Brown", "Duke"],
    alsoAccepted: [
      "University of Toronto", "Wesleyan University",
      "Carnegie Mellon University in Qatar", "University of Miami",
      "Howard University", "Drexel University",
      "Stetson University", "Fisk University",
    ],
    totalAccepted: 14,
    acceptancesNote:
      "Fourteen offers in total, worth $3,511,582 between them, nine of which were full rides covering tuition, " +
      "accommodation and living costs. Eleven were named in reporting.",
    chose: "Harvard",
    intendedFocus:
      "Computational physics, out of an interest in quantum computing and mathematics; his own profile lists computer science, physics and economics at Harvard",
    activities: [
      "Scored 800 out of 800 on SAT mathematics and 760 on reading and writing",
      "Second-best UTME result in Nigeria in 2023, at 358",
      "Eight As and a B2 in the 2023 WASSCE",
      "Sat SAT, IELTS and A-level preparation alongside the Nigerian curriculum at his school",
    ],
    background:
      "He finished secondary school at The Ambassadors College in Ota with a 4.0 average and went on to a 4.04 " +
      "college GPA before applying abroad. Asked how he had done it, he credited his faith first.",
    sources: [
      {
        label: "Vanguard (Nigeria) — Nigerian teenager Femi Ositade bags scholarships from Harvard and 13 foreign universities",
        url: "https://www.vanguardngr.com/2024/04/nigerian-teenager-femi-ositade-bags-scholarships-from-harvard-13-foreign-universities/",
      },
      {
        label: "BusinessDay (Nigeria) — Nigerian teenager wins 14 scholarships to Harvard and others worth $3.5m",
        url: "https://businessday.ng/news/article/nigerian-teenager-wins-14-scholarships-to-harvard-others-worth-3-5m/",
      },
      {
        label: "Oluwafemi Ositade — his own profile, listing Harvard",
        url: "https://ng.linkedin.com/in/oluwafemiositade",
      },
    ],
  },
  {
    id: "kaylee-razo-2025",
    name: "Kaylee Razo",
    highSchool: "Detroit Cristo Rey High School",
    location: "Detroit, MI",
    gradYear: 2025,
    headline: "Born in a Mexican fishing town, valedictorian in southwest Detroit, eleven acceptances and eleven full rides.",
    major: "Government",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Female",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Georgetown", "University of Notre Dame"],
    totalAccepted: 11,
    acceptancesNote:
      "She applied to eleven colleges and was admitted to all eleven, each with a full-ride offer; five were named " +
      "in reporting.",
    chose: "Harvard",
    choiceReason:
      "In her words: \"There was something about the vibe of Boston, of Cambridge. It really hooked me.\"",
    intendedFocus: "Government and economics, on a pre-law track, aiming to practise immigration law",
    activities: [
      "Valedictorian of her class",
      "Cristo Rey's Corporate Work Study Program: one day a week in a professional workplace, for four years",
      "Leadership Enterprise for a Diverse America (LEDA)",
      "Internship in the City of Detroit mayor's office",
    ],
    awards: [
      "Gates Scholarship — 300 awarded a year, under 1% of applicants, covering the full cost of attendance",
    ],
    background:
      "She was raised in a small fishing town in Mexico and is the first in her family to go to college; she has " +
      "said that college once felt \"really unfeasible\" and \"extremely inaccessible\". Nobody from her school had " +
      "been admitted to Harvard before, and only one student before her to any Ivy League school. Her advice: " +
      "\"If you behave like everyone else, you're going to be like everyone else.\"",
    sources: [
      {
        label: "Click On Detroit (WDIV) — Against the odds, SW Detroit student charts bold path from fishing town to Ivy League",
        url: "https://www.clickondetroit.com/news/local/2025/05/02/against-the-odds-sw-detroit-student-charts-bold-path-from-fishing-town-to-ivy-league/",
      },
      {
        label: "Metro Detroit News — First-generation Detroit high school student awarded full ride to Harvard and 11 other universities",
        url: "https://themetrodetroitnews.com/first-generation-detroit-high-school-student-awarded-full-ride-to-harvard-11-other-universities/",
      },
    ],
  },
  {
    id: "mantavius-presley-2025",
    name: "Mantavius Presley",
    highSchool: "Douglas County High School",
    location: "Douglasville, GA",
    gradYear: 2025,
    headline: "Known at school as \"LeBron,\" accepted to 58 colleges with a combined $1m in scholarship offers.",
    major: "Business",
    country: "United States",
    ethnicity: "African-American",
    gender: "Male",
    acceptedTo: ["Morehouse College", "Howard University", "Mercer University"],
    alsoAccepted: ["Xavier University of Louisiana", "University of Alabama"],
    totalAccepted: 58,
    acceptancesNote:
      "Accepted to 58 colleges in total, with a combined $1,000,000 in scholarship offers between them; five were named in reporting.",
    chose: "Morehouse College",
    intendedFocus: "Business",
    activities: [
      "President of Future Business Leaders of America",
      "President of the National Honor Society",
      "Vice president of student government",
      "Vice president of the Class of 2025",
      "Manager of the school's cheer teams",
      "More than 1,100 hours of community service",
    ],
    background:
      "A senior at Douglas County High School outside Atlanta, nicknamed \"LeBron\" by classmates. Local coverage " +
      "did not report his GPA or test scores alongside the scholarship total.",
    sources: [
      {
        label: "Atlanta News First — Douglas County teen earns more than $1 million in scholarships, 58 acceptances",
        url: "https://www.atlantanewsfirst.com/2025/03/17/douglas-county-teen-earns-more-than-1-million-scholarships-58-acceptances/",
      },
      {
        label: "FOX 5 Atlanta — Million-dollar scholar: Douglas County HS senior accepted to 58 schools",
        url: "https://www.fox5atlanta.com/news/million-dollar-scholar-douglas-county-hs-senior-accepted-58-schools",
      },
      {
        label: "11Alive — Viral Douglas County student chooses Morehouse after 58 acceptances",
        url: "https://www.11alive.com/article/news/community/douglas-county-senior-earns-1m-scholarships-chooses-morehouse/85-800b6fc8-7040-426d-bc39-e65d839124fe",
      },
    ],
  },
  {
    id: "lamont-newell-2025",
    name: "Lamont Newell",
    highSchool: "Verbum Dei Jesuit High School",
    location: "Los Angeles, CA",
    gradYear: 2025,
    headline: "Valedictorian who slept in the family car during periods of homelessness, accepted to 65 of the 70 colleges he applied to.",
    major: "Industrial Engineering",
    country: "United States",
    ethnicity: "African-American",
    gender: "Male",
    gpa: "4.4",
    acceptedTo: ["Columbia"],
    totalAccepted: 65,
    acceptancesNote:
      "Applied to 70 colleges and was accepted to 65 of them, on a promise he made himself on his mother's behalf, " +
      "since she never got to apply to as many schools as she wanted. Columbia was the only one named in reporting.",
    chose: "Columbia",
    choiceReason: "A full-ride scholarship to study industrial engineering.",
    intendedFocus: "Industrial engineering",
    activities: [
      "Valedictorian of his graduating class",
      "Robotics team",
      "Nominated by his biology teacher, a robotics team director, to attend a NASA program in Houston in tenth grade",
      "Relied on after-school programs for stability through repeated periods of family homelessness",
    ],
    background:
      "His family experienced repeated bouts of homelessness through his childhood, at times sleeping in their car, " +
      "alongside gang violence and incarceration in the family. He credits an after-school biology teacher's NASA " +
      "nomination with sparking his interest in engineering, and plans to start a nonprofit teaching children to " +
      "build computers and exposing them to STEM careers.",
    sources: [
      {
        label: "AfroTech — Valedictorian Lamont Newell, Who Battled Homelessness, Is Heading To Columbia University To Study Industrial Engineering",
        url: "https://afrotech.com/valedictorian-lamont-newell-is-headed-to-an-ivy-league-school",
      },
      {
        label: "ABC News — High school senior speaks out after getting accepted to 65 colleges",
        url: "https://abcnews.com/GMA/Living/high-school-senior-speaks-after-accepted-65-colleges/story?id=132774424",
      },
      {
        label: "Face2Face Africa — Teen who battled homelessness and got accepted into 65 colleges commits to Columbia University",
        url: "https://face2faceafrica.com/article/teen-who-battled-homelessness-and-got-accepted-into-65-colleges-commits-to-columbia-university",
      },
    ],
  },
  {
    id: "olivia-connie-perkins-2026",
    name: "Olivia Connie-Perkins",
    highSchool: "Success Academy High School of the Liberal Arts",
    location: "Brooklyn, NY",
    gradYear: 2026,
    headline: "Her school's very first Ivy League admit, announced over the intercom to a class that went viral celebrating with her.",
    major: "Art History",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Brown"],
    totalAccepted: 1,
    acceptancesNote: "Only her Brown acceptance was named in reporting.",
    chose: "Brown",
    choiceReason:
      "Brown was always her first choice: its campus architecture reminded her of what she had studied in art " +
      "history, and she was drawn to the Open Curriculum.",
    intendedFocus: "Art history",
    activities: [
      "Nearly a dozen Advanced Placement courses",
      "Founded Yarn Yard, a student crochet-and-art club",
    ],
    background:
      "A first-generation college student and member of the first graduating class at Success Academy High School " +
      "of the Liberal Arts, which opened in 2022; her acceptance was announced over the school intercom in December, " +
      "and video of her classmates' reaction went viral.",
    sources: [
      {
        label: "Brooklyn Eagle — Success Academy Brooklyn senior becomes school's first Ivy League admit",
        url: "https://brooklyneagle.com/381958/success-academy-brooklyn-senior-becomes-schools-first-ivy-league-admit/",
      },
      {
        label: "Black Enterprise — Brooklyn Student Marks First Ivy League Acceptance At Success Academy High School",
        url: "https://www.blackenterprise.com/success-academy-brooklyn-ivy-league-olivia-connie-perkins-brown-university/",
      },
      {
        label: "theGrio — Brooklyn teen's Ivy League acceptance brings entire classroom to its feet",
        url: "https://thegrio.com/2026/04/20/brooklyn-teen-ivy-league-acceptance-viral-reaction/",
      },
    ],
  },
  {
    id: "steven-gaxiola-urias-2025",
    name: "Steven Gaxiola Urias",
    highSchool: "Skyline High School",
    location: "Idaho Falls, ID",
    gradYear: 2025,
    headline: "Grew up moving between Mexico and the U.S. before settling in Idaho Falls; first in his family to attend college, on a full ride to Yale.",
    major: "Political Science",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Male",
    acceptedTo: ["Yale"],
    totalAccepted: 1,
    acceptancesNote: "Only his Yale acceptance was named in reporting.",
    chose: "Yale",
    intendedFocus: "Political science and women's studies, with law school and immigration law as the eventual goal",
    activities: [],
    background:
      "Born in Utah, he grew up moving between Mexico and the United States before his family settled in Idaho " +
      "Falls about seven years before he graduated. A first-generation college student, he hopes to become an " +
      "immigration attorney and eventually run for office.",
    sources: [
      {
        label: "East Idaho News — Local high school graduate will be headed to Ivy League school",
        url: "https://www.eastidahonews.com/2025/05/local-high-school-graduate-will-be-headed-to-ivy-league-school/",
      },
    ],
  },
  {
    id: "stefan-stoykov-2015",
    name: "Stefan Stoykov",
    highSchool: "North Central High School",
    location: "Indianapolis, IN",
    gradYear: 2015,
    headline: "Arrived from Bulgaria at eight speaking no English; ten years later, accepted to all eight Ivy League schools with a perfect SAT.",
    major: "Undeclared",
    country: "United States",
    ethnicity: "Bulgarian-American",
    gender: "Male",
    sat: 1600,
    satConverted: true,
    satOriginal: "2400",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Columbia", "Brown", "Dartmouth", "Cornell", "University of Pennsylvania"],
    totalAccepted: 18,
    acceptancesNote:
      "Accepted to 18 colleges in total, including all eight Ivy League schools; three of the Ivy League offers " +
      "included a full-ride scholarship.",
    chose: "Harvard",
    activities: [
      "Valedictorian of a graduating class of 802 students",
      "Perfect score of 2400 on the SAT",
      "$2,500 National Merit Scholarship",
      "National AP Scholar",
      "Student Council",
      "Spirit Week Chair for a student body of 3,500",
      "National Honor Society",
      "Tutoring Chair, tutoring other students",
      "Academic Quiz Bowl",
    ],
    background:
      "Born in Bulgaria, he moved to Indiana with his parents at age eight speaking no English, and was accepted " +
      "to all eight Ivy League schools about ten years later.",
    sources: [
      {
        label: "ABC7 New York — High school senior, native Bulgarian accepted into all eight Ivy Leagues",
        url: "https://abc7ny.com/post/teen-accepted-into-all-eight-ivy-leagues-just-10-years-after-arriving-in-the-us/644572/",
      },
      {
        label: "Nora Alliance — North Central Senior Accepted to Every Ivy League School",
        url: "https://www.noraindy.org/north-central-senior-accepted-to-every-ivy-league-school/",
      },
    ],
  },
  {
    id: "alexander-roman-2015",
    name: "Alexander Roman",
    highSchool: "Harding Senior High School",
    location: "St. Paul, MN",
    gradYear: 2015,
    headline: "Accepted to all eight Ivy League schools and turned every one of them down for MIT.",
    major: "STEM",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Male",
    acceptedTo: ["MIT", "Stanford", "Princeton", "Harvard"],
    totalAccepted: 20,
    acceptancesNote:
      "Accepted to 20 colleges in total, including all eight Ivy League schools, and narrowed his choice to four: " +
      "MIT, Stanford, Princeton and Harvard.",
    chose: "MIT",
    choiceReason:
      "He preferred MIT's smaller size and STEM focus, saying everyone there \"seems connected on campus\" and " +
      "\"seems focused in STEM fields.\"",
    activities: [
      "Knight Crew, a student group helping younger students transition to high school",
      "Genius Squad, a student tech-help group",
      "Starting first baseman on the school baseball team through junior year",
      "Youth leader at his church",
    ],
    background:
      "Will be the first in his family to graduate from college; his father emigrated from Mexico as a teenager.",
    sources: [
      {
        label: "Star Tribune — St. Paul Harding senior says 'no' to Ivy League",
        url: "https://www.startribune.com/st-paul-harding-senior-says-no-to-ivy-league/303311771",
      },
      {
        label: "MPR News — One chooses Harvard, the other snubs the Ivy League",
        url: "https://www.mprnews.org/story/2015/05/18/one-chooses-harvard-the-other-snubs-the-ivy-league",
      },
      {
        label: "Bring Me The News — Sweeping up the Ivy: Another St. Paul student admitted to entire Ivy League",
        url: "https://bringmethenews.com/minnesota-news/sweeping-up-the-ivy-another-st-paul-student-admitted-to-entire-ivy-league",
      },
    ],
  },
  {
    id: "salman-chowdhury-2025",
    name: "Salman Chowdhury",
    highSchool: "STEM Academy at Passaic County Technical-Vocational Schools",
    location: "Wayne, NJ",
    gradYear: 2025,
    headline: "His family won a visa lottery out of Chattogram, Bangladesh in 2009; valedictorian bound for Harvard applied math.",
    major: "Applied Mathematics",
    country: "United States",
    ethnicity: "Bangladeshi-American",
    gender: "Male",
    gpa: "4.5+",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Columbia", "University of Pennsylvania"],
    totalAccepted: 10,
    acceptancesNote:
      "Accepted to 10 of the top 25 universities in the US; five were named individually in reporting.",
    chose: "Harvard",
    intendedFocus: "Applied mathematics, economics, and computer science",
    activities: [
      "Valedictorian of the STEM Academy at PCTI",
      "President of FBLA (Future Business Leaders of America)",
      "Vice President of SkillsUSA",
      "Captain of the Varsity Foil Fencing Team",
      "Gifted & Talented program",
      "LEAP (Leaders Emerging Among Peers)",
      "History Club, Marketing Officer",
      "Class of 2025 Officer, Communications",
    ],
    awards: [
      "One of only 16 students statewide to ace the New Jersey Student Learning Assessments in 2019",
    ],
    background:
      "His family won a visa lottery in 2009 that let them immigrate from Chattogram, Bangladesh to Paterson, NJ; " +
      "he showed an early gift for mathematics.",
    sources: [
      {
        label: "TAPinto Paterson — Tough Choice...Paterson Student Accepted into Harvard, Yale, Princeton, Columbia, and University of Pennsylvania",
        url: "https://www.tapinto.net/towns/paterson/sections/education/articles/tough-choice-paterson-student-accepted-into-harvard-yale-princeton-columbia-and-university-of-pennsylvania",
      },
      {
        label: "Paterson Daily Voice — Paterson Teen Accepted Into Harvard, Yale, Princeton Reveals Early Secrets To Success",
        url: "https://dailyvoice.com/nj/paterson/harvard-bound-paterson-teen-says-3-things-his-parents-did-made-all-the-difference/",
      },
      {
        label: "The Business Standard (Bangladesh) — Bangladeshi-American Salman made it to Harvard, Princeton, Yale, and more",
        url: "https://www.tbsnews.net/features/pursuit/bangladeshi-american-salman-made-it-harvard-princeton-yale-and-more-heres-his",
      },
    ],
  },
  {
    id: "patrick-pruitt-2026",
    name: "Patrick Pruitt",
    highSchool: "Woodland High School",
    location: "Henry County, GA",
    gradYear: 2026,
    headline: "Applied to 270 colleges after reading about the previous record-holder, and was accepted to 264 of them with $17m in scholarship offers.",
    major: "Undeclared",
    country: "United States",
    gender: "Male",
    gpa: "3.8 (4.2 weighted)",
    sat: 1200,
    acceptedTo: ["Knox College"],
    totalAccepted: 264,
    acceptancesNote:
      "Applied to 270 colleges and was accepted to all but six, for a total of 264 acceptances and roughly $17 " +
      "million in scholarship offers combined; only Knox College was individually named in reporting.",
    chose: "Knox College",
    choiceReason: "A scholarship package worth about $260,000, leaving roughly $5,000 owed per term.",
    activities: [
      "Varsity cross country",
      "Varsity track",
      "Internship at the Henry County Water Authority",
    ],
    background:
      "Graduated in the top 10% of his class; his SAT score qualified him for free tuition at any Georgia public " +
      "college or university. He decided to break the national college-acceptance record after reading about " +
      "Madison Crowell, the previous record-holder.",
    sources: [
      {
        label: "WSB-TV (Atlanta) — High school graduate accepted to 264 colleges, earns $17 million in scholarships",
        url: "https://www.wsbtv.com/news/local/metro-atlanta-high-school-graduate-accepted-264-colleges-earns-17-million-scholarships/H5GVD4RQVVAVZKV6JAIMA4N5EU/",
      },
      {
        label: "Henry County Schools — Woodland High School Graduate Accepted to 264 Colleges with $17 Million in Scholarship Offers",
        url: "https://aas.henry.k12.ga.us/academy-for-advanced-studies-news/post-details/~board/headlines-henry-county-schools-41434/post/woodland-high-school-graduate-accepted-to-264-colleges-with-17-million-in-scholarship-offers",
      },
      {
        label: "Black Enterprise — High School Graduate Earns $17M In Scholarships, Accepted To 264 Colleges",
        url: "https://www.blackenterprise.com/high-school-graduate-17m-scholarships/",
      },
    ],
  },
  {
    id: "madison-crowell-2024",
    name: "Madison Crowell",
    highSchool: "Liberty County High School",
    location: "Hinesville, GA",
    gradYear: 2024,
    headline: "Accepted into 231 colleges with $14.7m in scholarships, a record later broken by Patrick Pruitt in 2026.",
    major: "Exercise Science",
    country: "United States",
    gender: "Female",
    gpa: "3.85",
    acceptedTo: ["High Point University"],
    totalAccepted: 231,
    acceptancesNote:
      "Accepted into 231 colleges in total, with a combined $14.7 million in scholarship offers; only High Point " +
      "University, her eventual choice, was individually named in reporting.",
    chose: "High Point University",
    choiceReason: "A full-tuition scholarship.",
    intendedFocus:
      "Exercise science, with plans to pursue a doctorate in physical therapy",
    activities: [
      "Class of 2024 vice president",
      "Varsity cheerleader",
      "Student ambassador",
      "Basketball team manager",
      "National Honor Society member",
      "Yearbook managing editor",
    ],
    sources: [
      {
        label: "ABC News — High school senior accepted into 231 schools, awarded $14.7 million in scholarships",
        url: "https://abcnews.com/GMA/Living/high-school-senior-accepted-231-schools-awarded-147/story?id=109961529",
      },
      {
        label: "FOX 5 Atlanta — Georgia teen accepted into 231 schools, awarded $14.7M in scholarships",
        url: "https://www.fox5atlanta.com/news/georgia-madison-crowell-accepted-231-schools-scholarships",
      },
      {
        label: "Ed Post — 231 Colleges, $15 Million in Scholarships: How Madison Crowell Made History",
        url: "https://www.edpost.com/stories/231-colleges-15-million-in-scholarships-how-madison-crowell-made-history",
      },
    ],
  },
  {
    id: "eboni-boykin-2012",
    name: "Eboni Boykin",
    highSchool: "Normandy High School",
    location: "St. Louis, MO",
    gradYear: 2012,
    headline: "Spent much of her childhood moving between homeless shelters and sleeping in cars; accepted to Columbia on a full scholarship.",
    major: "Undeclared",
    country: "United States",
    ethnicity: "African-American",
    gender: "Female",
    gpa: "3.8",
    acceptedTo: ["Columbia"],
    totalAccepted: 1,
    acceptancesNote: "Only her Columbia acceptance was named in reporting.",
    chose: "Columbia",
    activities: [
      "Editor-in-chief of the student newspaper",
      "Varsity cheerleader",
      "Student council member",
    ],
    background:
      "Spent much of her childhood in schools across Mississippi and Missouri as her single mother struggled to " +
      "raise her and her younger siblings, often depending on homeless shelters and at times sleeping in cars. Her " +
      "goal of an Ivy League education was sparked at age 13 by a television character on The Gilmore Girls. " +
      "Graduated from Columbia in May 2016 and later wrote and directed a short film, \"Afterbirth.\"",
    sources: [
      {
        label: "NewsOne — Eboni Boykin Goes From Homeless Shelter To Columbia University",
        url: "https://newsone.com/2017697/eboni-boykin-goes-from-homeless-shelter-to-columbia-university/",
      },
      {
        label: "theGrio — High school senior overcomes homelessness to land spot in Ivy League school",
        url: "https://thegrio.com/2012/05/29/high-school-senior-overcomes-homelessness-to-land-spot-at-ivy-league-school/",
      },
      {
        label: "theGrio — Eboni Boykin: Once homeless, now thrives in Ivy League",
        url: "https://thegrio.com/2013/10/07/eboni-boykin-once-homeless-now-thrives-in-ivy-league/",
      },
    ],
  },
  {
    id: "zach-yadegari-2025",
    name: "Zach Yadegari",
    highSchool: "Unnamed high school",
    location: "San Francisco, CA",
    gradYear: 2025,
    headline: "Co-founder of a viral calorie-tracking app on a $30m revenue run rate, with a 4.0 GPA and a 34 ACT, was rejected by 15 of the 18 colleges he applied to.",
    major: "Undeclared",
    country: "United States",
    gender: "Male",
    gpa: "4.0",
    act: 34,
    acceptedTo: ["Georgia Institute of Technology", "University of Miami"],
    alsoAccepted: ["University of Texas at Austin"],
    rejectedFrom: [
      "Stanford", "MIT", "Harvard", "Yale", "Washington University in St. Louis",
      "Columbia", "University of Pennsylvania", "Princeton", "Duke", "USC",
      "University of Virginia", "NYU", "Vanderbilt", "Brown", "Cornell",
    ],
    totalAccepted: 3,
    acceptancesNote:
      "Applied to 18 top colleges and was accepted to only three: Georgia Tech, the University of Texas at Austin, " +
      "and the University of Miami, which he chose.",
    chose: "University of Miami",
    choiceReason:
      "In his words: \"If I wasn't going to optimize for the best school academically, I was going to optimize for " +
      "the best school socially.\"",
    background:
      "Co-founder of the AI calorie-tracking app Cal AI, reported to be on a roughly $30 million annual revenue " +
      "run rate; previously sold an earlier web gaming company for $100,000. His college essay and rejection list " +
      "went viral after he posted it publicly.",
    activities: [
      "Co-founder of Cal AI, an AI calorie-tracking app",
      "Founder of an earlier web gaming company, sold for $100,000",
    ],
    sources: [
      {
        label: "TechCrunch — Teen with 4.0 GPA who built the viral Cal AI app was rejected by 15 top universities",
        url: "https://techcrunch.com/2025/04/03/teen-with-4-0-gpa-who-built-the-viral-cal-ai-app-was-rejected-by-15-top-universities/",
      },
      {
        label: "The San Francisco Chronicle — Teen S.F. entrepreneur's college essay went viral after he was rejected by Stanford, Harvard and Yale",
        url: "https://www.sfchronicle.com/college-admissions/article/teen-founder-college-rejections-20263004.php",
      },
      {
        label: "FOX 5 Atlanta — Teen's $30M app didn't impress Ivy League - But Georgia Tech said Yes",
        url: "https://www.fox5atlanta.com/news/teens-30m-app-didnt-impress-ivy-league-georgia-tech-said-yes",
      },
      {
        label: "Fortune — Gen Z coder rejected by the Ivy League despite founding a $30 million app says college is 'not worth it for most people'",
        url: "https://fortune.com/2025/10/12/zach-yadegari-entrepreneur-gen-z-coder-rejected-by-the-ivy-league-despite-founding-a-30-million-app-you-dont-need-college-to-find-success-millionaire-co-founder/",
      },
    ],
  },
  {
    id: "isabella-elizondo-2026",
    name: "Isabella Elizondo",
    highSchool: "Roma High School",
    location: "Roma, TX",
    gradYear: 2026,
    headline: "Valedictorian from a small rural border town, cleared over $2 million in cumulative scholarship offers.",
    major: "Government/Pre-Law",
    country: "United States",
    ethnicity: "Mexican-American",
    gender: "Female",
    acceptedTo: ["Harvard"],
    totalAccepted: 1,
    acceptancesNote:
      "Only her Harvard acceptance was named individually in reporting, though her cumulative scholarship offers " +
      "across all schools she applied to totaled more than $2.1 million.",
    chose: "Harvard",
    choiceReason:
      "A full-tuition package worth more than $400,000, including a spot in Harvard's Rising Scholar Program, a " +
      "summer initiative valued at roughly $50,000 with a $1,500 stipend.",
    intendedFocus: "Government, with plans to become a prosecutor",
    background:
      "Valedictorian of Roma High School's Class of 2026, in what she and her school describe as a small rural " +
      "town on the Texas-Mexico border.",
    activities: [],
    sources: [
      {
        label: "KRGV — Roma High School sending two seniors to Ivy League schools on full rides",
        url: "https://www.krgv.com/news/roma-high-school-sending-two-seniors-to-ivy-league-schools-on-full-rides/",
      },
      {
        label: "Roma ISD (via X/Twitter) — Roma High School Senior Isabella Elizondo Earns Full Tuition Scholarship to Attend Harvard University",
        url: "https://x.com/RomaISD/status/2057916989297848540",
      },
    ],
  },
  {
    id: "hamza-alsamraee-2020",
    name: "Hamza Alsamraee",
    highSchool: "Unnamed high school",
    location: "United States",
    gradYear: 2020,
    headline: "Published Amazon-bestselling calculus book with 200,000 online math followers, then Harvard, MIT, Yale and Princeton all said no.",
    major: "Mathematics/Physics",
    country: "United States",
    ethnicity: "Iraqi-American",
    gender: "Male",
    gpa: "4.2",
    sat: 1560,
    acceptedTo: ["Stanford", "NYU", "West Point", "Washington University in St. Louis"],
    rejectedFrom: ["Harvard", "MIT", "Yale", "Princeton"],
    totalAccepted: 4,
    acceptancesNote:
      "Accepted to Stanford, NYU, West Point and Washington University in St. Louis; Harvard, MIT, Yale and " +
      "Princeton either waitlisted or rejected him outright.",
    chose: "Stanford",
    activities: [
      "Author of the Amazon-bestselling \"Advanced Calculus Explored: With Applications in Physics, Chemistry, and Beyond\"",
      "Ran a math and physics page with roughly 200,000 followers",
      "Third place, National Science Bowl",
      "Two-time finalist, National Chemistry Olympiad",
    ],
    awards: [
      "Arab America Foundation 20 Under 20 (2020)",
      "Strogatz Prize for Mathematics Communication, National Museum of Mathematics (2020)",
    ],
    sources: [
      {
        label: "NextShark — Student with 2 published books, 4.2 GPA and 1560 SAT score rejected by Harvard, MIT, Yale and Princeton",
        url: "https://nextshark.com/high-school-student-hamza-alsamraee-rejected-ivy-leagues",
      },
      {
        label: "Yahoo News — Student with 2 published books, 4.2 GPA and 1560 SAT score rejected by Harvard, MIT, Yale and Princeton",
        url: "https://www.yahoo.com/news/student-2-published-books-4-182005756.html",
      },
      {
        label: "Hamza Alsamraee — his own author site, listing his books",
        url: "https://hamzaalsamraee.com/books",
      },
    ],
  },
  {
    id: "priscilla-samey-2017",
    name: "Priscilla Samey",
    highSchool: "Champlin Park High School",
    location: "Brooklyn Park, MN",
    gradYear: 2017,
    headline: "Had no prom date, so she brought her Harvard acceptance letter instead; a tweet about it got 120,000 likes.",
    major: "Social Studies and Global Health and Health Policy",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard", "Yale", "Princeton", "University of Pennsylvania", "Cornell", "Columbia", "Brown"],
    totalAccepted: 7,
    acceptancesNote: "Accepted to seven Ivy League schools: Harvard, Yale, Princeton, Penn, Cornell, Columbia and Brown.",
    chose: "Harvard",
    activities: [
      "Captain of the speech team at Champlin Park High School",
    ],
    background:
      "Posted a photo with her Harvard acceptance letter as her prom \"date\" after not being asked, captioned " +
      "\"Couldn't find a man to accept me for prom so I took a college that did.\" The tweet drew more than 120,000 " +
      "likes. She went on to graduate from Harvard.",
    sources: [
      {
        label: "CBS News (Minnesota) — Minn. Teen Takes Harvard Acceptance Letter To Prom As Her 'Date'",
        url: "https://www.cbsnews.com/minnesota/news/harvard-acceptance-letter-prom/",
      },
      {
        label: "Bring Me The News — MN teen didn't get asked to prom, so brought Harvard acceptance letter as her date",
        url: "https://bringmethenews.com/minnesota-lifestyle/mn-teen-didnt-get-asked-prom-brought-harvard-acceptance-letter-date",
      },
      {
        label: "Fox News — High school senior doesn't have date for prom, takes Harvard acceptance letter instead",
        url: "https://www.foxnews.com/us/high-school-senior-doesnt-have-date-for-prom-takes-harvard-acceptance-letter-instead",
      },
    ],
  },
  {
    id: "daniela-mercado-2026",
    name: "Daniela Mercado",
    highSchool: "Waco High School",
    location: "Waco, TX",
    gradYear: 2026,
    headline: "Worked up to 25 hours a week across two part-time jobs while carrying AP and dual-credit coursework; accepted to three Ivy League schools on a Gates Scholarship.",
    major: "Law/Pre-Law",
    country: "United States",
    ethnicity: "Hispanic",
    gender: "Female",
    acceptedTo: ["Harvard"],
    totalAccepted: 3,
    acceptancesNote: "Accepted to three Ivy League schools; only Harvard, her choice, was individually named in reporting.",
    chose: "Harvard",
    intendedFocus: "Law, with the eventual goal of starting a foundation or scholarship for first-generation students",
    activities: [
      "Class president",
      "Sports",
      "Band",
      "Worked up to 25 hours a week across two part-time jobs",
    ],
    awards: [
      "The Gates Scholarship",
    ],
    background:
      "Grew up in a single-mother household, balancing part-time work with AP and dual-credit coursework as a " +
      "first-generation college student.",
    sources: [
      {
        label: "KXXV — Waco High senior accepted to 3 Ivy League schools, will attend Harvard in the fall",
        url: "https://www.kxxv.com/news/local-news/in-your-neighborhood/waco-high-senior-accepted-to-3-ivy-league-schools-will-attend-harvard-in-the-fall",
      },
    ],
  },
  {
    id: "summer-sinsley-2025",
    name: "Summer Sinsley",
    highSchool: "Columbiana High School",
    location: "Columbiana, OH",
    gradYear: 2025,
    headline: "Small-town Ohio senior, captain of speech and debate, accepted to Harvard on the Harvard Faculty Scholarship.",
    major: "Astrophysics/Mathematics",
    country: "United States",
    gender: "Female",
    act: 34,
    acceptedTo: ["Harvard"],
    totalAccepted: 1,
    acceptancesNote: "Only her Harvard acceptance was named in reporting.",
    chose: "Harvard",
    intendedFocus: "Astrophysics or mathematics, with the goal of working in applied research",
    activities: [
      "Speech and debate team all four years of high school, captain in her junior year",
      "Academic challenge team",
      "Various school clubs",
    ],
    awards: [
      "Harvard Faculty Scholarship",
    ],
    background: "An open-enrollment student at Columbiana High School in Perry Township, Ohio.",
    sources: [
      {
        label: "Salem News — Well-rounded Columbiana student is Harvard-bound",
        url: "https://www.salemnews.net/news/local-news/2025/05/well-rounded-columbiana-student-is-harvard-bound/",
      },
      {
        label: "WFMJ — Columbiana High School student accepted into Harvard",
        url: "https://www.wfmj.com/story/52740322/columbiana-high-school-student-accepted-into-harvard",
      },
      {
        label: "WKBN — Columbiana, Ohio senior Summer Sinsley accepted to Harvard University",
        url: "https://www.wkbn.com/news/local-news/columbiana-news/local-senior-accepted-to-harvard-university/",
      },
    ],
  },
  {
    id: "ohanna-carrascoza-2026",
    name: "Ohanna Carrascoza",
    highSchool: "William Howard Taft Charter High School",
    location: "Woodland Hills, CA",
    gradYear: 2026,
    headline: "Wrote her college essay about being her immigrant family's tech-savvy \"secretary\" and got into three Ivies.",
    major: "Undeclared",
    country: "United States",
    ethnicity: "Latina",
    gender: "Female",
    acceptedTo: ["Yale", "University of Pennsylvania", "Dartmouth"],
    alsoAccepted: ["University of Southern California"],
    totalAccepted: 3,
    acceptancesNote:
      "Accepted to three Ivy League schools plus five of the top ten liberal arts colleges, and offered a full-" +
      "tuition merit scholarship to USC; only the Ivies and USC were individually named in reporting.",
    chose: "Yale",
    essayNote:
      "Wrote her college essay about growing up in an immigrant household and serving as her family's " +
      "\"secretary\" — handling translations, bills, and texts because her English and tech skills were stronger " +
      "than her parents'.",
    activities: [],
    background:
      "Grew up in an immigrant household where children take on adult responsibilities early; she taught herself " +
      "the technical and administrative skills that became the subject of her college essay.",
    sources: [
      {
        label: "CNBC — I got into Yale, Penn and Dartmouth—my college essay was about my parents' struggle with technology",
        url: "https://www.cnbc.com/2026/05/01/i-got-into-yale-penn-and-dartmouthheres-what-i-wrote-about-in-my-college-essay.html",
      },
    ],
  },
  {
    id: "sienna-jones-2025",
    name: "Sienna Jones",
    highSchool: "Masuk High School",
    location: "Monroe, CT",
    gradYear: 2025,
    headline: "Applied to 28 colleges including all eight Ivies, impressed a US senator enough to get a personal letter of recommendation, and chose Harvard.",
    major: "Government/Law",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Harvard", "Cornell", "Columbia", "Brown", "University of Pennsylvania"],
    alsoAccepted: ["Georgetown", "Stanford"],
    totalAccepted: 5,
    acceptancesNote:
      "Applied to 28 schools including all eight Ivy League schools; five Ivies plus Georgetown and Stanford were " +
      "individually named in reporting.",
    chose: "Harvard",
    choiceReason: "In her words: \"I think my grades were the main driving factor... I told a good story in my essay and my leadership was strong.\"",
    intendedFocus: "Government and law",
    activities: [
      "Varsity swim team all four years, team captain her senior year",
      "Piano",
      "Impressed Senator Richard Blumenthal at a campaign event, who invited her to tour a legislative work session at the State Capitol and wrote her a letter of recommendation",
    ],
    sources: [
      {
        label: "The Monroe Sun — Masuk senior accepted by 5 Ivy League schools, Stanford and Georgetown",
        url: "https://themonroesun.com/masuk-senior-accepted-by-5-ivy-league-schools-stanford-and-georgetown/",
      },
      {
        label: "Yahoo News — Monroe senior gets accepted into 5 Ivy League schools",
        url: "https://www.yahoo.com/news/articles/monroe-senior-gets-accepted-five-201642375.html",
      },
    ],
  },
  {
    id: "pham-gia-nguyen-2026",
    name: "Pham Gia Nguyen",
    highSchool: "Hanoi-Amsterdam High School for the Gifted",
    location: "Hanoi, Vietnam",
    gradYear: 2026,
    headline: "Joined his school's robotics club almost by accident, then got into Columbia — the Ivy he thought had the lowest odds.",
    major: "Physics/Engineering",
    country: "Vietnam",
    gender: "Male",
    acceptedTo: ["Columbia"],
    alsoAccepted: ["Georgia Institute of Technology", "University of Illinois Urbana-Champaign", "Lehigh University", "University of Rochester", "Villanova University"],
    totalAccepted: 6,
    acceptancesNote:
      "Applied to four Ivy League schools and was accepted to Columbia, the one he considered least likely; also " +
      "admitted to Georgia Tech, UIUC, Lehigh, Rochester and Villanova.",
    chose: "Columbia",
    background:
      "A 12th-grade physics student who joined his school's robotics club without a strong initial interest in the " +
      "subject, then won competitions and built his college application around it. His mother's strong language " +
      "ability and his older sister's English major initially pulled him toward studying English himself, but his " +
      "robotics passion ultimately set his academic direction.",
    activities: [
      "Robotics club at Hanoi-Amsterdam High School for the Gifted",
      "Competed in and won robotics competitions",
    ],
    sources: [
      {
        label: "VnExpress International — Hanoi student's passion for robotics lands him in Ivy League school",
        url: "https://e.vnexpress.net/news/news/education/hanoi-student-s-passion-for-robotics-lands-him-in-ivy-league-school-4881906.html",
      },
    ],
  },
  {
    id: "karen-otavalo-2019",
    name: "Karen Otavalo",
    highSchool: "Science Park High School",
    location: "Newark, NJ",
    gradYear: 2019,
    headline: "Born in Ibarra, Ecuador and raised in Newark's Ironbound section, one of eight Science Park seniors accepted to Ivy League schools that year.",
    major: "Government/Law",
    country: "United States",
    ethnicity: "Ecuadorian-American",
    gender: "Female",
    acceptedTo: ["Harvard", "Princeton", "Columbia"],
    totalAccepted: 3,
    acceptancesNote: "Accepted to Harvard, Princeton and Columbia.",
    chose: "Harvard",
    intendedFocus: "Government and law",
    background:
      "Credits her teachers and her experience in the International Baccalaureate program at Science Park High " +
      "School for her success; one of eight seniors from the school admitted to Ivy League universities that year.",
    activities: [],
    sources: [
      {
        label: "Newark Board of Education — Eight Science Park High School Students Accepted to Ivy League Universities",
        url: "https://www.nps.k12.nj.us/press-releases/eight-science-park-high-school-students-accepted-to-ivy-league-universities/",
      },
    ],
  },
  {
    id: "victor-alegunlade-2019",
    name: "Victor Alegunlade",
    highSchool: "Science Park High School",
    location: "Newark, NJ",
    gradYear: 2019,
    headline: "Born in Ibadan, Nigeria and raised in Newark's South Ward, built his first robot from cardboard at age nine before heading to Cornell for mechanical engineering.",
    major: "Mechanical Engineering",
    country: "United States",
    ethnicity: "Nigerian-American",
    gender: "Male",
    acceptedTo: ["Cornell"],
    totalAccepted: 1,
    acceptancesNote: "Only his Cornell acceptance was named in reporting.",
    chose: "Cornell",
    intendedFocus: "Mechanical engineering",
    background:
      "Born in Ibadan, Nigeria and raised in Newark's South Ward; built his first cardboard robot at age nine, a " +
      "passion that carried through to his college major.",
    activities: [
      "Marching band",
      "Jazz band",
      "Multiple honor societies",
    ],
    sources: [
      {
        label: "Newark Board of Education — Eight Science Park High School Students Accepted to Ivy League Universities",
        url: "https://www.nps.k12.nj.us/press-releases/eight-science-park-high-school-students-accepted-to-ivy-league-universities/",
      },
    ],
  },
  {
    id: "katherine-hildalgo-2019",
    name: "Katherine Hildalgo",
    highSchool: "Science Park High School",
    location: "Newark, NJ",
    gradYear: 2019,
    headline: "Grew up in Newark's Ironbound neighborhood, found her path through the school robotics team, and got into Cornell for mechanical engineering.",
    major: "Mechanical Engineering",
    country: "United States",
    ethnicity: "Hispanic",
    gender: "Female",
    acceptedTo: ["Cornell"],
    totalAccepted: 1,
    acceptancesNote: "Only her Cornell acceptance was named in reporting.",
    chose: "Cornell",
    intendedFocus: "Mechanical engineering",
    background:
      "Grew up in Newark's Ironbound neighborhood and found community through hands-on learning in her school's " +
      "Tech Titans robotics club.",
    activities: [
      "Robotics team, Tech Titans Club",
      "National Honor Society",
    ],
    sources: [
      {
        label: "Newark Board of Education — Eight Science Park High School Students Accepted to Ivy League Universities",
        url: "https://www.nps.k12.nj.us/press-releases/eight-science-park-high-school-students-accepted-to-ivy-league-universities/",
      },
    ],
  },
  {
    id: "kennedy-burdine-2020",
    name: "Kennedy Burdine",
    highSchool: "Pulaski County High School",
    location: "Somerset, KY",
    gradYear: 2020,
    headline: "One of just over 1,100 QuestBridge Match Scholars nationally out of nearly 15,000 applicants, headed to Yale to study economics.",
    major: "Economics",
    country: "United States",
    gender: "Female",
    acceptedTo: ["Yale"],
    totalAccepted: 1,
    acceptancesNote: "Matched to Yale through the QuestBridge National College Match; only Yale was named in reporting.",
    chose: "Yale",
    choiceReason: "Being an Ivy League school was what first attracted her to Yale.",
    intendedFocus: "Economics, with plans to go into financial advising or brokerage",
    activities: [
      "DECA",
      "Future Problem Solving",
      "Academic team",
      "International Order of the Rainbow for Girls, a Masonic youth leadership and community-service program",
    ],
    awards: [
      "QuestBridge National College Match Scholarship",
    ],
    background:
      "From Eubank, Kentucky, in the Appalachian foothills; said her financial-advising career goal comes partly " +
      "from growing up in a community where financial education is very limited.",
    sources: [
      {
        label: "Commonwealth Journal (Somerset, KY) — Pulaski High senior earns full ride to Ivy League school",
        url: "https://www.somerset-kentucky.com/news/local_news/pulaski-high-senior-earns-full-ride-to-ivy-league-school/article_535bdb77-5fb1-5b53-8ef6-525c92a91dc5.html",
      },
    ],
  },
  {
    id: "sienna-williams-2019",
    name: "Sienna Williams",
    highSchool: "Clarksburg High School",
    location: "Clarksburg, MD",
    gradYear: 2019,
    headline: "Aspiring astronaut and NASA intern, admitted to seven of eight Ivy League schools (Dartmouth waitlisted her), chose MIT for aerospace engineering.",
    major: "Aerospace Engineering",
    country: "United States",
    ethnicity: "African-American",
    gender: "Female",
    gpa: "4.8 (weighted)",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Columbia", "Brown", "Cornell", "University of Pennsylvania"],
    alsoAccepted: ["Duke", "University of Maryland", "Virginia Tech"],
    totalAccepted: 10,
    acceptancesNote:
      "Admitted to seven of the eight Ivy League schools (Dartmouth waitlisted her), plus Duke, the University of " +
      "Maryland and Virginia Tech.",
    chose: "MIT",
    choiceReason: "Said MIT has the best astrophysics department in the country.",
    intendedFocus:
      "Aerospace engineering, with a minor in computer science and a concentration in African and African Diaspora " +
      "Studies; hopes to become an astronaut and the first person on Mars",
    activities: [
      "Played three varsity sports",
      "Worked part-time at Papa John's",
      "NASA internship",
    ],
    sources: [
      {
        label: "WUSA9 — Clarksburg High senior admitted to every Ivy League school but one",
        url: "https://www.wusa9.com/article/news/inspirational-clarksburg-high-senior-admitted-to-every-ivy-league-school-but-one/65-c006b849-dc7e-4082-9c85-af4de259393e",
      },
      {
        label: "WTOP News — Clarksburg student accepted into most Ivy League schools",
        url: "https://wtop.com/montgomery-county/2019/04/accepted-into-almost-every-ivy-league-clarksburg-student-dreams-of-becoming-an-astronaut/",
      },
      {
        label: "FOX 5 DC — Clarksburg High School senior gets into 7 of 8 Ivy League schools",
        url: "https://www.fox5dc.com/news/clarksburg-high-school-senior-gets-into-7-of-8-ivy-league-schools",
      },
    ],
  },
  {
    id: "roberta-hannah-2020",
    name: "Roberta Hannah",
    highSchool: "Springfield High School of Science and Technology",
    location: "Springfield, MA",
    gradYear: 2020,
    headline: "Knew four Ivies wanted her early on, but waited for Ivy Day to learn all eight had said yes; chose Columbia for the Harlem \"vibe.\"",
    major: "Biochemistry",
    country: "United States",
    ethnicity: "African-American",
    gender: "Female",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Columbia", "Brown", "Dartmouth", "Cornell", "University of Pennsylvania"],
    totalAccepted: 8,
    acceptancesNote: "Accepted to all eight Ivy League schools.",
    chose: "Columbia",
    choiceReason:
      "Cited the instructors in her intended majors and the \"vibe\" of a campus in the middle of Harlem.",
    intendedFocus: "Biochemistry and African-American studies",
    activities: [
      "Track and field",
      "Four AP classes, preparing for seven AP exams",
    ],
    sources: [
      {
        label: "Essence — Massachusetts Senior Gets Accepted Into All 8 Ivy League Schools",
        url: "https://www.essence.com/news/roberta-hannah-accepted-ivy-league-colleges/",
      },
      {
        label: "Blavity — This Black High School Graduate Is Going To Columbia University After Getting Accepted Into All 8 Ivy League Schools",
        url: "https://blavity.com/this-black-high-school-graduate-is-going-to-columbia-university-after-getting-accepted-into-all-8-ivy-league-schools",
      },
      {
        label: "WWLP — Springfield high school student accepted into 8 Ivy League schools",
        url: "https://www.wwlp.com/news/local-news/hampden-county/springfield-high-school-student-accepted-into-8-ivy-league-schools/",
      },
    ],
  },
  {
    id: "stephany-gutierrez-2021",
    name: "Stephany Gutierrez",
    highSchool: "Santa Ana High School",
    location: "Santa Ana, CA",
    gradYear: 2021,
    headline: "Daughter of undocumented Mexican immigrants, filmed her acceptance reaction on video, and chose Harvard to study law.",
    major: "Pre-Law",
    country: "United States",
    ethnicity: "Latina",
    gender: "Female",
    acceptedTo: ["Harvard", "Columbia", "Brown", "Dartmouth"],
    totalAccepted: 4,
    acceptancesNote: "Accepted to four Ivy League schools: Harvard, Columbia, Brown and Dartmouth.",
    chose: "Harvard",
    intendedFocus: "Pre-law, with plans to become a lawyer",
    background:
      "Daughter of undocumented immigrants from Mexico; one of three Santa Ana High School seniors headed to " +
      "Harvard that year, alongside classmates Oziel Flores and Cielo Echegoyen. Her video reaction to her " +
      "acceptances went viral.",
    activities: [],
    sources: [
      {
        label: "The Hill — Latina daughter of undocumented immigrants accepted into four Ivy League schools in touching video",
        url: "https://thehill.com/changing-america/respect/diversity-inclusion/549592-latina-daughter-of-undocumented-immigrants/",
      },
      {
        label: "mitu — Harvard-Bound Latina Daughter Of Undocumented Immigrants Accepted To Four Ivy League Schools",
        url: "https://wearemitu.com/fierce/stephany-gutierrez-harvard-bound/",
      },
      {
        label: "HipLatina — Latina Daughter of Undocumented Immigrants Headed to Harvard",
        url: "https://hiplatina.com/undocumented-daughter-harvard/",
      },
    ],
  },
  {
    id: "oziel-flores-2021",
    name: "Oziel Flores",
    highSchool: "Santa Ana High School",
    location: "Santa Ana, CA",
    gradYear: 2021,
    headline: "Son of Mexican immigrants and a first-generation college student, one of three Santa Ana High seniors headed to Harvard that fall.",
    major: "Mechanical Engineering",
    country: "United States",
    ethnicity: "Latino",
    gender: "Male",
    acceptedTo: ["Harvard", "Princeton"],
    totalAccepted: 2,
    acceptancesNote: "Accepted to Harvard and Princeton; only these two were named in reporting.",
    chose: "Harvard",
    intendedFocus: "Mechanical engineering",
    background:
      "Son of Mexican immigrants and a first-generation college student; a mentor credited his commitment to his " +
      "community and school as a factor in his admission. One of three Santa Ana High School seniors headed to " +
      "Harvard that fall, alongside classmates Stephany Gutierrez and Cielo Echegoyen.",
    activities: [],
    sources: [
      {
        label: "CBS Los Angeles — 3 Santa Ana High School Seniors Headed To Harvard In The Fall",
        url: "https://www.cbsnews.com/losangeles/news/3-santa-ana-high-school-seniors-headed-to-harvard-in-the-fall/",
      },
      {
        label: "ABC7 Los Angeles — 2 Santa Ana High School students accepted to number of Ivy League schools, including Harvard",
        url: "https://abc7.com/santa-ana-high-school-harvard-students-college-acceptance-ivy-league/10498137/",
      },
    ],
  },
  {
    id: "zi-nava-chen-2022",
    name: "Zi Nava Chen",
    highSchool: "San Diego High School",
    location: "San Diego, CA",
    gradYear: 2022,
    headline: "Grew up with food insecurity and volunteered weekly at a food distribution center; a First Gen Scholars mentee headed to Brown on a full ride.",
    major: "Undeclared",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Brown"],
    totalAccepted: 1,
    acceptancesNote: "Only his Brown acceptance was named in reporting.",
    chose: "Brown",
    activities: [
      "Weekly volunteer at a food distribution center",
      "Tutors students in Spanish",
      "First Gen Scholars program participant",
    ],
    background:
      "Grew up with food insecurity; supported through First Gen Scholars, a San Diego nonprofit for low-income, " +
      "first-generation college-bound students. Also awarded a summer study-abroad opportunity in Spain.",
    sources: [
      {
        label: "FOX 5 San Diego — San Diego students earn full-ride scholarships to Ivy League schools",
        url: "https://fox5sandiego.com/news/local-news/san-diego-students-earn-full-ride-scholarships-to-ivy-league-schools/",
      },
      {
        label: "Times of San Diego — First Gen Scholars Program Helps Local Students Earn Scholarships to Ivy League",
        url: "https://timesofsandiego.com/education/2022/05/24/first-gen-scholars-participants-san-diego-students-earn-full-ride-scholarships/",
      },
    ],
  },
  {
    id: "martin-altenburg-2017",
    name: "Martin Altenburg",
    highSchool: "Fargo North High School",
    location: "Fargo, ND",
    gradYear: 2017,
    headline: "Concertmaster and Key Club district lieutenant governor from North Dakota, accepted to all eight Ivies plus Stanford, MIT, Caltech and UChicago; chose Stanford.",
    major: "Undeclared",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Harvard", "Yale", "Cornell", "Columbia", "University of Pennsylvania", "Princeton", "Dartmouth", "Brown"],
    alsoAccepted: ["Stanford", "MIT", "Caltech", "University of Chicago"],
    totalAccepted: 12,
    acceptancesNote: "Accepted to all eight Ivy League schools plus Stanford, MIT, Caltech and the University of Chicago.",
    chose: "Stanford",
    choiceReason: "Wanted a place to grow academically and find himself as a person in California.",
    activities: [
      "Cross-country",
      "Swimming",
      "Track",
      "Orchestra and chamber orchestra, concertmaster of the North Orchestra on violin",
      "Youth symphony",
      "District lieutenant governor for Key Club",
    ],
    sources: [
      {
        label: "CNN — Martin Altenburg: ND teen gets into all 8 Ivy League schools",
        url: "https://www.cnn.com/2017/04/05/us/nd-teen-ivy-league-trnd/index.html",
      },
      {
        label: "Grand Forks Herald — Fargo student with endless elite college options decides to head west",
        url: "https://www.grandforksherald.com/news/fargo-student-with-endless-elite-college-options-decides-to-head-west",
      },
      {
        label: "KFOR — North Dakota teen gets accepted by all 8 Ivy League schools",
        url: "https://kfor.com/news/north-dakota-teen-gets-accepted-by-all-8-ivy-league-schools/",
      },
    ],
  },
  {
    id: "ziad-ahmed-2017",
    name: "Ziad Ahmed",
    highSchool: "Princeton Day School",
    location: "Princeton, NJ",
    gradYear: 2017,
    headline: "Wrote #BlackLivesMatter 100 times as his entire Common App essay and was accepted to Stanford, where he chose to enroll.",
    major: "Undeclared",
    country: "United States",
    gender: "Male",
    acceptedTo: ["Stanford"],
    alsoAccepted: ["Yale", "University of Pennsylvania"],
    totalAccepted: 3,
    chose: "Stanford",
    essayNote:
      "Responded to the Common App prompt asking students to share something meaningful to them by writing " +
      "—#BlackLivesMatter— 100 times, using the repetition itself as the essay's substance.",
    activities: [
      "Founder of Redefy, a youth-run nonprofit combating stereotypes",
      "Muslim youth advocacy and interfaith organizing",
      "Public speaking on social justice issues",
    ],
    sources: [
      {
        label: "Teen Vogue — This Teen Wrote #BlackLivesMatter 100 Times for His College Essay",
        url: "https://www.teenvogue.com/story/ziad-ahmed-black-lives-matter-college-essay",
      },
      {
        label: "HuffPost — Teen Says He Got Into Stanford By Writing 'Black Lives Matter' Over And Over",
        url: "https://www.huffpost.com/entry/ziad-ahmed-stanford-essay_n_58def275e4b03c2b30f9a6a5",
      },
    ],
  },
  {
    id: "munira-khalif-2014",
    name: "Munira Khalif",
    highSchool: "Roosevelt High School",
    location: "Minneapolis, MN",
    gradYear: 2014,
    headline: "Somali-American daughter of refugees, founded a girls' school in Kenya, and was accepted to all eight Ivy League schools; chose Harvard.",
    major: "Government",
    country: "United States",
    ethnicity: "Somali-American",
    gender: "Female",
    acceptedTo: ["Harvard", "Yale", "Princeton", "Columbia", "University of Pennsylvania", "Cornell", "Dartmouth", "Brown"],
    alsoAccepted: ["Georgetown", "University of Minnesota"],
    totalAccepted: 10,
    acceptancesNote: "Accepted to all eight Ivy League schools plus Georgetown and University of Minnesota (full-ride).",
    chose: "Harvard",
    activities: [
      "Founder of a nonprofit funding a girls' secondary school in Marsabit, Kenya",
      "Minnesota Youth Council",
      "Speaker at TEDxMinneapolis",
      "Model United Nations",
      "Debate team",
    ],
    background:
      "Born in Kenya to Somali refugee parents who fled civil war; family resettled in Minneapolis when she was young. " +
      "Returned to East Africa to help build educational access for girls.",
    sources: [
      {
        label: "Star Tribune — Munira Khalif, daughter of Somali refugees, accepted to all 8 Ivy League schools",
        url: "https://www.startribune.com/munira-khalif-daughter-of-somali-refugees-accepted-to-all-8-ivy-league-schools/251882741/",
      },
      {
        label: "ABC News — Minnesota Teen Accepted Into All 8 Ivy League Schools",
        url: "https://abcnews.go.com/US/minnesota-teen-accepted-ivy-league-schools/story?id=22833063",
      },
    ],
  },
];

export const admitSchools = Array.from(
  new Set(pastAdmits.map((a) => a.chose)),
).sort();

export const admitYears = Array.from(
  new Set(pastAdmits.map((a) => a.gradYear)),
).sort((a, b) => b - a);

export const admitMajors = Array.from(
  new Set(pastAdmits.map((a) => a.major)),
).sort();

/** Every named school on a profile, tagged with how that application ended. */
export type AdmitOutcome = "attending" | "accepted" | "rejected";

export function schoolOutcomes(a: PastAdmit): { name: string; outcome: AdmitOutcome }[] {
  const seen = new Set<string>();
  const out: { name: string; outcome: AdmitOutcome }[] = [];
  const push = (name: string, outcome: AdmitOutcome) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name, outcome });
  };
  // Attending first so it always leads the grid, matching the design.
  push(a.chose, "attending");
  for (const c of a.acceptedTo) push(c, "accepted");
  for (const c of a.alsoAccepted ?? []) push(c, "accepted");
  for (const c of a.rejectedFrom ?? []) push(c, "rejected");
  return out;
}
