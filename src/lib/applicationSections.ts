// Application Builder sections.
// `id` is also the section key sent to the `refine-text` edge function.
// Prefix `essay-` triggers the long-form essay refinement prompt.
// Short-form keys use the application refinement prompt with strict
// role/fact preservation. The optional `platform` field groups sections
// by application system (Common App, UC, Coalition, UCAS, etc.) so
// students can pick the right one for the school they're applying to.

export type LimitKind = "words" | "chars";

export type ApplicationPlatform =
  | "Common App"
  | "Coalition"
  | "UC App"
  | "MIT"
  | "Stanford"
  | "Ivy Supplements"
  | "UCAS (UK)"
  | "Cambridge / Oxford"
  | "QuestBridge"
  | "ApplyTexas"
  | "Canada"
  | "Universal";

export interface ApplicationSection {
  id: string;
  title: string;
  platform: ApplicationPlatform;
  category:
    | "Essay"
    | "Activity"
    | "Honor"
    | "Service"
    | "Research"
    | "Publication"
    | "Patent"
    | "Entrepreneurship"
    | "Community Impact"
    | "Athletics"
    | "Arts"
    | "Teaching"
    | "Other";
  description: string;
  placeholder: string;
  limit: number;
  limitKind: LimitKind;
}

export const applicationSections: ApplicationSection[] = [
  // ── Common App ────────────────────────────────────────────────
  {
    id: "essay-personal",
    title: "Personal Statement",
    platform: "Common App",
    category: "Essay",
    description:
      "Common App main essay. 250–650 words. One focused story that reveals who you are.",
    placeholder:
      "Drop a rough story or bullet points — the moment, what you did, what you learned.",
    limit: 650,
    limitKind: "words",
  },
  {
    id: "extracurriculars",
    title: "Activity Description",
    platform: "Common App",
    category: "Activity",
    description:
      "Common App activity slot. Strong verbs, real impact, max 150 characters. Format like the Stanford reference: role + org + concrete action + outcome.",
    placeholder:
      'e.g. "Co-led robotics club; ran weekly builds; took team to state finals."',
    limit: 150,
    limitKind: "chars",
  },
  {
    id: "awards",
    title: "Honor / Award",
    platform: "Common App",
    category: "Honor",
    description:
      "One honor or award. Include level (school/state/national/international), year, and recognition.",
    placeholder:
      'e.g. "ISEF Finalist, International, Grade 10."',
    limit: 100,
    limitKind: "chars",
  },
  {
    id: "essay-additional-info",
    title: "Additional Information",
    platform: "Common App",
    category: "Other",
    description:
      "Optional 250-word context box. Use only if something material is missing from the rest of the app.",
    placeholder:
      "Course rigor notes, family context, COVID disruption, missing test scores, etc.",
    limit: 250,
    limitKind: "words",
  },

  // ── Coalition ─────────────────────────────────────────────────
  {
    id: "essay-coalition",
    title: "Coalition Essay",
    platform: "Coalition",
    category: "Essay",
    description:
      "Coalition main essay. 500–650 words. Choose one prompt and answer with a personal story.",
    placeholder:
      "Story arc: situation → conflict → action → growth.",
    limit: 650,
    limitKind: "words",
  },

  // ── UC App ────────────────────────────────────────────────────
  {
    id: "essay-uc-piq",
    title: "UC Personal Insight Question",
    platform: "UC App",
    category: "Essay",
    description:
      "One UC PIQ. 350-word max each (you submit 4). Direct, specific, no preamble.",
    placeholder:
      "Pick a PIQ and answer it with a single concrete example: situation, what you did, why it mattered.",
    limit: 350,
    limitKind: "words",
  },
  {
    id: "uc-activity",
    title: "UC Activity / Award Entry",
    platform: "UC App",
    category: "Activity",
    description:
      "UC activities & awards entry. 350 characters. Be factual and quantified.",
    placeholder:
      'Role, org, what you did weekly, outcomes.',
    limit: 350,
    limitKind: "chars",
  },

  // ── Why-school + supplements ──────────────────────────────────
  {
    id: "essay-why-us",
    title: "Why This College",
    platform: "Universal",
    category: "Essay",
    description:
      "School-specific. Mention real programs, professors, courses, traditions. 100–400 words.",
    placeholder:
      "Notes on the school: which major, courses/labs/clubs, why it fits your goals.",
    limit: 400,
    limitKind: "words",
  },
  {
    id: "essay-why-major",
    title: "Why This Major",
    platform: "Universal",
    category: "Essay",
    description:
      "Why you've chosen this field. 150–250 words. Show evidence, not just interest.",
    placeholder:
      "What pulled you in, what you've already done in it, where you want to take it.",
    limit: 250,
    limitKind: "words",
  },

  // ── MIT ───────────────────────────────────────────────────────
  {
    id: "essay-mit-pleasure",
    title: "MIT — Pleasure Question",
    platform: "MIT",
    category: "Essay",
    description:
      "MIT supplement: \"Tell us about something you do simply for the pleasure of it.\" 200 words.",
    placeholder:
      "Honest, specific, low-stakes activity. Show personality, not résumé.",
    limit: 200,
    limitKind: "words",
  },
  {
    id: "essay-mit-contribution",
    title: "MIT — Contribution to Community",
    platform: "MIT",
    category: "Essay",
    description:
      "How you've contributed to a community you value. 200 words.",
    placeholder:
      "One community, one concrete action, the actual change it created.",
    limit: 200,
    limitKind: "words",
  },

  // ── Stanford ──────────────────────────────────────────────────
  {
    id: "essay-stanford-roommate",
    title: "Stanford — Letter to Roommate",
    platform: "Stanford",
    category: "Essay",
    description:
      "Note to your future roommate. 100–250 words. Voice-driven, specific quirks, warm.",
    placeholder:
      "Habits, hobbies, how you sleep/study, what you'd love to share with a roommate.",
    limit: 250,
    limitKind: "words",
  },
  {
    id: "essay-stanford-meaningful",
    title: "Stanford — What Matters & Why",
    platform: "Stanford",
    category: "Essay",
    description:
      "Something meaningful and why. 100–250 words. Show value through specifics.",
    placeholder:
      "The thing, where it comes from, how it shows up in your daily decisions.",
    limit: 250,
    limitKind: "words",
  },
  {
    id: "essay-stanford-historical",
    title: "Stanford — Historical Moment",
    platform: "Stanford",
    category: "Essay",
    description:
      "A historical moment or event you wish you'd witnessed. 50 words.",
    placeholder:
      "One moment, why you'd choose it, what you'd want to feel being there.",
    limit: 50,
    limitKind: "words",
  },

  // ── Ivy / common supplements ──────────────────────────────────
  {
    id: "essay-intellectual",
    title: "Intellectual Curiosity",
    platform: "Ivy Supplements",
    category: "Essay",
    description:
      "Show how you think. A topic you nerd out on. 150–350 words.",
    placeholder:
      "What you've been reading, building, or wondering about — and why it hooks you.",
    limit: 350,
    limitKind: "words",
  },
  {
    id: "essay-community",
    title: "Community / Leadership",
    platform: "Ivy Supplements",
    category: "Essay",
    description:
      "A community you belong to and a role you've taken. 150–350 words.",
    placeholder:
      "The community, your role, what you actually did, what changed.",
    limit: 350,
    limitKind: "words",
  },
  {
    id: "essay-challenge",
    title: "Challenge / Failure",
    platform: "Ivy Supplements",
    category: "Essay",
    description:
      "A setback and the growth that came from it. 150–350 words.",
    placeholder:
      "What happened, how you reacted, what you understand now that you didn't then.",
    limit: 350,
    limitKind: "words",
  },
  {
    id: "essay-diversity",
    title: "Background / Identity",
    platform: "Ivy Supplements",
    category: "Essay",
    description:
      "A background, identity, or perspective central to who you are. 150–350 words.",
    placeholder:
      "The piece of background that shapes how you see the world, with real moments.",
    limit: 350,
    limitKind: "words",
  },

  // ── UCAS (UK) ─────────────────────────────────────────────────
  {
    id: "essay-ucas-statement",
    title: "UCAS Personal Statement",
    platform: "UCAS (UK)",
    category: "Essay",
    description:
      "UCAS Personal Statement. ~4,000 characters / ~47 lines. Heavy academic emphasis (~80% subject, ~20% wider engagement).",
    placeholder:
      "Why this subject, evidence of independent reading/work, super-curriculars, brief extracurriculars.",
    limit: 4000,
    limitKind: "chars",
  },

  // ── Oxbridge ──────────────────────────────────────────────────
  {
    id: "essay-oxbridge",
    title: "Oxbridge Academic Profile",
    platform: "Cambridge / Oxford",
    category: "Essay",
    description:
      "Oxford / Cambridge SAQ / My Cambridge App academic statement. 1,200 characters. Pure subject focus.",
    placeholder:
      "Books, papers, problems, projects in the subject; what you concluded.",
    limit: 1200,
    limitKind: "chars",
  },

  // ── Cross-platform short fields ───────────────────────────────
  {
    id: "research",
    title: "Research Description",
    platform: "Universal",
    category: "Research",
    description:
      "Independent or mentored research. Topic, method, outcome — keep it factual.",
    placeholder:
      "Topic, mentor/lab, what you actually did, any result, paper, or talk.",
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "volunteering",
    title: "Service / Volunteering",
    platform: "Universal",
    category: "Service",
    description:
      "Service role. Hours, frequency, and the difference made.",
    placeholder:
      "Org, role, frequency, what you did, the actual impact.",
    limit: 350,
    limitKind: "chars",
  },
  {
    id: "courses",
    title: "Coursework Highlight",
    platform: "Universal",
    category: "Other",
    description:
      "A course or set of courses that shaped your direction.",
    placeholder:
      "Course names, why they mattered, what you took away.",
    limit: 150,
    limitKind: "chars",
  },

  // ── Extended categories (Profile depth) ───────────────────────
  {
    id: "publication",
    title: "Publication / Paper",
    platform: "Universal",
    category: "Publication",
    description:
      "A published paper, article, or preprint. Include venue, your role, and a one-line summary of the finding.",
    placeholder:
      'e.g. "First author, arXiv preprint on graph neural networks for protein folding (2025)."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "patent",
    title: "Patent / Invention",
    platform: "Universal",
    category: "Patent",
    description:
      "A patent filing, granted patent, or invention disclosure. State status (filed/granted), number if available, and what it does.",
    placeholder:
      'e.g. "US patent application 18/xxxxxx, filed 2025 — low-cost respiratory monitor for rural clinics."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "entrepreneurship",
    title: "Entrepreneurship / Venture",
    platform: "Universal",
    category: "Entrepreneurship",
    description:
      "A venture you started or co-founded. Real metrics only: users, revenue, partners, or pilots.",
    placeholder:
      'e.g. "Co-founded tutoring platform; 240 paying students; $4.2k MRR by Grade 11."',
    limit: 300,
    limitKind: "chars",
  },
  {
    id: "community-impact",
    title: "Community Impact Project",
    platform: "Universal",
    category: "Community Impact",
    description:
      "A self-initiated community project. Problem, what you built, who was served, measurable change.",
    placeholder:
      'e.g. "Led food-rescue drive across 6 schools; redirected 1.2 tonnes of meals to 3 shelters over 8 months."',
    limit: 350,
    limitKind: "chars",
  },
  {
    id: "athletics",
    title: "Athletics",
    platform: "Universal",
    category: "Athletics",
    description:
      "A sport you compete in. Level (school/state/national), role, weekly commitment, and key result.",
    placeholder:
      'e.g. "Varsity captain, 14 hrs/week; state-level 400m finalist Grade 11."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "arts-performance",
    title: "Arts / Performance",
    platform: "Universal",
    category: "Arts",
    description:
      "Visual art, music, theatre, dance, film, or writing. Discipline, years of practice, public-facing work.",
    placeholder:
      'e.g. "Classical violin, 9 years; principal second in regional youth symphony; 2 solo recitals."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "teaching-tutoring",
    title: "Teaching / Tutoring",
    platform: "Universal",
    category: "Teaching",
    description:
      "Sustained teaching or tutoring. Subject, audience, hours, and a concrete outcome from the people you taught.",
    placeholder:
      'e.g. "Tutored 18 Grade-9 students in algebra; 11 moved up a grade band in one term."',
    limit: 300,
    limitKind: "chars",
  },
  {
    id: "internship",
    title: "Internship",
    platform: "Universal",
    category: "Other",
    description:
      "A formal internship. Organization, role, dates, and one concrete thing you built or shipped.",
    placeholder:
      'e.g. "Software intern, local biotech startup, 6 weeks — built an internal data-cleaning script used by the lab team."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "self-study",
    title: "Independent / Self-Directed Study",
    platform: "Universal",
    category: "Other",
    description:
      "Study you pursued outside class — MOOCs, textbooks, self-taught skills. Course/topic, duration, what you can now do.",
    placeholder:
      'e.g. "Worked through MIT 18.06 lectures independently over a summer; can now implement PCA from scratch."',
    limit: 250,
    limitKind: "chars",
  },
  {
    id: "language-proficiency",
    title: "Language Proficiency",
    platform: "Universal",
    category: "Other",
    description:
      "A language you speak beyond your native one. Level (conversational/fluent/native) and how you use it — do not overstate the level.",
    placeholder:
      'e.g. "Fluent in Spanish (heritage speaker); conversational in Mandarin after 3 years of school study."',
    limit: 150,
    limitKind: "chars",
  },

  // ── QuestBridge ───────────────────────────────────────────────
  {
    id: "essay-questbridge-extraordinary",
    title: "QuestBridge — Extraordinary Circumstances",
    platform: "QuestBridge",
    category: "Essay",
    description:
      "Describe a challenge or circumstance that has affected your education. Up to 800 words. Factual, specific, no self-pity framing.",
    placeholder:
      "The circumstance, how it shaped your schooling or opportunities, how you responded.",
    limit: 800,
    limitKind: "words",
  },
  {
    id: "essay-questbridge-community",
    title: "QuestBridge — Community Essay",
    platform: "QuestBridge",
    category: "Essay",
    description:
      "A community you belong to and your role in it. Up to 600 words.",
    placeholder:
      "The community, what you actually do in it, one concrete moment that shows your role.",
    limit: 600,
    limitKind: "words",
  },

  // ── ApplyTexas ────────────────────────────────────────────────
  {
    id: "essay-applytexas",
    title: "ApplyTexas Essay",
    platform: "ApplyTexas",
    category: "Essay",
    description:
      "ApplyTexas Topic A/B/C essay. ~500–700 words depending on the prompt chosen.",
    placeholder:
      "Which topic you're answering, and the concrete story or reasoning behind it.",
    limit: 700,
    limitKind: "words",
  },

  // ── Canada (McGill / U of T / common supplementary apps) ──────
  {
    id: "essay-canada-personal",
    title: "Canadian Supplementary Application",
    platform: "Canada",
    category: "Essay",
    description:
      "McGill / University of Toronto style supplementary profile: activities, interests, and short-answer academic-fit questions. ~250 words per answer.",
    placeholder:
      "Program you're applying to, why it fits, and the activities/interests you want them to know about.",
    limit: 250,
    limitKind: "words",
  },
];

export const applicationPlatforms: ApplicationPlatform[] = [
  "Common App",
  "Coalition",
  "UC App",
  "MIT",
  "Stanford",
  "Ivy Supplements",
  "UCAS (UK)",
  "Cambridge / Oxford",
  "QuestBridge",
  "ApplyTexas",
  "Canada",
  "Universal",
];

export function countFor(text: string, kind: LimitKind): number {
  if (kind === "words") return text.trim() ? text.trim().split(/\s+/).length : 0;
  return text.length;
}
