/**
 * Journey templates — art & design, architecture, performing arts and
 * environmental science.
 *
 * The creative majors are the ones most poorly served by generic advice: they
 * are portfolio-assessed or audition-assessed, and the artefact requirements
 * are specific and non-negotiable. Environmental science sits here because its
 * work is field-based and place-specific in the same way.
 */

import type { TemplateCtx, TemplateLibrary, TemplateTask } from "./types";
import { isIndia, isUS } from "./types";

// ── Art & Design ────────────────────────────────────────────────────────

export const design: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "des-l1-observational",
      level: 1,
      category: "academics",
      title: "Build observational drawing skill — from life, not from photos",
      why: "Design and art portfolios are read for observational skill first, whatever your intended discipline. Reviewers can tell a drawing from a photograph instantly, and it counts against you.",
      outcome: "A sketchbook with 100+ observational drawings from life, dated.",
      timeEstimate: "1 term, 30 minutes daily",
      microSteps: [
        { label: "Research", detail: "Understand what portfolio reviewers mean by observational work — it is the foundation requirement almost everywhere." },
        { label: "Select", detail: "Draw what is physically in front of you: hands, chairs, plants, people on transport." },
        { label: "Execute", detail: "Thirty minutes a day. Date every page and never tear one out." },
        { label: "Present", detail: "Photograph the sketchbook spreads properly, flat and evenly lit." },
      ],
    },
    {
      id: "des-l1-process",
      level: 1,
      category: "activities",
      title: "Keep a process journal — reviewers want the thinking, not just the outcome",
      why: "The single most common portfolio failure is showing only finished pieces. Design schools admit on evidence of process: iterations, dead ends, and decisions.",
      outcome: "A process journal documenting one project from brief through iterations to resolution.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Look at admitted portfolios published by art and design schools; note how much process they show." },
        { label: "Select", detail: "Pick one project and commit to documenting everything, including what you abandoned." },
        { label: "Execute", detail: "Photograph work in progress weekly and annotate why you changed direction." },
        { label: "Present", detail: "Lay the journal out as a sequence a stranger can follow." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "des-l2-brief",
      level: 2,
      category: "activities",
      title: "Design for a real client with a real constraint",
      why: "Self-directed work shows taste; client work shows you can solve someone else's problem within a brief. Both belong in a portfolio, and the second is rarer.",
      outcome: "A completed client project with the original brief, the iterations, and the delivered outcome in use.",
      timeEstimate: "8-10 weeks",
      microSteps: [
        { label: "Research", detail: "Approach a local charity, a school department, or a small business that has no design support." },
        { label: "Select", detail: "Get the brief and constraints in writing before you start designing." },
        { label: "Execute", detail: "Present at least two directions and let the client choose. Document their feedback." },
        { label: "Present", detail: "Photograph the work in situ — applied work reads far stronger than a mockup." },
      ],
    },
    {
      id: "des-l2-medium",
      level: 2,
      category: "academics",
      title: "Take one medium seriously enough to be genuinely good at it",
      why: "Portfolios that sample eight media shallowly read as undecided. Depth in one — printmaking, ceramics, typography, 3D — with breadth around it, reads as a maker.",
      outcome: "A body of 8+ finished pieces in one medium showing clear technical progression.",
      timeEstimate: "1-2 terms",
      microSteps: [
        { label: "Research", detail: "Choose based on what you keep returning to, not what seems most employable." },
        { label: "Select", detail: "Find access — a school facility, a community studio, or a maker space." },
        { label: "Execute", detail: "Work in series. Eight related pieces beat eight unrelated ones." },
        { label: "Present", detail: "Photograph or scan everything to a consistent standard." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "des-l3-exhibit",
      level: 3,
      category: "leadership",
      title: "Exhibit your work publicly and handle the whole show",
      why: "Curating, hanging, writing wall text and standing next to your work while strangers react to it is a different discipline from making, and schools notice it.",
      outcome: "A public exhibition with the curatorial statement, install photographs, and visitor numbers.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Find venues that show emerging work — cafés, libraries, community galleries, school spaces." },
        { label: "Select", detail: "Choose a coherent selection rather than everything you have made." },
        { label: "Execute", detail: "Handle hanging, lighting, labels and the opening yourself." },
        { label: "Present", detail: "Document the install professionally and record attendance." },
      ],
    },
    {
      id: "des-l3-competition",
      level: 3,
      category: "competitions",
      title: "Enter a juried national art or design award",
      why: "Juried awards are assessed by practising artists and designers against a national field — external validation no school prize provides.",
      outcome: "A submitted entry with any award, and the jury feedback where given.",
      timeEstimate: "1 cycle",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "The Scholastic Art & Writing Awards are the largest juried programme for US school students and carry real weight."
            : "Find your country's national youth art awards and any open juried competitions with school categories.",
        },
        { label: "Select", detail: "Read the category definitions carefully and enter the right one." },
        { label: "Execute", detail: "Photograph or scan submissions to the required specification — poor documentation loses good work." },
        { label: "Present", detail: "Archive the result and any jury comment." },
      ],
      link: isUS(c.country) ? "https://www.artandwriting.org/" : undefined,
      linkLabel: isUS(c.country) ? "Scholastic Art & Writing" : undefined,
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "des-l4-portfolio",
      level: 4,
      category: "application",
      title: "Build the portfolio to each school's actual stated requirements",
      why: "Portfolio requirements differ substantially between schools — piece counts, sketchbook inclusion, home tests. Submitting one generic portfolio everywhere is the most common avoidable failure.",
      outcome: "A portfolio meeting each target school's published specification, with a per-school checklist.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Write out every target school's requirements in a table; they genuinely differ." },
        { label: "Select", detail: "Choose 12-20 pieces covering observational work, process and personal direction." },
        { label: "Execute", detail: "Reshoot everything to a consistent standard. Poor photography sinks strong work." },
        { label: "Present", detail: "Upload to the required platform early — file specifications cause late failures." },
      ],
    },
    {
      id: "des-l4-review",
      level: 4,
      category: "activities",
      title: "Get your portfolio reviewed by people who admit students",
      why: "Portfolio reviews at National Portfolio Day and school open days are free, and thirty minutes with an admissions reviewer will change your portfolio more than three months of solo work.",
      outcome: "Two external reviews documented, with the specific changes you made afterwards.",
      timeEstimate: "2-3 months",
      microSteps: [
        { label: "Research", detail: "Find National Portfolio Day events, school open days, or virtual review sessions." },
        { label: "Select", detail: "Book with schools you actually want, plus one you do not — the low-stakes review is useful practice." },
        { label: "Execute", detail: "Bring the work and take notes without defending anything." },
        { label: "Present", detail: "Record the feedback and what you changed as a result." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "des-l5-commission",
      level: 5,
      category: "activities",
      title: "Get paid for your work, or have it published or permanently installed",
      why: "A paid commission, a published illustration, or a permanently installed piece is external proof that your work has value outside school assessment.",
      outcome: "A paid invoice, a publication credit, or documentation of a permanent installation.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Identify who actually commissions work locally — publications, venues, businesses, councils." },
        { label: "Select", detail: "Pitch with a specific proposal rather than a general offer." },
        { label: "Execute", detail: "Deliver professionally: contract or written agreement, deadline, invoice." },
        { label: "Present", detail: "Keep the paperwork and photograph the work in place." },
      ],
    },
    {
      id: "des-l5-statement",
      level: 5,
      category: "application",
      title: "Write an artist statement that describes what you actually do",
      why: "Art school statements collapse into abstraction — exploring identity, challenging boundaries. A statement naming your materials, your subjects and your recurring problem is instantly credible.",
      outcome: "An artist statement grounded in specific materials, subjects and questions, tested on a reviewer.",
      timeEstimate: "3 weeks",
      microSteps: [
        { label: "Research", detail: "Lay out your last twenty pieces and look for what actually repeats." },
        { label: "Select", detail: "Name the repetition honestly, even if it is unfashionable." },
        { label: "Execute", detail: "Write it with concrete nouns. Cut every abstract claim you cannot point to in the work." },
        { label: "Present", detail: "Read it to someone who has seen the work and ask if it matches." },
      ],
    },
  ],
};

