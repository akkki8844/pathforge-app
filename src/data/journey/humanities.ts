/**
 * Journey templates — economics, business, law, political science,
 * journalism and education.
 *
 * These majors are where generic "join a club, become president" advice does
 * the most damage. Each track here is built around the artefact the field
 * actually produces: an econometric result, a P&L, a legal brief, a
 * campaign's canvass data, a published byline, a measured learning gain.
 */

import type { TemplateCtx, TemplateLibrary, TemplateTask } from "./types";
import { isIndia, isUS } from "./types";

// ── Economics ───────────────────────────────────────────────────────────

export const economics: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "econ-l1-maths",
      level: 1,
      category: "academics",
      title: "Take the most quantitative maths track available — economics is a maths degree now",
      why: "Applicants consistently underestimate this. Top economics departments screen on calculus and statistics before they read anything about your interest in markets.",
      outcome: "Enrolment in the highest maths track with a first-term grade of A-/85% or better.",
      timeEstimate: "1 semester",
      microSteps: [
        { label: "Research", detail: "Check the published maths requirements of three economics programmes you would actually attend." },
        { label: "Select", detail: "Take calculus and statistics if you must choose; both if you can." },
        { label: "Execute", detail: "Daily practice. Economics maths is cumulative and unforgiving of gaps." },
        { label: "Present", detail: "Track the grade trend, not just the grade." },
      ],
    },
    {
      id: "econ-l1-data",
      level: 1,
      category: "research",
      title: "Pull real economic data and produce your own chart of something local",
      why: "Every economics applicant says they read The Economist. Almost none has downloaded a series from a central bank and plotted it themselves.",
      outcome: "A published chart and 500-word explanation using data from an official statistical source.",
      timeEstimate: "5 weeks",
      microSteps: [
        {
          label: "Research",
          detail: isIndia(c.country)
            ? "Use the RBI database on the Indian economy, MOSPI, or data.gov.in."
            : "Use FRED from the St. Louis Fed, or your national statistics office.",
        },
        { label: "Select", detail: "Pick a local question — unemployment in your state, food inflation, rents in your city." },
        { label: "Execute", detail: "Download the raw series, plot it, and check the units and deflation carefully." },
        { label: "Present", detail: "Write what the chart shows and, more importantly, what it cannot show." },
      ],
      link: isIndia(c.country) ? "https://data.gov.in/" : "https://fred.stlouisfed.org/",
      linkLabel: isIndia(c.country) ? "data.gov.in" : "FRED",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "econ-l2-competition",
      level: 2,
      category: "competitions",
      title: isUS(c.country)
        ? "Compete in the National Economics Challenge or the Fed Challenge"
        : "Enter a national economics competition or essay prize",
      why: "These are judged by economists and require you to defend a position under questioning — a much harder test than any school assessment.",
      outcome: "A team or individual placement, recorded with the level reached.",
      timeEstimate: "1 season",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "The Council for Economic Education runs the National Economics Challenge; the Fed Challenge runs through regional Reserve Banks."
            : "Look at university-run essay prizes — many accept international school students.",
        },
        { label: "Select", detail: "Build a team early and divide micro, macro and current events between you." },
        { label: "Execute", detail: "Practise on past questions under timing, including the oral rounds." },
        { label: "Present", detail: "Archive the official result." },
      ],
      link: isUS(c.country) ? "https://www.councilforeconed.org/" : undefined,
      linkLabel: isUS(c.country) ? "Council for Economic Education" : undefined,
    },
    {
      id: "econ-l2-regression",
      level: 2,
      category: "research",
      title: "Run your first regression and interpret it honestly",
      why: "Econometrics is what economics actually is. Running a regression and being able to say why it does not prove causation is exactly the maturity departments look for.",
      outcome: "A short paper with a regression, the coefficient interpreted, and the identification problem stated.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Learn R or Stata basics; both have free or student routes." },
        { label: "Select", detail: "Choose a relationship with public data on both sides." },
        { label: "Execute", detail: "Run it, plot the residuals, and check the assumptions rather than just reporting R-squared." },
        { label: "Present", detail: "Write a paragraph on why your estimate is not causal. That paragraph is the whole point." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "econ-l3-original",
      level: 3,
      category: "research",
      title: "Write an original empirical paper on a question nobody has asked locally",
      why: "Local questions are where a school student can genuinely add something: the data exists, the literature does not, and the result is new.",
      outcome: "A full paper with a literature review, data, method, results and limitations.",
      timeEstimate: "4 months",
      microSteps: [
        { label: "Research", detail: "Find a policy change, a price shock, or a local intervention with a before and after." },
        { label: "Select", detail: "Check the data exists in sufficient quality before committing." },
        { label: "Execute", detail: "Use a defensible design — difference-in-differences, event study — and state its assumptions." },
        { label: "Present", detail: "Have an economics teacher or academic referee it before you circulate it." },
      ],
    },
    {
      id: "econ-l3-survey",
      level: 3,
      category: "activities",
      title: "Collect primary economic data yourself",
      why: "Original data collection is rare and immediately distinguishing — a price survey across local markets or a vendor questionnaire is data nobody else has.",
      outcome: "An original dataset with documented methodology and an analysis of it.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Choose something measurable and repeatable — market prices, wage rates, transport costs." },
        { label: "Select", detail: "Design the sampling before you start; convenience samples limit what you can claim." },
        { label: "Execute", detail: "Collect on a fixed schedule. Get consent for anything involving named individuals." },
        { label: "Present", detail: "Publish the dataset with a methodology note alongside the analysis." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "econ-l4-research-assist",
      level: 4,
      category: "research",
      title: "Assist an economist with real research",
      why: "Economics research assistance is mostly data cleaning and replication — genuinely useful work a capable school student can do, and it earns a credible letter.",
      outcome: "A defined RA contribution with a supervisor letter.",
      timeEstimate: "One summer or two terms",
      microSteps: [
        { label: "Research", detail: `Find economists at nearby universities or think tanks${isIndia(c.country) ? " — NCAER, CPR, IGIDR and university departments all use assistants" : ""}.` },
        { label: "Select", detail: "Offer exactly what RAs do: data cleaning, replication, literature screening." },
        { label: "Execute", detail: "Be meticulous. In empirical work, carelessness is the only unforgivable trait." },
        { label: "Present", detail: "Ask for a letter naming the project and your task." },
      ],
    },
    {
      id: "econ-l4-essay-prize",
      level: 4,
      category: "competitions",
      title: "Enter a major university economics essay prize",
      why: "University-run essay prizes are judged by academics against a real standard and several explicitly accept international entrants — a rare externally validated distinction.",
      outcome: "A submitted essay with any placement or judge feedback retained.",
      timeEstimate: "3-4 months",
      microSteps: [
        { label: "Research", detail: "Check the question, word limit and eligibility carefully; these are strictly enforced." },
        { label: "Select", detail: "Pick the question where you can bring your own data or a genuinely unusual angle." },
        { label: "Execute", detail: "Argue one thing well. Prize essays fail from breadth far more often than from depth." },
        { label: "Present", detail: "Keep the essay as a writing sample regardless of the result." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "econ-l5-publish",
      level: 5,
      category: "research",
      title: "Publish your economics research or present it publicly",
      why: "A working paper, student journal publication or conference presentation makes your work checkable — and checkability is what economics rewards.",
      outcome: "A published or presented paper with the venue named.",
      timeEstimate: "5-8 months",
      microSteps: [
        { label: "Research", detail: "Look at student economics journals, undergraduate research conferences, and SSRN for working papers." },
        { label: "Select", detail: "Match the venue to how defensible the identification strategy is." },
        { label: "Execute", detail: "Release the data and code alongside the paper." },
        { label: "Present", detail: "Keep the acceptance or the listing." },
      ],
    },
    {
      id: "econ-l5-application",
      level: 5,
      category: "application",
      title: "Write the economics application around a result that surprised you",
      why: "Economics readers have seen every essay about the 2008 crisis and about supply and demand at a lemonade stand. A specific empirical result of your own that contradicted your prior is not one of them.",
      outcome: "A supplement built on one finding and the belief it forced you to revise.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Reread your own analyses for the coefficient that came out wrong-signed." },
        { label: "Select", detail: "Choose the result you initially tried to explain away." },
        { label: "Execute", detail: "Write the revision of belief, with the numbers." },
        { label: "Present", detail: "Have someone who knows econometrics confirm your claims are stated accurately." },
      ],
    },
  ],
};

