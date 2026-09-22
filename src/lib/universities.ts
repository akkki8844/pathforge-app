// US Top 20 — university-specific application structure & supplemental prompts.
// Each entry includes: id, name, supplements (extra essays beyond Common App PS),
// and any university-specific notes the AI uses to tailor output.

export interface SupplementPrompt {
  id: string;
  label: string;
  wordLimit: number;
  prompt: string;
}

export interface UniversityProfile {
  id: string;
  name: string;
  shortName: string;
  notes: string; // What the AI should know about this school's vibe / what they value
  supplements: SupplementPrompt[];
}

export const UNIVERSITIES: UniversityProfile[] = [
  {
    id: "harvard",
    name: "Harvard University",
    shortName: "Harvard",
    notes: "Harvard's own admissions site confirms 5 required short-answer questions at a 150-word limit each for 2026-27 (corrected here from a wrong 200-word figure), but the exact prompt text lives in a linked PDF supplement form that wasn't independently reachable. Only 4 prompts are listed below (a near-duplicate \"future roommate\" prompt was removed as likely stale); the 5th prompt is missing entirely. Treat these topics as directionally right but re-verify exact wording and the missing 5th prompt before relying on this list.",
    supplements: [
      { id: "intellectual", label: "Intellectual experience that meant the most to you", wordLimit: 150, prompt: "Briefly describe an intellectual experience that was important to you." },
      { id: "extracurricular", label: "Extracurricular / work / family responsibility that shaped you", wordLimit: 150, prompt: "Briefly describe any of your extracurricular activities, employment experience, travel, or family responsibilities that have shaped who you are." },
      { id: "future_roommate", label: "Top 3 things your roommates might like to know about you", wordLimit: 150, prompt: "Top 3 things your roommates might like to know about you." },
      { id: "diversity", label: "How will the life experiences you bring contribute to the Harvard community?", wordLimit: 150, prompt: "How will the life experiences that shape who you are today enable you to contribute to Harvard?" },
    ],
  },
  {
    id: "yale",
    name: "Yale University",
    shortName: "Yale",
    notes: "Verified directly from Yale's own admissions site: a topic/idea short answer for all applicants, three ultra-short \"Short Takes\" (~35 words each), and one 400-word essay chosen from three options (opposing viewpoints, community, or a shaping personal experience) — the old stub had invented a single fixed essay and missed the Short Takes entirely.",
    supplements: [
      { id: "topic_excites_you", label: "A topic or idea that excites you", wordLimit: 200, prompt: "Tell us about a topic or idea that excites you and is related to one or more academic areas you selected above. Why are you drawn to it?" },
      { id: "short_take_1", label: "Short Take: a course, book, or art you'd create", wordLimit: 35, prompt: "If you could teach any college course, write a book, or create an original piece of art of any kind, what would it be?" },
      { id: "short_take_2", label: "Short Take: what you hope to grow or develop", wordLimit: 35, prompt: "What is one aspect of yourself that you hope to grow or develop during college?" },
      { id: "short_take_3", label: "Short Take: something not elsewhere in your application", wordLimit: 35, prompt: "What is something about you that is not included anywhere else in your application?" },
      { id: "essay_opposing_view", label: "Essay option 1: a meaningful discussion with an opposing view", wordLimit: 400, prompt: "Reflect on discussing an issue important to you with someone holding an opposing view and why it was meaningful." },
      { id: "essay_community", label: "Essay option 2: a community you feel connected to", wordLimit: 400, prompt: "Reflect on membership in a community you feel connected to and why it's meaningful to you." },
      { id: "essay_shaping_experience", label: "Essay option 3: a personal experience that shaped you", wordLimit: 400, prompt: "Reflect on a personal experience element that will enrich your college and how it shaped you." },
    ],
  },
  {
    id: "princeton",
    name: "Princeton University",
    shortName: "Princeton",
    notes: "Verified structure directly from Princeton's own admissions site: an academic-interest essay (A.B./undecided vs. B.S.E. engineering applicants get different versions, 250 words), a \"Your Voice\" section of two essays (respectful conversation across difference, 400-500 words; service/civic engagement, 250 words), a \"More About You\" list of three 50-word-or-fewer prompts, and a separately-submitted graded written paper. The source page truncated both the academic-interest prompt and the \"respectful conversation\" prompt mid-sentence, so those two aren't quoted verbatim below — only their confirmed topic and word limit. The service/civic prompt and the \"More About You\" list are confirmed complete.",
    supplements: [
      { id: "extracurricular", label: "Extracurricular activity or work experience meaningful to you", wordLimit: 150, prompt: "Briefly elaborate on an activity, organization, work experience, or hobby that has been particularly meaningful to you." },
      { id: "service", label: "Your Voice: service and civic engagement", wordLimit: 250, prompt: "Princeton has a longstanding commitment to understanding our responsibility to society through service and civic engagement. Reflect on how your story intersects with these ideals." },
      { id: "difficult_conversation", label: "Your Voice: respectful conversation across difference (exact wording unconfirmed)", wordLimit: 500, prompt: "Princeton values community and encourages students, faculty, staff and leadership to engage in respectful conversations that can expand their perspectives and challenge their ideas and beliefs. [Prompt continues; exact remaining wording not independently confirmed.]" },
      { id: "new_skill", label: "More About You: a new skill you'd like to learn", wordLimit: 50, prompt: "What is a new skill you would like to learn in college?" },
      { id: "brings_joy", label: "More About You: what brings you joy", wordLimit: 50, prompt: "What brings you joy?" },
      { id: "soundtrack_song", label: "More About You: the soundtrack of your life right now", wordLimit: 50, prompt: "What song represents the soundtrack of your life at this moment?" },
    ],
  },
  {
    id: "stanford",
    name: "Stanford University",
    shortName: "Stanford",
    notes: "Verified directly from Stanford's own admissions site: five very short (3-50 word) list-style questions plus three short essays (100-250 words). The old entry had only the three essays and was missing all five short questions, and its third essay ('meaningful to you') has since been replaced with a distinctive-contribution prompt.",
    supplements: [
      { id: "short_challenge", label: "Short: the most significant challenge society faces today", wordLimit: 50, prompt: "What is the most significant challenge that society faces today?" },
      { id: "short_summers", label: "Short: how you spent your last two summers", wordLimit: 50, prompt: "How did you spend your last two summers?" },
      { id: "short_historical_moment", label: "Short: a historical moment you wish you'd witnessed", wordLimit: 50, prompt: "What historical moment or event do you wish you could have witnessed?" },
      { id: "short_extracurricular", label: "Short: an extracurricular, job, or family responsibility", wordLimit: 50, prompt: "Briefly elaborate on one of your extracurricular activities, a job you hold, or responsibilities you have for your family." },
      { id: "short_five_things", label: "Short: list five things that are important to you", wordLimit: 50, prompt: "List five things that are important to you." },
      { id: "intellectual_vitality", label: "An idea/experience that makes you genuinely excited about learning", wordLimit: 250, prompt: "The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning." },
      { id: "roommate", label: "Letter to your future roommate", wordLimit: 250, prompt: "Virtually all of Stanford's undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help your roommate — and us — get to know you better." },
      { id: "distinctive_contribution", label: "How your life experiences, interests, and character would contribute at Stanford", wordLimit: 250, prompt: "Please describe what aspects of your life experiences, interests, and character would help you make a distinctive contribution as an undergraduate to Stanford University." },
    ],
  },
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    shortName: "MIT",
    notes: "Verified directly from MIT's own admissions site for 2026-27: no personal statement, replaced by four main essays (100-200 words) plus four very short response questions (40-50 words). The old entry's five prompts were an entirely different, outdated set — none of the current eight prompts matched what was listed before.",
    supplements: [
      { id: "field_of_study", label: "What field of study appeals to you most right now?", wordLimit: 200, prompt: "What field of study appeals to you the most right now? Reflect on what has led to this interest." },
      { id: "own_path", label: "Doing something different than what was expected", wordLimit: 200, prompt: "While some reach their goals following well-trodden paths, others blaze their own trails achieving the unexpected. In what ways have you done something different than what was expected in your educational journey?" },
      { id: "problems_to_tackle", label: "Problems you'd want to tackle with an MIT education", wordLimit: 200, prompt: "How have your personal and academic experiences influenced the types of problems you would want to tackle with an MIT education and the impact you aim to make on your community?" },
      { id: "unexpected_challenge", label: "Managing an unexpected situation or challenge", wordLimit: 200, prompt: "How did you manage a situation or challenge that you didn't expect? What did you learn from it?" },
      { id: "just_for_fun", label: "Short: what you do just for fun", wordLimit: 50, prompt: "What do you do just for fun?" },
      { id: "someone_you_admire", label: "Short: someone you admire and why", wordLimit: 50, prompt: "Who is someone you admire, whether you know them personally or look up to them from afar? Tell us why." },
      { id: "talk_for_hours", label: "Short: a topic you could talk about for hours", wordLimit: 50, prompt: "What's a topic, academic or non-academic, that you could talk about for hours?" },
      { id: "generalist_or_specialist", label: "Short: generalist or specialist, and why", wordLimit: 50, prompt: "MIT values both 'generalists' with varied interests and 'specialists' who focus deeply on one or a few passions. Which do you think best describes you, and why?" },
    ],
  },
  {
    id: "uchicago",
    name: "University of Chicago",
    shortName: "UChicago",
    notes: "Famous for quirky, intellectual prompts. Wants creativity, wit, and rigorous thinking. No word limit but ~650 is typical.",
    supplements: [
      { id: "why_uchicago", label: "How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning?", wordLimit: 650, prompt: "How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning, community, and future?" },
      { id: "extended", label: "Extended essay (pick one of UChicago's signature prompts)", wordLimit: 650, prompt: "Choose one of UChicago's extended essay prompts (e.g. 'What can actually be divided by zero?', 'Exponents and square roots, pencils and erasers, beta-blockers and adrenaline. Name two opposites and explore the relationship between them.'). Be inventive and specific." },
    ],
  },
  {
    id: "columbia",
    name: "Columbia University",
    shortName: "Columbia",
    notes: "Loves NYC, Core Curriculum, intellectual community. Multiple short lists in addition to essays.",
    supplements: [
      { id: "list_required_reading", label: "List required readings from school courses", wordLimit: 150, prompt: "List the titles of required readings from courses during the school year or summer." },
      { id: "list_pleasure", label: "List media (books/films/podcasts) you enjoyed for pleasure", wordLimit: 150, prompt: "List the titles of books, essays, poetry, short stories or plays you read outside of academic courses that you enjoyed most." },
      { id: "why_columbia", label: "Why Columbia?", wordLimit: 200, prompt: "Why are you interested in attending Columbia University?" },
      { id: "why_major", label: "Why this major?", wordLimit: 200, prompt: "What attracts you to your preferred areas of study at Columbia?" },
      { id: "community", label: "A community you belong to and how it shaped you", wordLimit: 200, prompt: "A hallmark of the Columbia experience is being able to learn and live in a community with people from a wide range of perspectives. Tell us about an aspect of your own perspective, viewpoint or lived experience." },
    ],
  },
  {
    id: "upenn",
    name: "University of Pennsylvania",
    shortName: "UPenn",
    notes: "Verified directly from Penn's own admissions site: three required prompts, all 150-200 words — a thank-you note, a community-exploration essay, and a school-specific prompt unique to each undergraduate school (word limit corrected from an earlier, wrong 400-word figure).",
    supplements: [
      { id: "thank_you", label: "Write a short thank-you note to someone you have not yet thanked", wordLimit: 200, prompt: "Write a short thank-you note to someone you have not yet thanked and would like to acknowledge." },
      { id: "why_penn", label: "How will you explore community at Penn?", wordLimit: 200, prompt: "How will you explore community at Penn? Consider how Penn will help shape your perspective, and how your experiences and perspective will help shape Penn." },
      { id: "why_school", label: "Why this specific Penn school/program?", wordLimit: 200, prompt: "Considering the school you are applying to, describe how you will explore your academic and intellectual interests at Penn." },
    ],
  },
  {
    id: "brown",
    name: "Brown University",
    shortName: "Brown",
    notes: "Verified directly from Brown's own admissions site for 2026-27: four required essays, not three — the old entry was missing a \"teach a class on anything\" prompt entirely, and had wrong word limits throughout (200 across the board vs. the real 100-250 split).",
    supplements: [
      { id: "open_curriculum_traits", label: "How your curiosity, creativity, or humility shape your approach to the Open Curriculum", wordLimit: 250, prompt: "There is something distinctive about Brown students. It is a blend of intellectual curiosity, creativity, and humility. How will you use these characteristics or others to shape your approach to the Open Curriculum?" },
      { id: "community", label: "How growing up has inspired or challenged you", wordLimit: 250, prompt: "Students entering Brown often find that making their home on College Hill naturally invites reflection on where they came from. Share how an aspect of your growing up has inspired or challenged you, and what unique contributions this might allow you to make to the Brown community." },
      { id: "teach_a_class", label: "If you could teach a class on anything, what would it be?", wordLimit: 150, prompt: "If you could teach a class on any one thing, whether academic or otherwise, what would it be?" },
      { id: "joy", label: "What brings you joy?", wordLimit: 150, prompt: "Tell us about something that brings you joy, whether big or small, mundane or spectacular." },
    ],
  },
  {
    id: "dartmouth",
    name: "Dartmouth College",
    shortName: "Dartmouth",
    notes: "Verified directly from Dartmouth's own admissions site (Class of 2031 cycle): one required 100-word fit essay, plus two more required essays, each chosen from a pair or list of options (250 words each). The old entry's Daniel Webster quote is not part of the current prompt 1 text, and it was missing the second required pick-one entirely.",
    supplements: [
      { id: "why_dartmouth", label: "What attracts you to Dartmouth, and why is it a good fit?", wordLimit: 100, prompt: "As you seek admission to Dartmouth's Class of 2031, what aspects of the college's academic program, community, and/or campus environment attract your interest? How is Dartmouth a good fit for you?" },
      { id: "let_your_life_speak", label: "Option A: \"Let your life speak\" — the environment that raised you", wordLimit: 250, prompt: "Let your life speak. Describe the environment in which you were raised and the impact it has had on the person you are today." },
      { id: "introduce_yourself", label: "Option B: Introduce yourself", wordLimit: 250, prompt: "Introduce yourself." },
      { id: "what_excites_you", label: "Option A: What excites you?", wordLimit: 250, prompt: "What excites you?" },
      { id: "difference_identity", label: "Option F: How difference has shaped your identity or purpose", wordLimit: 250, prompt: "How has difference been a part of your life, and how have you embraced it as part of your identity, outlook, or sense of purpose?" },
    ],
  },
  {
    id: "cornell",
    name: "Cornell University",
    shortName: "Cornell",
    notes: "Verified directly from Cornell's own per-college admissions pages: applicants apply to one specific undergraduate college, and each college has its own distinct essay(s). Arts & Sciences, Engineering, CALS, AAP, Human Ecology, the Brooks School of Public Policy, the SC Johnson College, and ILR prompts below were each fetched from that college's own admissions page.",
    supplements: [
      { id: "cas_essay", label: "Arts & Sciences: an intellectual passion or question", wordLimit: 650, prompt: "At the College of Arts and Sciences, your education is yours to shape. Describe an intellectual passion, question, or idea that has captured your attention — whether it emerges from your studies or extends beyond your coursework. What specific aspects of our liberal arts curriculum would you draw on to explore and connect your varied interests?" },
      { id: "engineering_why", label: "Engineering: why you want to study engineering", wordLimit: 200, prompt: "Fundamentally, engineering is the application of math, science, and technology to solve complex problems. Why do you want to study engineering?" },
      { id: "engineering_why_duffield", label: "Engineering: why Duffield Engineering specifically", wordLimit: 200, prompt: "Why do you think you would love to study at Duffield Engineering?" },
      { id: "engineering_joy", label: "Engineering short answer: what brings you joy", wordLimit: 100, prompt: "What brings you joy?" },
      { id: "engineering_contribution", label: "Engineering short answer: your contribution and unique voice", wordLimit: 100, prompt: "What do you believe you will contribute to the Duffield Engineering community beyond what you've already detailed in your application? What unique voice will you bring?" },
      { id: "engineering_meaningful_activity", label: "Engineering short answer: a meaningful activity or responsibility", wordLimit: 100, prompt: "What is one activity, club, team, organization, work/volunteer experience or family responsibility that is especially meaningful to you? Please briefly tell us about its significance for you." },
      { id: "engineering_achievement", label: "Engineering short answer: an award or achievement that mattered most", wordLimit: 100, prompt: "What is one award you have received or achievement you have attained that has meant the most to you? Please briefly describe its importance to you." },
      { id: "cals_major", label: "CALS: what interests you about your selected major", wordLimit: 350, prompt: "What interests you about the major you selected? Tell us about experiences (both in and outside of the classroom), questions, and goals that influenced your choice." },
      { id: "cals_why", label: "CALS: what draws you to Cornell CALS", wordLimit: 350, prompt: "What draws you to Cornell's College of Agriculture and Life Sciences (CALS)? Reflect on the learning, community, or impact opportunities that matter most to you, and share how they align with Cornell CALS (as you understand it currently)." },
      { id: "human_ecology", label: "Human Ecology: an experience connecting you to the college's mission (question paraphrased, mission statement verbatim)", wordLimit: 550, prompt: "The College of Human Ecology prepares students to respond to human needs through an education organized around the interconnected issues that profoundly affect individuals, communities, and the institutions that shape our lives. Describe an extracurricular activity, community engagement, or work experience connecting you to the college's mission and your intended major. Explain what that experience revealed about the broader community's needs, the impact you can make, and how your chosen CHE major will support achieving that impact." },
      { id: "aap_architecture", label: "AAP, Architecture major: how your interests connect to architecture", wordLimit: 650, prompt: "Describe how your interests connect to architecture. Include an example of a creative project, design experience, or personal passion that sparked your interest in pursuing a 5-year professional degree in architecture. Reflect on how this experience shaped your understanding of the field and your motivation to study architecture." },
      { id: "aap_fine_arts", label: "AAP, Fine Arts major: an artist statement", wordLimit: 650, prompt: "Submit an artist statement describing your creative interests and practice. Address how your work reflects your artistic voice, influences, and process, and how studying art at Cornell AAP would support and expand your practice." },
      { id: "aap_urs", label: "AAP, Urban and Regional Studies major: your interest in URS", wordLimit: 650, prompt: "Describe your interest in urban and regional studies. Discuss experiences, ideas, or issues that have shaped your interest in cities, communities, and regional systems, and explain how URS at Cornell aligns with your academic and career goals." },
      { id: "brooks_policy", label: "Brooks School: your interest in public policy", wordLimit: 650, prompt: "Discuss your interest in pursuing a major in policy at the Cornell Jeb E. Brooks School of Public Policy and what draws you to this field of study." },
      { id: "brooks_dc_start", label: "Brooks School DC Start applicants only", wordLimit: 350, prompt: "Please describe why you are interested in being considered for the Brooks School DC Start program." },
      { id: "sc_johnson_business", label: "SC Johnson College (Dyson/Nolan): what kind of business student are you?", wordLimit: 650, prompt: "What kind of business student are you? Using your personal, academic, or volunteer/work experiences, describe the topics or issues that you care about and why they are important to you." },
      { id: "ilr_interests", label: "ILR: topics or issues you care about, aligned with ILR", wordLimit: 650, prompt: "Using your personal, academic, or volunteer/work experiences, describe the topics or issues that you care about and why they are important to you. Your response should show us that your interests align with the ILR School." },
    ],
  },
  {
    id: "duke",
    name: "Duke University",
    shortName: "Duke",
    notes: "Verified directly from Duke's own admissions site (2026-27): two required 250-word essays (why Duke, and a community that shaped you), plus one optional 250-word essay chosen from three options.",
    supplements: [
      { id: "why_duke", label: "Why Duke is a good match for your goals, values, and interests", wordLimit: 250, prompt: "What is your impression of Duke as a university and community, and why do you believe it is a good match for your goals, values, and interests?" },
      { id: "communities", label: "A community that has shaped who you are", wordLimit: 250, prompt: "We all belong to communities defined by place, faith, family, culture, interests or shared experience. Tell us about a community that has shaped who you are, any way it has set you apart, and what you've learned from being part of it that you hope to bring to Duke." },
      { id: "viewpoints_experiences", label: "Optional: viewpoints and experiences you'd bring to Duke", wordLimit: 250, prompt: "We believe a wide range of viewpoints and experiences is essential to maintaining Duke's vibrant living and learning community. Please share anything in this context that might help us better understand you and your potential contributions to Duke." },
      { id: "difference_of_opinion", label: "Optional: a difference of opinion with someone you care about", wordLimit: 250, prompt: "Meaningful dialogue often involves respectful disagreement. Provide an example of a difference of opinion you've had with someone you care about. What did you learn from it?" },
      { id: "excited_about", label: "Optional: the last thing you've been really excited about", wordLimit: 250, prompt: "What's the last thing that you've been really excited about?" },
    ],
  },
  {
    id: "northwestern",
    name: "Northwestern University",
    shortName: "Northwestern",
    notes: "Quarter system, journalism + research strong, Chicago-adjacent. Wants 'Why Northwestern' specificity.",
    supplements: [
      { id: "why_northwestern", label: "What are the unique qualities of Northwestern that make you want to attend?", wordLimit: 300, prompt: "Other parts of your application give us a sense for how you might contribute to Northwestern. But we also want to consider how Northwestern will contribute to your interests and goals. In what ways do you hope Northwestern will challenge you, support you, and ultimately empower you to engage with the world in new and exciting ways?" },
    ],
  },
  {
    id: "jhu",
    name: "Johns Hopkins University",
    shortName: "Johns Hopkins",
    notes: "Verified directly from JHU's own admissions blog for 2026-27: one required 350-word essay about engaging across differences and building community.",
    supplements: [
      { id: "bridge_building", label: "Engaging across differences and building community", wordLimit: 350, prompt: "At Johns Hopkins, community is built through dialogue, collaboration, and a willingness to engage across differences. Whether on campus or in the broader world, community depends on bridge builders who can listen to differing perspectives, challenge their own assumptions, or work together toward shared goals. Drawing on your own experiences, what have you learned about engaging across differences and how has it shaped the way you think about building bridges, enhancing community, and working with others?" },
    ],
  },
  {
    id: "cmu",
    name: "Carnegie Mellon University",
    shortName: "CMU",
    notes: "CMU's own admissions site confirms its writing supplement has three short-answer questions, not two — only two are listed below, and a third is confirmed to exist but its exact wording wasn't independently reachable this pass.",
    supplements: [
      { id: "why_cmu", label: "Why CMU & this specific program?", wordLimit: 300, prompt: "Most students choose their intended major or area of study based on a passion or inspiration that's developed over time. What passion or inspiration led you to choose this area of study?" },
      { id: "evolution", label: "What was your favorite high school activity, and how did it shape you?", wordLimit: 300, prompt: "Many students pursue college for a specific degree, career opportunity or personal goal. Whichever it may be, learning will be critical to achieve your ultimate goal. As you think ahead to the process of learning during your college years, how will you define a successful college experience?" },
    ],
  },
  {
    id: "caltech",
    name: "California Institute of Technology",
    shortName: "Caltech",
    notes: "Verified directly from Caltech's own admissions site: no personal statement at all, replaced by a set of short answers — one STEM interest question, a scholarly-character pick-one, two scientific-drive prompts (pick two of three), a 'fun question,' and an optional academic-context short answer.",
    supplements: [
      { id: "stem_interest", label: "Your area of STEM interest today", wordLimit: 200, prompt: "If you had to choose an area of interest or two today, what would you choose? Why did you choose your proposed area of interest? If you selected 'other', what topics are you interested in pursuing?" },
      { id: "collaboration", label: "Scholarly character, option 1: learning shaped by another person or group", wordLimit: 200, prompt: "Tell us about a time your learning in STEM was shaped by another person or group — either because you needed help, offered help, changed your thinking through collaboration, or contributed to someone else's understanding. What did that experience teach you about learning and working with others?" },
      { id: "process", label: "Scholarly character, option 2: when process mattered as much as outcome", wordLimit: 200, prompt: "Tell us about a time your approach to a STEM problem, concept, or project mattered as much as the outcome. How did you work through uncertainty or persist creatively in tackling the problem?" },
      { id: "nerd_out", label: "Scientific drive, option 1: a STEM rabbit hole", wordLimit: 200, prompt: "Take this opportunity to nerd out and talk to us about whatever STEM rabbit hole you have found yourself falling into." },
      { id: "held_attention", label: "Scientific drive, option 2: a question that held your attention", wordLimit: 200, prompt: "Tell us about a STEM question, problem, idea, or project that has held your attention over time." },
      { id: "making", label: "Scientific drive, option 3: something you made or built", wordLimit: 200, prompt: "Tell us about something you created, tested, repaired, modeled, coded, built, or redesigned." },
      { id: "fun_question", label: "What you'd contribute to the Caltech community", wordLimit: 150, prompt: "What is something you would be excited to do, share, teach, make, start, or contribute as part of the Caltech community?" },
      { id: "academic_context", label: "Optional: academic preparation or school context", wordLimit: 0, prompt: "Is there anything about your academic preparation, coursework, school context, or learning experiences that would help us better understand your readiness for Caltech?" },
    ],
  },
  {
    id: "vanderbilt",
    name: "Vanderbilt University",
    shortName: "Vanderbilt",
    notes: "Verified directly from Vanderbilt's own admissions site: one required ~250-word short answer, built around Vanderbilt's motto \"Crescere aude\" (dare to grow). The old entry's generic extracurricular prompt was entirely wrong — it isn't Vanderbilt's real prompt at all.",
    supplements: [
      { id: "dare_to_grow", label: "How your identity, culture, or background shaped your growth", wordLimit: 250, prompt: "Vanderbilt University's motto, Crescere aude, is Latin for 'dare to grow.' In your response, reflect on how one or more aspects of your identity, culture, or background has played a role in your personal growth, and how it will contribute to our campus community as you dare to grow at Vanderbilt." },
    ],
  },
  {
    id: "rice",
    name: "Rice University",
    shortName: "Rice",
    notes: "Verified directly from Rice's own admissions site (2026-27): three required essays, plus a required non-essay image submission (\"The Box\") for all applicants. Architecture applicants complete two different 250-word essays instead; Art applicants may submit a portfolio in place of essays.",
    supplements: [
      { id: "why_rice", label: "Why your selected academic areas, and how you'll explore them at Rice", wordLimit: 150, prompt: "Please explain what draws you to the academic areas you selected above and how you hope to explore them at Rice University." },
      { id: "rice_experience", label: "What elements of the Rice experience appeal to you?", wordLimit: 150, prompt: "Based upon your exploration of Rice University, what elements of the Rice experience appeal to you?" },
      { id: "residential_college", label: "Choice A: unique perspectives for the Residential College System", wordLimit: 500, prompt: "Rice's residential college system is at the heart of student life. What unique perspectives would you contribute to the Residential College System?" },
      { id: "change_agent", label: "Choice B: your background and aspirations as a \"change agent\" at Rice", wordLimit: 500, prompt: "Describe how your background, experiences, and cultural identity shape your aspirations as a \"change agent\" at Rice." },
      { id: "rice_box", label: "The Rice Box: an image that appeals to you (all applicants)", wordLimit: 0, prompt: "Submit a two-dimensional image of something that appeals to you, with a brief description. It is self-explanatory and not evaluated for artistic merit — it's a chance to express personality beyond your achievements." },
    ],
  },
  {
    id: "notredame",
    name: "University of Notre Dame",
    shortName: "Notre Dame",
    notes: "Verified directly from Notre Dame's own admissions site: one required 150-word essay on \"non-negotiable\" college-search priorities, plus two short answers (50-100 words each) chosen from four options touching faith, personal background, service, and personal conviction.",
    supplements: [
      { id: "non_negotiable", label: "Your \"non-negotiable\" factor(s) in a college", wordLimit: 150, prompt: "Everyone has different priorities when considering their higher education options and building their college or university list. Tell us about your 'non-negotiable' factor(s) when searching for your future college home." },
      { id: "faith_influence", label: "Short answer option: how faith influences your decisions", wordLimit: 100, prompt: "How does faith influence the decisions you make?" },
      { id: "personal_background", label: "Short answer option: what's distinctive about your personal background", wordLimit: 100, prompt: "What is distinctive about your personal experiences and development (eg, family support, culture, disability, personal background, community)? Why are these experiences important to you and how will you enrich the Notre Dame community?" },
      { id: "service_to_others", label: "Short answer option: how you foster service to others", wordLimit: 100, prompt: "Notre Dame's undergraduate experience is characterized by a collective sense of care for every person. How do you foster service to others in your community?" },
      { id: "what_would_you_fight_for", label: "Short answer option: what would you fight for?", wordLimit: 100, prompt: "What would you fight for?" },
    ],
  },
  {
    id: "washu",
    name: "Washington University in St. Louis",
    shortName: "WashU",
    notes: "Interdisciplinary, strong med/business/design, supportive culture. 'Why WashU' clarity is key.",
    supplements: [
      { id: "why_washu", label: "Please tell us what you are interested in studying at WashU and why", wordLimit: 250, prompt: "Please tell us what you are interested in studying at WashU and why. Undergraduate students in any of our schools — Arts & Sciences, McKelvey Engineering, Olin Business, or Sam Fox School of Design & Visual Arts — are encouraged to take advantage of the academic flexibility WashU offers." },
    ],
  },

  // ── Additional US (T20–T50 + popular targets) ──────────────────────────
  // rice, emory, georgetown, cmu, ucla, berkeley, umich, unc, uva, nyu, usc,
  // ut-austin, and gatech were removed from this block: they duplicated ids
  // already defined elsewhere in this array (either the richer Top-20 entry
  // above, or the verified 2026-27 entry below), and getUniversityById's
  // .find() always returns the FIRST match — so these stale, unverified
  // stubs were silently shadowing the better data every time.
  { id: "tufts", name: "Tufts University", shortName: "Tufts", notes: "Verified directly from Tufts' own admissions site: one required prompt for all applicants, plus a second prompt that depends on which school the applicant is applying to (Arts & Sciences, Engineering, BFA, or the combined BFA+BA/BS degree).",
    supplements: [
      { id: "how_you_engaged", label: "How you learned about and engaged with Tufts", wordLimit: 150, prompt: "Please describe how you have learned about and engaged with Tufts during your college search process." },
      { id: "favorite_assignment", label: "Arts & Sciences: a favorite school assignment", wordLimit: 200, prompt: "Tell us about one of your favorite school assignments in the past two years. What was the assignment and why did you enjoy it?" },
      { id: "engineering_project", label: "Engineering: a project you helped build", wordLimit: 200, prompt: "Tell us about an engineering or science-related project that you have helped build, design, create, or iterate in the past two years. What was the project and what was your role?" },
      { id: "bfa_portfolio", label: "BFA: a piece from your portfolio", wordLimit: 200, prompt: "Tell us more about a specific piece in your portfolio. What were the ideas you intended to explore, and how did those ideas inform the process of making the piece?" },
      { id: "combined_degree_portfolio", label: "Combined BFA+BA/BS: a piece from your portfolio", wordLimit: 200, prompt: "Tell us more about a specific piece in your portfolio. How did an academic course, project, or interest inspire the ideas that you explored in this piece? Or, how did making this piece influence your academic interests?" },
    ] },
  { id: "wakeforest", name: "Wake Forest University", shortName: "Wake Forest", notes: "Verified for 2025-26: one required 150-word essay, plus up to four optional essays/lists (a five-books list, an intellectual-curiosity prompt, and a Maya Angelou quote-reflection prompt — Angelou was a longtime Reynolds Professor at Wake Forest).",
    supplements: [
      { id: "why_wake", label: "Why Wake Forest", wordLimit: 150, prompt: "Why have you decided to apply to Wake Forest? Share with us anything that has made you interested in our institution." },
      { id: "list_of_5", label: "Optional: list of 5 books", wordLimit: 1, prompt: "List five books you have read that intrigued you, noting title, author, and whether each was required or not required reading." },
      { id: "intellectual_curiosity", label: "Optional: what piques your intellectual curiosity", wordLimit: 150, prompt: "Tell us what piques your intellectual curiosity or has helped you understand the world's complexity. This can include a work you've read, a project you've completed for a class, and even co-curricular activities in which you have been involved." },
      { id: "maya_angelou_quote", label: "Optional: a Maya Angelou quote and your lived experience", wordLimit: 150, prompt: "Dr. Maya Angelou, renowned author, poet, civil-rights activist, and former Wake Forest University Reynolds Professor of American Studies, inspired others to celebrate their identities and to honor each person's dignity. Choose one of Dr. Angelou's powerful quotes. How does this quote relate to your lived experience or reflect how you plan to contribute to the Wake Forest community?" },
    ] },
  { id: "boston-u", name: "Boston University", shortName: "BU", notes: "Urban, global, strong CAS/Questrom/Comm. Direct fit-based prompts.",
    supplements: [
      { id: "why_bu", label: "Why BU", wordLimit: 300, prompt: "What about being a student at Boston University most excites you?" },
    ] },
  { id: "uwashington", name: "University of Washington", shortName: "UW", notes: "Verified for 2025-26: UW uses its own application, not the Common App. One required 650-word essay, plus an optional 200-word additional-information space.",
    supplements: [
      { id: "essay", label: "A story that demonstrates or shaped your character", wordLimit: 650, prompt: "Tell a story from your life, describing an experience that either demonstrates your character or helped to shape it." },
      { id: "additional_info", label: "Optional: additional information not reflected elsewhere in your application", wordLimit: 200, prompt: "Optional space for additional information of particular significance that isn't reflected elsewhere in your application — for example, personal hardships in attaining your education, activities limited by work or family obligations, or unusual limitations or opportunities unique to the schools you attended. (Exact prompt wording not independently confirmed; word limit and topic are confirmed.)" },
    ] },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", shortName: "UIUC", notes: "Verified directly from Illinois' own admissions site: two to three short essays (~150 words each) tied to the applicant's declared major(s), with separate prompts for undeclared applicants, plus the standard Common App essay.",
    supplements: [
      { id: "major1_experience", label: "An experience related to your first-choice major", wordLimit: 150, prompt: "Explain, in detail, an experience you've had in the past 3 to 4 years related to your first-choice major." },
      { id: "major1_goals", label: "Your goals and how your first-choice major helps achieve them", wordLimit: 150, prompt: "Describe your personal and/or career goals after graduating from Illinois and how your selected first-choice major will help you achieve them." },
      { id: "major2", label: "Second-choice major or overall goals (if declaring a second major)", wordLimit: 150, prompt: "Please explain your interest in your second-choice major or your overall academic or career goals." },
      { id: "undeclared_goals", label: "Undeclared applicants: future career or academic goals", wordLimit: 150, prompt: "What are your future career or academic goals?" },
      { id: "undeclared_interests", label: "Undeclared applicants: academic interests and majors considered", wordLimit: 150, prompt: "What are your academic interests? Please include 2-3 majors you're considering at Illinois and why." },
    ] },
  { id: "purdue", name: "Purdue University", shortName: "Purdue", notes: "Verified directly from Purdue's own admissions site: the Common App essay (one of seven standard prompts) plus two required Purdue-specific 250-word-or-fewer questions, and four optional 200-word Honors College prompts (pick some if applying to Honors). The old entry only had one of the two required Purdue-specific questions.",
    supplements: [
      { id: "purdue_opportunities", label: "How Purdue opportunities will support your interests", wordLimit: 250, prompt: "How will opportunities at Purdue support your interests, both in and out of the classroom?" },
      { id: "why_purdue", label: "Why your major and this campus location", wordLimit: 250, prompt: "Briefly discuss your reasons for choosing your major and your interest in studying at this campus location." },
      { id: "honors_interdisciplinary", label: "Honors College (optional): connecting ideas across disciplines", wordLimit: 200, prompt: "Tell us about an experience connecting ideas from multiple disciplines." },
      { id: "honors_passion_topic", label: "Honors College (optional): a topic you're passionate about", wordLimit: 200, prompt: "Tell us about exploring a topic you're passionate about." },
      { id: "honors_travel", label: "Honors College (optional): a destination and its culture", wordLimit: 200, prompt: "Share about a destination you'd like to travel to and how you'd engage with its culture." },
      { id: "honors_leadership", label: "Honors College (optional): a leadership experience", wordLimit: 200, prompt: "Describe a leadership experience in your school or community." },
    ] },
  { id: "wisconsin", name: "University of Wisconsin–Madison", shortName: "UW–Madison", notes: "Verified directly from UW-Madison's own admissions site: one required why-UW/why-major essay for all applicants, plus a second essay whose prompt depends on which application platform is used (Common App essay, or a UW-specific \"tell us about yourself\" prompt for the Universities of Wisconsin Application). Word limits weren't specified on the source page (the old entry's 650 wasn't independently confirmed).",
    supplements: [
      { id: "why_uw", label: "Why UW–Madison and your selected major", wordLimit: 650, prompt: "Tell us why you would like to attend the University of Wisconsin–Madison. In addition, please include why you are interested in studying the major(s) you have selected. If you selected undecided, please describe your areas of possible academic interest." },
      { id: "unique_experiences", label: "Wisconsin Application only: what you'll bring to campus", wordLimit: 650, prompt: "Each student is unique. Please tell us about the particular life experiences, talents, commitments, and/or interests you will bring to our campus." },
    ] },

  // ── United Kingdom (UCAS personal statement model) ──────────────────────
  { id: "oxford", name: "University of Oxford", shortName: "Oxford", notes: "UCAS PS focused entirely on subject. Tutorial system, single-subject depth, no breadth.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen course: academic interest, super-curricular reading, and why this subject." },
    ] },
  { id: "cambridge", name: "University of Cambridge", shortName: "Cambridge", notes: "UCAS PS + My Cambridge Application. Subject obsession, supercurriculars over extracurriculars.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement deeply focused on your chosen Tripos." },
      { id: "mca", label: "My Cambridge Application — additional info", wordLimit: 1200, prompt: "Use the My Cambridge Application section to expand on academic interest and college choice." },
    ] },
  { id: "imperial", name: "Imperial College London", shortName: "Imperial", notes: "STEM/medicine only. UCAS PS must be technical and quantitative.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement demonstrating technical aptitude and motivation for your STEM/medical course." },
    ] },
  { id: "ucl", name: "University College London", shortName: "UCL", notes: "Subject-focused UCAS PS. Research-led, London-embedded.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen UCL programme." },
    ] },
  { id: "lse", name: "London School of Economics", shortName: "LSE", notes: "Social sciences. UCAS PS should be 80%+ academic and analytical.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement showing analytical engagement with your social-science subject." },
    ] },
  { id: "kcl", name: "King's College London", shortName: "KCL", notes: "Strong law, medicine, humanities. Standard UCAS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen KCL programme." },
    ] },
  { id: "edinburgh", name: "University of Edinburgh", shortName: "Edinburgh", notes: "Broad excellence, flexible curriculum. UCAS PS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen Edinburgh degree." },
    ] },
  { id: "warwick", name: "University of Warwick", shortName: "Warwick", notes: "Maths, economics, business. UCAS PS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen Warwick course." },
    ] },
  { id: "manchester", name: "University of Manchester", shortName: "Manchester", notes: "Russell Group, broad subject base. UCAS PS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen Manchester course." },
    ] },
  { id: "bristol", name: "University of Bristol", shortName: "Bristol", notes: "Strong engineering, law, medicine. UCAS PS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen Bristol course." },
    ] },
  { id: "st-andrews", name: "University of St Andrews", shortName: "St Andrews", notes: "Small, traditional, strong IR + sciences. UCAS PS.",
    supplements: [
      { id: "ucas_ps", label: "UCAS Personal Statement", wordLimit: 600, prompt: "Write a UCAS personal statement focused on your chosen St Andrews course." },
    ] },

  // ── Canada ─────────────────────────────────────────────────────────────
  { id: "toronto", name: "University of Toronto", shortName: "U of T", notes: "Top Canadian research university. Some programs (Rotman, Engineering, CS) require supplementary applications.",
    supplements: [
      { id: "supp", label: "Program supplementary application", wordLimit: 250, prompt: "Complete the supplementary application required by your chosen U of T program (e.g., Rotman, Engineering, CS)." },
    ] },
  { id: "ubc", name: "University of British Columbia", shortName: "UBC", notes: "Personal Profile (5–6 short essays). Holistic review. Values community impact and self-awareness.",
    supplements: [
      { id: "personal_profile", label: "UBC Personal Profile", wordLimit: 200, prompt: "Respond to UBC's Personal Profile questions about activities, perspective, and engagement." },
    ] },
  { id: "mcgill", name: "McGill University", shortName: "McGill", notes: "Grades-driven admissions. Some programs (Music, Education, Architecture) require supplementary materials.",
    supplements: [
      { id: "program_supp", label: "Program-specific supplement (if required)", wordLimit: 500, prompt: "Submit any program-specific essay or audition required by your McGill faculty." },
    ] },
  { id: "waterloo", name: "University of Waterloo", shortName: "Waterloo", notes: "Top CS/engineering, co-op model. AIF (Admissions Information Form) is critical.",
    supplements: [
      { id: "aif", label: "Admissions Information Form (AIF)", wordLimit: 900, prompt: "Complete the Waterloo AIF: extracurriculars, reasons for program choice, and any extenuating circumstances." },
    ] },

  // ── Continental Europe ─────────────────────────────────────────────────
  { id: "eth-zurich", name: "ETH Zurich", shortName: "ETH", notes: "Top European STEM. Bachelor's taught in German; admissions largely grades + entrance exam.",
    supplements: [
      { id: "motivation", label: "Motivation letter (if required)", wordLimit: 500, prompt: "If required by your ETH program, write a motivation letter explaining academic preparation and goals." },
    ] },
  { id: "epfl", name: "EPFL", shortName: "EPFL", notes: "Swiss federal STEM institute. Bachelor's mainly grades-based; English Master's require motivation letter.",
    supplements: [
      { id: "motivation", label: "Motivation letter (Master's)", wordLimit: 500, prompt: "If applying to a Master's programme, write a motivation letter." },
    ] },
  { id: "tu-delft", name: "Delft University of Technology", shortName: "TU Delft", notes: "Top Dutch engineering. English Bachelor's may require motivation letter.",
    supplements: [
      { id: "motivation", label: "Motivation letter", wordLimit: 500, prompt: "Write a motivation letter explaining your interest in TU Delft and your chosen programme." },
    ] },
  { id: "sciences-po", name: "Sciences Po", shortName: "Sciences Po", notes: "Social sciences, political science. Multiple essays in French/English.",
    supplements: [
      { id: "motivation", label: "Motivation essay", wordLimit: 1500, prompt: "Why Sciences Po and why your chosen dual-degree / campus?" },
      { id: "personal", label: "Personal essay", wordLimit: 1500, prompt: "A personal essay reflecting on an experience that shaped your worldview." },
    ] },
  { id: "bocconi", name: "Bocconi University", shortName: "Bocconi", notes: "Top Italian business/economics school. Bocconi Test + motivational letter.",
    supplements: [
      { id: "motivation", label: "Motivation letter", wordLimit: 500, prompt: "Write a motivation letter explaining your fit for Bocconi and your chosen programme." },
    ] },
  { id: "ie-university", name: "IE University", shortName: "IE", notes: "Madrid/Segovia, English-taught, strong business + IR.",
    supplements: [
      { id: "motivation", label: "Motivation essay", wordLimit: 500, prompt: "Why IE University and why your chosen programme?" },
    ] },
  { id: "trinity-dublin", name: "Trinity College Dublin", shortName: "Trinity", notes: "Top Irish university. Some courses (Drama, Music) require supplementary applications.",
    supplements: [
      { id: "personal_statement", label: "Personal statement (where required)", wordLimit: 500, prompt: "Write a personal statement for your chosen Trinity course where required." },
    ] },

  // ── Asia / Australia ───────────────────────────────────────────────────
  { id: "nus", name: "National University of Singapore", shortName: "NUS", notes: "Top APAC research university. Personal Insights and program-specific essays.",
    supplements: [
      { id: "personal_insights", label: "Personal Insights essay", wordLimit: 600, prompt: "Respond to NUS Personal Insights questions about academic interest and contribution." },
    ] },
  { id: "ntu-singapore", name: "Nanyang Technological University", shortName: "NTU", notes: "Strong engineering, business. Program-specific essays.",
    supplements: [
      { id: "essay", label: "Program essay", wordLimit: 500, prompt: "Why this NTU programme and how does it fit your goals?" },
    ] },
  { id: "hku", name: "University of Hong Kong", shortName: "HKU", notes: "Top Asian university. Personal statement + interviews for international applicants.",
    supplements: [
      { id: "personal_statement", label: "Personal statement", wordLimit: 700, prompt: "Write a personal statement covering academic interest, achievements, and reasons for HKU." },
    ] },
  { id: "tsinghua", name: "Tsinghua University", shortName: "Tsinghua", notes: "Top Chinese university. International applicants submit personal statement + recommendations.",
    supplements: [
      { id: "personal_statement", label: "Personal statement", wordLimit: 800, prompt: "Write a personal statement for the Tsinghua international undergraduate programme." },
    ] },
  { id: "peking", name: "Peking University", shortName: "PKU", notes: "Top Chinese university. International programs require essays + interviews.",
    supplements: [
      { id: "personal_statement", label: "Personal statement", wordLimit: 800, prompt: "Write a personal statement for the PKU international programme." },
    ] },
  { id: "iit-bombay", name: "Indian Institute of Technology Bombay", shortName: "IIT Bombay", notes: "JEE-based admissions for Indian nationals; international/Olympiad routes available.",
    supplements: [
      { id: "sop", label: "Statement of Purpose (international/Olympiad route)", wordLimit: 1000, prompt: "Write a statement of purpose for the IIT Bombay international/Olympiad admission route." },
    ] },
  { id: "ashoka", name: "Ashoka University", shortName: "Ashoka", notes: "Indian liberal arts. Multiple essays + interview. Values intellectual curiosity.",
    supplements: [
      { id: "why_ashoka", label: "Why Ashoka", wordLimit: 400, prompt: "Why are you applying to Ashoka and how does liberal arts fit your goals?" },
      { id: "personal", label: "Personal reflection", wordLimit: 400, prompt: "Choose one Ashoka reflective prompt and respond." },
    ] },
  { id: "u-tokyo", name: "University of Tokyo", shortName: "Todai", notes: "Top Japanese university. PEAK and Global Science programs taught in English.",
    supplements: [
      { id: "essays", label: "Programme essays (PEAK/GSC)", wordLimit: 800, prompt: "Respond to the application essays for the PEAK or Global Science Course programme." },
    ] },
  { id: "kyoto", name: "Kyoto University", shortName: "Kyoto U", notes: "iUP English-taught undergraduate programmes. Essays + recommendation.",
    supplements: [
      { id: "essays", label: "iUP application essays", wordLimit: 800, prompt: "Respond to the Kyoto iUP application essay prompts." },
    ] },
  { id: "melbourne", name: "University of Melbourne", shortName: "Melbourne", notes: "Top Australian university. Most programs grades-based; some (Conservatorium, Architecture) require portfolios.",
    supplements: [
      { id: "supp", label: "Course-specific supplement", wordLimit: 500, prompt: "Complete the course-specific supplementary requirement (portfolio, audition, or essay) where required." },
    ] },
  { id: "sydney", name: "University of Sydney", shortName: "USyd", notes: "Top Australian research university. Mostly grades-based admission.",
    supplements: [
      { id: "supp", label: "Course-specific supplement", wordLimit: 500, prompt: "Complete the course-specific supplementary requirement where required." },
    ] },
  { id: "anu", name: "Australian National University", shortName: "ANU", notes: "Strong policy, IR, sciences. Mostly grades-based; some scholarships require essays.",
    supplements: [
      { id: "scholarship", label: "Scholarship essay (if applying)", wordLimit: 500, prompt: "Write a scholarship essay for the ANU programme/scholarship to which you are applying." },
    ] },

  // ── Verified 2026-27 cycle (added via live web research, not memory) ──
  {
    id: "georgetown",
    name: "Georgetown University",
    shortName: "Georgetown",
    notes: "Revised its writing supplement for 2026-27: dropped the old special-talents question for a new differing-viewpoints essay, and standardized word limits. Requires the SAT or ACT (not test-optional) and bans AI tools anywhere in the application. Applies through Common App or Georgetown's own application — same four essays either way.",
    supplements: [
      { id: "activity", label: "Most significant activity", wordLimit: 250, prompt: "Briefly discuss the significance to you of the school or summer activity in which you have been most involved." },
      { id: "differing-viewpoints", label: "Differing viewpoints (new for 2026-27)", wordLimit: 250, prompt: "In all our lives, we interact with people who hold different viewpoints than our own. Describe such an event you experienced. What did you learn from the experience?" },
      { id: "personal-creative", label: "Personal or creative essay", wordLimit: 650, prompt: "As Georgetown is a diverse community, the Admissions Committee would like to know more about you in your own words. Please submit a brief personal or creative essay which you feel best describes you and reflects on your personal background and individual experiences, skills, and talents." },
      { id: "school-cas", label: "College of Arts & Sciences (if applying here)", wordLimit: 500, prompt: "Founded in 1789, the Georgetown College of Arts & Sciences is committed to the Jesuit traditions of an integrated education and of productive research in the natural sciences, humanities, social sciences, and fine arts. Describe your interest in studying at the College of Arts & Sciences." },
      { id: "school-nursing", label: "Berkley School of Nursing (if applying here)", wordLimit: 500, prompt: "Georgetown University's Berkley School of Nursing is committed to the formation of ethical, empathetic, and transformational nursing leaders. Describe the factors that have influenced your interest in studying Nursing at Georgetown University." },
      { id: "school-health", label: "School of Health (if applying here)", wordLimit: 500, prompt: "Georgetown University's School of Health was founded to advance the health and well-being of people locally, nationally, and globally through innovative research, the delivery of interdisciplinary education, and transformative engagement of communities. Describe the factors that influenced your interest in studying health care at Georgetown University, specifically addressing your intended related major: Global Health, Health Care Management & Policy, or Human Science." },
      { id: "school-sfs", label: "Walsh School of Foreign Service (if applying here)", wordLimit: 500, prompt: "Georgetown University's Walsh School of Foreign Service was founded more than a century ago to prepare generations of leaders with the foundational skills to address global issues. Describe your primary motivations for studying international affairs at Georgetown University and dedicating your undergraduate studies toward a future in global service." },
      { id: "school-msb", label: "McDonough School of Business (if applying here)", wordLimit: 500, prompt: "Georgetown University's McDonough School of Business provides graduates with essential global, ethical, analytical, financial, and diverse perspectives on the economies of our nation and the world. Describe your primary motivations for studying business at Georgetown University." },
    ],
  },
  {
    id: "umich",
    name: "University of Michigan",
    shortName: "Michigan",
    notes: "Prompts are unchanged from the prior cycle for 2026-27. Applicants pick an undergraduate school/college (LSA, Engineering, Ross, Kinesiology, Music Theatre & Dance, Art & Design, Nursing, etc.) and the second essay must engage that specific school, not Michigan in general.",
    supplements: [
      { id: "leadership-citizenship", label: "Leadership and citizenship", wordLimit: 300, prompt: "At the University of Michigan, we are focused on developing leaders and citizens who will challenge the present and enrich the future. In your essay, share with us how you are prepared to contribute to these goals. This could include the people, places, experiences, or aspirations that have shaped your journey and future plans." },
      { id: "why-school", label: "Why this college or school", wordLimit: 550, prompt: "Describe the unique qualities that attract you to the specific undergraduate College or School (including preferred admission and dual degree programs) to which you are applying at the University of Michigan. How would that curriculum support your interests?" },
    ],
  },
  {
    id: "uc-system",
    name: "University of California",
    shortName: "UC (any campus)",
    notes: "Covers every UC campus (Berkeley, UCLA, San Diego, Irvine, Davis, Santa Barbara, etc.) — they share one application and one set of essay prompts, called Personal Insight Questions (PIQs), verified against UC's own admissions site. Applicants answer 4 of the 8 questions below, 350 words each; there is no 'right' four, and no campus reads more or fewer than the others submit.",
    supplements: [
      { id: "piq-1", label: "PIQ 1 — Leadership", wordLimit: 350, prompt: "Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time." },
      { id: "piq-2", label: "PIQ 2 — Creativity", wordLimit: 350, prompt: "Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side." },
      { id: "piq-3", label: "PIQ 3 — Greatest talent or skill", wordLimit: 350, prompt: "What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?" },
      { id: "piq-4", label: "PIQ 4 — Educational opportunity or barrier", wordLimit: 350, prompt: "Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced." },
      { id: "piq-5", label: "PIQ 5 — Significant challenge", wordLimit: 350, prompt: "Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?" },
      { id: "piq-6", label: "PIQ 6 — Academic subject that inspires you", wordLimit: 350, prompt: "Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom." },
      { id: "piq-7", label: "PIQ 7 — Improving your school or community", wordLimit: 350, prompt: "What have you done to make your school or your community a better place?" },
      { id: "piq-8", label: "PIQ 8 — Why you're a strong candidate", wordLimit: 350, prompt: "Beyond what has already been shared in your application, what do you believe makes you a strong candidate for admissions to the University of California?" },
    ],
  },
  {
    id: "nyu",
    name: "New York University",
    shortName: "NYU",
    notes: "The supplemental essay is technically optional but strongly recommended for a competitive application. Applicants may respond to one, several, or none of the listed guiding questions as long as the main prompt is addressed.",
    supplements: [
      { id: "bridge-builders", label: "Bridge builders (optional but recommended)", wordLimit: 250, prompt: "We are looking for students who want to be bridge builders — students who can connect people, groups, and ideas to span divides, foster understanding, and promote collaboration within a dynamic, interconnected, and vibrant global academic community. We are eager for you to tell us how your experiences have helped you understand what qualities and efforts are needed to bridge divides so that people can better learn and work together. Please consider one or more of the following questions in your essay: Tell us about a time you encountered a perspective different from your own." },
    ],
  },
  {
    id: "usc",
    name: "University of Southern California",
    shortName: "USC",
    notes: "Essay 2 is new for 2026-27 and framed around USC's Student Commitment on open debate. The gap-year essay only applies if the applicant actually has a fall/spring term outside school. Ten short-answer questions (100 characters max, except the 3-word opener) round out the writing supplement.",
    supplements: [
      { id: "academic-interests", label: "Academic interests at USC", wordLimit: 250, prompt: "Describe how you plan to pursue your academic interests and why you want to explore them at USC specifically. Please feel free to address your first- and second-choice major selections." },
      { id: "disagreement", label: "Disagreement and common ground (optional, new for 2026-27)", wordLimit: 250, prompt: "The USC Student Commitment charges Trojans to 'value honest, open communication and robust debate,' and to 'champion ideological diversity and embrace freedom of expression.' Describe a time when you disagreed with someone you know about something important to you. Did you change your mind or reach common ground?" },
      { id: "gap-year", label: "Education gap (only if applicable)", wordLimit: 250, prompt: "Starting with the beginning of high school/secondary school, if you have had a gap where you were not enrolled in school during a fall or spring term, please address this gap in your educational history." },
    ],
  },
  {
    id: "uva",
    name: "University of Virginia",
    shortName: "UVA",
    notes: "Verified for 2026-27: UVA dropped its general supplemental essay entirely — almost all applicants submit only the Common App personal statement. The single exception is the School of Nursing, which keeps one short-answer prompt. Do not draft a general UVA supplement; there isn't one.",
    supplements: [
      { id: "nursing", label: "School of Nursing only", wordLimit: 250, prompt: "Describe a healthcare-related experience and how it shaped your decision to pursue nursing." },
    ],
  },
  {
    id: "gatech",
    name: "Georgia Institute of Technology",
    shortName: "Georgia Tech",
    notes: "Verified for 2026-27: Georgia Tech eliminated its short-answer supplement entirely, announced days before the cycle opened. The Common App personal essay is now the only piece of writing Georgia Tech reads — do not draft a Georgia Tech-specific supplement.",
    supplements: [],
  },
  {
    id: "berkeley",
    name: "University of California, Berkeley",
    shortName: "UC Berkeley",
    notes: "Applies through the UC application, not the Common App, and has no personal statement at all — only the Personal Insight Questions (PIQs). The same four answers go to every UC campus the student applies to, so they should not be Berkeley-specific.",
    supplements: [
      { id: "piq_leadership", label: "Describe an example of your leadership experience", wordLimit: 350, prompt: "Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes, or contributed to group efforts over time." },
      { id: "piq_creative", label: "Your creative side", wordLimit: 350, prompt: "Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side." },
      { id: "piq_talent", label: "Greatest talent or skill", wordLimit: 350, prompt: "What would you say is your greatest talent or skill? Describe how you have developed and demonstrated that talent over time." },
      { id: "piq_opportunity", label: "Educational opportunity or barrier", wordLimit: 350, prompt: "Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced." },
      { id: "piq_challenge", label: "Most significant challenge", wordLimit: 350, prompt: "Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?" },
      { id: "piq_subject", label: "Academic subject that inspires you", wordLimit: 350, prompt: "Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom." },
      { id: "piq_community", label: "Improving your school or community", wordLimit: 350, prompt: "What have you done to make your school or your community a better place?" },
      { id: "piq_standout", label: "What makes you stand out", wordLimit: 350, prompt: "Beyond what has already been shared in your application, what do you believe makes you stand out as a strong candidate for admission to the University of California?" },
    ],
  },
  {
    id: "ucla",
    name: "University of California, Los Angeles",
    shortName: "UCLA",
    notes: "Same UC application and same eight Personal Insight Questions as every other UC campus — pick any four of the eight, 350 words each. No UCLA-only prompt exists.",
    supplements: [
      { id: "piq_leadership", label: "Describe an example of your leadership experience", wordLimit: 350, prompt: "Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes, or contributed to group efforts over time." },
      { id: "piq_creative", label: "Your creative side", wordLimit: 350, prompt: "Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side." },
      { id: "piq_talent", label: "Greatest talent or skill", wordLimit: 350, prompt: "What would you say is your greatest talent or skill? Describe how you have developed and demonstrated that talent over time." },
      { id: "piq_opportunity", label: "Educational opportunity or barrier", wordLimit: 350, prompt: "Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced." },
      { id: "piq_challenge", label: "Most significant challenge", wordLimit: 350, prompt: "Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?" },
      { id: "piq_subject", label: "Academic subject that inspires you", wordLimit: 350, prompt: "Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom." },
      { id: "piq_community", label: "Improving your school or community", wordLimit: 350, prompt: "What have you done to make your school or your community a better place?" },
      { id: "piq_standout", label: "What makes you stand out", wordLimit: 350, prompt: "Beyond what has already been shared in your application, what do you believe makes you stand out as a strong candidate for admission to the University of California?" },
    ],
  },
  {
    id: "williams",
    name: "Williams College",
    shortName: "Williams",
    notes: "Verified for 2025-26: Williams has no required supplemental essay. There is only an optional academic writing sample — a graded or ungraded 3-5 page paper from the last two years, analytical or creative, on any topic — for students who want to show their writing in a classroom context.",
    supplements: [
      { id: "writing_sample", label: "Optional academic writing sample (3-5 pages)", wordLimit: 2500, prompt: "Optional: submit a paper you have written in the last two years for an academic course, 3-5 pages, that best represents your writing. It need not be graded and can be analytical or creative." },
    ],
  },
  {
    id: "emory",
    name: "Emory University",
    shortName: "Emory",
    notes: "Two short answers: a recommended-length (not hard-capped) 200-word academic-interest prompt, plus a pick-one 150-word prompt on community, cultural awareness, service, or navigating disagreement.",
    supplements: [
      { id: "why_emory", label: "Academic areas you want to explore at Emory", wordLimit: 200, prompt: "What academic areas are you interested in exploring at Emory University and why?" },
      { id: "community", label: "A community you helped shape", wordLimit: 150, prompt: "Reflect on a community that you have helped shape or that has shaped you." },
      { id: "cultural_awareness", label: "Expanding your cultural awareness", wordLimit: 150, prompt: "Describe a time when you intentionally expanded your cultural awareness." },
      { id: "service", label: "Contributing to service to humanity", wordLimit: 150, prompt: "Emory's mission includes service to humanity. How do you see yourself contributing to that mission?" },
      { id: "disagreement", label: "Navigating intellectual disagreement", wordLimit: 150, prompt: "Describe how you navigate a disagreement with someone whose perspective differs from your own." },
    ],
  },
  {
    id: "unc",
    name: "University of North Carolina at Chapel Hill",
    shortName: "UNC Chapel Hill",
    notes: "Two required short responses, 200-250 words each: one on a personal quality's community impact, one on an academic topic you want to explore in college.",
    supplements: [
      { id: "quality_community", label: "A personal quality and its impact on a community", wordLimit: 250, prompt: "Discuss one of your personal qualities and share a story, anecdote, or memory of how it helped you make a positive impact on a community. This could be your current community or another community you have engaged." },
      { id: "academic_topic", label: "Academic topic you're excited to explore", wordLimit: 250, prompt: "Discuss an academic topic that you're excited to explore and learn more about in college. Why does this topic interest you? Topics could be a specific course of study, research interests, or any other area related to your academic experience in college." },
    ],
  },
  {
    id: "bc",
    name: "Boston College",
    shortName: "Boston College",
    notes: "One required 400-word essay, chosen from five options: most applicants pick one of four general prompts, while Human-Centered Engineering applicants must answer the fifth instead. Only the tradition prompt and the HCE-specific prompt are quoted verbatim below; the other three general options exist but their exact wording wasn't independently confirmed.",
    supplements: [
      { id: "tradition", label: "A meaningful tradition in your family or community", wordLimit: 400, prompt: "Strong communities are sustained by traditions. Boston College's annual calendar is marked with both long-standing and newer traditions that help shape our community. Tell us about a meaningful tradition in your family or community. Why is it important to you, and how does it bring people together or strengthen the bonds of those who participate?" },
      { id: "hce", label: "Human-Centered Engineering applicants only", wordLimit: 400, prompt: "One goal of a Jesuit education is to prepare students to serve the Common Good. Human-Centered Engineering at Boston College integrates technical knowledge, creativity, and a humanistic perspective to address societal challenges and opportunities. What societal problems are important to you and how will you use your HCE education to solve them?" },
    ],
  },
  {
    id: "wellesley",
    name: "Wellesley College",
    shortName: "Wellesley",
    notes: "One required essay of 250-400 words, written as two paragraphs, on building bridges across difference. Verified for 2025-26.",
    supplements: [
      { id: "bridges", label: "Working alongside people of different backgrounds or perspectives", wordLimit: 400, prompt: "Wellesley students actively seek ways to build bridges and to change the world for the better. Tell us about an experience working with and alongside people of different backgrounds and/or perspectives from your own. Why was this important to you, and what lessons from this will you bring with you to Wellesley?" },
    ],
  },
  {
    id: "pomona",
    name: "Pomona College",
    shortName: "Pomona",
    notes: "Two required pieces: a 150-word academic-interest statement, plus a 250-word response chosen from three prompts. Only two of the three 250-word options were confirmed verbatim; a third, about how others perceive you, exists but its exact wording wasn't independently verified.",
    supplements: [
      { id: "academic_interest", label: "What draws you to your potential major(s)?", wordLimit: 150, prompt: "What draws you to the subject(s) you selected as potential major(s)? If Undecided, share more about one of your academic passions or interests." },
      { id: "community_values", label: "Values or perspectives from a community you're part of", wordLimit: 250, prompt: "Reflecting on a community that you are a part of, what values or perspectives from that community would you bring to Pomona?" },
      { id: "outside_classroom", label: "An experience outside the classroom that changed how you think", wordLimit: 250, prompt: "Describe an experience you had outside the classroom that changed the way you think or how you engage with your peers. What was that experience, and what did you learn from it?" },
    ],
  },
  {
    id: "ut-austin",
    name: "The University of Texas at Austin",
    shortName: "UT Austin",
    notes: "Applies through ApplyTexas, not the Common App. Two required short answers of about 250-300 words (40-line limit) each, plus an optional third for special circumstances.",
    supplements: [
      { id: "why_major", label: "Why your first-choice major?", wordLimit: 300, prompt: "Why are you interested in the major you indicated as your first-choice major?" },
      { id: "proudest_activity", label: "The activity you're most proud of", wordLimit: 300, prompt: "Think of all the activities — both in and outside of school — that you have been involved with during high school. Which one are you most proud of and why? (Guidance for students: This can include an extracurricular activity, a club/organization, volunteer activity, work or a family responsibility.)" },
      { id: "special_circumstances", label: "Optional: special circumstances affecting your academics", wordLimit: 300, prompt: "Optional: share background on events or special circumstances that you feel may have impacted your high school academic performance." },
    ],
  },
  {
    id: "middlebury",
    name: "Middlebury College",
    shortName: "Middlebury",
    notes: "Verified for 2025-26: Middlebury has no supplemental essay of any kind, a rarity among selective schools. The only optional extra is an arts supplement uploaded via SlideRoom. Do not draft a Middlebury-specific supplement; there isn't one.",
    supplements: [],
  },
  {
    id: "swarthmore",
    name: "Swarthmore College",
    shortName: "Swarthmore",
    notes: "Two required 250-word essays: one long identity/background prompt framed around Swarthmore's DEI commitment, and one on a topic that has recently fascinated the applicant.",
    supplements: [
      { id: "identity_background", label: "Self-identity or personal background, and navigating difference", wordLimit: 250, prompt: "Swarthmore College maintains an ongoing commitment of building a diverse, equitable, and inclusive residential community dedicated to rigorous intellectual inquiry. All who engage in our community are empowered through the open exchange of ideas guided by equity and social responsibility to thrive and contribute as bridge builders within global communities. Our identities and perspectives are supported and developed by our immediate contexts and lived experiences – in our neighborhoods, families, classrooms, communities of faith, and more. What aspects of your self-identity or personal background are most significant to you? Reflecting on the elements of your home, school, or other communities that have shaped your life, explain how you have grown in your ability to navigate differences when engaging with others, or demonstrated your ability to collaborate in communities other than your own." },
      { id: "recent_fascination", label: "A topic that has fascinated you recently", wordLimit: 250, prompt: "Tell us about a topic that has fascinated you recently – either inside or outside of the classroom. What made you curious about this? Has this topic connected across other areas of your interests? How has this experience shaped you and what encourages you to keep exploring?" },
    ],
  },
  {
    id: "amherst",
    name: "Amherst College",
    shortName: "Amherst",
    notes: "One required 350-word essay chosen from a list of quotations Amherst publishes each cycle, plus a shorter required extracurricular write-up and two optional short responses. Only one of the published quotation options is confirmed verbatim below; the rest of the quote list and the extracurricular/optional prompt wording weren't independently verified.",
    supplements: [
      { id: "curiosity_quote", label: "Respond to a quotation about curiosity (one of several quote options)", wordLimit: 350, prompt: "\"Hope and curiosity — these are qualities that are the foundation of what Amherst College means, of everything that we do here. Curiosity is at the core of a liberal arts education — a spirit of inquiry that shapes not only what our students do in the classroom, but also how they learn from and about each other.\" — Michael A. Elliott, 20th President of Amherst College. What does curiosity mean to you? How do you experience curiosity in your own life?" },
    ],
  },
  {
    id: "cwru",
    name: "Case Western Reserve University",
    shortName: "Case Western",
    notes: "Verified for 2025-26: no supplemental essay for general first-year applicants, a rare policy among top-30 research universities. The exception is the Pre-Professional Scholars Program (PPSP), which requires two additional essays (a why-this-profession essay of 250-500 words, and a 750-word essay about an accomplishment that wouldn't otherwise appear on the application) plus a finalist interview.",
    supplements: [
      { id: "ppsp_profession", label: "PPSP applicants only: why this profession", wordLimit: 500, prompt: "By applying to the Pre-Professional Scholars Program, you are applying to gain admission to professional school earlier than students who apply in the traditional way. Please indicate why you're interested in your chosen profession. How do you see yourself being particularly suited to this field? What events and/or experiences have led you to your choice?" },
      { id: "ppsp_hidden_accomplishment", label: "PPSP applicants only: an accomplishment that won't appear elsewhere", wordLimit: 750, prompt: "In the college application process, you are constantly prompted for a list of your achievements, awards, and accomplishments. While this information is useful to us, we are interested in hearing more about you. Describe an event, achievement, or experience of which you are particularly proud but that will not show up on a resume, may not garner any recognition, and does not appear anywhere else on your admission application." },
    ],
  },
  {
    id: "vassar",
    name: "Vassar College",
    shortName: "Vassar",
    notes: "One required essay of 300 words or fewer, chosen from two identity/community prompts framed around Vassar's philosophy of \"engaged pluralism.\"",
    supplements: [
      { id: "identity", label: "An important part of your identity", wordLimit: 300, prompt: "At Vassar, we aim to foster an inclusive community through our philosophy of engaged pluralism. Engaged pluralism is rooted in \"the conviction that collaborating across differences is necessary for social transformation and critical for the well-being of any community and its members.\" In short, we believe it's our differences that make us stronger. Tell us a little bit about an important part of your identity and how it has shaped your life and/or interactions with others." },
      { id: "community", label: "A community that has shaped your identity", wordLimit: 300, prompt: "Vassar is a diverse community that inspires positive change through open inquiry, deep dives into society's most difficult challenges, and collaborative problem solving. We care deeply about one another, the communities that have forged us, and the community we build together on campus. Tell us more about the community (or communities) you come from and how it has shaped your lived experiences and identity." },
    ],
  },
  {
    id: "carleton",
    name: "Carleton College",
    shortName: "Carleton",
    notes: "One required 300-word essay on connecting with someone different from you, plus an optional 250-word catch-all for anything not covered elsewhere in the application.",
    supplements: [
      { id: "connection", label: "Someone you connect with who's different from you", wordLimit: 300, prompt: "Think about someone you connect with who's different from you. What do you find most meaningful about your interactions with them?" },
      { id: "anything_missing", label: "Optional: anything missing from your application", wordLimit: 250, prompt: "Anything missing?" },
    ],
  },
  {
    id: "northeastern",
    name: "Northeastern University",
    shortName: "Northeastern",
    notes: "Verified for 2025-26: Northeastern has no supplemental essay of its own. Applicants only write the standard Common App or Coalition App personal statement. Do not draft a Northeastern-specific supplement; there isn't one.",
    supplements: [],
  },
  {
    id: "haverford",
    name: "Haverford College",
    shortName: "Haverford",
    notes: "Two required essays, 150-200 words each: one on intellectual curiosity, one on values and Haverford's student-run Honor Code, one of the oldest in the US.",
    supplements: [
      { id: "curiosity", label: "A topic or issue that sparks your intellectual curiosity", wordLimit: 200, prompt: "Tell us about a topic or issue that sparks your curiosity and gets you intellectually excited. How do you hope to engage with this topic or issue at Haverford?" },
      { id: "values_honor_code", label: "Values you seek in your next community, and the Honor Code", wordLimit: 200, prompt: "We have highlighted for you some of the values that shape the Haverford community. What are some of the values you seek in your next community? How do Haverford's values, as demonstrated through our Honor Code, resonate with you? As you think about how to answer this question, you might draw from how you have been influenced by other communities you have been a part of, experiences you may have had within your communities, or opportunities you have had to shape or even change your communities." },
    ],
  },
  {
    id: "barnard",
    name: "Barnard College",
    shortName: "Barnard",
    notes: "One required 250-word essay: imagine a conversation with a woman whose views differ from your own.",
    supplements: [
      { id: "conversation_with_a_woman", label: "A conversation with a woman whose views differ from your own", wordLimit: 250, prompt: "Rooted in a history of trailblazing women, Barnard College is a collaborative community of care shaped by bold women with a multitude of perspectives. Choose one woman — historical, fictional, contemporary, or personally significant — whose views differ from your own. Imagine a conversation with her. What would you discuss? How might her perspective challenge or shift your own? Share how this new mindset could influence your approach to learning and engagement both in and beyond the classroom at Barnard." },
    ],
  },
  {
    id: "grinnell",
    name: "Grinnell College",
    shortName: "Grinnell",
    notes: "Verified for 2025-26: Grinnell has no required supplemental essay. Applicants may optionally submit extra letters of recommendation, writing samples, essays, or other documents if they feel it strengthens the application, but nothing is required beyond the Common App or QuestBridge essay.",
    supplements: [],
  },
  {
    id: "oberlin",
    name: "Oberlin College",
    shortName: "Oberlin",
    notes: "Verified against Oberlin's own admissions site: no supplemental essay required for the College of Arts & Sciences. Only the standard Common App personal essay (up to 650 words, one of six prompts) is needed. Conservatory applicants have separate audition/portfolio requirements not covered here.",
    supplements: [],
  },
  {
    id: "davidson",
    name: "Davidson College",
    shortName: "Davidson",
    notes: "Two required essays, 250-300 words each: a specific why-Davidson prompt, and a prompt about a curiosity outside the classroom.",
    supplements: [
      { id: "why_davidson", label: "What interests you most about Davidson?", wordLimit: 300, prompt: "There are just under 3,000 4-year colleges and universities in the United States. Being as specific as possible, what interests you most about Davidson College?" },
      { id: "curiosities", label: "A topic, activity, or idea that excites you", wordLimit: 300, prompt: "Davidson encourages students to explore curiosities in and out of the classroom. What is a topic, activity or idea that excites you?" },
    ],
  },
  {
    id: "reed",
    name: "Reed College",
    shortName: "Reed",
    notes: "One required essay, 200-500 words, built around Paideia — Reed's real end-of-January week where students teach each other classes on anything.",
    supplements: [
      { id: "paideia", label: "What would you teach during Paideia?", wordLimit: 500, prompt: "For one week at the end of January, Reed students upend the traditional classroom hierarchy and teach classes about any topic they love, academic or otherwise. This week is known as Paideia after the Greek term signifying \"education\" — the complete education of mind, body and spirit. What would you teach that would contribute to the Reed community?" },
    ],
  },
  {
    id: "colgate",
    name: "Colgate University",
    shortName: "Colgate",
    notes: "All writing beyond the Common App essay is technically optional, available in the applicant portal after submission — but in practice expected of a competitive application. Structure: one 250-word diversity-engagement prompt (quoted verbatim below), a second 250-word prompt on what inspires the applicant (paraphrased in the sources reviewed, not independently confirmed word-for-word), and a set of short sentence stems answered in 13 words or less each.",
    supplements: [
      { id: "diverse_engagement", label: "Optional: benefits of engaging with a diverse campus", wordLimit: 250, prompt: "On Colgate's campus, students engage with individuals from a variety of socioeconomic backgrounds, races, ethnicities, religions, and perspectives during the course of their educational and social experiences. In 250 words or less, please share the benefits you see in engaging with a diverse body of students, faculty, and staff as part of your Colgate experience." },
    ],
  },
  {
    id: "wesleyan",
    name: "Wesleyan University",
    shortName: "Wesleyan",
    notes: "Verified for 2025-26: Wesleyan has no supplemental essay of its own. Only the standard 650-word Common App or Coalition personal statement is required; an arts portfolio via SlideRoom is optional for students who want to highlight creative work.",
    supplements: [],
  },
  {
    id: "bates",
    name: "Bates College",
    shortName: "Bates",
    notes: "Verified for 2025-26: Bates requires no supplemental essay or short answer beyond the Common App personal statement. Optional arts supplements (music, theater, art, dance, film, or creative writing) can be added as a portfolio, not a required essay.",
    supplements: [],
  },
  {
    id: "trinity-hartford",
    name: "Trinity College (Connecticut)",
    shortName: "Trinity (Hartford)",
    notes: "One optional essay, under 300 words, on an aspect of the applicant's background or identity. Distinct from Trinity College Dublin, id \"trinity-dublin\", elsewhere in this list.",
    supplements: [
      { id: "background_identity", label: "Optional: an aspect of your background you want to share", wordLimit: 300, prompt: "The identities you claim, the challenges you face, and the successes you enjoy shape the background for your college experience to come. What is an aspect of your background that you are excited to share and/or explore as a member of the Trinity community and why?" },
    ],
  },
  {
    id: "kenyon",
    name: "Kenyon College",
    shortName: "Kenyon",
    notes: "Verified against Kenyon's own admissions site and independently corroborated: no supplemental essay. Only the standard Common App personal statement (650 words) is required.",
    supplements: [],
  },
  {
    id: "occidental",
    name: "Occidental College",
    shortName: "Occidental",
    notes: "One essay, technically optional but strongly recommended, up to 250 words: a classic why-this-college prompt.",
    supplements: [
      { id: "why_oxy", label: "Why Occidental is the right place for you", wordLimit: 250, prompt: "Why are you applying to Occidental? Why do you think Occidental is the right place for you to pursue your interests?" },
    ],
  },
  {
    id: "macalester",
    name: "Macalester College",
    shortName: "Macalester",
    notes: "Three optional 300-word prompts — urban location, mission fit, and a grades-context explanation — though Prompt 1 is strongly encouraged for demonstrated interest.",
    supplements: [
      { id: "urban_location", label: "How Macalester's Twin Cities location would enhance your experience", wordLimit: 300, prompt: "Macalester is one of the few highly selective liberal arts colleges located in the middle of a metropolitan area. Students benefit from the strong sense of community on campus and opportunities to engage in academic, social, and civic engagement options in the Twin Cities of Minneapolis and St. Paul. Identify one way that Macalester's urban location would enhance your academic, social, and/or community experiences?" },
      { id: "mission_fit", label: "How your experiences connect with Macalester's mission", wordLimit: 300, prompt: "Four values permeate Macalester's mission and purpose: academic distinction, internationalism, multiculturalism, and service to society. Guided by this mission, Macalester is a learning environment that affirms different identities and experiences and prepares graduates to work toward a more just and peaceful world. In what ways do your lived experiences, perspectives, or hopes for your college education connect with Macalester's mission/learning environment?" },
      { id: "grades_context", label: "Optional: context for a significant change in your grades", wordLimit: 300, prompt: "Has there been a significant change in your grades at any point during your academic journey? Please use this space to provide relevant context we should consider when reviewing your academic record." },
    ],
  },
  {
    id: "union-college",
    name: "Union College",
    shortName: "Union",
    notes: "Verified for 2025-26: Union has no supplemental essay or short-answer requirement. All applicants receive an optional Applicant Research Questionnaire to describe undergraduate research interest and, if applicable, AP Capstone or IB Extended Essay topics — not a required essay.",
    supplements: [],
  },
  {
    id: "bryn-mawr",
    name: "Bryn Mawr College",
    shortName: "Bryn Mawr",
    notes: "One required essay (250-500 words) on personal authenticity, plus an optional 250-word why-Bryn-Mawr essay.",
    supplements: [
      { id: "authentic_self", label: "What you know about yourself to be true", wordLimit: 500, prompt: "Bryn Mawr students bring their authentic selves to campus. What do you know about yourself to be true — and what in your background or experience led you to that truth?" },
      { id: "why_bryn_mawr", label: "Optional: why Bryn Mawr", wordLimit: 250, prompt: "Why are you interested in Bryn Mawr?" },
    ],
  },
  {
    id: "sarah-lawrence",
    name: "Sarah Lawrence College",
    shortName: "Sarah Lawrence",
    notes: "One optional essay, 250-500 words, chosen from four prompts (identity, creativity, community values, and differing perspectives). Only the \"hyphenates\" creativity prompt is confirmed verbatim below; the other three exist but their exact wording wasn't independently verified.",
    supplements: [
      { id: "hyphenates", label: "Disparate interests you've brought together", wordLimit: 500, prompt: "Sarah Lawrence students are often described as hyphenates: filmmaker-sociologist-historian, environmentalist-photographer, psychologist-novelist, economist-poet. In 250-500 words, tell us about seemingly disparate interests you have brought together, or hope to bring together at Sarah Lawrence." },
    ],
  },
  {
    id: "skidmore",
    name: "Skidmore College",
    shortName: "Skidmore",
    notes: "Verified for 2025-26: Skidmore has no supplemental essay. Only the Common App personal statement plus standard supporting materials (school report, recommendations, transcript) are required.",
    supplements: [],
  },
  {
    id: "hamilton",
    name: "Hamilton College",
    shortName: "Hamilton",
    notes: "One essay, technically optional but strongly encouraged, 350 words, built around Hamilton's motto \"know thyself.\"",
    supplements: [
      { id: "know_thyself", label: "Your unique perspective, and how Hamilton would shape it", wordLimit: 350, prompt: "At Hamilton, we each bring different backgrounds and perspectives, and we teach one another about the world through our individual and shared experiences. In the spirit of Hamilton's motto, know thyself, please reflect on your unique perspective and how Hamilton might shape it, as well as how your perspective will shape Hamilton." },
    ],
  },
  {
    id: "franklin-marshall",
    name: "Franklin & Marshall College",
    shortName: "F&M",
    notes: "No supplemental essay found in F&M's own application checklist (transcript, one academic recommendation, and optional extras like an interview or arts samples) or in independent guides for the 2025-26 cycle — treated here as no required supplement, though this wasn't confirmed by an explicit statement on F&M's own site the way UVA's or Georgia Tech's absence was.",
    supplements: [],
  },
  {
    id: "lehigh",
    name: "Lehigh University",
    shortName: "Lehigh",
    notes: "Three required 200-word essays: how you learned about Lehigh, something good happening in your life right now, and how your specific program choice serves your goals.",
    supplements: [
      { id: "why_lehigh", label: "How you learned about Lehigh and what motivated you to apply", wordLimit: 200, prompt: "How did you first learn about Lehigh University and what motivated you to apply?" },
      { id: "celebrate_good", label: "Something great happening in your life right now", wordLimit: 200, prompt: "At Lehigh, we believe in pausing to celebrate the good — meaningful moments that bring joy, pride or motivation. What's something great happening in your life right now?" },
      { id: "why_major", label: "Why this college, program, and major", wordLimit: 200, prompt: "How will the unique combination of college, program, major and/or 4+1 program that you selected above allow you to achieve your educational or professional goals?" },
    ],
  },
  {
    id: "villanova",
    name: "Villanova University",
    shortName: "Villanova",
    notes: "One required 250-word essay, chosen from five prompts. Three are confirmed close to verbatim below; the remaining two (\"a time you were misjudged\" and \"a time someone borrowed your strength\") appear only as short topic labels in the sources reviewed, not full prompt text, so they aren't quoted here.",
    supplements: [
      { id: "playing_your_part", label: "Playing your part in advancing equity and justice", wordLimit: 250, prompt: "As Pope Leo XIV (Villanova Class of 1977) has said, \"no one can single-handedly bear the weight of the challenges the world is facing, just as no one is so weak that they cannot play their part.\" What have you done to play your part in advancing equity and justice in your community?" },
      { id: "life_lesson", label: "A life lesson you'd want to share with others at Villanova", wordLimit: 250, prompt: "What is a lesson in life that you have learned that you would want to share with others at Villanova?" },
      { id: "new_home", label: "Why you want to call Villanova your new home", wordLimit: 250, prompt: "\"Villanova\" means \"new home.\" Why do you want to call Villanova your new home?" },
    ],
  },
  {
    id: "bucknell",
    name: "Bucknell University",
    shortName: "Bucknell",
    notes: "One required 250-word why-this-major essay.",
    supplements: [
      { id: "why_major_bucknell", label: "Your intended major(s) and why Bucknell", wordLimit: 250, prompt: "Please explain your interest in your first-choice major/undecided status and your second-choice major (should you opt to list one) and why you would choose Bucknell University to pursue your interest(s)." },
    ],
  },
  {
    id: "smith",
    name: "Smith College",
    shortName: "Smith",
    notes: "One required essay, 200-250 words, framed around Smith's residential house system, where students of all class years live together.",
    supplements: [
      { id: "residential_community", label: "What you'd bring to and hope to learn from your residential neighbors", wordLimit: 250, prompt: "What personal experiences, background, or abilities would you bring to this residential environment to share with your neighbors, and what would you hope your neighbors would share with you?" },
    ],
  },
  {
    id: "bowdoin",
    name: "Bowdoin College",
    shortName: "Bowdoin",
    notes: "One 250-word optional essay reflecting on a line from \"The Offer of the College,\" a 1906 address by Bowdoin President William DeWitt Hyde that the school treats as a statement of its values, plus a separate 140-character prompt on how the applicant first learned about Bowdoin.",
    supplements: [
      { id: "offer_of_the_college", label: "A line from \"The Offer of the College\" that resonates with you", wordLimit: 250, prompt: "Generations of students have found connection and meaning in Bowdoin's \"The Offer of the College,\" written in 1906 by Bowdoin President William DeWitt Hyde. Which line from The Offer resonates most with you? The Offer represents Bowdoin's values. Please reflect on the line you selected and how it has meaning to you." },
      { id: "how_you_learned", label: "How did you first learn about Bowdoin?", wordLimit: 20, prompt: "How did you first learn about Bowdoin? (140 characters)" },
    ],
  },
  {
    id: "whitman",
    name: "Whitman College",
    shortName: "Whitman",
    notes: "Verified for 2026-27: Whitman has no supplemental essay. Only the standard Common App personal statement (650 words) is required.",
    supplements: [],
  },
  {
    id: "pitzer",
    name: "Pitzer College",
    shortName: "Pitzer",
    notes: "One required 650-word essay, choosing between a college-fit prompt and a community-engagement prompt, plus an optional 250-word background/identity essay.",
    supplements: [
      { id: "college_fit", label: "What you want from college and why Pitzer fits", wordLimit: 650, prompt: "Describe what you are looking for from your college experience and why Pitzer would be a good fit for you." },
      { id: "core_values", label: "How you've engaged with one of Pitzer's core values", wordLimit: 650, prompt: "Reflecting on your involvement throughout high school or within the community, how have you engaged with one of Pitzer's core values?" },
      { id: "background_identity", label: "Optional: background, identity, or interests you'd bring to Pitzer", wordLimit: 250, prompt: "Describe distinctive aspects of your background, identity, or personal interests that you would bring to Pitzer, and how you plan to engage in our community." },
    ],
  },
  {
    id: "muhlenberg",
    name: "Muhlenberg College",
    shortName: "Muhlenberg",
    notes: "Verified for 2025-26: Muhlenberg has no supplemental essay. Only the standard Common App personal statement is required.",
    supplements: [],
  },
  {
    id: "dickinson",
    name: "Dickinson College",
    shortName: "Dickinson",
    notes: "Three short-answer questions, 50 words each, and applicants may answer as few as one or two. Only the internet-rabbit-hole question is confirmed verbatim below; the other two ask about private/aspirational interests and about the values that make you you, but their exact wording wasn't independently confirmed — only paraphrases and illustrative examples were found.",
    supplements: [
      { id: "rabbit_hole", label: "What sends you down an internet rabbit hole?", wordLimit: 50, prompt: "What sends you down an internet rabbit hole? What topic could you wax poetic about for hours?" },
    ],
  },
  {
    id: "connecticut-college",
    name: "Connecticut College",
    shortName: "Conn College",
    notes: "Confirmed no required supplemental essay and no application fee; one optional essay is offered. The prompt text below is the confirmed 2024-25 wording — whether it carried over unchanged to 2025-26 wasn't independently verified.",
    supplements: [
      { id: "who_you_are", label: "Optional: who you are and what you'll bring to Conn", wordLimit: 150, prompt: "In 150 words or less, please tell us who you are and what you will bring to the Conn community to help us grow into the best version of ourselves." },
    ],
  },
  {
    id: "denison",
    name: "Denison University",
    shortName: "Denison",
    notes: "Verified for 2025-26: Denison has no supplemental essay beyond whatever essay the applicant's chosen platform (Common App, Coalition, or QuestBridge) already requires. Optional arts supplements exist for cinema, creative writing, dance, music, studio art, or theatre applicants.",
    supplements: [],
  },
  {
    id: "gettysburg",
    name: "Gettysburg College",
    shortName: "Gettysburg",
    notes: "Verified for 2025-26: Gettysburg has no supplemental essay. Only the standard Common App personal essay is required.",
    supplements: [],
  },
  {
    id: "furman",
    name: "Furman University",
    shortName: "Furman",
    notes: "One required 350-word essay built around \"The Furman Advantage,\" the school's branded mentored-experience program.",
    supplements: [
      { id: "furman_advantage", label: "How the Furman Advantage will prepare you for purpose, community impact, and career success", wordLimit: 350, prompt: "Describe how you believe The Furman Advantage will prepare you for a life of purpose, community impact, and career success." },
    ],
  },
  {
    id: "emerson",
    name: "Emerson College",
    shortName: "Emerson",
    notes: "Two required essays of 100-200 words each: why your first-choice major, plus a choice between a \"title the story of your life\" prompt and a community-benefit prompt. Honors Program applicants add a separate 400-600 word essay.",
    supplements: [
      { id: "why_major_emerson", label: "What influenced your first-choice major", wordLimit: 200, prompt: "The academic programs at Emerson College are focused on communication and the arts. Please tell us what influenced you to select your first choice major. Please be brief." },
      { id: "story_of_your_life", label: "Title the story of your life", wordLimit: 200, prompt: "Much of the work that students do at Emerson College is a form of storytelling. If you were to write the story of your life until now, what would you title it and why?" },
      { id: "community_benefit", label: "How community benefits the individual, the whole, or both", wordLimit: 200, prompt: "At its best, how does community benefit the individual, the whole, or both?" },
    ],
  },
  {
    id: "rollins",
    name: "Rollins College",
    shortName: "Rollins",
    notes: "Verified against two independent sources: no supplemental essay beyond a 250-word-or-more personal statement, no application fee, and test scores are optional.",
    supplements: [],
  },
  {
    id: "william-mary",
    name: "College of William & Mary",
    shortName: "William & Mary",
    notes: "Applicants choose up to two of six 300-word prompts. Only three of the six are confirmed close to verbatim below; the other three exist but weren't independently confirmed.",
    supplements: [
      { id: "community", label: "A community important to you", wordLimit: 300, prompt: "Are there any particular communities that are important to you, and how do you see yourself being a part of our community?" },
      { id: "academic_interest_career", label: "A personal academic interest or career goal", wordLimit: 300, prompt: "Share more about a personal academic interest or career goal." },
      { id: "family_culture", label: "How family, culture, and/or background shaped you", wordLimit: 300, prompt: "How has your family, culture and/or background shaped your lived experience?" },
    ],
  },
  {
    id: "wheaton-ma",
    name: "Wheaton College (Massachusetts)",
    shortName: "Wheaton (MA)",
    notes: "No required supplemental essay. Applicants may optionally submit creative supplemental materials via SlideRoom (a video, research paper, reflection essay, or other artifact) to showcase a passion, skill, or experience — not a fixed essay prompt.",
    supplements: [],
  },
  {
    id: "ithaca",
    name: "Ithaca College",
    shortName: "Ithaca",
    notes: "One required essay on your chosen major (with an added note for Cinema and Photography applicants). The prompt text is confirmed for 2025-26; the exact word limit wasn't independently re-confirmed for this cycle and is carried over from the last verified figure (approximately 100 words).",
    supplements: [
      { id: "why_major_ithaca", label: "What you love about your chosen major", wordLimit: 100, prompt: "What do you love about your chosen major and/or minor? If you're interested in the Cinema and Photography program, can you describe the unique opportunities you'll find at Ithaca?" },
    ],
  },
  {
    id: "loyola-chicago",
    name: "Loyola University Chicago",
    shortName: "Loyola Chicago",
    notes: "Verified for 2026-27: no supplemental essay for undergraduate first-year applicants. Only the Common App personal statement is required. (Its Stritch School of Medicine has separate, unrelated secondary application essays for medical school applicants, not covered here.)",
    supplements: [],
  },
  {
    id: "lmu",
    name: "Loyola Marymount University",
    shortName: "LMU",
    notes: "One optional essay, up to 500 words, combining why-this-school and why-this-major.",
    supplements: [
      { id: "why_lmu_major", label: "Optional: why LMU and/or your chosen major", wordLimit: 500, prompt: "Share with us why you are interested in LMU and/or why you're interested in your chosen major." },
    ],
  },
  {
    id: "gustavus",
    name: "Gustavus Adolphus College",
    shortName: "Gustavus",
    notes: "Verified against Gustavus's own catalog and application: an essay is part of the holistic review, but it's optional on both the Gustavus Application and the Common App — like test scores, applicants can choose whether to submit one.",
    supplements: [],
  },
  {
    id: "st-olaf",
    name: "St. Olaf College",
    shortName: "St. Olaf",
    notes: "One required 150-word essay, a set of three sentence-completion prompts (10 words each), and one optional essay on a community issue (word limit for the optional prompt wasn't independently confirmed).",
    supplements: [
      { id: "why_st_olaf", label: "What excites you about St. Olaf?", wordLimit: 150, prompt: "What excites you about St. Olaf?" },
      { id: "sentence_completions", label: "Complete: Everyone knows... / No one knows... / You should know...", wordLimit: 10, prompt: "Everyone knows... (we've read about your accomplishments in your application). No one knows... (there are no wrong answers here, just be your authentic self). You should know... (we are eager to learn more about you). Use up to 10 additional words to complete each sentence." },
      { id: "community_issue", label: "Optional: an issue in your community you'd tackle before college", wordLimit: 300, prompt: "If you could spend a year tackling any issue in your community before starting college, what would it be? Why is that issue important to you and what would you do to address it?" },
    ],
  },
  {
    id: "bard",
    name: "Bard College",
    shortName: "Bard",
    notes: "Two very different application paths. Traditional path: one optional 250-word \"Why Bard?\" essay (exact current wording not independently confirmed). Alternative path, the Bard Entrance Examination: instead of a normal application, the applicant writes three 2,500-word essays answering questions from three of four categories (Social Studies; Languages and Literature; Arts; Science, Mathematics, and Computing) — free to take, due November 1, with results by mid-December, and admission decided solely on the essays.",
    supplements: [
      { id: "why_bard", label: "Optional: Why Bard?", wordLimit: 250, prompt: "Why Bard? (Exact current wording not independently confirmed — this prompt has historically asked simply why the applicant wants to attend Bard.)" },
      { id: "entrance-exam", label: "Alternative: Bard Entrance Examination (in place of the standard application)", wordLimit: 2500, prompt: "Answer three of sixteen essay questions, one from each of three of four categories (Social Studies; Languages and Literature; Arts; Science, Mathematics, and Computing), 2,500 words each. Admission is decided on these essays alone, replacing the standard application." },
    ],
  },
  {
    id: "rhodes",
    name: "Rhodes College",
    shortName: "Rhodes",
    notes: "No supplemental essay beyond the standard Common App personal statement. SAT/ACT and a short \"elevator pitch\" self-introduction video are both optional extras, not required essays.",
    supplements: [],
  },
  {
    id: "colorado-college",
    name: "Colorado College",
    shortName: "Colorado College",
    notes: "One optional 300-word essay tied to the school's Block Plan (one subject at a time, 3.5-week blocks). Colorado College explicitly says it means it when it calls this optional — skipping it doesn't hurt an application. Applicants may also optionally attach a document or URL showing the outcome of the experience they describe.",
    supplements: [
      { id: "deep_focus", label: "Optional: a time you experienced deep focus", wordLimit: 300, prompt: "One of the benefits of Colorado College's Block Plan is the opportunity to immerse yourself fully in a single subject for 3.5 weeks. We see this as the luxury of focus — the joy and value of directing your full attention to one thing. Tell us about a time when you experienced this kind of deep focus in an academic or extracurricular setting. What were you doing, and how did it turn out?" },
    ],
  },
  {
    id: "colby",
    name: "Colby College",
    shortName: "Colby",
    notes: "Verified for 2025-26: Colby has no supplemental essay or short answer of any kind, and no interview. Only the standard Common App or Coalition App personal essay is required. (Previously flagged as unconfirmed; resolved this pass.)",
    supplements: [],
  },
  {
    id: "willamette",
    name: "Willamette University",
    shortName: "Willamette",
    notes: "One why-Willamette essay with no stated word limit — confirmed for the 2024-25 cycle; carrying over to 2025-26 wasn't independently re-verified.",
    supplements: [
      { id: "why_willamette", label: "Why you're interested in attending Willamette", wordLimit: 0, prompt: "In as many or as few words as you would like, please tell us why you're interested in attending Willamette University." },
    ],
  },
  {
    id: "lafayette",
    name: "Lafayette College",
    shortName: "Lafayette",
    notes: "One required essay, 20-200 words: a specific why-Lafayette prompt.",
    supplements: [
      { id: "why_lafayette", label: "Why Lafayette", wordLimit: 200, prompt: "Students identify Lafayette as an excellent fit for countless reasons. In your response, be deliberate and specific about your motivation for applying to Lafayette. Why do you see yourself at Lafayette?" },
    ],
  },
  {
    id: "trinity-university-tx",
    name: "Trinity University (San Antonio)",
    shortName: "Trinity U (San Antonio)",
    notes: "Confirmed directly from Trinity's own admissions page: no supplemental essay for first-year applicants, on any of its three accepted platforms (Common App, ApplyTexas, Coalition App). No application fee either. Distinct from Trinity College Dublin (id \"trinity-dublin\") and Trinity College Hartford (id \"trinity-hartford\") elsewhere in this list.",
    supplements: [],
  },
  {
    id: "rpi",
    name: "Rensselaer Polytechnic Institute",
    shortName: "RPI",
    notes: "Two required essays, 250 words or fewer each: why RPI, and an extracurricular/work-experience elaboration. Some specific programs add their own additional essay (300-750 words) on top of these two.",
    supplements: [
      { id: "why_rpi", label: "Why are you interested in RPI?", wordLimit: 250, prompt: "Why are you interested in Rensselaer Polytechnic Institute?" },
      { id: "extracurricular_rpi", label: "Elaborate on an extracurricular activity or work experience", wordLimit: 250, prompt: "Please briefly elaborate on one of your extracurricular activities or work experiences." },
    ],
  },
  {
    id: "drexel",
    name: "Drexel University",
    shortName: "Drexel",
    notes: "No supplemental essay for most applicants. Architecture and Music applicants must submit an additional 500-word essay; BA/BS+MD Early Assurance Program applicants submit a separate ~500-word essay of their own.",
    supplements: [
      { id: "arch_music_essay", label: "Architecture/Music applicants only", wordLimit: 500, prompt: "Reflect on your experiences, personal characteristics, and unique traits that have prepared you for the challenges and opportunities associated with your chosen major, and how these things have shaped your goals, aspirations, and potential contributions to your field of study." },
    ],
  },
  {
    id: "elon",
    name: "Elon University",
    shortName: "Elon",
    notes: "Four short prompts: a 150-word why-Elon essay, a 200-word identity essay, a three-song playlist, and an open-theme \"top 5\" list.",
    supplements: [
      { id: "why_elon", label: "What at Elon has caught your eye?", wordLimit: 150, prompt: "What at Elon has caught your eye — programs, opportunities, or experiences you can't wait to try?" },
      { id: "identity_elon", label: "The aspect of your identity you find most meaningful", wordLimit: 200, prompt: "What aspect of your identity do you find most meaningful, and why?" },
      { id: "playlist", label: "Three songs from your perfect playlist", wordLimit: 30, prompt: "Name three songs from your perfect playlist. We look forward to creating a Spotify playlist from your answers." },
      { id: "top_5", label: "Your top 5, on any theme", wordLimit: 100, prompt: "Tell us your top 5. Take this opportunity to let Elon Admissions know more about you. Your top 5 should be something unique to you and will give us a glimpse of who you are." },
    ],
  },
  {
    id: "american-university",
    name: "American University",
    shortName: "American",
    notes: "One required 150-word essay on the subject that most excites the applicant intellectually.",
    supplements: [
      { id: "what_makes_you_tick", label: "The subject that makes you tick", wordLimit: 150, prompt: "Whether it's a general love for math/science or literature or a specific interest in aerospace engineering or 19th-century French novels, use this opportunity to share what makes you tick, the ideas or issues that keep you up at night, and what subject inspires you to dream big. What topic makes you read books and online content until your eyes bleed?" },
    ],
  },
  {
    id: "miami",
    name: "University of Miami",
    shortName: "Miami",
    notes: "One required 250-word essay on a community that has influenced the applicant.",
    supplements: [
      { id: "community_miami", label: "A community that has influenced you", wordLimit: 250, prompt: "The University of Miami is situated in one of the most vibrant cities in the world, fostering a community filled with varied backgrounds. Our students come from an array of cultures, traditions, languages, and experiences. We value the unique perspectives each student brings and the meaningful contributions they can make. Reflect on a community that has influenced you — be it your school, neighborhood, club, team, ethnic group, or any other group that has played a role in shaping who you are. What significance did that community hold for you, and in what ways did you contribute to it? How will you bring those experiences, values, and insights to enrich our campus community at the University of Miami?" },
    ],
  },
  {
    id: "fairfield",
    name: "Fairfield University",
    shortName: "Fairfield",
    notes: "Verified against two independent sources: no supplemental essay. Only the standard Common App personal statement is required; test scores are optional.",
    supplements: [],
  },
  {
    id: "fordham",
    name: "Fordham University",
    shortName: "Fordham",
    notes: "One optional 300-word essay, chosen from around four prompts. Only the \"New York is my campus\" prompt is confirmed verbatim below; the other options (campus contribution, a perspective-changing experience) exist but weren't independently confirmed word-for-word.",
    supplements: [
      { id: "nyc_campus", label: "What prepared you for living and learning in New York City", wordLimit: 300, prompt: "Our motto is 'New York is my campus, Fordham is my school.' New York City is a diverse and global city that provides Fordham students with a special kind of educational experience, full of both challenge and opportunity. What has prepared you to embrace the unique opportunity of living and learning in New York City?" },
    ],
  },
  {
    id: "baylor",
    name: "Baylor University",
    shortName: "Baylor",
    notes: "One required 450-word essay combining what you want from a university, why Baylor, and how you'd contribute.",
    supplements: [
      { id: "why_baylor", label: "What you're looking for, why Baylor, and your contribution", wordLimit: 450, prompt: "What are you looking for in a university, why do you want to attend Baylor, and how do you see yourself contributing to the Baylor community?" },
    ],
  },
  {
    id: "santa-clara",
    name: "Santa Clara University",
    shortName: "Santa Clara",
    notes: "Two required 300-word essays (community/background, and an ethical dilemma), plus an optional 50-word why-this-major prompt.",
    supplements: [
      { id: "community_scu", label: "What has shaped who you are and how you'd contribute", wordLimit: 300, prompt: "At Santa Clara University, we value our diverse and inclusive community. Our campus learning environment is enriched by the lived experiences of people from different backgrounds. What people, places, events, or circumstances have shaped the individual you are today and how you could contribute to our community?" },
      { id: "ethical_dilemma", label: "An ethical dilemma facing society today", wordLimit: 300, prompt: "At Santa Clara University, we push our students to be creative, be challenged, and be the solution. Think about an ethical dilemma that you care about that our society is currently facing. This can be something happening in your local community or more globally. How can an SCU education help you prepare for and address this challenge?" },
      { id: "why_major_scu", label: "Optional: why your selected division or major", wordLimit: 50, prompt: "Why are you interested in pursuing the [Division or Major] selected above?" },
    ],
  },
  {
    id: "tulane",
    name: "Tulane University",
    shortName: "Tulane",
    notes: "Tulane's own admission checklist lists only \"Application (including list of activities and personal statement)\" with no mention of a supplemental essay — treated here as no required supplement, though this is inferred from the checklist's silence rather than an explicit statement.",
    supplements: [],
  },
];

export const getUniversityById = (id: string): UniversityProfile | undefined =>
  UNIVERSITIES.find((u) => u.id === id);
