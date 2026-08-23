/**
 * Journey templates — pre-med, biology, nursing and psychology.
 *
 * The health pathways differ sharply from each other and from the sciences:
 * pre-med is clinical hours + shadowing + research, nursing is hands-on
 * certification and patient contact, biology is bench or field work, and
 * psychology is study design and statistics. They are not interchangeable.
 */

import type { TemplateCtx, TemplateLibrary, TemplateTask } from "./types";
import { isIndia, isUS } from "./types";

// ── Pre-Med / Medicine ──────────────────────────────────────────────────

export const premed: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "med-l1-academics",
      level: 1,
      category: "academics",
      title: isIndia(c.country)
        ? "Lock the NEET foundation — Biology, Chemistry and Physics at full rigour"
        : "Take the hardest available Biology and Chemistry track and hold an A",
      why: isIndia(c.country)
        ? "NEET is a single-day, rank-determined gate to every MBBS seat in India. Nothing else in the profile compensates for the rank."
        : "US medical school admission starts with the undergraduate science GPA; the habits that produce it start now.",
      outcome: "Enrolment in the highest science track with a first-term grade at A-/85% or better.",
      timeEstimate: "1 semester",
      microSteps: [
        {
          label: "Research",
          detail: isIndia(c.country)
            ? "Get the current NEET syllabus from NTA and map it against your board syllabus to find the gaps."
            : "List every advanced science option — AP Biology, AP Chemistry, IB HL, A-Level — and what your school actually offers.",
        },
        { label: "Select", detail: "Choose the highest level you can genuinely hold a top grade in. A B in the hardest class helps nobody." },
        { label: "Execute", detail: "Daily practice, weekly past papers. Science subjects punish cramming more than any others." },
        { label: "Present", detail: "Track grades each term and share the trend with your counsellor." },
      ],
      link: isIndia(c.country) ? "https://neet.nta.nic.in/" : undefined,
      linkLabel: isIndia(c.country) ? "NEET (NTA)" : undefined,
    },
    {
      id: "med-l1-cert",
      level: 1,
      category: "activities",
      title: "Get certified in CPR and first aid",
      why: "It is the cheapest, fastest credential that makes you actually useful in a clinical setting, and many volunteer placements require it before they will take you.",
      outcome: "A valid CPR/BLS or first aid certification card with the certifying body named.",
      timeEstimate: "1-2 days plus booking",
      microSteps: [
        { label: "Research", detail: "Find a recognised provider — the Red Cross, St John Ambulance, or your national equivalent." },
        { label: "Select", detail: "Choose the certification that hospitals near you actually accept." },
        { label: "Execute", detail: "Take the practical course, not an online-only version. Placements check." },
        { label: "Present", detail: "Keep the card; it unlocks the volunteering tasks in Level 2." },
      ],
      link: "https://www.redcross.org/take-a-class",
      linkLabel: "Red Cross training",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "med-l2-clinical-hours",
      level: 2,
      category: "activities",
      title: "Start sustained clinical volunteering — one place, every week",
      why: "Admissions committees discount scattered short-term volunteering entirely. What counts is a long, unglamorous commitment in one setting where the staff know your name.",
      outcome: "A logged 100+ hours at a single site, with a supervisor who can write about you specifically.",
      timeEstimate: "6-12 months, 3-4 hours weekly",
      microSteps: [
        { label: "Research", detail: "Contact hospital volunteer services, hospices, care homes, and community clinics." },
        { label: "Select", detail: "Choose the setting you can reach reliably every week, not the most prestigious one." },
        { label: "Execute", detail: "Same shift, same day, every week. Take the tasks nobody wants." },
        { label: "Present", detail: "Keep a signed hour log and a private reflection journal — the journal becomes your essay." },
      ],
    },
    {
      id: "med-l2-hosa",
      level: 2,
      category: "competitions",
      title: isUS(c.country)
        ? "Compete in a HOSA event in your intended clinical area"
        : "Enter a national biology or medical-science competition",
      why: "A judged clinical-knowledge event gives you an external, comparable result in a field where most applicants only have participation to show.",
      outcome: "A competition placement or qualification, with the event and level recorded.",
      timeEstimate: "1 season",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "Check whether your school has a HOSA chapter; starting one is itself a leadership item."
            : "Map your country's biology olympiad and medical-science competitions and their eligibility windows.",
        },
        { label: "Select", detail: "Pick the event closest to the clinical area you actually care about." },
        { label: "Execute", detail: "Work the published guidelines and past materials; these events reward preparation heavily." },
        { label: "Present", detail: "Archive the official result." },
      ],
      link: isUS(c.country) ? "https://hosa.org/" : undefined,
      linkLabel: isUS(c.country) ? "HOSA" : undefined,
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "med-l3-shadow",
      level: 3,
      category: "activities",
      title: "Shadow physicians across at least three different specialties",
      why: "Shadowing one specialty tells a reader you know a doctor. Shadowing three tells them you have actually tested the assumption that you want this life.",
      outcome: "A shadowing log across 3+ specialties with dates, hours, and a written reflection per specialty.",
      timeEstimate: "3-6 months",
      microSteps: [
        { label: "Research", detail: "Approach through your own GP, family contacts, and hospital education offices." },
        { label: "Select", detail: "Deliberately include one specialty you expect to dislike." },
        { label: "Execute", detail: "Observe only. Never touch, never advise, and respect confidentiality absolutely." },
        { label: "Present", detail: "Write a reflection after each — what surprised you, what you found hard." },
      ],
    },
    {
      id: "med-l3-research",
      level: 3,
      category: "research",
      title: "Join a research project in a biomedical or public-health lab",
      why: "Research is where medicine's evidence comes from, and being able to read a paper critically is a skill admissions interviews probe directly.",
      outcome: "A defined contribution — literature review, data entry, analysis — with a supervisor letter.",
      timeEstimate: "One summer or two terms",
      microSteps: [
        { label: "Research", detail: `Find nearby medical schools or research institutes${isIndia(c.country) ? " — AIIMS, ICMR institutes and medical colleges take students" : ""}.` },
        { label: "Select", detail: "Email with a specific offer and evidence you have read their work." },
        { label: "Execute", detail: "Complete ethics or human-subjects training before touching any data." },
        { label: "Present", detail: "Ask for a letter that names your specific contribution." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "med-l4-health-project",
      level: 4,
      category: "leadership",
      title: "Run a health initiative with a measured outcome in a real community",
      why: "Awareness campaigns are dismissed on sight. A screening drive with numbers, or a training programme with a pre/post assessment, is a public-health contribution.",
      outcome: "A completed initiative with participant numbers and a measured before/after outcome.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Identify a genuine local gap — hypertension screening, anaemia, oral health, first-aid literacy." },
        { label: "Select", detail: "Partner with a clinic or NGO so it is supervised and safe. Never run health activity unsupervised." },
        { label: "Execute", detail: "Measure at the start and the end. Without both numbers there is no result." },
        { label: "Present", detail: "Write it up with the data and hand it to the partner organisation." },
      ],
    },
    {
      id: "med-l4-emt",
      level: 4,
      category: "activities",
      title: "Earn a hands-on clinical certification such as EMT or nursing assistant",
      why: "A certification that lets you provide actual patient care puts you in a different category from applicants whose contact is limited to observation.",
      outcome: "A certification with a licence or registry number, plus logged shifts using it.",
      timeEstimate: "3-6 months",
      microSteps: [
        { label: "Research", detail: "Check the minimum age and prerequisites in your jurisdiction — they vary widely." },
        { label: "Select", detail: "Choose the route you can actually use afterwards; a certificate you never work with is thin." },
        { label: "Execute", detail: "Complete the course and clinical hours, then work real shifts." },
        { label: "Present", detail: "Record the credential number and the shift log." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "med-l5-publish",
      level: 5,
      category: "research",
      title: "Get your name onto a published paper, abstract or poster",
      why: "A named contribution to the literature is uncommon before university and it evidences the research-literacy every medical programme wants.",
      outcome: "A publication, conference abstract, or poster with your name on it.",
      timeEstimate: "6-12 months",
      microSteps: [
        { label: "Research", detail: "Ask your supervisor which outputs are realistic — a case report or a poster is often the achievable route." },
        { label: "Select", detail: "Take on the writing tasks nobody else wants; that is how students earn authorship." },
        { label: "Execute", detail: "Follow the journal or conference format precisely." },
        { label: "Present", detail: "Keep the DOI or the programme listing." },
      ],
    },
    {
      id: "med-l5-narrative",
      level: 5,
      category: "application",
      title: "Write the medicine essay about one patient interaction, not about wanting to help people",
      why: "Every rejected pre-med essay says the applicant wants to help people. The ones that work describe one specific moment and what the writer did not understand about it.",
      outcome: "A drafted personal statement anchored on one interaction, with all identifying details removed.",
      timeEstimate: "6 weeks",
      microSteps: [
        { label: "Research", detail: "Reread your volunteering journal for the shift that stayed with you." },
        { label: "Select", detail: "Choose the moment where you were uncomfortable or wrong, not the one where you helped." },
        { label: "Execute", detail: "Anonymise completely. No names, no identifying detail, no photographs, ever." },
        { label: "Present", detail: "Have a clinician read it for professionalism before anyone else reads it for style." },
      ],
    },
  ],
};