// ── Business / Entrepreneurship / Management ────────────────────────────

export const business: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bus-l1-accounting",
      level: 1,
      category: "academics",
      title: "Learn to read a real company's financial statements",
      why: "Business applicants who can walk through an actual annual report stand out sharply from those who can only talk about entrepreneurship in the abstract.",
      outcome: "A written analysis of one listed company's annual report covering revenue, margin, cash flow and one risk.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Download the annual report of a company you actually buy from." },
        { label: "Select", detail: "Learn the three statements and how they connect before analysing anything." },
        { label: "Execute", detail: "Work through the accounts line by line; look up every term you do not know." },
        { label: "Present", detail: "Write the analysis for a reader who has not seen the report." },
      ],
    },
    {
      id: "bus-l1-sell",
      level: 1,
      category: "activities",
      title: "Sell something to a stranger and record the unit economics",
      why: "The gap between a business idea and a business is a paying customer. One real transaction, with the costs tracked, teaches more than a term of theory.",
      outcome: "A record of real revenue with costs, unit margin, and what you learned from the first refusal.",
      timeEstimate: "6 weeks",
      microSteps: [
        { label: "Research", detail: "Find something you can make or do that someone nearby will pay for." },
        { label: "Select", detail: "Price it before you start and write down why." },
        { label: "Execute", detail: "Track every cost, including your own time. Sell to strangers, not relatives." },
        { label: "Present", detail: "Report the actual margin, even if it is negative." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bus-l2-competition",
      level: 2,
      category: "competitions",
      title: isUS(c.country)
        ? "Compete in DECA or FBLA at state level or above"
        : "Enter a national business plan or case competition",
      why: "Case competitions force you to structure an argument under time pressure in front of judges from industry — the closest school-level analogue to real business work.",
      outcome: "A placement at regional level or above, with the event named.",
      timeEstimate: "1 season",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "Check whether your school has a DECA or FBLA chapter; founding one is itself an item."
            : "Look at Diamond Challenge, Conrad Challenge and national business-plan contests with school divisions.",
        },
        { label: "Select", detail: "Choose the event category matching what you actually want to study." },
        { label: "Execute", detail: "Practise the presentation against a stopwatch and a hostile questioner." },
        { label: "Present", detail: "Archive the placement and the judges' scoresheets." },
      ],
      link: isUS(c.country) ? "https://www.deca.org/" : "https://diamondchallenge.org/",
      linkLabel: isUS(c.country) ? "DECA" : "Diamond Challenge",
    },
    {
      id: "bus-l2-venture",
      level: 2,
      category: "activities",
      title: "Run a venture to £/$/₹1,000 of real revenue",
      why: "A thousand units of real money from real customers is a threshold nobody can wave away, and it is achievable for a school student who actually starts.",
      outcome: "Revenue records showing 1,000+ in real sales, with a customer list and cost breakdown.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Choose a market you can reach without paid advertising." },
        { label: "Select", detail: "Keep the cost base near zero until revenue exists." },
        { label: "Execute", detail: "Track every transaction properly from the first one. Retrofitting records is miserable." },
        { label: "Present", detail: "Produce a simple P&L and a written account of what you got wrong." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bus-l3-team",
      level: 3,
      category: "leadership",
      title: "Hire, manage and eventually let go of someone",
      why: "Management is the actual subject of a business degree. Having genuinely managed people — including the hard conversation — is exceptionally rare at this age.",
      outcome: "A documented team structure with roles, and a written reflection on one difficult personnel decision.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Work out which parts of your venture you should stop doing yourself." },
        { label: "Select", detail: "Define the role and the expectations in writing before recruiting." },
        { label: "Execute", detail: "Give real feedback on a real schedule. Handle underperformance rather than absorbing it." },
        { label: "Present", detail: "Reflect honestly on what you handled badly." },
      ],
    },
    {
      id: "bus-l3-market",
      level: 3,
      category: "research",
      title: "Do primary market research with real potential customers",
      why: "Most student business plans are built on assumptions. Fifty real customer conversations, properly recorded, produce a plan that survives its first contact with reality.",
      outcome: "50+ documented customer interviews with a written synthesis and the pivot it caused.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Learn how to ask about past behaviour rather than future intentions." },
        { label: "Select", detail: "Target people who are not your friends. Friends will lie to be kind." },
        { label: "Execute", detail: "Fifty conversations, notes on each, tallied by theme." },
        { label: "Present", detail: "Write what the research killed, not just what it supported." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bus-l4-scale",
      level: 4,
      category: "activities",
      title: "Grow the venture to a number that requires explanation",
      why: "At Level 4 the business must generate a metric an admissions reader stops on — revenue, users, or units — and that number is what carries the whole application.",
      outcome: "A verified metric with the supporting records: revenue statements, analytics, or order history.",
      timeEstimate: "6-9 months",
      microSteps: [
        { label: "Research", detail: "Identify your single binding constraint — demand, capacity, or cash." },
        { label: "Select", detail: "Fix that one constraint rather than working on everything." },
        { label: "Execute", detail: "Track the metric weekly and keep the raw records." },
        { label: "Present", detail: "Be able to evidence the number; unverifiable claims are worse than smaller real ones." },
      ],
    },
    {
      id: "bus-l4-accelerator",
      level: 4,
      category: "competitions",
      title: "Get into a selective, non-fee-paying accelerator or incubator",
      why: "Selection by people with no financial interest in admitting you is real validation. Paid summer business programmes are not — admissions readers discount them heavily.",
      outcome: "An acceptance into a competitive programme, with the selectivity documented.",
      timeEstimate: "4 months including application",
      microSteps: [
        { label: "Research", detail: "Filter hard for programmes that do not charge students. Free and selective is the signal." },
        { label: "Select", detail: "Apply with traction, not with a deck full of projections." },
        { label: "Execute", detail: "Prepare for the interview by knowing your own numbers cold." },
        { label: "Present", detail: "Record the acceptance and the cohort size." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "bus-l5-institution",
      level: 5,
      category: "leadership",
      title: "Make the venture outlast you",
      why: "Handing over something that keeps running after you leave for university is the difference between a school activity and an institution you built.",
      outcome: "A documented handover with a successor named and the operation still running after eight weeks.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Document every process that currently lives only in your head." },
        { label: "Select", detail: "Choose and train a successor well before you need one." },
        { label: "Execute", detail: "Step back deliberately and let them run it while you are still available." },
        { label: "Present", detail: "Evidence that it is still operating without you." },
      ],
    },
    {
      id: "bus-l5-application",
      level: 5,
      category: "application",
      title: "Write the business application around a decision that cost you money",
      why: "Business essays about founding a club are indistinguishable. An essay about a pricing decision that lost real money, and what you concluded, is not.",
      outcome: "A supplement anchored on one costly decision, with the numbers and the reasoning.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Go through your records for the decision you most regret." },
        { label: "Select", detail: "Choose the one where the mistake was in your reasoning, not your luck." },
        { label: "Execute", detail: "Write the reasoning and the correction. Include the actual figures." },
        { label: "Present", detail: "Have a reader confirm you sound accountable rather than defensive." },
      ],
    },
  ],
};

