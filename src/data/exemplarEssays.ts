/**
 * Exemplar college application essays.
 *
 * SOURCING RULES — read before adding an entry:
 *
 * 1. Only essays a college has *officially published itself*, with the
 *    student's permission, qualify. No scraped forums, no paywalled
 *    aggregators, no "leaked" essays.
 * 2. We store an EXCERPT ONLY (the published opening lines). The essay is
 *    still the student's copyrighted work — we never reproduce it in full.
 *    Every entry links to the official page so readers get the full text
 *    from the source that has the right to publish it.
 * 3. `whyItWorked` must either quote/paraphrase the admissions office
 *    (analysisSource: "admissions") or be clearly labelled as our own craft
 *    read (analysisSource: "pathforge"). Never blur the two.
 *
 * Verified July 2026.
 */

export interface ExemplarEssay {
  id: string;
  /** First name + last initial, exactly as the college published it. */
  student: string;
  hometown: string;
  school: string;
  schoolShort: string;
  classYear: string;
  title: string;
  /** Opening lines as published by the college. Excerpt only — never the full essay. */
  excerpt: string;
  /** What made it work. See `analysisSource` for who is actually speaking. */
  whyItWorked: string;
  /**
   * "admissions" — paraphrases/quotes the college's own published commentary.
   * "pathforge" — the college published the essay but no commentary, so this
   * is our craft analysis. Surfaced in the UI so readers never mistake our
   * read for an admissions officer's.
   */
  analysisSource: "admissions" | "pathforge";
  intendedMajor?: string;
  themes: string[];
  /** Canonical URL of the college's own published page. */
  sourceUrl: string;
  sourceName: string;
}