// ── Biology / Life Sciences ─────────────────────────────────────────────

export const biology: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bio-l1-molecular",
      level: 1,
      category: "academics",
      title: "Learn molecular biology to the level the olympiad syllabus expects",
      why: "School biology is largely descriptive; university biology is molecular and quantitative. Closing that gap early is the highest-value preparation available.",
      outcome: "A completed molecular biology course or self-study programme with a written assessment.",
      timeEstimate: "12 weeks",
      microSteps: [
        { label: "Research", detail: "Use the biology olympiad syllabus as your map — it is the best free curriculum available." },
        { label: "Select", detail: "Campbell Biology is the standard; pair it with an open lecture series." },
        { label: "Execute", detail: "Work problems, not just readings. Genetics especially needs practice." },
        { label: "Present", detail: "Take a past olympiad paper as your own assessment and record the score." },
      ],
    },
    {
      id: "bio-l1-bioinformatics",
      level: 1,
      category: "research",
      title: "Do real sequence analysis with public genomic databases",
      why: "NCBI's tools are free, are what working biologists actually use, and let a school student analyse real sequence data without a lab.",
      outcome: "A written analysis using BLAST and a public database, with a biological conclusion and its limitations.",
      timeEstimate: "6 weeks",
      microSteps: [
        { label: "Research", detail: "Work through NCBI's own BLAST tutorials — they are free and thorough." },
        { label: "Select", detail: "Pick a real question: a gene's conservation across species, or an unknown sequence's identity." },
        { label: "Execute", detail: "Run the analysis and interpret the e-values properly rather than reading the top hit." },
        { label: "Present", detail: "Write the conclusion with an explicit statement of what the method cannot tell you." },
      ],
      link: "https://blast.ncbi.nlm.nih.gov/",
      linkLabel: "NCBI BLAST",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bio-l2-olympiad",
      level: 2,
      category: "competitions",
      title: isIndia(c.country)
        ? "Sit the Indian Olympiad Qualifier in Biology (IOQB)"
        : "Sit the USABO open exam or your national biology olympiad",
      why: "The biology olympiad is the field's only externally comparable school-level ranking, and progression past the open round is a genuine distinction.",
      outcome: "An official score, with any progression recorded.",
      timeEstimate: "1 cycle plus 12 weeks prep",
      microSteps: [
        {
          label: "Research",
          detail: isIndia(c.country)
            ? "Check the HBCSE calendar and register through your school."
            : "Ask a teacher to register your school with the Center for Excellence in Education for USABO.",
        },
        { label: "Select", detail: "Work the published syllabus; it is much broader than any school course." },
        { label: "Execute", detail: "Past papers under timing; the open round is a speed test as much as a knowledge test." },
        { label: "Present", detail: "Archive the official score report." },
      ],
      link: isIndia(c.country) ? "https://olympiads.hbcse.tifr.res.in/" : "https://www.usabo-trc.org/",
      linkLabel: isIndia(c.country) ? "HBCSE Olympiads" : "USABO",
    },
    {
      id: "bio-l2-field",
      level: 2,
      category: "research",
      title: "Run a field study and contribute the data to a real scientific project",
      why: "Citizen-science platforms feed genuine research datasets. Contributing verified observations makes you a data producer rather than a data consumer.",
      outcome: "200+ verified observations contributed, plus your own written analysis of the local pattern.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Choose a platform with real scientific use — iNaturalist, eBird, or a national biodiversity portal." },
        { label: "Select", detail: "Pick a site and a taxon you can survey repeatedly and identify reliably." },
        { label: "Execute", detail: "Survey on a fixed schedule; irregular sampling makes the data much less useful." },
        { label: "Present", detail: "Analyse your own data for a local pattern and write it up." },
      ],
      link: "https://www.inaturalist.org/",
      linkLabel: "iNaturalist",
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bio-l3-experiment",
      level: 3,
      category: "research",
      title: "Design and run a controlled experiment with proper replication",
      why: "The difference between a school project and science is controls, replication and statistics. Getting that right is the whole exercise.",
      outcome: "An experimental report with controls, replicates, statistical tests and a stated effect size.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Choose a tractable system — plants, microbes, invertebrates such as Drosophila or Daphnia." },
        { label: "Select", detail: "Decide your sample size before starting; underpowered experiments cannot be rescued afterwards." },
        { label: "Execute", detail: "Run the controls in parallel, blind the scoring where you can." },
        { label: "Present", detail: "Report the statistical test, the p-value and the effect size, not just the direction." },
      ],
    },
    {
      id: "bio-l3-igem",
      level: 3,
      category: "competitions",
      title: "Join or start a synthetic biology team",
      why: "iGEM-style projects require design, wet lab, safety review and public engagement together — a much fuller picture of biology as a practice.",
      outcome: "A team project with the design documentation, safety assessment and results.",
      timeEstimate: "6-9 months",
      microSteps: [
        { label: "Research", detail: "Check whether a nearby university team accepts school students, or whether a high-school track exists." },
        { label: "Select", detail: "Secure lab access and supervision before committing; this is the binding constraint." },
        { label: "Execute", detail: "Take a defined role — design, wet lab, modelling, or human practices." },
        { label: "Present", detail: "Keep the team wiki or documentation and your named contribution." },
      ],
      link: "https://igem.org/",
      linkLabel: "iGEM",
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bio-l4-lab",
      level: 4,
      category: "research",
      title: "Work in a research lab and become competent in a real technique",
      why: "Being genuinely able to run a PCR, a culture or a histology prep — not just having watched one — is what a supervisor letter can attest to.",
      outcome: "A summer or term placement with a supervisor letter naming your techniques.",
      timeEstimate: "8-12 weeks",
      microSteps: [
        { label: "Research", detail: "Read recent papers from ten nearby groups and email the ones you can describe accurately." },
        { label: "Select", detail: "Complete biosafety training before requesting bench access." },
        { label: "Execute", detail: "Keep a bound lab notebook. Learn one technique properly rather than five badly." },
        { label: "Present", detail: "Ask for a letter naming the techniques you can run independently." },
      ],
    },
    {
      id: "bio-l4-research-comp",
      level: 4,
      category: "competitions",
      title: "Enter your research into a national science competition",
      why: "Scientist judges will interrogate your controls and statistics in a way no school audience ever does, and surviving that is meaningful evidence.",
      outcome: "A submitted research entry with judge feedback retained.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Check eligibility, affiliated fairs and any required forms a full year ahead." },
        { label: "Select", detail: "Get institutional review sorted early if your work involves vertebrates or human subjects." },
        { label: "Execute", detail: "Rehearse against a sceptical biologist before you face judges." },
        { label: "Present", detail: "Keep the abstract, poster and feedback." },
      ],
      link: "https://www.societyforscience.org/",
      linkLabel: "Society for Science",
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bio-l5-publish",
      level: 5,
      category: "research",
      title: "Publish your biology research in a peer-reviewed student journal",
      why: "Peer review, even at student level, forces you to defend methodology — and a published paper is a permanent, citable record of your work.",
      outcome: "A published paper or an accepted manuscript with the journal named.",
      timeEstimate: "6-10 months",
      microSteps: [
        { label: "Research", detail: "The Journal of Emerging Investigators peer-reviews secondary-school research and is free to submit to." },
        { label: "Select", detail: "Confirm your work meets their scope and ethical requirements." },
        { label: "Execute", detail: "Write to the format, then take the reviewer comments seriously and revise properly." },
        { label: "Present", detail: "Keep the acceptance and the DOI." },
      ],
      link: "https://emerginginvestigators.org/",
      linkLabel: "Journal of Emerging Investigators",
    },
    {
      id: "bio-l5-application",
      level: 5,
      category: "application",
      title: "Write the biology application around one organism or one system you know deeply",
      why: "Breadth reads as a syllabus. Depth on a single organism, ecosystem or pathway reads as a biologist, and gives an interviewer something real to ask about.",
      outcome: "A supplement anchored on one system, with your own data or observations in it.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Identify what you have spent the most hours actually looking at." },
        { label: "Select", detail: "Choose the observation that contradicted what you had been taught." },
        { label: "Execute", detail: "Write it with real detail — names, numbers, conditions." },
        { label: "Present", detail: "Have a biology teacher check every factual claim in it." },
      ],
    },
  ],
};