// ── Law / Pre-Law ───────────────────────────────────────────────────────

export const law: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "law-l1-read-cases",
      level: 1,
      category: "academics",
      title: "Read primary sources — actual judgments, not summaries of them",
      why: "Law is a reading discipline. Working through a full judgment, including the dissent, is the single best preparation and almost no applicant has done it.",
      outcome: "Written case briefs for 10 judgments, each with facts, issue, holding and reasoning.",
      timeEstimate: "10 weeks",
      microSteps: [
        {
          label: "Research",
          detail: isIndia(c.country)
            ? "Indian Supreme Court judgments are freely available on the Supreme Court and Indian Kanoon sites."
            : "Oyez and CourtListener publish US opinions and oral arguments free of charge.",
        },
        { label: "Select", detail: "Choose cases from one area so the doctrine accumulates." },
        { label: "Execute", detail: "Brief each one to a fixed format. Read the dissent every time." },
        { label: "Present", detail: "Publish the briefs; they demonstrate reading stamina and precision." },
      ],
      link: isIndia(c.country) ? "https://indiankanoon.org/" : "https://www.oyez.org/",
      linkLabel: isIndia(c.country) ? "Indian Kanoon" : "Oyez",
    },
    {
      id: "law-l1-argue",
      level: 1,
      category: "competitions",
      title: "Join debate and learn to argue the side you disagree with",
      why: "Advocacy means constructing the strongest version of a position you find wrong. Competitive debate is the only school activity that trains this directly.",
      outcome: "A season of competitive debate with tournament records.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Find your school's team, or the national debating association's schools programme." },
        { label: "Select", detail: "Choose a format with real judged rounds rather than informal discussion." },
        { label: "Execute", detail: "Compete regularly. Ask judges for their reasoning after every round." },
        { label: "Present", detail: "Keep the tournament record." },
      ],
      link: isUS(c.country) ? "https://www.speechanddebate.org/" : undefined,
      linkLabel: isUS(c.country) ? "NSDA" : undefined,
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "law-l2-mock-trial",
      level: 2,
      category: "competitions",
      title: "Compete in mock trial or moot court",
      why: "Mock trial teaches rules of evidence and examination technique; moot court teaches appellate argument. Both are judged by actual lawyers, which is the point.",
      outcome: "A season with a documented role — counsel or witness — and the competition results.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Find the mock trial or moot competition operating in your region." },
        { label: "Select", detail: "Take a counsel role if you can; it is where the skill develops fastest." },
        { label: "Execute", detail: "Learn the case file completely. Preparation beats eloquence every time." },
        { label: "Present", detail: "Keep the results and any judge feedback sheets." },
      ],
      link: isUS(c.country) ? "https://www.nationalmocktrial.org/" : undefined,
      linkLabel: isUS(c.country) ? "National High School Mock Trial" : undefined,
    },
    {
      id: "law-l2-legal-writing",
      level: 2,
      category: "academics",
      title: "Write a real legal memorandum on a live question",
      why: "Legal writing is a specific form — issue, rule, application, conclusion — and producing one competently is far more distinguishing than any essay about justice.",
      outcome: "A structured memorandum with citations, reviewed by a lawyer or law student.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Pick a narrow, genuinely contested question rather than a broad topic." },
        { label: "Select", detail: "Learn the IRAC structure and one citation format properly." },
        { label: "Execute", detail: "Research from primary sources and cite them accurately." },
        { label: "Present", detail: "Get a lawyer or law student to mark it up and revise accordingly." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "law-l3-access",
      level: 3,
      category: "activities",
      title: "Volunteer with a legal aid, rights or advocacy organisation",
      why: "Working near real cases shows you what law is like when it is not a competition — and gives you something specific to write about that no summer programme provides.",
      outcome: "Sustained volunteering with a supervisor reference and a documented contribution.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Approach legal aid clinics, rights organisations, and community advice services." },
        { label: "Select", detail: "Offer research, translation, intake support or documentation — genuinely useful tasks." },
        { label: "Execute", detail: "Treat confidentiality as absolute. Never discuss any case, ever." },
        { label: "Present", detail: "Ask for a reference naming what you contributed." },
      ],
    },
    {
      id: "law-l3-shadow",
      level: 3,
      category: "activities",
      title: "Sit in a real courtroom and follow one case properly",
      why: "Most hearings are public. Watching an actual trial or hearing across several days, and writing up the procedure, is free, rare and immediately credible.",
      outcome: "A written account of a real case observed over multiple sittings, with the procedure explained.",
      timeEstimate: "6 weeks",
      microSteps: [
        { label: "Research", detail: "Check which courts have public galleries and what the listing schedule is." },
        { label: "Select", detail: "Choose a case you can follow across several days rather than dropping into one hearing." },
        { label: "Execute", detail: "Observe respectfully and follow all court rules. Take notes only where permitted." },
        { label: "Present", detail: "Write it up focusing on procedure and advocacy technique, not on the parties." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "law-l4-national",
      level: 4,
      category: "competitions",
      title: "Reach a national round in mooting, mock trial or debate",
      why: "A national-level advocacy result is externally verifiable and directly relevant, which is a combination few pre-law applicants can produce.",
      outcome: "A national qualification or placement, archived.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Map the qualification pathway and the historical standard required." },
        { label: "Select", detail: "Concentrate on one format rather than spreading across three." },
        { label: "Execute", detail: "Drill against stronger opponents; comfortable rounds do not improve anyone." },
        { label: "Present", detail: "Archive the official result." },
      ],
    },
    {
      id: "law-l4-policy",
      level: 4,
      category: "leadership",
      title: "Change one rule or policy through the proper process",
      why: "Law is procedure. Actually changing a school, council or organisational policy by following its rules is the most concrete demonstration of legal thinking available.",
      outcome: "A written record of the change adopted, plus the submission that achieved it.",
      timeEstimate: "6-9 months",
      microSteps: [
        { label: "Research", detail: "Read the constitution or rules of the body that has authority. Find the actual mechanism." },
        { label: "Select", detail: "Choose one change and draft it in the correct form." },
        { label: "Execute", detail: "Build support, submit properly, and attend every meeting." },
        { label: "Present", detail: "Obtain the minutes or written decision." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "law-l5-publish",
      level: 5,
      category: "research",
      title: "Publish legal analysis somewhere with an editor",
      why: "Student law reviews, legal blogs and opinion pages have editors who will reject sloppy reasoning, so publication is a real quality filter.",
      outcome: "A published piece of legal analysis with the outlet named.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Look at student law journals and law blogs that accept external contributions." },
        { label: "Select", detail: "Pick a live question where you have something specific to say." },
        { label: "Execute", detail: "Write it, cite it properly, and take the editorial revisions seriously." },
        { label: "Present", detail: "Keep the published link." },
      ],
    },
    {
      id: "law-l5-application",
      level: 5,
      category: "application",
      title: "Write the pre-law application around an argument you lost",
      why: "Pre-law essays about wanting to fight injustice are the most crowded genre in admissions. An argument you lost, and what the loss taught you about the other side, is not.",
      outcome: "A supplement anchored on one argument you lost and how it changed your reasoning.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Go through your debate and moot records for the round you should have won." },
        { label: "Select", detail: "Choose the loss where the other side was actually right." },
        { label: "Execute", detail: "Write the concession honestly. Advocacy that cannot concede is not credible." },
        { label: "Present", detail: "Have a reader check that you sound rigorous rather than merely combative." },
      ],
    },
  ],
};