export const exemplarEssays: ExemplarEssay[] = [
  // ── Johns Hopkins University — "Essays That Worked", Class of 2029 ──
  // https://apply.jhu.edu/college-planning-guide/essays-that-worked/
  {
    id: "jhu-anthony-math-art",
    student: "Anthony M.",
    hometown: "Laguna Niguel, CA",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "Where Math Collides With Art",
    excerpt:
      "Pop quiz: A bird shoots through the crisp morning air of New York City, dodging skyscrapers at a speed of thirty kilometers per hour. The sun breaks through the horizon, blinding the bird in both eyes.",
    whyItWorked:
      "The committee highlighted how Anthony connected his mathematical interest to real-world impact through teaching, nonprofit work, and school clubs — showing he could share a passion through several different avenues, which aligned with Hopkins' mission of connecting knowledge discovery to the wider world.",
    intendedMajor: "Applied Mathematics",
    themes: ["Academic passion", "Teaching & mentorship", "STEM"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/where-math-collides-with-art/",
    sourceName: "Johns Hopkins Admissions",
  },
  {
    id: "jhu-emily-splash-of-color",
    student: "Emily O.",
    hometown: "Glen Ellyn, IL",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "A Splash of Color",
    excerpt:
      "I stare into my bathroom mirror as I remove the mask. For the first time, I will attend high school showing my full face. I need to be beautiful, just like the girls on my TikTok feed.",
    whyItWorked:
      "Admissions praised how Emily used personal experience to show risk-taking and self-discovery, noting her essay \"does an excellent job demonstrating the ways in which she has embarked upon that process.\" Hopkins values that exploratory mindset both inside and outside the classroom.",
    themes: ["Identity", "Self-discovery", "Vulnerability"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/a-splash-of-color/",
    sourceName: "Johns Hopkins Admissions",
  },
  {
    id: "jhu-faith-conquering",
    student: "Faith W.",
    hometown: "Montclair, NJ",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "Conquering",
    excerpt:
      "I remember being surprised at how weak my arm felt, as if I was holding a dumbbell instead of a microphone. Standing in front of all of my high school classmates at our weekly Monday Meeting, I could feel my heartbeat in my ears…",
    whyItWorked:
      "The committee valued how Faith turned a very common fear — public speaking — into genuine growth, noting that \"she is able to explore how that initial fear leads to a resolve to tackle the challenge head on,\" alongside her perseverance and impact on her community.",
    themes: ["Overcoming fear", "Growth", "Community impact"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/conquering/",
    sourceName: "Johns Hopkins Admissions",
  },
  {
    id: "jhu-jade-balance",
    student: "Jade",
    hometown: "Frederick, MD",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "Balancing Life; A Life of Balance",
    excerpt:
      "The concept of balance guides me through life. At heart I am a figure skater. Since early childhood I've learned how to balance on and off the ice rink; to glide though skating routines and busy schedules.",
    whyItWorked:
      "Admissions appreciated how Jade wove together several different interests into one coherent idea, saying the essay \"creates confidence… that once a student, Jade will have no difficulty continuing to pursue a balanced approach that allows them to explore all that Hopkins has to offer.\"",
    intendedMajor: "Film Studies",
    themes: ["Extracurricular passion", "Balance", "Athletics"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/balancing-life-a-life-of-balance/",
    sourceName: "Johns Hopkins Admissions",
  },
  {
    id: "jhu-maria-salt",
    student: "Maria G.",
    hometown: "El Paso, TX",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "Be the Salt of the Earth",
    excerpt:
      "\"No le pongas demasiada sal!\" My mom, anticipating a bitter taste from the soup, alarmed me. Yet curious like a five-year-old, I felt it was my mission to discover the secrets behind the little white container in front of me.",
    whyItWorked:
      "The committee noted Maria \"uses salt as a driver to examine her growing awareness of communities and perspectives different from her own,\" and that the essay shows how she is prepared to take part in the kind of discourse and action-oriented experience Hopkins provides.",
    themes: ["Culture & heritage", "Family", "Perspective"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/be-the-salt-of-the-earth/",
    sourceName: "Johns Hopkins Admissions",
  },
  {
    id: "jhu-shotaro-universe",
    student: "Shotaro O.",
    hometown: "Westchester, NY",
    school: "Johns Hopkins University",
    schoolShort: "Johns Hopkins",
    classYear: "Class of 2029",
    title: "Building a Universe",
    excerpt:
      "Just outlining the coastlines took a month. On the solid, 22-inch by 30-inch sheet of white paper I was working on, I couldn't just press the \"undo\" button if my highlighter happened to slip.",
    whyItWorked:
      "Admissions wrote that \"through his interest in worldbuilding, Shotaro is able to highlight skills and perspectives that will allow him to seamlessly engage in that type of interconnected study,\" combining history, geology and more into work they called cohesive and well-developed.",
    themes: ["Niche hobby", "Interdisciplinary", "Creativity"],
    analysisSource: "admissions",
    sourceUrl: "https://apply.jhu.edu/hopkins-insider/building-a-universe/",
    sourceName: "Johns Hopkins Admissions",
  },

  // ── Hamilton College — "Essays That Worked", Class of 2026 ──
  // https://www.hamilton.edu/admission/apply/college-essays-that-worked
  {
    id: "hamilton-aubrey-wallen",
    student: "Aubrey Wallen '26",
    hometown: "Lakeland, TN",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "75,000 Flipped Pages",
    excerpt: "75,000 flipped pages. 11,520 packed boxes. 6 school maps.",
    whyItWorked:
      "Hamilton selected this essay as an exemplar for its incoming class. The opening uses hard numbers instead of adjectives — an immediate, concrete hook that makes the reader want the story behind the tally.",
    themes: ["Moving & change", "Unconventional structure", "Resilience"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-cole-wassiliew",
    student: "Nicholas \"Cole\" Wassiliew '26",
    hometown: "Bethesda, MD",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "The Cicadas",
    excerpt:
      "I dreaded their arrival. The tyrannical cicadas swarmed DC and neighboring areas in 1987, 2004, and again in 2021.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. It anchors a personal narrative to a recurring natural event, using the 17-year cicada cycle as a structural device to measure the writer's own growth.",
    themes: ["Nature", "Structural metaphor", "Growth"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-cate-van-den-beemt",
    student: "Catherine \"Cate\" van den Beemt '26",
    hometown: "Freeland, MD",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "Two Moms",
    excerpt:
      "I was born to two moms. One, my biological mom, Meredith. One, my mom who adopted me, Mary.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. It opens with a plain, unembellished statement of fact about family — trusting the reader to find it interesting without any dramatic framing.",
    themes: ["Family", "Identity", "Directness"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-deni-galay",
    student: "Daniel \"Deni\" Galay '26",
    hometown: "London, England",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "Anti-Personnel",
    excerpt:
      "\"The difference between an anti-personnel and an anti-tank mine is not that complicated,\" — recounted from a conversation held casually in Russian during a visit to the Chechen mountains.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. A startling piece of overheard dialogue drops the reader into a specific place and history without a paragraph of setup.",
    themes: ["International", "Dialogue-driven", "Family history"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-zachary-yasinov",
    student: "Zachary Yasinov '26",
    hometown: "Syosset, NY",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "Two Arduous Months",
    excerpt:
      "I know that I had prepared well for this moment. For two arduous months, I readied my fingers for an exciting concert.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. It sets up confidence in the first line specifically so the reader braces for what goes wrong next — a controlled use of tension.",
    themes: ["Music", "Failure & recovery", "Preparation"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-katy-appleman",
    student: "Katherine \"Katy\" Appleman '26",
    hometown: "Pittsburgh, PA",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "Scorch",
    excerpt:
      "I have never felt such palpable emotion, such profound grief emanating from a space, as I did while hiking through the forest fire scorch in Philmont, New Mexico.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. It locates a large abstract feeling in one very specific physical place, which keeps an emotional opening from reading as generic.",
    themes: ["Environment", "Place", "Reflection"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-claire-lazar",
    student: "Claire Lazar '26",
    hometown: "New York, NY",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "I'm 6",
    excerpt:
      "I'm 6. The sounds of hornpipe and laughter drift across the gymnasium-turned-cafeteria-turned-auditorium.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. Present tense plus a precise age puts the reader inside the memory, and the triple-hyphenated room does a lot of characterization in three words.",
    themes: ["Childhood memory", "Present tense", "Dance & arts"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },
  {
    id: "hamilton-kat-showalter",
    student: "Katherine \"Kat\" Showalter '26",
    hometown: "Los Altos, CA",
    school: "Hamilton College",
    schoolShort: "Hamilton",
    classYear: "Class of 2026",
    title: "The Black Void",
    excerpt: "The black void descends toward the young girl standing in the grassy field.",
    whyItWorked:
      "Chosen by Hamilton as an exemplar. Opening in third person about herself is a risk that earns attention, and the unexplained image forces the reader into the next line.",
    themes: ["Imagery", "Third-person opening", "Risk-taking"],
    analysisSource: "pathforge",
    sourceUrl: "https://www.hamilton.edu/admission/apply/college-essays-that-worked",
    sourceName: "Hamilton College Admission",
  },

  // ── Connecticut College — "Essays that Worked", Class of 2028 ──
  // https://www.conncoll.edu/admission/apply/essays-that-worked/
  //
  // Conn College publishes each essay on its own page under the student's
  // name, with commentary written by the admission counsellors who read it —
  // so every entry below is analysisSource: "admissions". Two notes on how the
  // fields are filled, because the source does not supply everything:
  //   • The college publishes no titles. Rather than invent one, `title` here
  //     is a phrase taken from the essay's own opening line.
  //   • Hometowns are not published, so `hometown` says so explicitly instead
  //     of guessing — same convention as pastAdmits.ts.
  // Verified August 2026.
  {
    id: "conncoll-phoebe-hughes",
    student: "Phoebe Hughes '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "I Am Every Woman I Have Ever Met",
    excerpt:
      "I am every woman I have ever met. My sister Chloe taught me how to be a girl.",
    whyItWorked:
      "The admission counsellor highlighted that Phoebe told a meaningful story about herself through the women around her, even though she is not the main character in the encounters she recounts — calling it \"a masterful way of highlighting her relationships while telling us about herself.\"",
    themes: ["Identity", "Family & relationships", "Indirect self-portrait"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/phoebe-hughes-28/",
    sourceName: "Connecticut College Admission",
  },
  {
    id: "conncoll-elizabeth-madden",
    student: "Elizabeth Madden '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "The Tattered Hiking Map",
    excerpt:
      "I sat quietly at my kitchen table studying the tattered, torn hiking map of Acadia National Park.",
    whyItWorked:
      "Readers valued the journey of awakening: the essay traces Elizabeth's growing awareness of climate change through one pivotal moment — finding an article about youth climate activists — and then shows the concrete changes she made in response. The counsellors noted it also aligned closely with the college's own environmental commitments.",
    intendedMajor: "Environmental Studies",
    themes: ["Environment", "Turning point", "Action & follow-through"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/elizabeth-madden-28/",
    sourceName: "Connecticut College Admission",
  },
  {
    id: "conncoll-nancy-owusu",
    student: "Nancy Owusu '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "There Are Seven Days a Week",
    excerpt:
      "There are seven days a week. For the five days I'm in school, if my name is called at least once in each class, my name is said at least eight times that day.",
    whyItWorked:
      "The counsellors pointed to the growth, maturity and storytelling on display — the repetition of her name as a structural device, the clever turn into how a different name or gender might have changed her circumstances, and a genuine appreciation for what family responsibility taught her.",
    themes: ["Identity", "Family responsibility", "Structural device"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/nancy-owusu-28/",
    sourceName: "Connecticut College Admission",
  },
  {
    id: "conncoll-jackson-spallone",
    student: "Jackson Spallone '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "The Plants Were All Dead",
    excerpt:
      "The plants were all dead. I had carefully prepped the hydroponics before my three-week vacation, but when I came back I found all 36 pods holding dry, shriveled lettuce.",
    whyItWorked:
      "The counsellors called the opening sentence \"a knockout\", and praised the decision to build an extended gardening metaphor instead of writing the far more common straight account of recovering from an injury. What it finally delivers is a point about patience and showing up consistently.",
    themes: ["Extended metaphor", "Setback & recovery", "Patience"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/jackson-spallone-28/",
    sourceName: "Connecticut College Admission",
  },
  {
    id: "conncoll-nikeya-tankard",
    student: "Nikeya Tankard '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "A Mane as Versatile as Mine",
    excerpt:
      "The morning was a war I could not win with a mane as versatile as mine.",
    whyItWorked:
      "Readers praised the imaginative opening and the density of the description, and noted that the essay starts as a piece about hair care and then moves past it into biracial identity and personal agency — connecting the choice between hairstyles to her refusal to be narrowed down academically or socially.",
    themes: ["Identity", "Imagery", "Agency"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/nikeya-tankard-28/",
    sourceName: "Connecticut College Admission",
  },
  {
    id: "conncoll-elle-yarborough",
    student: "Elle Yarborough '28",
    hometown: "Not publicly reported",
    school: "Connecticut College",
    schoolShort: "Connecticut College",
    classYear: "Class of 2028",
    title: "The Clinking of Measuring Spoons",
    excerpt:
      "The clinking of measuring spoons always fills me with joy. Those shiny metal utensils know all of my secrets.",
    whyItWorked:
      "The counsellors liked how a deceptively simple narrative — making a pancake — carried real character detail: a long-standing love of cooking, a willingness to go out of her way for friends, and prose that holds attention without straining for significance.",
    themes: ["Everyday subject", "Voice", "Generosity"],
    analysisSource: "admissions",
    sourceUrl: "https://www.conncoll.edu/admission/apply/essays-that-worked/elle-yarborough-28/",
    sourceName: "Connecticut College Admission",
  },
];

export const essaySchools = Array.from(
  new Set(exemplarEssays.map((e) => e.schoolShort)),
).sort();

export const essayThemes = Array.from(
  new Set(exemplarEssays.flatMap((e) => e.themes)),
).sort();