// ── Nursing ─────────────────────────────────────────────────────────────

export const nursing: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "nur-l1-sciences",
      level: 1,
      category: "academics",
      title: "Build the anatomy, physiology and chemistry base nursing programmes screen on",
      why: "Nursing admission is decided largely on the science prerequisites and the grades in them. Everything else is secondary to that record.",
      outcome: "Enrolment in biology and chemistry at the highest available level with strong first-term grades.",
      timeEstimate: "1 semester",
      microSteps: [
        { label: "Research", detail: "Check the exact prerequisite list published by three nursing programmes you would actually attend." },
        { label: "Select", detail: "Add an anatomy and physiology course if your school offers one; it maps directly onto first year." },
        { label: "Execute", detail: "Study for retention rather than for the test — you will use this material clinically." },
        { label: "Present", detail: "Track grades against each programme's stated minimum." },
      ],
    },
    {
      id: "nur-l1-cpr",
      level: 1,
      category: "activities",
      title: "Get BLS/CPR certified and start volunteering where there are patients",
      why: "Nursing programmes want evidence you have been near patients and stayed. Certification is the key that opens those placements.",
      outcome: "A valid BLS/CPR card plus a volunteer placement started at a patient-facing site.",
      timeEstimate: "6 weeks",
      microSteps: [
        { label: "Research", detail: "Find a recognised provider and check which certification local facilities require." },
        { label: "Select", detail: "Target care homes, hospices and rehabilitation units — they take students more readily than hospitals." },
        { label: "Execute", detail: "Certify, then commit to a fixed weekly shift." },
        { label: "Present", detail: "Keep the card and start the hour log." },
      ],
      link: "https://www.redcross.org/take-a-class",
      linkLabel: "Red Cross training",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "nur-l2-hours",
      level: 2,
      category: "activities",
      title: "Accumulate sustained hours in direct patient contact",
      why: "Nursing selectors read for evidence that you understand the actual work — including the parts that are physically and emotionally hard — before you commit to it.",
      outcome: "150+ logged hours at one site with a supervisor reference.",
      timeEstimate: "6-9 months",
      microSteps: [
        { label: "Research", detail: "Ask the volunteer coordinator which roles involve real patient contact rather than administration." },
        { label: "Select", detail: "Take the role with contact even if it is less comfortable." },
        { label: "Execute", detail: "Same shift weekly. Learn names. Do the unglamorous tasks properly." },
        { label: "Present", detail: "Keep a signed log and a private reflection journal." },
      ],
    },
    {
      id: "nur-l2-hosa",
      level: 2,
      category: "competitions",
      title: isUS(c.country)
        ? "Compete in a HOSA nursing or patient-care event"
        : "Enter a health-sciences competition or first-aid championship",
      why: "A judged clinical-skills event is one of the few externally verifiable achievements available to a pre-nursing student.",
      outcome: "A competition placement recorded with the event level.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Identify the events that assess clinical skill rather than knowledge alone." },
        { label: "Select", detail: "Choose the one closest to the care setting you want to work in." },
        { label: "Execute", detail: "Practise the skills to the published rubric, repeatedly." },
        { label: "Present", detail: "Archive the official result." },
      ],
      link: isUS(c.country) ? "https://hosa.org/" : undefined,
      linkLabel: isUS(c.country) ? "HOSA" : undefined,
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "nur-l3-cna",
      level: 3,
      category: "academics",
      title: "Qualify as a nursing assistant or equivalent care worker",
      why: "A CNA or equivalent licence means you have provided real care under supervision and been assessed on it — the strongest possible pre-nursing credential.",
      outcome: "A certification with a registry number, plus paid or volunteer shifts worked under it.",
      timeEstimate: "3-5 months",
      microSteps: [
        { label: "Research", detail: "Check the minimum age and training requirements where you live; they vary by jurisdiction." },
        { label: "Select", detail: "Choose an approved programme — unapproved courses do not lead to registration." },
        { label: "Execute", detail: "Complete the clinical hours and pass the competency assessment." },
        { label: "Present", detail: "Record the registry number and start logging shifts." },
      ],
    },
    {
      id: "nur-l3-shadow",
      level: 3,
      category: "activities",
      title: "Shadow nurses across several settings — not doctors",
      why: "Nursing programmes notice when an applicant's exposure is all physician shadowing. Following nurses through a shift shows you understand whose job you are applying for.",
      outcome: "A shadowing log across 3+ settings with a written reflection on the scope of nursing practice.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Ask about acute, community, paediatric and mental-health nursing — the differences are large." },
        { label: "Select", detail: "Deliberately include community or mental-health nursing, which most applicants ignore." },
        { label: "Execute", detail: "Follow a full shift where permitted, including handover." },
        { label: "Present", detail: "Write about how nursing decision-making differs from medical decision-making." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "nur-l4-project",
      level: 4,
      category: "leadership",
      title: "Lead a health project for an underserved group with measured results",
      why: "Nursing is a public-health profession. Delivering a measurable improvement for a specific population is exactly the professional identity the degree is built around.",
      outcome: "A completed project with participant numbers and a measured outcome, run with a partner organisation.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Identify a specific under-served group and a specific unmet need." },
        { label: "Select", detail: "Partner with a clinic, NGO or care home so it is supervised." },
        { label: "Execute", detail: "Measure baseline and outcome. Never provide clinical advice outside your competence." },
        { label: "Present", detail: "Report back to the partner with the data." },
      ],
    },
    {
      id: "nur-l4-specialty",
      level: 4,
      category: "activities",
      title: "Go deep in one care setting until the staff rely on you",
      why: "A reference that says 'we changed the rota around her' carries more weight than five shallow placements ever could.",
      outcome: "A sustained role in one setting with a detailed reference letter.",
      timeEstimate: "9-12 months",
      microSteps: [
        { label: "Research", detail: "Choose the setting from Level 3 you found most demanding, not most comfortable." },
        { label: "Select", detail: "Ask for more responsibility explicitly; it is rarely offered unprompted." },
        { label: "Execute", detail: "Stay for a year. Longevity is the signal." },
        { label: "Present", detail: "Request a letter that describes specific incidents." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "nur-l5-interview",
      level: 5,
      category: "application",
      title: "Prepare for values-based interviews and multiple mini-interviews",
      why: "Most nursing programmes interview, and they test values and ethical reasoning rather than knowledge. It is a trainable skill that applicants routinely neglect.",
      outcome: "Six recorded mock interview stations with written feedback and a revised approach.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Find the published values framework your target programmes assess against." },
        { label: "Select", detail: "Build a bank of your own examples covering compassion, error, conflict and boundaries." },
        { label: "Execute", detail: "Run timed stations with a nurse or teacher playing assessor. Record them." },
        { label: "Present", detail: "Watch the recordings; the fixes are usually obvious and uncomfortable." },
      ],
    },
    {
      id: "nur-l5-statement",
      level: 5,
      category: "application",
      title: "Write the nursing statement about a shift that was hard",
      why: "Statements about wanting to care for people are indistinguishable from one another. A specific difficult shift, handled honestly, is what a nursing selector remembers.",
      outcome: "A personal statement anchored on one shift, fully anonymised, reviewed by a nurse.",
      timeEstimate: "5 weeks",
      microSteps: [
        { label: "Research", detail: "Reread your reflection journal for the shift you did not want to write about." },
        { label: "Select", detail: "Choose the one where you did not know what to do." },
        { label: "Execute", detail: "Anonymise absolutely — no names, no identifying details, no exceptions." },
        { label: "Present", detail: "Have a registered nurse check it for professionalism before submission." },
      ],
    },
  ],
};