// ── Political Science / International Relations / Public Policy ─────────

export const politicalScience: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pol-l1-mun",
      level: 1,
      category: "competitions",
      title: "Do Model UN properly — research your country's actual positions",
      why: "Model UN is common; doing it well is not. Delegates who cite their country's real voting record and treaty reservations are immediately visible.",
      outcome: "Conference participation with your position paper and any award.",
      timeEstimate: "1 season",
      microSteps: [
        { label: "Research", detail: "Read your assigned country's real UN voting record and statements before writing anything." },
        { label: "Select", detail: "Choose committees on topics you will still care about in three years." },
        { label: "Execute", detail: "Write a position paper grounded in actual policy, then negotiate from it." },
        { label: "Present", detail: "Keep the position papers; they are evidence of research quality." },
      ],
    },
    {
      id: "pol-l1-data",
      level: 1,
      category: "research",
      title: "Learn to read political and electoral data properly",
      why: "Political science is quantitative. Analysing real election or survey data separates you from applicants whose engagement is entirely rhetorical.",
      outcome: "A written analysis of real electoral or survey data with charts you made yourself.",
      timeEstimate: "8 weeks",
      microSteps: [
        {
          label: "Research",
          detail: isIndia(c.country)
            ? "The Election Commission of India publishes constituency-level results; Lokniti-CSDS publishes survey data."
            : "Use official electoral commission data and reputable public survey archives.",
        },
        { label: "Select", detail: "Pick one constituency or one question and go deep." },
        { label: "Execute", detail: "Build the charts yourself and check turnout denominators carefully." },
        { label: "Present", detail: "Write what the data supports and, explicitly, what it does not." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pol-l2-campaign",
      level: 2,
      category: "activities",
      title: "Work on a real campaign or civic organisation",
      why: "Canvassing, phone banking and voter registration are how politics actually functions, and the hours are countable and verifiable.",
      outcome: "Logged campaign hours with a supervisor reference and your own contact numbers.",
      timeEstimate: "1 campaign cycle",
      microSteps: [
        { label: "Research", detail: "Find local campaigns, civic groups, or non-partisan registration drives." },
        { label: "Select", detail: "Pick something local enough that you will be given real responsibility." },
        { label: "Execute", detail: "Do the unglamorous work and track your own numbers — doors, calls, registrations." },
        { label: "Present", detail: "Get a reference that names your figures." },
      ],
    },
    {
      id: "pol-l2-brief",
      level: 2,
      category: "research",
      title: "Write a policy brief on a live local issue",
      why: "A policy brief — problem, options, trade-offs, recommendation — is the actual output format of the field, and writing one is far more distinguishing than an opinion essay.",
      outcome: "A brief with a costed recommendation, sent to a relevant official.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Choose an issue where a decision is genuinely pending." },
        { label: "Select", detail: "Study the standard brief format; brevity and structure are the discipline." },
        { label: "Execute", detail: "Present three options with honest trade-offs before recommending one." },
        { label: "Present", detail: "Send it to the responsible official and record any reply." },
      ],
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pol-l3-intern",
      level: 3,
      category: "activities",
      title: "Intern in a legislative office, think tank or civil-society organisation",
      why: "Seeing how a bill, a budget or an advocacy campaign is actually made is the experience that makes a political science application concrete.",
      outcome: "A completed internship with a written deliverable and a supervisor letter.",
      timeEstimate: "4-10 weeks",
      microSteps: [
        { label: "Research", detail: "Local and state offices take students far more readily than national ones." },
        { label: "Select", detail: "Offer research and constituent correspondence — the tasks offices actually need help with." },
        { label: "Execute", detail: "Produce one research product they use." },
        { label: "Present", detail: "Ask for a letter naming the deliverable." },
      ],
    },
    {
      id: "pol-l3-research",
      level: 3,
      category: "research",
      title: "Run an original political research project with primary data",
      why: "Interviewing local officials or surveying voters produces data that does not exist elsewhere, which is the only reliable way for a school student to add something.",
      outcome: "A research paper with primary data, methodology and findings.",
      timeEstimate: "4 months",
      microSteps: [
        { label: "Research", detail: "Choose a question answerable by interview or local survey." },
        { label: "Select", detail: "Get ethical review and informed consent for any human subjects." },
        { label: "Execute", detail: "Document your sampling and be honest about its limits." },
        { label: "Present", detail: "Write it to academic format with limitations stated plainly." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pol-l4-selective",
      level: 4,
      category: "competitions",
      title: "Win a place in a selective civic or government programme",
      why: "Competitive, free civic programmes select on merit and are recognised — a much stronger signal than any fee-paying summer politics course.",
      outcome: "Selection into a competitive programme, with the selectivity documented.",
      timeEstimate: "3-4 months including application",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "Boys/Girls State, the US Senate Youth Program and legislative page programmes are competitive and free."
            : "Look for national youth parliament schemes and government-run youth delegate programmes.",
        },
        { label: "Select", detail: "Note the nomination route; many require a school or official nomination." },
        { label: "Execute", detail: "Apply early and secure the nomination well ahead of the deadline." },
        { label: "Present", detail: "Record the acceptance and the number selected." },
      ],
    },
    {
      id: "pol-l4-organise",
      level: 4,
      category: "leadership",
      title: "Organise a campaign that produces a measurable civic outcome",
      why: "Awareness-raising is dismissed. Registrations added, turnout changed, or a policy amended are outcomes that survive scrutiny.",
      outcome: "A completed campaign with a specific measured outcome and independent confirmation.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Choose an outcome you can actually count." },
        { label: "Select", detail: "Partner with an established organisation for legitimacy and reach." },
        { label: "Execute", detail: "Track the number weekly and keep the raw records." },
        { label: "Present", detail: "Get the partner organisation to confirm the figure in writing." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "pol-l5-publish",
      level: 5,
      category: "research",
      title: "Publish your political analysis somewhere edited",
      why: "An op-ed in a real newspaper or a piece in a student policy journal has passed an editor, which is a genuine quality filter and a public record.",
      outcome: "A published piece with the outlet named.",
      timeEstimate: "3-5 months",
      microSteps: [
        { label: "Research", detail: "Read the submission guidelines for local papers and student policy journals." },
        { label: "Select", detail: "Write on something local where your primary research gives you standing." },
        { label: "Execute", detail: "Pitch, write to the word limit, and accept the editing." },
        { label: "Present", detail: "Keep the published link." },
      ],
    },
    {
      id: "pol-l5-application",
      level: 5,
      category: "application",
      title: "Write the application around a political belief you changed",
      why: "Political science essays that restate a partisan position read as unexamined. Describing a belief you revised, and the evidence that did it, reads as a scholar.",
      outcome: "A supplement anchored on one revised belief and the evidence behind the revision.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Identify a position you held two years ago and no longer hold." },
        { label: "Select", detail: "Choose the change driven by evidence or by a conversation, not by fashion." },
        { label: "Execute", detail: "Write it without contempt for your earlier self or for the other side." },
        { label: "Present", detail: "Have a reader who disagrees with you check that it reads fairly." },
      ],
    },
  ],
};

