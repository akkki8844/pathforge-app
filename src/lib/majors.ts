// Comprehensive Majors Database - Only majors with 5+ activities supported
// Majors are sorted alphabetically and niche/low-demand majors have been removed

export interface Major {
  id: string;
  name: string;
  category: "STEM" | "Humanities" | "Social Sciences" | "Arts" | "Business" | "Health" | "Interdisciplinary";
  relatedMajors: string[];
  description: string;
}

export const majors: Major[] = [
  // All majors sorted alphabetically
  
  { id: "accounting", name: "Accounting", category: "Business", relatedMajors: ["Business/Finance", "Economics", "Business Management"], description: "Recording, analysis, and reporting of financial information for organizations." },

  { id: "ae", name: "Aerospace Engineering", category: "STEM", relatedMajors: ["Mechanical Engineering", "Physics", "Electrical Engineering", "Mathematics"], description: "Design and development of aircraft, spacecraft, and related systems." },
  
  { id: "ai", name: "Artificial Intelligence", category: "STEM", relatedMajors: ["Computer Science", "Data Science", "Mathematics", "Neuroscience"], description: "Development of intelligent systems that can learn, reason, and make decisions." },
  { id: "arch", name: "Architecture", category: "Arts", relatedMajors: ["Civil Engineering", "Fine Arts"], description: "Design of buildings and physical structures." },
  { id: "biochem", name: "Biochemistry", category: "STEM", relatedMajors: ["Biology/Pre-Med", "Chemistry", "Neuroscience"], description: "Chemical processes and substances within living organisms." },
  { id: "bme", name: "Biomedical Engineering", category: "STEM", relatedMajors: ["Biology/Pre-Med", "Electrical Engineering", "Mechanical Engineering", "Chemistry"], description: "Application of engineering principles to medicine and healthcare technology." },
  { id: "bio-premed", name: "Biology/Pre-Med", category: "STEM", relatedMajors: ["Chemistry", "Neuroscience", "Biochemistry", "Public Health"], description: "Study of living organisms with pathway to medical school." },
  { id: "business", name: "Business/Finance", category: "Business", relatedMajors: ["Economics", "Marketing", "Data Science"], description: "Management of organizations and financial resources." },
  { id: "bizmgmt", name: "Business Management", category: "Business", relatedMajors: ["Business/Finance", "Economics", "Marketing", "Management", "Entrepreneurship"], description: "Strategy, operations, and people management for modern organizations." },
  { id: "che", name: "Chemical Engineering", category: "STEM", relatedMajors: ["Chemistry", "Biology/Pre-Med", "Environmental Science"], description: "Application of chemistry and physics to large-scale chemical production and processing." },
  { id: "chemistry", name: "Chemistry", category: "STEM", relatedMajors: ["Biology/Pre-Med", "Biochemistry", "Chemical Engineering"], description: "Study of the composition, structure, and reactions of matter." },
  { id: "ce", name: "Civil Engineering", category: "STEM", relatedMajors: ["Mechanical Engineering", "Environmental Science", "Architecture"], description: "Design and construction of infrastructure including buildings, bridges, and roads." },
  
  { id: "comm", name: "Communications", category: "Social Sciences", relatedMajors: ["Journalism", "Marketing", "Political Science"], description: "Study of human communication processes and media." },
  { id: "cs", name: "Computer Science", category: "STEM", relatedMajors: ["Data Science", "Artificial Intelligence", "Electrical Engineering", "Mathematics"], description: "Study of computation, algorithms, data structures, and software development." },
  
  { id: "cybersecurity", name: "Cybersecurity", category: "STEM", relatedMajors: ["Computer Science", "Data Science", "Electrical Engineering"], description: "Protection of computer systems and networks from digital attacks and unauthorized access." },
  { id: "ds", name: "Data Science", category: "STEM", relatedMajors: ["Computer Science", "Mathematics", "Statistics", "Artificial Intelligence"], description: "Interdisciplinary field using statistical and computational methods to extract insights from data." },
  { id: "econ", name: "Economics", category: "Business", relatedMajors: ["Business/Finance", "Mathematics", "Political Science", "Public Policy"], description: "Study of production, distribution, and consumption of goods and services." },
  { id: "ee", name: "Electrical Engineering", category: "STEM", relatedMajors: ["Computer Science", "Physics", "Mechanical Engineering", "Mathematics"], description: "Design and development of electrical systems, circuits, and electronics." },
  { id: "english", name: "English/Creative Writing", category: "Humanities", relatedMajors: ["Journalism", "Communications"], description: "Study of literature and development of writing skills." },
  { id: "entrepren", name: "Entrepreneurship", category: "Business", relatedMajors: ["Business/Finance", "Computer Science", "Marketing", "Economics"], description: "Creation and management of new business ventures." },
  { id: "enveng", name: "Environmental Engineering", category: "STEM", relatedMajors: ["Civil Engineering", "Environmental Science", "Chemical Engineering", "Biology/Pre-Med"], description: "Application of engineering to environmental protection and sustainability." },
  { id: "envsci", name: "Environmental Science", category: "STEM", relatedMajors: ["Biology/Pre-Med", "Chemistry", "Public Policy"], description: "Study of environmental systems and human impact on nature." },
  { id: "film", name: "Film/Television", category: "Arts", relatedMajors: ["Communications", "English/Creative Writing"], description: "Production and study of film, television, and digital media." },
  { id: "finearts", name: "Fine Arts", category: "Arts", relatedMajors: ["Graphic Design", "Film/Television"], description: "Creation of visual art including painting, sculpture, and drawing." },
  { id: "graphicdesign", name: "Graphic Design", category: "Arts", relatedMajors: ["Fine Arts", "Marketing", "Computer Science", "Communications"], description: "Visual communication through typography, imagery, and layout." },
  { id: "history", name: "History", category: "Humanities", relatedMajors: ["Political Science", "International Relations"], description: "Study of past events and their significance." },
  { id: "industrial", name: "Industrial Engineering", category: "STEM", relatedMajors: ["Mechanical Engineering", "Business/Finance", "Data Science"], description: "Optimization of complex systems, processes, and organizations." },
  { id: "ir", name: "International Relations", category: "Social Sciences", relatedMajors: ["Political Science", "Economics", "History"], description: "Study of relations between nations and global governance." },
  { id: "journalism", name: "Journalism", category: "Social Sciences", relatedMajors: ["Communications", "English/Creative Writing", "Political Science"], description: "Gathering, reporting, and presenting news and information." },
  { id: "law", name: "Law/Pre-Law", category: "Humanities", relatedMajors: ["Political Science", "History", "Economics"], description: "Preparation for legal education and careers." },
  { id: "management", name: "Management", category: "Business", relatedMajors: ["Business/Finance", "Psychology", "Economics", "Communications"], description: "Leadership and administration of organizations." },
  { id: "marketing", name: "Marketing", category: "Business", relatedMajors: ["Business/Finance", "Psychology", "Communications", "Data Science"], description: "Promotion and sale of products and services." },
  
  { id: "math", name: "Mathematics", category: "STEM", relatedMajors: ["Physics", "Computer Science", "Economics", "Data Science"], description: "Study of numbers, structures, patterns, and abstract reasoning." },
  { id: "me", name: "Mechanical Engineering", category: "STEM", relatedMajors: ["Physics", "Electrical Engineering", "Aerospace Engineering", "Civil Engineering"], description: "Design and analysis of mechanical systems, machines, and thermal devices." },
  
  { id: "neuro", name: "Neuroscience", category: "STEM", relatedMajors: ["Biology/Pre-Med", "Psychology", "Biochemistry", "Artificial Intelligence"], description: "Study of the nervous system and brain function." },
  { id: "nursing", name: "Nursing", category: "Health", relatedMajors: ["Biology/Pre-Med", "Psychology", "Public Health"], description: "Patient care and healthcare delivery in clinical settings." },
  { id: "physics", name: "Physics", category: "STEM", relatedMajors: ["Mathematics", "Electrical Engineering", "Chemistry"], description: "Study of matter, energy, and the fundamental forces of nature." },
  { id: "polisci", name: "Political Science", category: "Social Sciences", relatedMajors: ["International Relations", "Public Policy", "Law/Pre-Law", "Economics"], description: "Study of governments, political systems, and political behavior." },
  { id: "psych", name: "Psychology", category: "Social Sciences", relatedMajors: ["Neuroscience", "Sociology", "Biology/Pre-Med", "Marketing"], description: "Study of mind and behavior." },
  { id: "pubhealth", name: "Public Health", category: "Health", relatedMajors: ["Biology/Pre-Med", "Sociology", "Economics"], description: "Prevention of disease and promotion of health at population level." },
  { id: "pubpol", name: "Public Policy", category: "Social Sciences", relatedMajors: ["Political Science", "Economics", "Sociology", "Law/Pre-Law"], description: "Analysis and development of government policies." },
  { id: "se", name: "Software Engineering", category: "STEM", relatedMajors: ["Computer Science", "Data Science", "Mathematics"], description: "Application of engineering principles to software development and maintenance." },
  { id: "soc", name: "Sociology", category: "Social Sciences", relatedMajors: ["Psychology", "Anthropology", "Political Science", "Public Policy"], description: "Study of society, social institutions, and social relationships." },
  { id: "stats", name: "Statistics", category: "STEM", relatedMajors: ["Mathematics", "Data Science", "Economics", "Psychology"], description: "Collection, analysis, and interpretation of numerical data." },
  { id: "anthro", name: "Anthropology", category: "Social Sciences", relatedMajors: ["Sociology", "History", "Linguistics"], description: "Study of human societies, cultures, and their development." },
  { id: "astro", name: "Astronomy/Astrophysics", category: "STEM", relatedMajors: ["Physics", "Mathematics", "Aerospace Engineering"], description: "Study of celestial objects, space, and the physical universe." },
  { id: "crim", name: "Criminology", category: "Social Sciences", relatedMajors: ["Sociology", "Psychology", "Political Science", "Law/Pre-Law"], description: "Scientific study of crime, criminal behavior, and justice systems." },
  { id: "dance", name: "Dance/Performing Arts", category: "Arts", relatedMajors: ["Drama", "Fine Arts", "Music"], description: "Choreography, movement performance, and dance composition." },
  { id: "drama", name: "Drama/Theater", category: "Arts", relatedMajors: ["Film/Television", "English/Creative Writing", "Communications"], description: "Acting, directing, and theatrical performance and production." },
  { id: "edu", name: "Education", category: "Social Sciences", relatedMajors: ["Psychology", "Sociology", "English/Creative Writing"], description: "Theory and practice of teaching, learning, and curriculum design." },
  { id: "gamedev", name: "Game Design/Development", category: "Arts", relatedMajors: ["Computer Science", "Graphic Design", "Fine Arts"], description: "Design, art, and engineering of interactive games and experiences." },
  { id: "geog", name: "Geography/GIS", category: "STEM", relatedMajors: ["Environmental Science", "Urban Planning", "Sociology"], description: "Study of places, spatial data, and human–environment interaction." },
  { id: "geo", name: "Geology/Earth Sciences", category: "STEM", relatedMajors: ["Environmental Science", "Chemistry", "Physics"], description: "Study of Earth's materials, processes, and history." },
  { id: "hospitality", name: "Hospitality/Tourism Management", category: "Business", relatedMajors: ["Business Management", "Marketing", "Communications"], description: "Management of hotels, travel, events, and tourism operations." },
  { id: "linguistics", name: "Linguistics", category: "Humanities", relatedMajors: ["Computer Science", "Psychology", "Anthropology"], description: "Scientific study of language structure, meaning, and use." },
  { id: "music", name: "Music/Musicology", category: "Arts", relatedMajors: ["Fine Arts", "Drama", "Mathematics"], description: "Performance, theory, composition, and history of music." },
  { id: "philos", name: "Philosophy", category: "Humanities", relatedMajors: ["Political Science", "History", "Mathematics", "Law/Pre-Law"], description: "Inquiry into knowledge, ethics, logic, and the nature of reality." },
  { id: "religion", name: "Religious Studies/Theology", category: "Humanities", relatedMajors: ["Philosophy", "History", "Anthropology"], description: "Comparative study of religions, beliefs, and spiritual traditions." },
  { id: "socialwork", name: "Social Work", category: "Social Sciences", relatedMajors: ["Psychology", "Sociology", "Public Health"], description: "Helping individuals and communities cope with social challenges." },
  { id: "sportsmgmt", name: "Sports Management", category: "Business", relatedMajors: ["Business Management", "Marketing", "Communications"], description: "Business operations of sports organizations, teams, and events." },
  { id: "supplychain", name: "Supply Chain/Logistics", category: "Business", relatedMajors: ["Business Management", "Industrial Engineering", "Data Science"], description: "Planning and operating the flow of goods, services, and information." },
  { id: "urbanplan", name: "Urban Planning", category: "Social Sciences", relatedMajors: ["Architecture", "Public Policy", "Geography/GIS", "Civil Engineering"], description: "Designing cities, infrastructure, and sustainable communities." },
  { id: "uxdesign", name: "UX/Product Design", category: "Arts", relatedMajors: ["Graphic Design", "Computer Science", "Psychology"], description: "Designing usable, useful, and delightful digital products." },
  { id: "vetsci", name: "Veterinary Science/Animal Science", category: "Health", relatedMajors: ["Biology/Pre-Med", "Biochemistry", "Public Health"], description: "Animal health, biology, and clinical veterinary practice." },
];

// Get major by name
export const getMajorByName = (name: string): Major | undefined => {
  return majors.find(m => m.name === name);
};

// Get all major names (legacy export name) - returns sorted alphabetically
export const getMajorNames = (): string[] => {
  return majors.map(m => m.name).sort((a, b) => a.localeCompare(b));
};

// Alias for backward compatibility
export const getAllMajorNames = getMajorNames;

// Get majors by category
export const getMajorsByCategory = (category: Major["category"]): Major[] => {
  return majors.filter(m => m.category === category);
};

// Search majors by name
export const searchMajors = (query: string): Major[] => {
  const lowerQuery = query.toLowerCase();
  return majors.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.description.toLowerCase().includes(lowerQuery)
  );
};