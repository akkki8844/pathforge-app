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
    notes: "Values intellectual curiosity, leadership impact, and depth over breadth. Likes specific moments that reveal character.",
    supplements: [
      { id: "intellectual", label: "Intellectual experience that meant the most to you", wordLimit: 200, prompt: "Briefly describe an intellectual experience that was important to you." },
      { id: "extracurricular", label: "Extracurricular / work / family responsibility that shaped you", wordLimit: 200, prompt: "Briefly describe any of your extracurricular activities, employment experience, travel, or family responsibilities that have shaped who you are." },
      { id: "future_roommate", label: "Top 3 things your roommates might like to know about you", wordLimit: 200, prompt: "Top 3 things your roommates might like to know about you." },
      { id: "diversity", label: "How will the life experiences you bring contribute to the Harvard community?", wordLimit: 200, prompt: "How will the life experiences that shape who you are today enable you to contribute to Harvard?" },
      { id: "future_self", label: "Top three things you hope your future roommates know about you", wordLimit: 200, prompt: "Top 3 things your future college roommates might like to know about you." },
    ],
  },
  {
    id: "yale",
    name: "Yale University",
    shortName: "Yale",
    notes: "Cares about community, collaborative intellect, and 'why Yale' specificity. Likes warmth and humility.",
    supplements: [
      { id: "why_major", label: "Why these academic interests?", wordLimit: 200, prompt: "Students at Yale have plenty of time to explore their academic interests before declaring a major. What about Yale's academic offerings appeals to you?" },
      { id: "why_yale", label: "What is it about Yale that has led you to apply?", wordLimit: 125, prompt: "What is it about Yale that has led you to apply?" },
      { id: "community", label: "Reflect on a community you belong to", wordLimit: 400, prompt: "Reflect on a community to which you feel connected. Why is it meaningful to you?" },
    ],
  },
  {
    id: "princeton",
    name: "Princeton University",
    shortName: "Princeton",
    notes: "Values academic rigor, service, and 'in the nation's service'. Engineering applicants get an extra prompt.",
    supplements: [
      { id: "extracurricular", label: "Extracurricular activity or work experience meaningful to you", wordLimit: 150, prompt: "Briefly elaborate on an activity, organization, work experience, or hobby that has been particularly meaningful to you." },
      { id: "service", label: "Service and civic engagement", wordLimit: 250, prompt: "Princeton values service and civic engagement. Tell us how your story intersects with these ideals." },
      { id: "difficult_conversation", label: "Difficult conversation that engaged a difference", wordLimit: 250, prompt: "Describe a difficult conversation in which you engaged a difference of perspective." },
    ],
  },
  {
    id: "stanford",
    name: "Stanford University",
    shortName: "Stanford",
    notes: "Wants intellectual vitality, what excites you, and a sense of playfulness. Concise, specific answers win.",
    supplements: [
      { id: "intellectual_vitality", label: "An idea/experience that makes you genuinely excited about learning", wordLimit: 250, prompt: "The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning." },
      { id: "roommate", label: "Letter to your future roommate", wordLimit: 250, prompt: "Virtually all of Stanford's undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help them — and us — get to know you better." },
      { id: "meaningful", label: "Tell us about something meaningful to you and why", wordLimit: 250, prompt: "Tell us about something that is meaningful to you and why." },
    ],
  },
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    shortName: "MIT",
    notes: "Wants doers and tinkerers. Loves specificity, hands-on projects, and 'what do you do for fun'. No personal statement — only short answers.",
    supplements: [
      { id: "background", label: "How has the world you come from shaped your dreams and aspirations?", wordLimit: 225, prompt: "Tell us about the world you come from and how you, as a product of it, might add to the diversity of MIT." },
      { id: "department", label: "Why this MIT department / field?", wordLimit: 100, prompt: "Although you may not yet know what you want to major in, which department or program at MIT appeals to you and why?" },
      { id: "fun", label: "What do you do for the pleasure of it?", wordLimit: 225, prompt: "We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it." },
      { id: "challenge", label: "Describe a challenge you've faced and what you learned", wordLimit: 225, prompt: "Tell us about a significant challenge you've faced or something didn't go according to plan that you feel comfortable sharing. How did you manage the situation?" },
      { id: "community_contribution", label: "How have you contributed to your community?", wordLimit: 225, prompt: "MIT brings people together to better the lives of others. Describe one way in which you have contributed to your community." },
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
    notes: "Pre-professional, interdisciplinary. 'Why Penn' and 'Why this school within Penn' are critical.",
    supplements: [
      { id: "thank_you", label: "Write a short thank-you note to someone you have not yet thanked", wordLimit: 200, prompt: "Write a short thank-you note to someone you have not yet thanked and would like to acknowledge." },
      { id: "why_penn", label: "How will you explore community at Penn?", wordLimit: 200, prompt: "How will you explore community at Penn? Consider how Penn will help shape your perspective, and how your experiences and perspective will help shape Penn." },
      { id: "why_school", label: "Why this specific Penn school/program?", wordLimit: 400, prompt: "Considering the school you are applying to, describe how you will explore your academic and intellectual interests at Penn." },
    ],
  },
  {
    id: "brown",
    name: "Brown University",
    shortName: "Brown",
    notes: "Open Curriculum freedom is the soul of Brown. Show academic curiosity and self-direction.",
    supplements: [
      { id: "why_brown", label: "Open Curriculum: what excites you about academic exploration at Brown?", wordLimit: 200, prompt: "Brown's Open Curriculum allows students to explore broadly while pursuing in-depth their academic fields of interest. Tell us about any academic interests that excite you, and how you might use the Open Curriculum to pursue them." },
      { id: "community", label: "How have you grown from a community you've been part of?", wordLimit: 200, prompt: "Students entering Brown often find that making their home on College Hill naturally invites reflection on where they came from. Share how an aspect of your growing up has inspired or challenged you." },
      { id: "joy", label: "What brings you joy?", wordLimit: 200, prompt: "Brown students care deeply about their work and the world around them. Students find contentment, satisfaction, and meaning in daily interactions and major discoveries. Whether big or small, mundane or spectacular, tell us about something that brings you joy." },
    ],
  },
  {
    id: "dartmouth",
    name: "Dartmouth College",
    shortName: "Dartmouth",
    notes: "Small, tight-knit, outdoorsy, undergraduate-focused. Wants students who love learning and contribute.",
    supplements: [
      { id: "why_dartmouth", label: "Why are you interested in Dartmouth?", wordLimit: 100, prompt: "While arguing a Dartmouth-related case before the U.S. Supreme Court in 1818, Daniel Webster, Class of 1801, declared: 'It is, Sir... a small college. And yet, there are those who love it!' As you seek admission to the Class of 2029, what aspects of the College's program, community, or campus environment attract your interest?" },
      { id: "second", label: "Pick one of Dartmouth's optional supplemental prompts", wordLimit: 250, prompt: "Choose one of Dartmouth's supplemental prompts (e.g. 'Labor leader and civil rights activist Dolores Huerta...', 'There is a Quaker saying: Let your life speak.'). Respond authentically and specifically." },
    ],
  },
  {
    id: "cornell",
    name: "Cornell University",
    shortName: "Cornell",
    notes: "Application is to a specific college within Cornell. Each college has its own essay. Be very specific to your school's offerings.",
    supplements: [
      { id: "college_specific", label: "Why this specific Cornell college / major?", wordLimit: 650, prompt: "Cornell applicants apply to a specific undergraduate college. Explain how your interests, experiences, and goals align with the college you are applying to and the major within it." },
    ],
  },
  {
    id: "duke",
    name: "Duke University",
    shortName: "Duke",
    notes: "Spirited, intellectually serious, interdisciplinary. Loves passion + impact stories.",
    supplements: [
      { id: "why_duke", label: "Why are you interested in attending Duke?", wordLimit: 250, prompt: "If you are applying to either Pratt School of Engineering or Trinity College of Arts and Sciences, please discuss why you consider Duke a good match." },
      { id: "optional", label: "Optional: an aspect of your identity or perspective that has shaped you", wordLimit: 250, prompt: "We believe a wide range of personal perspectives, beliefs, and lived experiences are essential to making Duke a vibrant and meaningful community. Share with us about an aspect of your background, identity, or perspective that you would bring to Duke." },
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
    notes: "Research-first culture, collaborative learning, top med/STEM/IR. Wants concrete examples of collaboration.",
    supplements: [
      { id: "collaboration", label: "Tell us about an aspect of your identity or experience that has shaped you and how you'll contribute to the JHU community", wordLimit: 350, prompt: "Founded in the spirit of exploration and discovery, Johns Hopkins University encourages students to share their perspectives, develop their interests, and pursue new experiences. Use this space to share something you'd like the admissions committee to know about you (your interests, your background, your identity, or your community), and how it has shaped what you want to get out of your college experience at Hopkins." },
    ],
  },
  {
    id: "cmu",
    name: "Carnegie Mellon University",
    shortName: "CMU",
    notes: "Highly pre-professional and intense in chosen field. Show why this exact school within CMU.",
    supplements: [
      { id: "why_cmu", label: "Why CMU & this specific program?", wordLimit: 300, prompt: "Most students choose their intended major or area of study based on a passion or inspiration that's developed over time. What passion or inspiration led you to choose this area of study?" },
      { id: "evolution", label: "What was your favorite high school activity, and how did it shape you?", wordLimit: 300, prompt: "Many students pursue college for a specific degree, career opportunity or personal goal. Whichever it may be, learning will be critical to achieve your ultimate goal. As you think ahead to the process of learning during your college years, how will you define a successful college experience?" },
    ],
  },
  {
    id: "caltech",
    name: "California Institute of Technology",
    shortName: "Caltech",
    notes: "Pure STEM. Wants curiosity, depth in math/science, and collaboration. Personal statement is replaced by short answers.",
    supplements: [
      { id: "stem_curiosity", label: "Describe three experiences and/or activities that have helped develop your passion for STEM", wordLimit: 200, prompt: "Describe three experiences and/or activities that have helped develop your passion for a possible STEM major." },
      { id: "stem_topic", label: "STEM topic that excites you outside the classroom", wordLimit: 200, prompt: "Tell us about a STEM topic that you have explored outside of school and what you learned from it." },
      { id: "creativity", label: "Caltech values creative thinking — share an example", wordLimit: 200, prompt: "Caltech values 'creative thinking,' 'collaboration,' and 'a passion for science.' Give us an example of when you've embodied one of these values." },
    ],
  },
  {
    id: "vanderbilt",
    name: "Vanderbilt University",
    shortName: "Vanderbilt",
    notes: "Southern hospitality + intellectual seriousness. Cares about community contribution.",
    supplements: [
      { id: "extracurricular", label: "Briefly elaborate on one of your extracurricular activities or work experiences", wordLimit: 250, prompt: "Please briefly elaborate on one of your extracurricular activities or work experiences." },
    ],
  },
  {
    id: "rice",
    name: "Rice University",
    shortName: "Rice",
    notes: "Residential college system, undergrad focused, collaborative culture. 'The Box' is a famous quirk.",
    supplements: [
      { id: "why_rice", label: "Why are you drawn to your area of study?", wordLimit: 150, prompt: "Please explain why you wish to study in the academic areas you selected." },
      { id: "rice_box", label: "The Rice Box: an image that appeals to you", wordLimit: 0, prompt: "In keeping with Rice's long-standing tradition (known as 'The Box'), please share an image of something that appeals to you. Briefly describe it." },
      { id: "community", label: "Rice's residential college system fosters community — describe a community you've contributed to", wordLimit: 500, prompt: "Rice's residential college system builds a strong, diverse, and inclusive community. Reflect on a community you've been part of and how you contributed to it." },
    ],
  },
  {
    id: "notredame",
    name: "University of Notre Dame",
    shortName: "Notre Dame",
    notes: "Catholic identity, service, community, faith optional but valued. Strong sports + business culture.",
    supplements: [
      { id: "why_nd", label: "What excites you about Notre Dame that wouldn't be replicated elsewhere?", wordLimit: 200, prompt: "What excites you about the University of Notre Dame that wouldn't be replicated elsewhere?" },
      { id: "second_short", label: "Pick one of Notre Dame's short essay prompts", wordLimit: 200, prompt: "Choose one of Notre Dame's short essay prompts and respond." },
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
  { id: "rice", name: "Rice University", shortName: "Rice", notes: "Residential college culture, collaborative, strong STEM + humanities. Fit and community matter.",
    supplements: [
      { id: "why_rice", label: "Why Rice", wordLimit: 150, prompt: "Why are you drawn to the area(s) of study you indicated? Why Rice?" },
      { id: "box", label: "The Box", wordLimit: 0, prompt: "Share an image that appeals to you and reflects something meaningful about who you are." },
    ] },
  { id: "emory", name: "Emory University", shortName: "Emory", notes: "Pre-health, business, liberal arts. Values community engagement and reflection.",
    supplements: [
      { id: "why_emory", label: "Why Emory", wordLimit: 200, prompt: "What academic areas are you interested in exploring at Emory and why?" },
      { id: "reflection", label: "Reflection prompt", wordLimit: 150, prompt: "Choose one of Emory's short reflection prompts and respond." },
    ] },
  { id: "georgetown", name: "Georgetown University", shortName: "Georgetown", notes: "Jesuit values, government/IR/policy strength. Uses its own application; values service and intellectual seriousness.",
    supplements: [
      { id: "why_gtown", label: "Why Georgetown", wordLimit: 1, prompt: "Briefly describe why you are applying to Georgetown and to your selected school (College, SFS, MSB, NHS)." },
      { id: "school_specific", label: "School-specific essay", wordLimit: 1, prompt: "Discuss your interest in the specific Georgetown school to which you are applying." },
    ] },
  { id: "cmu", name: "Carnegie Mellon University", shortName: "CMU", notes: "CS, engineering, drama, design. Direct, technical, quirky. Values specificity and craft.",
    supplements: [
      { id: "why_cmu", label: "Why CMU", wordLimit: 300, prompt: "Most students choose their college based on academic interests, but there are other factors as well. Tell us why you are interested in CMU and your specific college/program." },
      { id: "evolved", label: "How have your interests evolved", wordLimit: 300, prompt: "Many students pursue college for a specific degree, career, or other reason. Explain how your education at CMU will help you reach your goals." },
    ] },
  { id: "ucla", name: "University of California, Los Angeles", shortName: "UCLA", notes: "UC Personal Insight Questions (4 of 8, 350 words each). No supplements beyond PIQs.",
    supplements: [
      { id: "piq", label: "UC Personal Insight Questions", wordLimit: 350, prompt: "Respond to 4 of the 8 UC Personal Insight Questions, 350 words each." },
    ] },
  { id: "berkeley", name: "University of California, Berkeley", shortName: "Berkeley", notes: "UC PIQs only. Values rigor, activism, intellectual depth.",
    supplements: [
      { id: "piq", label: "UC Personal Insight Questions", wordLimit: 350, prompt: "Respond to 4 of the 8 UC Personal Insight Questions, 350 words each." },
    ] },
  { id: "umich", name: "University of Michigan", shortName: "Michigan", notes: "Large, school-spirited, strong business/engineering/LSA. Values community contribution.",
    supplements: [
      { id: "community", label: "Community essay", wordLimit: 300, prompt: "Everyone belongs to many communities. Describe one and your place within it." },
      { id: "why_umich", label: "Why Michigan / specific school", wordLimit: 550, prompt: "Describe the unique qualities that attract you to the school or college to which you are applying. How would that curriculum support your interests?" },
    ] },
  { id: "unc", name: "University of North Carolina at Chapel Hill", shortName: "UNC", notes: "Public ivy, service-oriented. Short reflective prompts.",
    supplements: [
      { id: "short1", label: "Short answer 1", wordLimit: 250, prompt: "Choose one UNC short-answer prompt and respond." },
      { id: "short2", label: "Short answer 2", wordLimit: 250, prompt: "Choose a second UNC short-answer prompt and respond." },
    ] },
  { id: "uva", name: "University of Virginia", shortName: "UVA", notes: "Honor code, Jeffersonian self-governance, strong humanities. Likes intellectual curiosity.",
    supplements: [
      { id: "school_specific", label: "School-specific prompt", wordLimit: 250, prompt: "Answer the prompt corresponding to your selected UVA school (CLAS, Engineering, Architecture, Nursing, Kinesiology)." },
      { id: "community", label: "Short prompt", wordLimit: 50, prompt: "Choose one of UVA's three short prompts (50 words each)." },
    ] },
  { id: "nyu", name: "New York University", shortName: "NYU", notes: "Urban, global campuses, strong arts/business/Stern. Values purpose-driven 'why NYU'.",
    supplements: [
      { id: "why_nyu", label: "Why NYU", wordLimit: 400, prompt: "Why have you applied or expressed interest in a particular campus, school, college, program, or area of study at NYU?" },
    ] },
  { id: "usc", name: "University of Southern California", shortName: "USC", notes: "Trojan network, film/business/engineering. Likes specificity about USC programs.",
    supplements: [
      { id: "why_major", label: "Why this major / why USC", wordLimit: 250, prompt: "Describe how you plan to pursue your academic interests and why you want to explore them at USC." },
      { id: "short_takes", label: "USC short takes", wordLimit: 25, prompt: "Respond to USC's 'short takes' (one-sentence answers)." },
    ] },
  { id: "tufts", name: "Tufts University", shortName: "Tufts", notes: "Quirky, intellectually playful, strong IR and engineering. 'Let your life speak' tone.",
    supplements: [
      { id: "why_tufts", label: "Why Tufts", wordLimit: 150, prompt: "Which aspects of the Tufts undergraduate experience prompt your application?" },
      { id: "creative", label: "Creative prompt", wordLimit: 250, prompt: "Choose one of Tufts' three creative prompts and respond." },
    ] },
  { id: "wakeforest", name: "Wake Forest University", shortName: "Wake Forest", notes: "Pro humanitate, small classes, strong writing culture.",
    supplements: [
      { id: "why_wake", label: "Why Wake Forest", wordLimit: 150, prompt: "How did you become interested in Wake Forest and why are you applying?" },
      { id: "list_of_5", label: "List of 5 books", wordLimit: 1, prompt: "List five books you have read that intrigued you." },
    ] },
  { id: "boston-college", name: "Boston College", shortName: "BC", notes: "Jesuit, formative education, service. Values reflection and purpose.",
    supplements: [
      { id: "human_centered", label: "Human-centered prompt", wordLimit: 400, prompt: "Choose one of BC's human-centered prompts and respond." },
    ] },
  { id: "boston-u", name: "Boston University", shortName: "BU", notes: "Urban, global, strong CAS/Questrom/Comm. Direct fit-based prompts.",
    supplements: [
      { id: "why_bu", label: "Why BU", wordLimit: 300, prompt: "What about being a student at Boston University most excites you?" },
    ] },
  { id: "ut-austin", name: "University of Texas at Austin", shortName: "UT Austin", notes: "ApplyTexas essays, strong CS/engineering/business. Values specificity about major.",
    supplements: [
      { id: "topic_a", label: "ApplyTexas Topic A", wordLimit: 700, prompt: "Tell us your story. What unique opportunities or challenges have you experienced that have shaped who you are today?" },
      { id: "why_major", label: "Why this major", wordLimit: 350, prompt: "Why are you interested in the major you indicated?" },
    ] },
  { id: "gatech", name: "Georgia Institute of Technology", shortName: "Georgia Tech", notes: "Engineering/CS powerhouse. 'Why Tech' should be specific and technical.",
    supplements: [
      { id: "why_gt", label: "Why Georgia Tech", wordLimit: 300, prompt: "Why do you want to study your chosen major at Georgia Tech?" },
    ] },
  { id: "uwashington", name: "University of Washington", shortName: "UW", notes: "Coalition app, strong CS, pre-health. Values community + diversity essays.",
    supplements: [
      { id: "essay", label: "UW essay", wordLimit: 650, prompt: "Tell a story from your life, describing an experience that shaped your character or shaped your aspirations." },
      { id: "short", label: "Short response", wordLimit: 300, prompt: "Our families and communities define us. Describe the world you come from and how you might add to the diversity of the UW." },
    ] },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", shortName: "UIUC", notes: "Engineering/CS strength, Grainger reputation. Major-specific prompts.",
    supplements: [
      { id: "major1", label: "First-choice major essay", wordLimit: 150, prompt: "Explain your interest in your first-choice major." },
      { id: "major2", label: "Second-choice major essay", wordLimit: 150, prompt: "Explain your interest in your second-choice major (if applicable)." },
    ] },
  { id: "purdue", name: "Purdue University", shortName: "Purdue", notes: "Engineering/agriculture/CS, Big Ten. Direct, no-frills prompts.",
    supplements: [
      { id: "why_purdue", label: "Why Purdue", wordLimit: 250, prompt: "Briefly discuss your reasons for pursuing the major you have selected and why Purdue." },
    ] },
  { id: "wisconsin", name: "University of Wisconsin–Madison", shortName: "UW–Madison", notes: "Public ivy, broad excellence. Wisconsin Idea — service to state and world.",
    supplements: [
      { id: "why_uw", label: "Why UW–Madison", wordLimit: 650, prompt: "Tell us why you decided to apply to UW–Madison and what about your selected major appeals to you." },
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
];

export const getUniversityById = (id: string): UniversityProfile | undefined =>
  UNIVERSITIES.find((u) => u.id === id);