// ── Journalism / Communications / Media ─────────────────────────────────

export const journalism: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "jour-l1-bylines",
      level: 1,
      category: "activities",
      title: "Get your first ten published bylines",
      why: "Journalism is the one field where the entry credential is simply published work. Ten bylines beats any amount of stated interest.",
      outcome: "Ten published pieces with links, collected in one portfolio.",
      timeEstimate: "1 term",
      microSteps: [
        { label: "Research", detail: "Start with the school paper, then local community outlets and youth publications." },
        { label: "Select", detail: "Choose stories nobody else is covering — that is how you get accepted." },
        { label: "Execute", detail: "File on deadline, every time. Reliability is what gets you asked again." },
        { label: "Present", detail: "Build one portfolio page with all links." },
      ],
    },
    {
      id: "jour-l1-craft",
      level: 1,
      category: "academics",
      title: "Learn interviewing, sourcing and media law basics",
      why: "The skills that separate journalism from blogging are verification, sourcing and knowing what you may legally publish. All three are learnable now.",
      outcome: "A written sourcing and verification standard you actually apply, plus a completed ethics or media-law module.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Poynter and similar institutes publish free training on verification and ethics." },
        { label: "Select", detail: "Cover interviewing, on/off the record, and the basics of defamation." },
        { label: "Execute", detail: "Apply it to your next piece — two independent sources minimum." },
        { label: "Present", detail: "Write your own standards note and keep to it." },
      ],
      link: "https://www.poynter.org/",
      linkLabel: "Poynter",
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "jour-l2-original",
      level: 2,
      category: "research",
      title: "Break one story that nobody else has",
      why: "Aggregation and opinion are abundant. An original story sourced from records or interviews is a genuine contribution and the thing editors remember.",
      outcome: "A published original story with named sources or documents, and evidence of its reach.",
      timeEstimate: "8-10 weeks",
      microSteps: [
        { label: "Research", detail: "Look at public records, budgets, minutes and inspection reports for your area." },
        { label: "Select", detail: "Choose the discrepancy you can actually verify." },
        { label: "Execute", detail: "Verify with at least two independent sources and seek comment from anyone criticised." },
        { label: "Present", detail: "Publish and record the response — reaction is part of the artefact." },
      ],
    },
    {
      id: "jour-l2-award",
      level: 2,
      category: "competitions",
      title: "Enter national student journalism awards",
      why: "Awards from established press associations are judged by working journalists and are the field's recognised external validation.",
      outcome: "A submitted entry, with any award or honourable mention recorded.",
      timeEstimate: "1 cycle",
      microSteps: [
        {
          label: "Research",
          detail: isUS(c.country)
            ? "NSPA and the Columbia Scholastic Press Association both run individual and publication awards."
            : "Find your country's student press association and national youth writing awards.",
        },
        { label: "Select", detail: "Match the category to your strongest piece rather than your favourite." },
        { label: "Execute", detail: "Follow the submission rules exactly; entries get disqualified on formatting." },
        { label: "Present", detail: "Archive the result." },
      ],
      link: isUS(c.country) ? "https://studentpress.org/nspa/" : undefined,
      linkLabel: isUS(c.country) ? "NSPA" : undefined,
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "jour-l3-lead",
      level: 3,
      category: "leadership",
      title: "Edit a publication and be accountable for what it prints",
      why: "Editing means making calls about what runs, defending them, and correcting errors publicly. That responsibility is a different order from writing.",
      outcome: "A masthead role across a full publication cycle, with a corrections policy you wrote and applied.",
      timeEstimate: "1 academic year",
      microSteps: [
        { label: "Research", detail: "Understand your publication's actual editorial independence and constraints." },
        { label: "Select", detail: "Take a section or the top job rather than a nominal title." },
        { label: "Execute", detail: "Publish on schedule. Run corrections openly when you get something wrong." },
        { label: "Present", detail: "Keep the issues, the policy, and any correction you had to run." },
      ],
    },
    {
      id: "jour-l3-multimedia",
      level: 3,
      category: "activities",
      title: "Produce a serious piece in audio, video or data journalism",
      why: "Newsrooms hire for format range. A documented podcast episode, short documentary or data story shows you can report in more than one medium.",
      outcome: "A published multimedia piece with audience numbers.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Pick the format that suits the story rather than the one you find easiest." },
        { label: "Select", detail: "Learn the tools well enough that the craft is not the limiting factor." },
        { label: "Execute", detail: "Report it as rigorously as you would a written piece." },
        { label: "Present", detail: "Publish and record the audience figures." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "jour-l4-professional",
      level: 4,
      category: "activities",
      title: "Get published by a professional outlet as a freelancer or intern",
      why: "A byline in a real newspaper or magazine, edited by a professional desk, is categorically different from student publication and reads that way.",
      outcome: "A byline in a professional outlet, with the editor's name recorded.",
      timeEstimate: "4-6 months",
      microSteps: [
        { label: "Research", detail: "Read the outlet closely and identify the section your story fits." },
        { label: "Select", detail: "Pitch a story only you can get — local access is your advantage." },
        { label: "Execute", detail: "Pitch in three paragraphs, deliver on deadline, accept the edit." },
        { label: "Present", detail: "Keep the published link and the editorial relationship." },
      ],
    },
    {
      id: "jour-l4-investigation",
      level: 4,
      category: "research",
      title: "Run one long-form investigation to publication",
      why: "A months-long investigation with records requests and multiple sources is the hardest thing in the field, and finishing one at school level is genuinely rare.",
      outcome: "A published long-form investigation with a documented methodology.",
      timeEstimate: "5-8 months",
      microSteps: [
        { label: "Research", detail: "File public records requests early; the wait is usually the constraint." },
        { label: "Select", detail: "Choose a subject where the documents will exist." },
        { label: "Execute", detail: "Build a source and document log. Seek comment from everyone criticised." },
        { label: "Present", detail: "Publish with a methodology note explaining how you know what you claim." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "jour-l5-impact",
      level: 5,
      category: "leadership",
      title: "Report something that produces a documented change",
      why: "Impact is journalism's own measure of success. A policy reversed, a fund released, or an official response is the strongest artefact the field offers.",
      outcome: "Documented evidence of a change following your reporting.",
      timeEstimate: "6-12 months",
      microSteps: [
        { label: "Research", detail: "Follow up on your earlier stories; impact usually comes from persistence." },
        { label: "Select", detail: "Choose the story where someone with authority actually responded." },
        { label: "Execute", detail: "Keep reporting the follow-up until the outcome is settled." },
        { label: "Present", detail: "Archive the evidence — the statement, the minutes, the reversal." },
      ],
    },
    {
      id: "jour-l5-portfolio",
      level: 5,
      category: "application",
      title: "Build the clip portfolio your application links to",
      why: "Journalism programmes read clips. A curated portfolio of your six strongest pieces, with a line on what each required, is the application.",
      outcome: "A portfolio page with six pieces, each annotated with the reporting challenge it involved.",
      timeEstimate: "3 weeks",
      microSteps: [
        { label: "Research", detail: "Look at how working journalists structure portfolios." },
        { label: "Select", detail: "Six pieces maximum, range of formats, best work only." },
        { label: "Execute", detail: "Annotate each with what was hard about getting it." },
        { label: "Present", detail: "Link it in your application and your email signature." },
      ],
    },
  ],
};