// ── Psychology / Cognitive Science / Neuroscience ───────────────────────

export const psychology: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "psy-l1-methods",
      level: 1,
      category: "academics",
      title: "Learn research methods and statistics before you learn theories",
      why: "Psychology is a methods discipline. Students who arrive able to explain a control condition and a p-value are immediately more useful than those who can recite famous studies.",
      outcome: "A completed research methods and statistics course with a written assessment.",
      timeEstimate: "10 weeks",
      microSteps: [
        { label: "Research", detail: "Find an introductory research methods course; many universities publish full open versions." },
        { label: "Select", detail: "Prioritise experimental design, sampling and inference over content areas." },
        { label: "Execute", detail: "Work problems. Learn to spot confounds in published study descriptions." },
        { label: "Present", detail: "Write a critique of one famous study's methodology as your assessment." },
      ],
    },
    {
      id: "psy-l1-replication",
      level: 1,
      category: "research",
      title: "Read about the replication crisis and audit one classic study yourself",
      why: "Psychology's most important development in twenty years is the replication crisis. An applicant who understands it is instantly more credible than one who cites Zimbardo uncritically.",
      outcome: "A written critique of one classic study covering sample size, design flaws and replication status.",
      timeEstimate: "5 weeks",
      microSteps: [
        { label: "Research", detail: "Pick a study you were taught as fact — Stanford Prison, ego depletion, power posing." },
        { label: "Select", detail: "Find both the original paper and the replication attempts." },
        { label: "Execute", detail: "Compare the effect sizes and the sample sizes; that is usually where the story is." },
        { label: "Present", detail: "Write the critique and publish it." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "psy-l2-study",
      level: 2,
      category: "research",
      title: "Design and run your own study with proper ethical review",
      why: "Running a real study — with consent, debriefing and an analysis plan — puts you far ahead of applicants whose research experience is reading about research.",
      outcome: "A completed study with consent forms, a pre-registered analysis plan, and a written report.",
      timeEstimate: "4 months",
      microSteps: [
        { label: "Research", detail: "Pick a question with a small, measurable effect — attention, memory, judgement under time pressure." },
        { label: "Select", detail: "Get a teacher or academic to review the ethics before you recruit anyone." },
        { label: "Execute", detail: "Pre-register on OSF, then collect data. Debrief every participant." },
        { label: "Present", detail: "Report the result including if it is null — that is the credible outcome." },
      ],
      link: "https://osf.io/",
      linkLabel: "OSF pre-registration",
    },
    {
      id: "psy-l2-stats-tool",
      level: 2,
      category: "academics",
      title: "Learn R or Python for real statistical analysis",
      why: "Psychology is now a computational field. Arriving able to run and interpret a regression in R is a genuine head start on the degree.",
      outcome: "An analysis script on real data with the output interpreted in writing.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "R with tidyverse is the psychology standard; Python works too." },
        { label: "Select", detail: "Learn on your own study's data so the analysis has a purpose." },
        { label: "Execute", detail: "Run descriptives, a t-test or ANOVA, and a regression. Plot everything." },
        { label: "Present", detail: "Publish the script and the interpretation together." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "psy-l3-lab",
      level: 3,
      category: "research",
      title: "Work as a research assistant in a psychology or neuroscience lab",
      why: "Lab experience is the currency of psychology admissions and graduate progression, and undergraduate labs frequently take capable school students.",
      outcome: "An RA role with a defined task and a supervisor letter naming your contribution.",
      timeEstimate: "One summer or two terms",
      microSteps: [
        { label: "Research", detail: "Read recent papers from nearby departments and identify labs whose methods you can support." },
        { label: "Select", detail: "Email with a specific offer — coding behavioural data, running participants, literature screening." },
        { label: "Execute", detail: "Complete ethics training and follow the protocol exactly." },
        { label: "Present", detail: "Ask for a letter that names the study and your task." },
      ],
    },
    {
      id: "psy-l3-service",
      level: 3,
      category: "activities",
      title: "Train and volunteer in a real mental-health support role",
      why: "Trained peer support or helpline work is structured, supervised, and demonstrates both commitment and an understanding of boundaries — which this field takes seriously.",
      outcome: "Completed training plus logged supervised hours in a support role.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Find organisations with proper training and supervision; avoid anything unstructured." },
        { label: "Select", detail: "Check the minimum age — many services set one, and it exists for good reason." },
        { label: "Execute", detail: "Complete the training in full and attend supervision every time." },
        { label: "Present", detail: "Log hours; never disclose anything about anyone you supported." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "psy-l4-original",
      level: 4,
      category: "research",
      title: "Run an original study with a real sample and defensible power",
      why: "Level 4 is where your work stops being a classroom exercise. A pre-registered study with an adequate sample is genuinely publishable research.",
      outcome: "A completed study with a pre-registration, an adequate sample, and a full written paper.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Do a power analysis first and let it determine your sample size." },
        { label: "Select", detail: "Design recruitment you can actually achieve at that size." },
        { label: "Execute", detail: "Follow the pre-registered plan. Report any deviation explicitly." },
        { label: "Present", detail: "Write it to journal format with limitations stated honestly." },
      ],
    },
    {
      id: "psy-l4-topss",
      level: 4,
      category: "competitions",
      title: "Enter a psychology essay or research competition",
      why: "Discipline-specific competitions judge whether you can reason like a psychologist, which no general academic prize tests.",
      outcome: "A submitted entry with the result or feedback retained.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "The APA's TOPSS programme runs a student essay competition; universities run others." },
        { label: "Select", detail: "Read past winning entries to calibrate depth and structure." },
        { label: "Execute", detail: "Argue from evidence, cite properly, and address the counter-position." },
        { label: "Present", detail: "Keep the entry — it is a strong academic writing sample regardless of outcome." },
      ],
      link: "https://www.apa.org/",
      linkLabel: "APA",
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "psy-l5-publish",
      level: 5,
      category: "research",
      title: "Publish or present your psychology research",
      why: "A poster at a psychology conference or a student-journal paper demonstrates that your work survived scrutiny by people who know the methods.",
      outcome: "An accepted abstract, poster or paper with the venue named.",
      timeEstimate: "5-9 months",
      microSteps: [
        { label: "Research", detail: "Look at regional psychology conferences and peer-reviewed student journals." },
        { label: "Select", detail: "Choose a venue whose scope matches your design." },
        { label: "Execute", detail: "Write to the template with full method reporting." },
        { label: "Present", detail: "Keep the programme listing and any reviewer comments." },
      ],
    },
    {
      id: "psy-l5-application",
      level: 5,
      category: "application",
      title: "Write the psychology application around a question, not a diagnosis",
      why: "Psychology attracts a large volume of essays about personal or family mental health. Those are legitimate but crowded; an essay built on a research question you could not stop thinking about is not.",
      outcome: "A supplement anchored on one research question and how your thinking about it changed.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Look through your critiques and studies for the question you kept returning to." },
        { label: "Select", detail: "Choose the one where the evidence contradicted your intuition." },
        { label: "Execute", detail: "Write about the reasoning. Be careful and ethical with any personal material." },
        { label: "Present", detail: "Have someone with research training check the claims are accurately stated." },
      ],
    },
  ],
};
