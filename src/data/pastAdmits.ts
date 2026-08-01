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
    activities: ["Class salutatorian", "Alzheimer's research"],
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
      "Commencement speaker",
    ],
    awards: [
      "UN Special Envoy for Global Education's Youth Courage Award (one of nine chosen worldwide)",
      "Invited twice to the White House Iftar dinner",
      "6th U.S. Youth Observer to the United Nations (2017–2018)",
    ],
    background: "First-generation Somali-American, born in Minneapolis in 1996.",
    sources: [
      {
        label: "NBC News — Minnesota Teen Accepted to All Eight Ivy League Schools",
        url: "https://www.nbcnews.com/news/us-news/minnesota-teen-munira-khalif-accepted-all-eight-ivy-league-schools-n338661",
      },
      {
        label: "Wikipedia — Munira Khalif",
        url: "https://en.wikipedia.org/wiki/Munira_Khalif",
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
      "Admitted to Alabama's University Fellows Experience honors program",
    ],
    background:
      "His decision drew national attention as a challenge to the assumption that the most selective admit is automatically the right one.",
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
    activities: ["Student government president", "Poet and writer", "AP coursework"],
    awards: [
      "First place, National Liberty Museum Selma Speech & Essay Contest ($5,000 prize)",
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
    activities: [
      "Founded Our Story, Our Worth — a mentoring organization providing mentorship, confidence-building and sisterhood to girls and young women of color in Miami",
    ],
    background: "First-generation Nigerian-American; 17 at the time of her acceptances.",
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
    activities: [
      "Valedictorian of the class of 2025",
      "Captain of the school robotics team",
      "Known by teachers for relentless questioning — one noted he \"always asks more questions\" until the answers require original research",
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
      "Independent materials research on cement slurries",
      "Presented her work at the White House Science Fair",
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
    intendedFocus: "Medicine and law — he later enrolled at Michigan's medical school and Yale Law School",
    activities: ["Class valedictorian at Cape Fear Academy"],
    background:
      "Son of Nigerian immigrants. He has since pursued an MD and a JD concurrently, which is what drew renewed coverage in 2023.",
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
    ],
    background:
      "She later received a Paul & Daisy Soros Fellowship for New Americans.",
    sources: [
      {
        label: "The Washington Post — Accepted to all eight Ivies, Virginia student makes her decision: Harvard",
        url: "https://www.washingtonpost.com/local/education/accepted-to-all-eight-ivies-virginia-student-makes-her-decision-harvard/2015/05/04/e6457454-f25f-11e4-b2f3-af5479e6bbdd_story.html",
      },
      {
        label: "Harvard SEAS — Cultivating STEM success",
        url: "https://www.seas.harvard.edu/news/2017/11/cultivating-stem-success",
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
      "Founded a student-led gender equality group",
      "Senior Council secretary",
      "11 AP classes",
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
    totalAccepted: 17,
    acceptancesNote:
      "Seventeen acceptances in total; reporting focused on The College of New Jersey, his top choice, and did not name the other sixteen individually.",
    chose: "The College of New Jersey",
    choiceReason:
      "TCNJ was his stated top choice; staff surprised him at school with the acceptance letter after a long wait.",
    activities: ["Class president", "National Honor Society"],
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
    activities: [],
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
    ],
    awards: [
      "One silver and two bronze medals at the International Olympiad in Informatics",
    ],
    background:
      "Her family withdrew her from conventional schooling; CMI admitted her on the strength of her mathematics despite her lacking board certificates.",
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
    activities: ["AP coursework", "Mock trial", "Athletics"],
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
    activities: ["Earlier schooling at Columbus Preparatory School, St Ann's Bay"],
    sources: [
      {
        label: "Jamaica Star — Jamaica-born teen accepted by six Ivy League schools",
        url: "http://jamaica-star.com/article/news/20200331/jamaica-born-teen-accepted-six-ivy-league-schools",
      },
      {
        label: "Stabroek News — Jamaica-born teen accepted by six US Ivy League schools",
        url: "https://www.stabroeknews.com/2020/03/31/news/regional/jamaica/jamaica-born-teen-accepted-by-six-us-ivy-league-schools/",
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
    totalAccepted: 50,
    acceptedTo: ["Duke"],
    acceptancesNote:
      "Reported at more than 50 acceptances and over $1.3 million in scholarship offers; only Duke, the school she chose, was named individually.",
    chose: "Duke",
    choiceReason:
      "She described \"a sense of home\" on campus and a welcoming community of Black students with similar ambitions.",
    intendedFocus: "Visual media studies with a journalism minor",
    activities: [
      "Founded Elom & Co. Productions, a production company focused on emerging creators",
      "Poetry, spoken word and film production",
    ],
    background:
      "She began working on applications in her sophomore year during the pandemic, curating a list of schools strong in mass communications and film and spending a few hours a day on them.",
    sources: [
      {
        label: "Good Morning America / ABC News — Teen accepted to more than 50 colleges, receives over $1.3 million in scholarships",
        url: "https://www.goodmorningamerica.com/living/story/teen-accepted-50-colleges-receives-13-million-scholarships-97722969",
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
    ],
    awards: [
      "Formal certification of Spanish fluency from the Instituto Cervantes",
    ],
    background:
      "He graduated two years early, at 16, and said he began applying in August 2022 with no intention of setting a record.",
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
    ],
    totalAccepted: 49,
    acceptancesNote:
      "She applied to more than 50 universities — collecting application fee waivers at college fairs — and was admitted to 49, with scholarship offers totalling more than $1.3 million. Four were named individually.",
    chose: "Tuskegee University",
    choiceReason:
      "Tuskegee is the historically Black university best known for training Black veterinarians, which is the career she is aiming at.",
    intendedFocus: "Animal science, on the way to veterinary medicine",
    activities: [
      "Senior class president",
      "Co-captain of the dance team",
      "Work-based learning placement at a veterinary clinic",
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
    acceptedTo: ["Clark Atlanta University"],
    totalAccepted: 18,
    acceptancesNote:
      "She applied to between 25 and 30 schools and was admitted to 18, with scholarship offers totalling $1,074,260. Clark Atlanta, her choice, was the one consistently named.",
    chose: "Clark Atlanta University",
    choiceReason:
      "She wanted an HBCU and wanted to be in Atlanta; Clark Atlanta felt like the right distance from home in Philadelphia.",
    intendedFocus: "Psychology",
    activities: ["Robotics", "Journalism"],
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
    activities: ["Straight-A student at Fitchburg High School"],
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
    activities: [],
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
      "From a single-parent family, on free school meals, and the first in his family to attend university. Brampton Manor, in one of London's poorest boroughs, produced 41 Oxbridge offers that year. In his words: \"This is something that I have wanted my whole life. It's made my family really proud.\"",
    sources: [
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
      "She had been in care since the age of 14. In her words: \"Brampton made me believe I was good enough to go to Oxford.\"",
    sources: [
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
      "He has said teachers at his previous secondary school discouraged him despite his results: \"One of the biggest things was being in an environment where I felt teachers believed I could do it.\"",
    sources: [
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