// ── Architecture ────────────────────────────────────────────────────────

export const architecture: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "arch-l1-draw",
      level: 1,
      category: "academics",
      title: "Learn to draw buildings and spaces by hand",
      why: "Architecture portfolios still weight hand drawing heavily, because it shows spatial understanding that software can conceal.",
      outcome: "A sketchbook of 50+ architectural drawings from observation, including sections and perspectives.",
      timeEstimate: "1 term",
      microSteps: [
        { label: "Research", detail: "Learn one-point and two-point perspective properly before you start." },
        { label: "Select", detail: "Draw real buildings you can stand in front of, including ordinary ones." },
        { label: "Execute", detail: "Include plans and sections, not just elevations — sections show you understand space." },
        { label: "Present", detail: "Date every drawing and keep the sketchbook intact." },
      ],
    },
    {
      id: "arch-l1-software",
      level: 1,
      category: "academics",
      title: "Learn one 3D modelling tool and one drafting workflow",
      why: "Rhino, SketchUp or Revit plus a drafting standard gives you the production capability to turn ideas into presentable drawings.",
      outcome: "A modelled and drafted small building with plan, section, elevation and an axonometric.",
      timeEstimate: "10 weeks",
      microSteps: [
        { label: "Research", detail: "Most major tools have free education licences; check what your target schools teach." },
        { label: "Select", detail: "Learn one properly rather than three superficially." },
        { label: "Execute", detail: "Model an existing building first — you learn construction logic by reconstructing it." },
        { label: "Present", detail: "Produce a full drawing set with a consistent line weight hierarchy." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "arch-l2-model",
      level: 2,
      category: "activities",
      title: "Build physical models — architecture is a material discipline",
      why: "Physical models test ideas renders cannot, and a portfolio of only renders reads as someone who has never made anything.",
      outcome: "Three physical models at different scales, professionally photographed.",
      timeEstimate: "10 weeks",
      microSteps: [
        { label: "Research", detail: "Learn how models are made: card, chipboard, basswood, and clean cutting." },
        { label: "Select", detail: "Model at a consistent, stated scale." },
        { label: "Execute", detail: "Build carefully. Craft quality is visible in photographs and it is being assessed." },
        { label: "Present", detail: "Photograph on white with directional light to show form and shadow." },
      ],
    },
    {
      id: "arch-l2-analysis",
      level: 2,
      category: "research",
      title: "Analyse a building you can visit repeatedly",
      why: "Precedent analysis is core architectural method. Documenting how one building actually handles light, circulation and structure is exactly what first year asks for.",
      outcome: "An analysis document with redrawn plans, circulation and light studies, and your own photographs.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Choose an accessible building with something specific going on — a library, a station, a place of worship." },
        { label: "Select", detail: "Visit at different times of day; light is half the analysis." },
        { label: "Execute", detail: "Redraw the plan and section yourself rather than reproducing published drawings." },
        { label: "Present", detail: "Present it as a designer would — drawings first, text supporting." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "arch-l3-design",
      level: 3,
      category: "activities",
      title: "Take one site through a complete design project",
      why: "A resolved project — site analysis, brief, concept, plan, section, model — is the single strongest portfolio item architecture schools can receive from a school student.",
      outcome: "A complete project with site analysis, drawings at scale, a model, and a written concept.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Choose a real site you can visit and survey. Real constraints produce better work." },
        { label: "Select", detail: "Write yourself a brief with a real user and a real programme." },
        { label: "Execute", detail: "Resolve it. Half-finished projects are visible immediately in a portfolio." },
        { label: "Present", detail: "Lay it out as a sequence: site, concept, plan, section, model, detail." },
      ],
    },
    {
      id: "arch-l3-mentor",
      level: 3,
      category: "activities",
      title: "Get inside a practice — mentorship, work experience, or a site visit programme",
      why: "Seeing how a real practice moves from sketch to construction drawings is the fastest way to understand what the profession actually is.",
      outcome: "Documented time in a practice with a project you contributed to and a mentor reference.",
      timeEstimate: "2-8 weeks or an academic year",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "The ACE Mentor Program pairs students with practising architects and engineers at no cost."
            : "Approach small local practices directly; they take students far more readily than large firms.",
        },
        { label: "Select", detail: "Offer model-making, drawing cleanup, or site photography — genuinely useful tasks." },
        { label: "Execute", detail: "Ask to see a set of construction drawings and to visit a live site." },
        { label: "Present", detail: "Get a reference naming what you worked on." },
      ],
      link: isUS(c.country) ? "https://www.acementor.org/" : undefined,
      linkLabel: isUS(c.country) ? "ACE Mentor Program" : undefined,
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "arch-l4-competition",
      level: 4,
      category: "competitions",
      title: "Enter an open architecture competition",
      why: "Open ideas competitions accept student entries, are judged by architects, and force you to resolve and present a scheme to a professional deadline.",
      outcome: "A submitted competition entry with the boards and any recognition.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Look for open ideas competitions with student categories and low or no entry fees." },
        { label: "Select", detail: "Choose a brief where your existing site knowledge gives you an advantage." },
        { label: "Execute", detail: "Design to the submission format from the start; board layout is part of the design." },
        { label: "Present", detail: "Keep the boards; they are portfolio-ready as submitted." },
      ],
    },
    {
      id: "arch-l4-portfolio",
      level: 4,
      category: "application",
      title: "Assemble the architecture portfolio to each school's specification",
      why: "Architecture portfolio requirements vary — page counts, formats, whether non-architectural work is wanted. Getting this wrong is a purely avoidable rejection.",
      outcome: "A portfolio meeting each target's published specification, with a per-school checklist.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Tabulate every school's requirements; several want non-architectural creative work too." },
        { label: "Select", detail: "Lead with the resolved project and follow with observational and model work." },
        { label: "Execute", detail: "Design the layout deliberately — the portfolio is itself a designed object being assessed." },
        { label: "Present", detail: "Export to the required format and test the file before the deadline." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "arch-l5-built",
      level: 5,
      category: "leadership",
      title: "Get something you designed actually built",
      why: "A built structure — a shelter, a pavilion, a bench, a community installation — is exceptionally rare from a school applicant and answers every question about whether you can deliver.",
      outcome: "A built and installed structure with construction photographs and the client's confirmation.",
      timeEstimate: "6-9 months",
      microSteps: [
        { label: "Research", detail: "Find a client with a small real need — a school, a garden, a community group." },
        { label: "Select", detail: "Keep it small and buildable, and check any permissions required." },
        { label: "Execute", detail: "Build it safely and with supervision. Document the construction sequence." },
        { label: "Present", detail: "Photograph it in use, with people in the frame." },
      ],
    },
    {
      id: "arch-l5-statement",
      level: 5,
      category: "application",
      title: "Write the architecture statement about one space, not about loving buildings",
      why: "Architecture personal statements about being fascinated by skylines are the default. One ordinary space described precisely, and what it does to the people in it, is not.",
      outcome: "A statement anchored on one specific space and a precise spatial observation.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Choose a space you know in every light — not a famous building you visited once." },
        { label: "Select", detail: "Find the detail that changes how the space is used." },
        { label: "Execute", detail: "Describe it with architectural precision: dimension, material, light, threshold." },
        { label: "Present", detail: "Have an architect or teacher check the terminology is used correctly." },
      ],
    },
  ],
};