// ── Education / Teaching ────────────────────────────────────────────────

export const education: TemplateLibrary = {
  1: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "edu-l1-tutor",
      level: 1,
      category: "activities",
      title: "Tutor the same students consistently and track whether they improve",
      why: "Everybody claims to tutor. Almost nobody measures whether their students actually learned anything, and that measurement is the entire difference.",
      outcome: "A tutoring record across 20+ sessions with before/after assessment data for each student.",
      timeEstimate: "1 term",
      microSteps: [
        { label: "Research", detail: "Find students who need help through your school, a library, or a community centre." },
        { label: "Select", detail: "Commit to the same small group weekly rather than drop-in sessions." },
        { label: "Execute", detail: "Assess at the start, teach, assess again at the end using the same instrument." },
        { label: "Present", detail: "Report the change per student, including where there was none." },
      ],
    },
    {
      id: "edu-l1-pedagogy",
      level: 1,
      category: "academics",
      title: "Learn actual learning science — including which popular ideas are wrong",
      why: "Learning styles are not supported by evidence; spaced retrieval is. A future teacher who knows the difference at 17 is genuinely unusual.",
      outcome: "A written summary of evidence-based teaching methods with sources, plus a critique of one popular myth.",
      timeEstimate: "8 weeks",
      microSteps: [
        { label: "Research", detail: "Read on retrieval practice, spacing, interleaving and cognitive load." },
        { label: "Select", detail: "Pick one widely believed myth and find the evidence against it." },
        { label: "Execute", detail: "Apply one evidence-based technique in your tutoring and record what happened." },
        { label: "Present", detail: "Write the summary with proper citations." },
      ],
    },
  ],
  2: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "edu-l2-design",
      level: 2,
      category: "activities",
      title: "Design and teach a full course of your own",
      why: "Designing a sequence — objectives, assessment, materials — is the professional work of teaching, and delivering it repeatedly proves it holds up.",
      outcome: "A course of 6+ sessions delivered to 10+ students, with materials published and assessment data.",
      timeEstimate: "1 term",
      microSteps: [
        { label: "Research", detail: "Find a genuine gap — coding, financial literacy, exam technique, a language." },
        { label: "Select", detail: "Write the learning objectives first and design the assessment before the content." },
        { label: "Execute", detail: "Deliver every session. Adjust based on what students actually got wrong." },
        { label: "Present", detail: "Publish the materials openly with the assessment results." },
      ],
    },
    {
      id: "edu-l2-classroom",
      level: 2,
      category: "activities",
      title: "Get real classroom experience with a teacher who will mentor you",
      why: "Classroom management is what actually breaks new teachers, and it can only be learned by being in a room with thirty children.",
      outcome: "Logged classroom assistance hours with a mentor teacher's reference.",
      timeEstimate: "1 term",
      microSteps: [
        { label: "Research", detail: "Ask a primary school or your own teachers about assisting; check any required clearances." },
        { label: "Select", detail: "Choose an age group different from your own experience." },
        { label: "Execute", detail: "Observe management technique deliberately, then take small groups yourself." },
        { label: "Present", detail: "Ask the mentor for a reference on your classroom presence specifically." },
      ],
      link: isUS(c.country) ? "https://educatorsrising.org/" : undefined,
      linkLabel: isUS(c.country) ? "Educators Rising" : undefined,
    },
  ],
  3: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "edu-l3-programme",
      level: 3,
      category: "leadership",
      title: "Build a tutoring or learning programme that runs without you present",
      why: "Recruiting and training other tutors, then having the programme continue when you are absent, is the shift from volunteer to organisation-builder.",
      outcome: "A programme with 5+ trained tutors, 25+ students, and outcome data across the cohort.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Identify demand and secure a venue and a schedule." },
        { label: "Select", detail: "Recruit tutors and write an actual training curriculum for them." },
        { label: "Execute", detail: "Standardise assessment across tutors so the data is comparable." },
        { label: "Present", detail: "Publish the cohort results, including the students who did not improve." },
      ],
    },
    {
      id: "edu-l3-equity",
      level: 3,
      category: "research",
      title: "Research an educational inequity in your own area with real data",
      why: "Education policy runs on data. Documenting a real local disparity with official statistics is a genuine contribution and a serious research artefact.",
      outcome: "A research report using official education data, delivered to a school board or authority.",
      timeEstimate: "3 months",
      microSteps: [
        { label: "Research", detail: "Pull published school-level data — enrolment, attainment, dropout, teacher ratios." },
        { label: "Select", detail: "Narrow to one measurable disparity." },
        { label: "Execute", detail: "Analyse carefully and be cautious about causal claims." },
        { label: "Present", detail: "Deliver it to the responsible body and record their response." },
      ],
    },
  ],
  4: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "edu-l4-outcomes",
      level: 4,
      category: "research",
      title: "Prove your programme works with a defensible evaluation",
      why: "Claiming impact is easy; evidencing it against a comparison group is what education research demands, and doing it at school level is exceptional.",
      outcome: "An evaluation report with a comparison group or pre/post design and an effect size.",
      timeEstimate: "6 months",
      microSteps: [
        { label: "Research", detail: "Learn what a defensible design looks like and what your data can support." },
        { label: "Select", detail: "Use a comparison group if you ethically can; otherwise be explicit about the limit." },
        { label: "Execute", detail: "Collect consistently and analyse honestly." },
        { label: "Present", detail: "Report the effect size and the confidence interval, not just the direction." },
      ],
    },
    {
      id: "edu-l4-teach-teachers",
      level: 4,
      category: "leadership",
      title: "Train other people to teach",
      why: "Moving from teaching students to training teachers is a genuine step up in scope, and the multiplier is what education leadership actually means.",
      outcome: "A training programme delivered to 10+ tutors or teachers with feedback data.",
      timeEstimate: "4 months",
      microSteps: [
        { label: "Research", detail: "Identify what your tutors consistently struggle with." },
        { label: "Select", detail: "Build the training around those specific failure points." },
        { label: "Execute", detail: "Include practice and feedback, not just presentation." },
        { label: "Present", detail: "Collect participant feedback and evidence of changed practice." },
      ],
    },
  ],
  5: (c: TemplateCtx): TemplateTask[] => [
    {
      id: "edu-l5-scale",
      level: 5,
      category: "leadership",
      title: "Get your approach adopted by an institution that is not yours",
      why: "Another school, an NGO or a district adopting your materials is external validation that your work is genuinely useful rather than locally impressive.",
      outcome: "Written confirmation of adoption by an outside institution.",
      timeEstimate: "6-12 months",
      microSteps: [
        { label: "Research", detail: "Identify institutions with the same problem you solved." },
        { label: "Select", detail: "Package the materials so someone else can run them without you." },
        { label: "Execute", detail: "Support the first adopter closely; the first adoption is the hardest." },
        { label: "Present", detail: "Get written confirmation and, if possible, their outcome data." },
      ],
    },
    {
      id: "edu-l5-application",
      level: 5,
      category: "application",
      title: "Write the education application around one student who did not improve",
      why: "Education essays about the joy of a lightbulb moment are ubiquitous. The student you could not reach, and what you changed as a result, is the honest and memorable version.",
      outcome: "A supplement anchored on one student, fully anonymised, and the change in your practice.",
      timeEstimate: "4 weeks",
      microSteps: [
        { label: "Research", detail: "Look back at your assessment data for the student who flatlined." },
        { label: "Select", detail: "Choose the case where you eventually understood why." },
        { label: "Execute", detail: "Anonymise completely and write about your practice, not the child's deficits." },
        { label: "Present", detail: "Have a teacher confirm it reads professionally and respectfully." },
      ],
    },
  ],
};