// ── Performing Arts (Music, Theatre, Dance) ─────────────────────────────

export const performingArts: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pa-l1-technique",
      level: 1,
      category: "academics",
      title: "Get into structured technical training with a teacher who assesses you",
      why: "Performing arts admission is audition-based and technique is assessed within the first minute. Untutored talent does not survive contact with a conservatoire panel.",
      outcome: "Regular lessons with a qualified teacher plus a graded exam or formal assessment result.",
      timeEstimate: "Ongoing, weekly",
      microSteps: [
        { label: "Research", detail: "Find a teacher whose students have progressed to the level you are aiming at." },
        { label: "Select", detail: "Enter the recognised graded exam system in your discipline if one exists." },
        { label: "Execute", detail: "Practise daily and log it. Technique is built by consistency, not by intensity." },
        { label: "Present", detail: "Keep the exam certificates and assessment reports." },
      ],
    },
    {
      id: "pa-l1-perform",
      level: 1,
      category: "activities",
      title: "Perform publicly, regularly, and record every performance",
      why: "Stage time is a skill of its own, and you will need clean recordings for pre-screening submissions. Both are built by performing often.",
      outcome: "A performance log of 10+ public performances with at least three usable recordings.",
      timeEstimate: "1 year",
      microSteps: [
        { label: "Research", detail: "Find every performance opportunity available: school, community, competitions, open mics, festivals." },
        { label: "Select", detail: "Say yes to everything at this stage. Range matters more than prestige right now." },
        { label: "Execute", detail: "Record every performance, even informally — you cannot recreate them later." },
        { label: "Present", detail: "Keep a dated log of venue, repertoire and role." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pa-l2-ensemble",
      level: 2,
      category: "competitions",
      title: "Audition for a selective ensemble, company or honour group",
      why: "Selection by audition into a regional, state or national ensemble is externally verifiable and directly relevant, which is the combination that carries weight.",
      outcome: "Selection into an auditioned ensemble, with the selectivity documented.",
      timeEstimate: "1 audition cycle",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "All-State ensembles and the NAfME All-National Honor Ensembles are the recognised progression."
            : "Find your region's youth orchestras, national youth theatre or dance companies and their audition dates.",
        },
        { label: "Select", detail: "Get the audition requirements early; they are usually published a year ahead." },
        { label: "Execute", detail: "Prepare the set repertoire to performance standard, not to rehearsal standard." },
        { label: "Present", detail: "Record the selection and the ensemble's level." },
      ],
      link: isUS(c.country) ? "https://nafme.org/" : undefined,
      linkLabel: isUS(c.country) ? "NAfME" : undefined,
    },
    {
      id: "pa-l2-repertoire",
      level: 2,
      category: "academics",
      title: "Build the audition repertoire your target programmes actually require",
      why: "Audition requirements are specific — contrasting periods, particular monologue types, set combinations. Discovering them late is the most common reason strong performers fail.",
      outcome: "A repertoire list meeting the published requirements of your top three programmes.",
      timeEstimate: "2 terms",
      microSteps: [
        { label: "Research", detail: "Download the audition requirements for your target programmes now, not in senior year." },
        { label: "Select", detail: "Choose pieces that show your strengths and are within secure technical reach." },
        { label: "Execute", detail: "Work each piece to performance standard with your teacher." },
        { label: "Present", detail: "Perform the full audition programme publicly at least twice before auditioning." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pa-l3-lead",
      level: 3,
      category: "leadership",
      title: "Take a principal role or lead a company",
      why: "A named principal role or a directing credit shows you can carry responsibility for a production, not just appear in one.",
      outcome: "A principal role or directing credit with the programme, reviews and production photographs.",
      timeEstimate: "1 production cycle",
      microSteps: [
        { label: "Research", detail: "Look beyond school — community theatre and youth companies cast school-age performers." },
        { label: "Select", detail: "Audition widely; casting is largely a numbers game." },
        { label: "Execute", detail: "Prepare thoroughly and be the most reliable person in the room." },
        { label: "Present", detail: "Keep programmes, photographs and any press coverage." },
      ],
    },
    {
      id: "pa-l3-own-work",
      level: 3,
      category: "activities",
      title: "Create and stage your own work",
      why: "Composing, choreographing or writing and then staging it shows artistic voice rather than interpretive skill alone — and conservatoires increasingly ask for it.",
      outcome: "An original work performed publicly, with a recording and the audience response.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Choose a form you can realistically stage with the performers you can actually recruit." },
        { label: "Select", detail: "Secure a venue and a date early; a date forces completion." },
        { label: "Execute", detail: "Create it, rehearse it, and stage it. Finished beats perfect." },
        { label: "Present", detail: "Record it properly and keep the programme." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pa-l4-national",
      level: 4,
      category: "competitions",
      title: "Compete or be recognised at national level",
      why: "National recognition in performing arts is scarce and unambiguous, and it is one of the few things that can carry an application in an audition-based field.",
      outcome: "A national competition result, festival selection, or arts recognition award.",
      timeEstimate: "1 cycle",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "YoungArts and the International Thespian Festival are the recognised national routes."
            : "Identify your country's national youth arts competitions and festivals with school-age categories.",
        },
        { label: "Select", detail: "Check the recording and submission specifications months in advance." },
        { label: "Execute", detail: "Submit professionally recorded material; poor audio loses good performances." },
        { label: "Present", detail: "Archive the result." },
      ],
      link: isUS(c.country) ? "https://youngarts.org/" : undefined,
      linkLabel: isUS(c.country) ? "YoungArts" : undefined,
    },
    {
      id: "pa-l4-prescreen",
      level: 4,
      category: "application",
      title: "Produce professional-quality pre-screening recordings",
      why: "Most conservatoires cut the majority of applicants at the pre-screen. The recording quality is part of what is being judged, whether or not anyone admits it.",
      outcome: "Pre-screening recordings meeting every target programme's technical specification.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Read each programme's recording rules — single take, no editing, visible hands or full body." },
        { label: "Select", detail: "Book a decent room and, if you can, a recordist. Acoustics matter more than the camera." },
        { label: "Execute", detail: "Record multiple complete takes on separate days; you will need the choice." },
        { label: "Present", detail: "Upload well before the deadline and verify the files play." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pa-l5-professional",
      level: 5,
      category: "activities",
      title: "Work professionally — get paid, or perform alongside professionals",
      why: "A paid engagement or a professional company credit places you in a different category and is the strongest possible evidence of readiness.",
      outcome: "A paid engagement or professional credit with the contract or programme.",
      timeEstimate: "6-12 months",
      microSteps: [
        { label: "Research", detail: "Identify local professional companies, ensembles, session work and paid engagements." },
        { label: "Select", detail: "Approach with recordings and a genuine credit list." },
        { label: "Execute", detail: "Be the most prepared and most reliable person there." },
        { label: "Present", detail: "Keep the contract, the programme, and any review." },
      ],
    },
    {
      id: "pa-l5-audition-prep",
      level: 5,
      category: "application",
      title: "Rehearse the live audition itself, including the interview",
      why: "Live auditions test nerve and adaptability as much as technique, and panels interview. Both are trainable and almost nobody trains them.",
      outcome: "Six full mock auditions in front of different people, recorded, with written feedback.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Find out each panel's format — how long, how many pieces, whether they interview." },
        { label: "Select", detail: "Recruit varied mock panels, including people who intimidate you." },
        { label: "Execute", detail: "Run the whole thing: entrance, introduction, performance, questions, exit." },
        { label: "Present", detail: "Watch the recordings and fix what you see rather than what you felt." },
      ],
    },
  ],
};

// ── Environmental Science & Sustainability ──────────────────────────────

export const environmentalScience: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "env-l1-monitor",
      level: 1,
      category: "research",
      title: "Start a monitoring programme on one site and keep it running",
      why: "Environmental science is longitudinal. A year of consistent measurements at one location is worth more than any number of one-off projects.",
      outcome: "A dataset of 6+ months of regular measurements from one site, with the protocol documented.",
      timeEstimate: "6-12 months, weekly",
      microSteps: [
        { label: "Research", detail: "Choose a measurable variable — water quality, air particulates, soil, phenology, species counts." },
        { label: "Select", detail: "Pick a site you can reach easily every week; access determines whether this survives." },
        { label: "Execute", detail: "Same method, same time, same place. Log conditions each visit." },
        { label: "Present", detail: "Publish the dataset with a written protocol so it is reproducible." },
      ],
      link: "https://www.globe.gov/",
      linkLabel: "GLOBE Program",
    },
    {
      id: "env-l1-gis",
      level: 1,
      category: "academics",
      title: "Learn GIS and map something real about your area",
      why: "GIS is the working toolset of environmental science, and free software plus open data means a school student can produce genuinely professional analysis.",
      outcome: "A map and spatial analysis you produced from real data, published with the methodology.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "QGIS is free and fully capable; open geodata portals exist for most countries." },
        { label: "Select", detail: "Pick a spatial question — tree cover, flood exposure, green space access, heat islands." },
        { label: "Execute", detail: "Do the analysis and state your projection and data sources clearly." },
        { label: "Present", detail: "Publish the map with a proper legend, scale bar and source note." },
      ],
      link: "https://qgis.org/",
      linkLabel: "QGIS (free)",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "env-l2-competition",
      level: 2,
      category: "competitions",
      title: "Compete in an environmental science competition",
      why: "Environmental competitions judge field knowledge and applied problem-solving together, which is a far better test than any written exam.",
      outcome: "A competition placement with the event and level recorded.",
      timeEstimate: "1 season",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "NCF-Envirothon tests soils, aquatics, forestry and wildlife as a team field competition."
            : "Find national environmental olympiads, water prizes and youth science competitions with environmental categories.",
        },
        { label: "Select", detail: "Build a team and split the subject areas between you." },
        { label: "Execute", detail: "Train in the field, not just from books. These competitions test identification and sampling." },
        { label: "Present", detail: "Archive the result." },
      ],
      link: isUS(c.country) ? "https://envirothon.org/" : undefined,
      linkLabel: isUS(c.country) ? "NCF-Envirothon" : undefined,
    },
    {
      id: "env-l2-citizen-science",
      level: 2,
      category: "research",
      title: "Contribute verified data to a real research programme",
      why: "Citizen science platforms feed genuine scientific datasets. Contributing verified records makes you part of the data pipeline rather than a reader of it.",
      outcome: "300+ verified records contributed, plus your own analysis of the local pattern.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Choose a platform with real scientific use and a verification process." },
        { label: "Select", detail: "Pick a taxon or measurement you can identify reliably." },
        { label: "Execute", detail: "Record on a fixed schedule; irregular effort makes the data much less useful." },
        { label: "Present", detail: "Analyse your own contributions for a local trend and write it up." },
      ],
      link: "https://www.inaturalist.org/",
      linkLabel: "iNaturalist",
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "env-l3-study",
      level: 3,
      category: "research",
      title: "Run a controlled environmental study with a real hypothesis",
      why: "Moving from monitoring to hypothesis testing is the step that turns data collection into science, and it is where most student projects stop short.",
      outcome: "A study with a stated hypothesis, controls, statistics and a written report.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Use your monitoring data to generate a testable question." },
        { label: "Select", detail: "Design controls and decide the sample size before you begin." },
        { label: "Execute", detail: "Collect systematically and record all conditions." },
        { label: "Present", detail: "Report the statistics honestly, including a null result." },
      ],
    },
    {
      id: "env-l3-remediation",
      level: 3,
      category: "leadership",
      title: "Deliver a measurable environmental improvement",
      why: "Clean-ups and awareness campaigns are dismissed. Hectares restored, litres saved, or a monitored water-quality improvement are results that survive scrutiny.",
      outcome: "A completed project with before/after measurements and partner confirmation.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Find a specific degraded site or a measurable resource problem." },
        { label: "Select", detail: "Partner with a land manager, council or conservation group — permission is essential." },
        { label: "Execute", detail: "Measure the baseline first, do the work, then measure again." },
        { label: "Present", detail: "Get the partner to confirm the outcome in writing." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "env-l4-research",
      level: 4,
      category: "research",
      title: "Work with a university or agency environmental research group",
      why: "Field and lab research groups take capable students for exactly the work students can do well — sampling, sorting, data entry — and the letter that follows is credible.",
      outcome: "A research contribution with a supervisor letter naming your responsibility.",
      timeEstimate: "One summer or two terms",
      microSteps: [
        { label: "Research", detail: `Look at ecology, hydrology, atmospheric and conservation groups nearby${isIndia(c.country) ? " — ATREE, NCBS, WII and university departments run student projects" : ""}.` },
        { label: "Select", detail: "Offer field assistance and data work; that is where the real need is." },
        { label: "Execute", detail: "Follow sampling protocols exactly. In field science, protocol discipline is everything." },
        { label: "Present", detail: "Request a letter naming the project and your task." },
      ],
    },
    {
      id: "env-l4-policy",
      level: 4,
      category: "leadership",
      title: "Get environmental evidence in front of decision-makers",
      why: "Environmental science exists to inform decisions. Submitting your own data to a consultation or hearing is where the science becomes consequential.",
      outcome: "A formal submission to a consultation, hearing or authority, with the acknowledgement.",
      timeEstimate: "4 months",
      microSteps: [
        { label: "Research", detail: "Find live consultations, planning applications or environmental hearings in your area." },
        { label: "Select", detail: "Choose one where your own data is directly relevant." },
        { label: "Execute", detail: "Write to the required format and submit within the window." },
        { label: "Present", detail: "Keep the acknowledgement and any reference to your evidence in the decision." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "env-l5-publish",
      level: 5,
      category: "research",
      title: "Publish your environmental research",
      why: "A published paper or dataset makes your work usable by other researchers — which is what distinguishes environmental science from environmental activism.",
      outcome: "A published paper, dataset or conference presentation with the venue named.",
      timeEstimate: "6-10 months",
      microSteps: [
        { label: "Research", detail: "Look at student journals, regional ecological society meetings and open data repositories." },
        { label: "Select", detail: "Long monitoring datasets are often more publishable than short experiments." },
        { label: "Execute", detail: "Write to format with full methodology and deposit the data openly." },
        { label: "Present", detail: "Keep the DOI or the programme listing." },
      ],
      link: "https://emerginginvestigators.org/",
      linkLabel: "Journal of Emerging Investigators",
    },
    {
      id: "env-l5-application",
      level: 5,
      category: "application",
      title: "Write the environmental application around one place you know completely",
      why: "This major receives an enormous volume of essays about loving nature and worrying about the climate. One site you have measured for a year, and one thing your data showed, is unmistakably different.",
      outcome: "A supplement anchored on one site and one finding from your own data.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Go back through your monitoring records for the change you did not expect." },
        { label: "Select", detail: "Choose the observation that complicated your assumptions." },
        { label: "Execute", detail: "Write it with the actual numbers and the actual place." },
        { label: "Present", detail: "Link the dataset so a reader can check you." },
      ],
    },
  ],
};
