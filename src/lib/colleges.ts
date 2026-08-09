// Comprehensive Global Colleges Database

export interface College {
  id: string;
  name: string;
  country: string;
  region: string;
  level: "regional" | "national" | "global";
  strongMajors: string[];
  website: string;
}

// Helper to get colleges by country.
// Strict country-only filtering — if a user picks USA, ONLY USA universities
// are returned. We never mix in cross-country "global top" suggestions; that
// behavior produced confusing recommendations (e.g. Harvard appearing when a
// user explicitly selected "Saudi Arabia"). Sorted by level so the most
// prestigious schools in that country surface first.
export const getCollegesByCountry = (country: string): College[] => {
  if (!country) return [];
  const countryColleges = colleges.filter(c => c.country === country);
  const levelOrder = { global: 0, national: 1, regional: 2 } as const;
  return [...countryColleges].sort(
    (a, b) => levelOrder[a.level] - levelOrder[b.level]
  );
};

export const getCollegeNames = (): string[] => {
  return colleges.map(c => c.name);
};

export const getCollegeNamesByCountry = (country: string): string[] => {
  return getCollegesByCountry(country).map(c => c.name);
};

const collegesRaw: College[] = [
  // ===== UNITED STATES - GLOBAL TOP =====
  { id: "mit", name: "Massachusetts Institute of Technology", country: "United States", region: "Northeast", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics", "Mathematics", "Economics"], website: "https://www.mit.edu" },
  { id: "stanford", name: "Stanford University", country: "United States", region: "West", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Business/Finance", "Biology/Pre-Med", "Economics"], website: "https://www.stanford.edu" },
  { id: "harvard", name: "Harvard University", country: "United States", region: "Northeast", level: "global", strongMajors: ["Economics", "Biology/Pre-Med", "Law/Pre-Law", "Political Science", "Computer Science"], website: "https://www.harvard.edu" },
  { id: "princeton", name: "Princeton University", country: "United States", region: "Northeast", level: "global", strongMajors: ["Mathematics", "Physics", "Computer Science", "Economics", "Public Policy"], website: "https://www.princeton.edu" },
  { id: "yale", name: "Yale University", country: "United States", region: "Northeast", level: "global", strongMajors: ["Law/Pre-Law", "Political Science", "Economics", "English/Creative Writing", "History"], website: "https://www.yale.edu" },
  { id: "caltech", name: "California Institute of Technology", country: "United States", region: "West", level: "global", strongMajors: ["Physics", "Computer Science", "Electrical Engineering", "Chemistry", "Mathematics"], website: "https://www.caltech.edu" },
  { id: "columbia", name: "Columbia University", country: "United States", region: "Northeast", level: "global", strongMajors: ["Computer Science", "Economics", "Political Science", "Business/Finance", "Journalism"], website: "https://www.columbia.edu" },
  { id: "upenn", name: "University of Pennsylvania", country: "United States", region: "Northeast", level: "global", strongMajors: ["Business/Finance", "Biomedical Engineering", "Economics", "Nursing", "Law/Pre-Law"], website: "https://www.upenn.edu" },
  { id: "chicago", name: "University of Chicago", country: "United States", region: "Midwest", level: "global", strongMajors: ["Economics", "Mathematics", "Physics", "Political Science", "Sociology"], website: "https://www.uchicago.edu" },
  { id: "duke", name: "Duke University", country: "United States", region: "South", level: "global", strongMajors: ["Biology/Pre-Med", "Public Policy", "Economics", "Computer Science", "Biomedical Engineering"], website: "https://www.duke.edu" },
  
  // ===== UNITED STATES - NATIONAL =====
  { id: "northwestern", name: "Northwestern University", country: "United States", region: "Midwest", level: "national", strongMajors: ["Journalism", "Economics", "Biomedical Engineering", "Psychology", "Communications"], website: "https://www.northwestern.edu" },
  { id: "jhu", name: "Johns Hopkins University", country: "United States", region: "Mid-Atlantic", level: "national", strongMajors: ["Biology/Pre-Med", "Biomedical Engineering", "Public Health", "Neuroscience", "International Relations"], website: "https://www.jhu.edu" },
  { id: "cmu", name: "Carnegie Mellon University", country: "United States", region: "Mid-Atlantic", level: "national", strongMajors: ["Computer Science", "Artificial Intelligence", "Electrical Engineering", "Drama", "Business/Finance"], website: "https://www.cmu.edu" },
  { id: "brown", name: "Brown University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Computer Science", "Economics", "Biology/Pre-Med", "History", "English/Creative Writing"], website: "https://www.brown.edu" },
  { id: "cornell", name: "Cornell University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Computer Science", "Architecture", "Biomedical Engineering", "Hotel Administration", "Agriculture"], website: "https://www.cornell.edu" },
  { id: "rice", name: "Rice University", country: "United States", region: "South", level: "national", strongMajors: ["Computer Science", "Biomedical Engineering", "Mechanical Engineering", "Physics", "Architecture"], website: "https://www.rice.edu" },
  { id: "vanderbilt", name: "Vanderbilt University", country: "United States", region: "South", level: "national", strongMajors: ["Education", "Biology/Pre-Med", "Economics", "Neuroscience", "Political Science"], website: "https://www.vanderbilt.edu" },
  { id: "notredame", name: "University of Notre Dame", country: "United States", region: "Midwest", level: "national", strongMajors: ["Business/Finance", "Political Science", "Engineering", "Philosophy", "Theology"], website: "https://www.nd.edu" },
  { id: "washu", name: "Washington University in St. Louis", country: "United States", region: "Midwest", level: "national", strongMajors: ["Biology/Pre-Med", "Business/Finance", "Biomedical Engineering", "Political Science", "Psychology"], website: "https://www.wustl.edu" },
  { id: "emory", name: "Emory University", country: "United States", region: "South", level: "national", strongMajors: ["Biology/Pre-Med", "Business/Finance", "Public Health", "Economics", "Nursing"], website: "https://www.emory.edu" },
  { id: "georgetown", name: "Georgetown University", country: "United States", region: "Mid-Atlantic", level: "national", strongMajors: ["International Relations", "Political Science", "Law/Pre-Law", "Business/Finance", "Foreign Service"], website: "https://www.georgetown.edu" },
  { id: "ucberkeley", name: "UC Berkeley", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Electrical Engineering", "Business/Finance", "Economics", "Molecular Biology"], website: "https://www.berkeley.edu" },
  { id: "ucla", name: "UCLA", country: "United States", region: "West", level: "national", strongMajors: ["Film/Television", "Computer Science", "Biology/Pre-Med", "Psychology", "Economics"], website: "https://www.ucla.edu" },
  { id: "umich", name: "University of Michigan", country: "United States", region: "Midwest", level: "national", strongMajors: ["Computer Science", "Business/Finance", "Mechanical Engineering", "Economics", "Psychology"], website: "https://www.umich.edu" },
  { id: "gatech", name: "Georgia Institute of Technology", country: "United States", region: "South", level: "national", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Aerospace Engineering", "Industrial Engineering"], website: "https://www.gatech.edu" },
  { id: "usc", name: "University of Southern California", country: "United States", region: "West", level: "national", strongMajors: ["Film/Television", "Business/Finance", "Computer Science", "Communications", "Engineering"], website: "https://www.usc.edu" },
  { id: "nyu", name: "New York University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Business/Finance", "Film/Television", "Drama", "Economics", "Computer Science"], website: "https://www.nyu.edu" },
  { id: "tufts", name: "Tufts University", country: "United States", region: "Northeast", level: "national", strongMajors: ["International Relations", "Biology/Pre-Med", "Computer Science", "Economics", "Political Science"], website: "https://www.tufts.edu" },
  { id: "uva", name: "University of Virginia", country: "United States", region: "South", level: "national", strongMajors: ["Business/Finance", "Economics", "Political Science", "English/Creative Writing", "History"], website: "https://www.virginia.edu" },
  
  // ===== UNITED STATES - REGIONAL =====
  { id: "ut-austin", name: "University of Texas at Austin", country: "United States", region: "South", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Communications", "Liberal Arts"], website: "https://www.utexas.edu" },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Business/Finance", "Agriculture"], website: "https://www.illinois.edu" },
  { id: "uw", name: "University of Washington", country: "United States", region: "West", level: "regional", strongMajors: ["Computer Science", "Biomedical Engineering", "Medicine", "Business/Finance", "Oceanography"], website: "https://www.washington.edu" },
  { id: "unc", name: "University of North Carolina at Chapel Hill", country: "United States", region: "South", level: "regional", strongMajors: ["Journalism", "Business/Finance", "Biology/Pre-Med", "Public Policy", "Political Science"], website: "https://www.unc.edu" },
  { id: "wisconsin", name: "University of Wisconsin-Madison", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Dairy Science", "Political Science"], website: "https://www.wisc.edu" },
  { id: "purdue", name: "Purdue University", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Aerospace Engineering", "Computer Science", "Mechanical Engineering", "Agriculture", "Pharmacy"], website: "https://www.purdue.edu" },
  { id: "osu", name: "Ohio State University", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Psychology", "Political Science", "Communications"], website: "https://www.osu.edu" },
  { id: "psu", name: "Penn State University", country: "United States", region: "Mid-Atlantic", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Agriculture", "Meteorology", "Communications"], website: "https://www.psu.edu" },
  { id: "umass", name: "University of Massachusetts Amherst", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Hospitality", "Public Health"], website: "https://www.umass.edu" },
  { id: "umd", name: "University of Maryland", country: "United States", region: "Mid-Atlantic", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Journalism", "Public Policy"], website: "https://www.umd.edu" },
  { id: "bu", name: "Boston University", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Communications", "Business/Finance", "Engineering", "Biology/Pre-Med", "International Relations"], website: "https://www.bu.edu" },
  { id: "bc", name: "Boston College", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Business/Finance", "Economics", "Political Science", "Nursing", "Education"], website: "https://www.bc.edu" },
  { id: "ufl", name: "University of Florida", country: "United States", region: "South", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Agriculture", "Journalism", "Biology/Pre-Med"], website: "https://www.ufl.edu" },
  { id: "asu", name: "Arizona State University", country: "United States", region: "West", level: "regional", strongMajors: ["Journalism", "Business/Finance", "Engineering", "Sustainability", "Design"], website: "https://www.asu.edu" },
  
  // ===== UNITED KINGDOM - GLOBAL TOP =====
  { id: "oxford", name: "University of Oxford", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Law/Pre-Law", "Philosophy", "Mathematics", "Physics", "Economics"], website: "https://www.ox.ac.uk" },
  { id: "cambridge", name: "University of Cambridge", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Mathematics", "Physics", "Computer Science", "Engineering", "Natural Sciences"], website: "https://www.cam.ac.uk" },
  { id: "imperial", name: "Imperial College London", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Computer Science", "Engineering", "Medicine", "Physics", "Chemistry"], website: "https://www.imperial.ac.uk" },
  { id: "ucl", name: "University College London", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Architecture", "Law/Pre-Law", "Economics", "Neuroscience", "Computer Science"], website: "https://www.ucl.ac.uk" },
  { id: "lse", name: "London School of Economics", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Economics", "Political Science", "International Relations", "Business/Finance", "Law/Pre-Law"], website: "https://www.lse.ac.uk" },
  
  // ===== UNITED KINGDOM - NATIONAL =====
  { id: "edinburgh", name: "University of Edinburgh", country: "United Kingdom", region: "Scotland", level: "national", strongMajors: ["Computer Science", "Medicine", "Philosophy", "Linguistics", "Artificial Intelligence"], website: "https://www.ed.ac.uk" },
  { id: "kcl", name: "King's College London", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Law/Pre-Law", "Medicine", "Psychology", "War Studies", "Philosophy"], website: "https://www.kcl.ac.uk" },
  { id: "manchester", name: "University of Manchester", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Computer Science", "Physics", "Business/Finance", "Chemistry", "Engineering"], website: "https://www.manchester.ac.uk" },
  { id: "warwick", name: "University of Warwick", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Mathematics", "Economics", "Business/Finance", "Computer Science", "Engineering"], website: "https://www.warwick.ac.uk" },
  { id: "bristol", name: "University of Bristol", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Engineering", "Law/Pre-Law", "Economics", "Computer Science", "Veterinary Science"], website: "https://www.bristol.ac.uk" },
  { id: "glasgow", name: "University of Glasgow", country: "United Kingdom", region: "Scotland", level: "regional", strongMajors: ["Medicine", "Law/Pre-Law", "Engineering", "Arts", "Veterinary Medicine"], website: "https://www.gla.ac.uk" },
  { id: "birmingham", name: "University of Birmingham", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Computer Science", "Medicine", "Sports Science"], website: "https://www.birmingham.ac.uk" },
  { id: "leeds", name: "University of Leeds", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Communications", "Food Science"], website: "https://www.leeds.ac.uk" },
  
  // ===== CANADA =====
  { id: "toronto", name: "University of Toronto", country: "Canada", region: "Ontario", level: "global", strongMajors: ["Computer Science", "Engineering", "Medicine", "Business/Finance", "Artificial Intelligence"], website: "https://www.utoronto.ca" },
  { id: "ubc", name: "University of British Columbia", country: "Canada", region: "British Columbia", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Environmental Science", "Forestry"], website: "https://www.ubc.ca" },
  { id: "mcgill", name: "McGill University", country: "Canada", region: "Quebec", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Psychology", "Economics", "Neuroscience"], website: "https://www.mcgill.ca" },
  { id: "waterloo", name: "University of Waterloo", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Computer Science", "Engineering", "Mathematics", "Actuarial Science", "Data Science"], website: "https://www.uwaterloo.ca" },
  { id: "alberta", name: "University of Alberta", country: "Canada", region: "Alberta", level: "regional", strongMajors: ["Artificial Intelligence", "Engineering", "Medicine", "Agriculture", "Business/Finance"], website: "https://www.ualberta.ca" },
  { id: "mcmaster", name: "McMaster University", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Health Sciences", "Nuclear Engineering"], website: "https://www.mcmaster.ca" },
  { id: "queens", name: "Queen's University", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Law/Pre-Law", "Medicine", "Arts"], website: "https://www.queensu.ca" },
  { id: "western", name: "Western University", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Business/Finance", "Medicine", "Law/Pre-Law", "Engineering", "Dentistry"], website: "https://www.uwo.ca" },
  
  // ===== AUSTRALIA =====
  { id: "melbourne", name: "University of Melbourne", country: "Australia", region: "Victoria", level: "global", strongMajors: ["Law/Pre-Law", "Medicine", "Engineering", "Business/Finance", "Arts"], website: "https://www.unimelb.edu.au" },
  { id: "sydney", name: "University of Sydney", country: "Australia", region: "New South Wales", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Architecture", "Veterinary Science"], website: "https://www.sydney.edu.au" },
  { id: "anu", name: "Australian National University", country: "Australia", region: "ACT", level: "national", strongMajors: ["Political Science", "Law/Pre-Law", "Economics", "Physics", "Astronomy"], website: "https://www.anu.edu.au" },
  { id: "unsw", name: "University of New South Wales", country: "Australia", region: "New South Wales", level: "national", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Medicine", "Law/Pre-Law"], website: "https://www.unsw.edu.au" },
  { id: "uq", name: "University of Queensland", country: "Australia", region: "Queensland", level: "regional", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Agriculture", "Marine Science"], website: "https://www.uq.edu.au" },
  { id: "monash", name: "Monash University", country: "Australia", region: "Victoria", level: "regional", strongMajors: ["Pharmacy", "Engineering", "Medicine", "Business/Finance", "Arts"], website: "https://www.monash.edu" },
  
  // ===== SINGAPORE =====
  { id: "nus", name: "National University of Singapore", country: "Singapore", region: "Singapore", level: "global", strongMajors: ["Computer Science", "Business/Finance", "Law/Pre-Law", "Medicine", "Engineering"], website: "https://www.nus.edu.sg" },
  { id: "ntu-sg", name: "Nanyang Technological University", country: "Singapore", region: "Singapore", level: "global", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Communications", "Materials Science"], website: "https://www.ntu.edu.sg" },
  { id: "smu", name: "Singapore Management University", country: "Singapore", region: "Singapore", level: "national", strongMajors: ["Business/Finance", "Economics", "Law/Pre-Law", "Computer Science", "Accounting"], website: "https://www.smu.edu.sg" },
  
  // ===== HONG KONG =====
  { id: "hku", name: "University of Hong Kong", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Architecture", "Dentistry"], website: "https://www.hku.hk" },
  { id: "hkust", name: "Hong Kong University of Science and Technology", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Chemistry", "Mathematics"], website: "https://www.hkust.edu.hk" },
  { id: "cuhk", name: "Chinese University of Hong Kong", country: "Hong Kong", region: "Hong Kong", level: "national", strongMajors: ["Business/Finance", "Medicine", "Engineering", "Social Sciences", "Arts"], website: "https://www.cuhk.edu.hk" },
  
  // ===== CHINA =====
  { id: "tsinghua", name: "Tsinghua University", country: "China", region: "Beijing", level: "global", strongMajors: ["Computer Science", "Engineering", "Architecture", "Economics", "Physics"], website: "https://www.tsinghua.edu.cn" },
  { id: "peking", name: "Peking University", country: "China", region: "Beijing", level: "global", strongMajors: ["Law/Pre-Law", "Economics", "Political Science", "Physics", "Chemistry"], website: "https://www.pku.edu.cn" },
  { id: "fudan", name: "Fudan University", country: "China", region: "Shanghai", level: "national", strongMajors: ["Economics", "Medicine", "Business/Finance", "International Relations", "Journalism"], website: "https://www.fudan.edu.cn" },
  { id: "sjtu", name: "Shanghai Jiao Tong University", country: "China", region: "Shanghai", level: "national", strongMajors: ["Engineering", "Computer Science", "Medicine", "Business/Finance", "Naval Architecture"], website: "https://www.sjtu.edu.cn" },
  { id: "zhejiang", name: "Zhejiang University", country: "China", region: "Zhejiang", level: "national", strongMajors: ["Computer Science", "Engineering", "Agriculture", "Medicine", "Business/Finance"], website: "https://www.zju.edu.cn" },
  { id: "nanjing", name: "Nanjing University", country: "China", region: "Jiangsu", level: "regional", strongMajors: ["Physics", "Chemistry", "Environmental Science", "Computer Science", "History"], website: "https://www.nju.edu.cn" },
  
  // ===== JAPAN =====
  { id: "tokyo", name: "University of Tokyo", country: "Japan", region: "Tokyo", level: "global", strongMajors: ["Engineering", "Physics", "Medicine", "Law/Pre-Law", "Economics"], website: "https://www.u-tokyo.ac.jp" },
  { id: "kyoto", name: "Kyoto University", country: "Japan", region: "Kyoto", level: "national", strongMajors: ["Physics", "Chemistry", "Medicine", "Philosophy", "Economics"], website: "https://www.kyoto-u.ac.jp" },
  { id: "osaka", name: "Osaka University", country: "Japan", region: "Osaka", level: "national", strongMajors: ["Engineering", "Medicine", "Science", "Foreign Studies", "Economics"], website: "https://www.osaka-u.ac.jp" },
  { id: "tohoku", name: "Tohoku University", country: "Japan", region: "Miyagi", level: "regional", strongMajors: ["Engineering", "Physics", "Chemistry", "Medicine", "Agriculture"], website: "https://www.tohoku.ac.jp" },
  { id: "waseda", name: "Waseda University", country: "Japan", region: "Tokyo", level: "regional", strongMajors: ["Political Science", "Literature", "Business/Finance", "Engineering", "Sports Sciences"], website: "https://www.waseda.jp" },
  { id: "keio", name: "Keio University", country: "Japan", region: "Tokyo", level: "regional", strongMajors: ["Business/Finance", "Economics", "Medicine", "Law/Pre-Law", "Science"], website: "https://www.keio.ac.jp" },
  
  // ===== SOUTH KOREA =====
  { id: "seoul-nat", name: "Seoul National University", country: "South Korea", region: "Seoul", level: "global", strongMajors: ["Engineering", "Computer Science", "Medicine", "Business/Finance", "Law/Pre-Law"], website: "https://www.snu.ac.kr" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Daejeon", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics", "Artificial Intelligence"], website: "https://www.kaist.ac.kr" },
  { id: "postech", name: "POSTECH", country: "South Korea", region: "Pohang", level: "national", strongMajors: ["Physics", "Chemistry", "Materials Science", "Computer Science", "Mechanical Engineering"], website: "https://www.postech.ac.kr" },
  { id: "yonsei", name: "Yonsei University", country: "South Korea", region: "Seoul", level: "national", strongMajors: ["Medicine", "Business/Finance", "International Relations", "Engineering", "Dentistry"], website: "https://www.yonsei.ac.kr" },
  { id: "korea-univ", name: "Korea University", country: "South Korea", region: "Seoul", level: "regional", strongMajors: ["Business/Finance", "Law/Pre-Law", "Political Science", "Computer Science", "Media Studies"], website: "https://www.korea.ac.kr" },
  
  // ===== GERMANY =====
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "Bavaria", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Chemistry", "Architecture"], website: "https://www.tum.de" },
  { id: "lmu", name: "Ludwig Maximilian University of Munich", country: "Germany", region: "Bavaria", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Physics", "Economics", "Philosophy"], website: "https://www.lmu.de" },
  { id: "heidelberg", name: "Heidelberg University", country: "Germany", region: "Baden-Württemberg", level: "national", strongMajors: ["Medicine", "Physics", "Law/Pre-Law", "Philosophy", "Biology/Pre-Med"], website: "https://www.uni-heidelberg.de" },
  { id: "rwth-aachen", name: "RWTH Aachen University", country: "Germany", region: "North Rhine-Westphalia", level: "national", strongMajors: ["Mechanical Engineering", "Electrical Engineering", "Computer Science", "Civil Engineering", "Physics"], website: "https://www.rwth-aachen.de" },
  { id: "hu-berlin", name: "Humboldt University of Berlin", country: "Germany", region: "Berlin", level: "regional", strongMajors: ["Physics", "Philosophy", "Economics", "Political Science", "History"], website: "https://www.hu-berlin.de" },
  { id: "tu-berlin", name: "Technical University of Berlin", country: "Germany", region: "Berlin", level: "regional", strongMajors: ["Engineering", "Computer Science", "Architecture", "Economics", "Urban Planning"], website: "https://www.tu.berlin" },
  
  // ===== SWITZERLAND =====
  { id: "eth", name: "ETH Zurich", country: "Switzerland", region: "Zurich", level: "global", strongMajors: ["Computer Science", "Engineering", "Physics", "Architecture", "Mathematics"], website: "https://www.ethz.ch" },
  { id: "epfl", name: "EPFL", country: "Switzerland", region: "Vaud", level: "global", strongMajors: ["Computer Science", "Engineering", "Physics", "Life Sciences", "Architecture"], website: "https://www.epfl.ch" },
  { id: "zurich", name: "University of Zurich", country: "Switzerland", region: "Zurich", level: "national", strongMajors: ["Economics", "Law/Pre-Law", "Medicine", "Political Science", "Psychology"], website: "https://www.uzh.ch" },
  
  // ===== NETHERLANDS =====
  { id: "delft", name: "Delft University of Technology", country: "Netherlands", region: "South Holland", level: "national", strongMajors: ["Engineering", "Architecture", "Aerospace Engineering", "Computer Science", "Industrial Design"], website: "https://www.tudelft.nl" },
  { id: "amsterdam", name: "University of Amsterdam", country: "Netherlands", region: "North Holland", level: "national", strongMajors: ["Economics", "Psychology", "Communications", "Political Science", "Philosophy"], website: "https://www.uva.nl" },
  { id: "eindhoven", name: "Eindhoven University of Technology", country: "Netherlands", region: "North Brabant", level: "regional", strongMajors: ["Electrical Engineering", "Computer Science", "Industrial Design", "Physics", "Biomedical Engineering"], website: "https://www.tue.nl" },
  
  // ===== FRANCE =====
  { id: "psl", name: "Paris Sciences et Lettres University", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Mathematics", "Physics", "Economics", "Arts", "Social Sciences"], website: "https://www.psl.eu" },
  { id: "polytechnique", name: "École Polytechnique", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Engineering", "Mathematics", "Physics", "Computer Science", "Economics"], website: "https://www.polytechnique.edu" },
  { id: "hec", name: "HEC Paris", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Business/Finance", "Economics", "Management", "Marketing", "Entrepreneurship"], website: "https://www.hec.edu" },
  { id: "sorbonne", name: "Sorbonne University", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Medicine", "Physics", "Mathematics", "Literature", "History"], website: "https://www.sorbonne-universite.fr" },
  { id: "sciences-po", name: "Sciences Po", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Political Science", "International Relations", "Economics", "Law/Pre-Law", "Public Policy"], website: "https://www.sciencespo.fr" },
  
  // ===== INDIA - GLOBAL TOP =====
  { id: "iit-bombay", name: "IIT Bombay", country: "India", region: "Maharashtra", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Chemical Engineering", "Physics"], website: "https://www.iitb.ac.in" },
  { id: "iit-delhi", name: "IIT Delhi", country: "India", region: "Delhi", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Civil Engineering", "Biotechnology", "Mathematics"], website: "https://www.iitd.ac.in" },
  
  // ===== INDIA - NATIONAL =====
  { id: "iit-madras", name: "IIT Madras", country: "India", region: "Tamil Nadu", level: "national", strongMajors: ["Computer Science", "Mechanical Engineering", "Electrical Engineering", "Aerospace Engineering", "Data Science"], website: "https://www.iitm.ac.in" },
  { id: "iit-kanpur", name: "IIT Kanpur", country: "India", region: "Uttar Pradesh", level: "national", strongMajors: ["Computer Science", "Mechanical Engineering", "Electrical Engineering", "Aerospace Engineering", "Physics"], website: "https://www.iitk.ac.in" },
  { id: "iit-kharagpur", name: "IIT Kharagpur", country: "India", region: "West Bengal", level: "national", strongMajors: ["Engineering", "Computer Science", "Architecture", "Agriculture", "Business/Finance"], website: "https://www.iitkgp.ac.in" },
  { id: "iit-roorkee", name: "IIT Roorkee", country: "India", region: "Uttarakhand", level: "national", strongMajors: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Computer Science", "Architecture"], website: "https://www.iitr.ac.in" },
  { id: "iit-guwahati", name: "IIT Guwahati", country: "India", region: "Assam", level: "national", strongMajors: ["Computer Science", "Biotechnology", "Design", "Electronics", "Chemical Engineering"], website: "https://www.iitg.ac.in" },
  { id: "iisc", name: "Indian Institute of Science", country: "India", region: "Karnataka", level: "national", strongMajors: ["Physics", "Chemistry", "Engineering", "Computer Science", "Biotechnology"], website: "https://www.iisc.ac.in" },
  { id: "iim-ahmedabad", name: "IIM Ahmedabad", country: "India", region: "Gujarat", level: "national", strongMajors: ["Business/Finance", "Economics", "Management", "Marketing", "Analytics"], website: "https://www.iima.ac.in" },
  { id: "iim-bangalore", name: "IIM Bangalore", country: "India", region: "Karnataka", level: "national", strongMajors: ["Business/Finance", "Marketing", "Strategy", "Analytics", "Entrepreneurship"], website: "https://www.iimb.ac.in" },
  { id: "iim-calcutta", name: "IIM Calcutta", country: "India", region: "West Bengal", level: "national", strongMajors: ["Business/Finance", "Economics", "Operations", "Analytics", "Marketing"], website: "https://www.iimcal.ac.in" },
  { id: "aiims-delhi", name: "AIIMS Delhi", country: "India", region: "Delhi", level: "national", strongMajors: ["Medicine", "Biology/Pre-Med", "Nursing", "Public Health", "Biotechnology"], website: "https://www.aiims.edu" },
  { id: "nls-bangalore", name: "National Law School of India University", country: "India", region: "Karnataka", level: "national", strongMajors: ["Law/Pre-Law", "Political Science", "Public Policy", "International Relations"], website: "https://www.nls.ac.in" },
  { id: "isb", name: "Indian School of Business", country: "India", region: "Telangana", level: "national", strongMajors: ["Business/Finance", "Marketing", "Analytics", "Entrepreneurship", "Strategy"], website: "https://www.isb.edu" },
  
  // ===== INDIA - REGIONAL =====
  { id: "bits-pilani", name: "BITS Pilani", country: "India", region: "Rajasthan", level: "regional", strongMajors: ["Computer Science", "Electronics", "Mechanical Engineering", "Pharmacy", "Economics"], website: "https://www.bits-pilani.ac.in" },
  { id: "delhi-univ", name: "University of Delhi", country: "India", region: "Delhi", level: "regional", strongMajors: ["Economics", "Political Science", "History", "Commerce", "English/Creative Writing"], website: "https://www.du.ac.in" },
  { id: "jnu", name: "Jawaharlal Nehru University", country: "India", region: "Delhi", level: "regional", strongMajors: ["Political Science", "International Relations", "History", "Economics", "Languages"], website: "https://www.jnu.ac.in" },
  { id: "anna-univ", name: "Anna University", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Engineering", "Computer Science", "Architecture", "Information Technology", "Biotechnology"], website: "https://www.annauniv.edu" },
  { id: "jadavpur", name: "Jadavpur University", country: "India", region: "West Bengal", level: "regional", strongMajors: ["Engineering", "Computer Science", "Arts", "Science", "Pharmacy"], website: "https://www.jaduniv.edu.in" },
  { id: "iit-hyderabad", name: "IIT Hyderabad", country: "India", region: "Telangana", level: "regional", strongMajors: ["Computer Science", "Electrical Engineering", "Artificial Intelligence", "Biotechnology", "Design"], website: "https://www.iith.ac.in" },
  { id: "iit-bhu", name: "IIT BHU Varanasi", country: "India", region: "Uttar Pradesh", level: "regional", strongMajors: ["Mining Engineering", "Metallurgy", "Ceramic Engineering", "Computer Science", "Electrical Engineering"], website: "https://www.iitbhu.ac.in" },
  { id: "iiit-hyderabad", name: "IIIT Hyderabad", country: "India", region: "Telangana", level: "regional", strongMajors: ["Computer Science", "Artificial Intelligence", "Data Science", "Electronics", "Computational Linguistics"], website: "https://www.iiit.ac.in" },
  { id: "nit-trichy", name: "NIT Tiruchirappalli", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics"], website: "https://www.nitt.edu" },
  { id: "nit-warangal", name: "NIT Warangal", country: "India", region: "Telangana", level: "regional", strongMajors: ["Computer Science", "Electronics", "Mechanical Engineering", "Chemical Engineering", "Civil Engineering"], website: "https://www.nitw.ac.in" },
  { id: "vit", name: "VIT Vellore", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Computer Science", "Electronics", "Mechanical Engineering", "Biotechnology", "Law/Pre-Law"], website: "https://www.vit.ac.in" },
  { id: "srm", name: "SRM Institute of Science and Technology", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Engineering", "Computer Science", "Medicine", "Business/Finance", "Architecture"], website: "https://www.srmist.edu.in" },
  { id: "manipal", name: "Manipal Academy of Higher Education", country: "India", region: "Karnataka", level: "regional", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Media Studies", "Health Sciences"], website: "https://manipal.edu" },
  { id: "symbiosis", name: "Symbiosis International University", country: "India", region: "Maharashtra", level: "regional", strongMajors: ["Law/Pre-Law", "Business/Finance", "International Relations", "Media Studies", "Design"], website: "https://www.siu.edu.in" },
  { id: "christ-univ", name: "Christ University", country: "India", region: "Karnataka", level: "regional", strongMajors: ["Business/Finance", "Psychology", "Economics", "Journalism", "Performing Arts"], website: "https://www.christuniversity.in" },
  { id: "ashoka", name: "Ashoka University", country: "India", region: "Haryana", level: "regional", strongMajors: ["Economics", "Political Science", "Philosophy", "English/Creative Writing", "Computer Science"], website: "https://www.ashoka.edu.in" },
  { id: "flame", name: "FLAME University", country: "India", region: "Maharashtra", level: "regional", strongMajors: ["Liberal Arts", "Business/Finance", "Communications", "Psychology", "Economics"], website: "https://www.flame.edu.in" },
  { id: "op-jindal", name: "O.P. Jindal Global University", country: "India", region: "Haryana", level: "regional", strongMajors: ["Law/Pre-Law", "Business/Finance", "International Relations", "Public Policy", "Journalism"], website: "https://www.jgu.edu.in" },
  
  // ===== ISRAEL =====
  { id: "technion", name: "Technion - Israel Institute of Technology", country: "Israel", region: "Haifa", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Chemistry", "Physics"], website: "https://www.technion.ac.il" },
  { id: "hebrew", name: "Hebrew University of Jerusalem", country: "Israel", region: "Jerusalem", level: "national", strongMajors: ["Computer Science", "Law/Pre-Law", "Economics", "Political Science", "Biology/Pre-Med"], website: "https://www.huji.ac.il" },
  { id: "tel-aviv", name: "Tel Aviv University", country: "Israel", region: "Tel Aviv", level: "national", strongMajors: ["Computer Science", "Business/Finance", "Law/Pre-Law", "Medicine", "Engineering"], website: "https://www.tau.ac.il" },
  
  // ===== UAE =====
  { id: "nyu-ad", name: "NYU Abu Dhabi", country: "United Arab Emirates", region: "Abu Dhabi", level: "national", strongMajors: ["Liberal Arts", "Engineering", "Computer Science", "Economics", "Political Science"], website: "https://www.nyuad.nyu.edu" },
  { id: "khalifa", name: "Khalifa University", country: "United Arab Emirates", region: "Abu Dhabi", level: "regional", strongMajors: ["Engineering", "Computer Science", "Medicine", "Nuclear Engineering", "Robotics"], website: "https://www.ku.ac.ae" },
  
  // ===== BRAZIL =====
  { id: "usp", name: "University of São Paulo", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Business/Finance", "Architecture"], website: "https://www.usp.br" },
  { id: "unicamp", name: "University of Campinas", country: "Brazil", region: "São Paulo", level: "regional", strongMajors: ["Computer Science", "Engineering", "Medicine", "Physics", "Chemistry"], website: "https://www.unicamp.br" },
  
  // ===== MEXICO =====
  { id: "unam", name: "National Autonomous University of Mexico", country: "Mexico", region: "Mexico City", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Engineering", "Architecture", "Economics"], website: "https://www.unam.mx" },
  { id: "tec-monterrey", name: "Tecnológico de Monterrey", country: "Mexico", region: "Nuevo León", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Biotechnology", "Architecture"], website: "https://www.tec.mx" },
  
  // ===== SOUTH AFRICA =====
  { id: "uct", name: "University of Cape Town", country: "South Africa", region: "Western Cape", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Engineering", "Business/Finance", "Humanities"], website: "https://www.uct.ac.za" },
  { id: "wits", name: "University of the Witwatersrand", country: "South Africa", region: "Gauteng", level: "regional", strongMajors: ["Mining Engineering", "Medicine", "Law/Pre-Law", "Business/Finance", "Science"], website: "https://www.wits.ac.za" },
  
  // ===== NEW ZEALAND =====
  { id: "auckland", name: "University of Auckland", country: "New Zealand", region: "Auckland", level: "national", strongMajors: ["Engineering", "Computer Science", "Medicine", "Business/Finance", "Law/Pre-Law"], website: "https://www.auckland.ac.nz" },
  { id: "otago", name: "University of Otago", country: "New Zealand", region: "Otago", level: "regional", strongMajors: ["Medicine", "Dentistry", "Health Sciences", "Science", "Business/Finance"], website: "https://www.otago.ac.nz" },

  // ===== EXPANDED COVERAGE — additional universities students actually consider =====
  // United States — additional national & regional research universities
  { id: "ucsd", name: "University of California, San Diego", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Biology/Pre-Med", "Engineering", "Cognitive Science", "Oceanography"], website: "https://www.ucsd.edu" },
  { id: "ucsb", name: "University of California, Santa Barbara", country: "United States", region: "West", level: "national", strongMajors: ["Physics", "Computer Science", "Environmental Science", "Engineering", "Economics"], website: "https://www.ucsb.edu" },
  { id: "ucdavis", name: "University of California, Davis", country: "United States", region: "West", level: "national", strongMajors: ["Agriculture", "Veterinary Medicine", "Biology/Pre-Med", "Engineering", "Environmental Science"], website: "https://www.ucdavis.edu" },
  { id: "uci", name: "University of California, Irvine", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Biology/Pre-Med", "Engineering", "Business/Finance", "Public Health"], website: "https://www.uci.edu" },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", country: "United States", region: "Midwest", level: "national", strongMajors: ["Computer Science", "Engineering", "Accounting", "Agriculture", "Physics"], website: "https://illinois.edu" },
  { id: "purdue", name: "Purdue University", country: "United States", region: "Midwest", level: "national", strongMajors: ["Engineering", "Computer Science", "Aerospace Engineering", "Agriculture", "Pharmacy"], website: "https://www.purdue.edu" },
  { id: "wisconsin", name: "University of Wisconsin-Madison", country: "United States", region: "Midwest", level: "national", strongMajors: ["Engineering", "Biology/Pre-Med", "Business/Finance", "Computer Science", "Education"], website: "https://www.wisc.edu" },
  { id: "uwashington", name: "University of Washington", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Medicine", "Biomedical Engineering", "Oceanography", "Public Health"], website: "https://www.washington.edu" },
  { id: "uflorida", name: "University of Florida", country: "United States", region: "South", level: "national", strongMajors: ["Engineering", "Business/Finance", "Biology/Pre-Med", "Agriculture", "Journalism"], website: "https://www.ufl.edu" },
  { id: "utaustin", name: "University of Texas at Austin", country: "United States", region: "South", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Petroleum Engineering", "Communications"], website: "https://www.utexas.edu" },
  { id: "tamu", name: "Texas A&M University", country: "United States", region: "South", level: "regional", strongMajors: ["Engineering", "Agriculture", "Veterinary Medicine", "Business/Finance", "Geosciences"], website: "https://www.tamu.edu" },
  { id: "boston-college", name: "Boston College", country: "United States", region: "Northeast", level: "national", strongMajors: ["Business/Finance", "Theology", "Economics", "Communications", "Nursing"], website: "https://www.bc.edu" },
  { id: "boston-u", name: "Boston University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Communications", "Business/Finance", "Biomedical Engineering", "International Relations", "Public Health"], website: "https://www.bu.edu" },
  { id: "northeastern", name: "Northeastern University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Health Sciences", "Cooperative Education"], website: "https://www.northeastern.edu" },
  { id: "tufts", name: "Tufts University", country: "United States", region: "Northeast", level: "national", strongMajors: ["International Relations", "Biology/Pre-Med", "Engineering", "Veterinary Medicine", "Drama"], website: "https://www.tufts.edu" },
  { id: "nyu", name: "New York University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Business/Finance", "Film", "Drama", "Computer Science", "Public Policy"], website: "https://www.nyu.edu" },
  { id: "usc", name: "University of Southern California", country: "United States", region: "West", level: "national", strongMajors: ["Film", "Business/Finance", "Engineering", "Communications", "International Relations"], website: "https://www.usc.edu" },
  { id: "georgia-tech", name: "Georgia Institute of Technology", country: "United States", region: "South", level: "national", strongMajors: ["Engineering", "Computer Science", "Industrial Engineering", "Aerospace Engineering", "Architecture"], website: "https://www.gatech.edu" },
  { id: "vt", name: "Virginia Tech", country: "United States", region: "South", level: "regional", strongMajors: ["Engineering", "Architecture", "Agriculture", "Computer Science", "Business/Finance"], website: "https://www.vt.edu" },
  { id: "uva", name: "University of Virginia", country: "United States", region: "South", level: "national", strongMajors: ["Business/Finance", "Law/Pre-Law", "Public Policy", "Engineering", "English/Creative Writing"], website: "https://www.virginia.edu" },
  { id: "umich", name: "University of Michigan", country: "United States", region: "Midwest", level: "national", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Public Health", "Music"], website: "https://umich.edu" },
  { id: "osu", name: "Ohio State University", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Agriculture", "Medicine", "Public Health"], website: "https://www.osu.edu" },
  { id: "umd", name: "University of Maryland, College Park", country: "United States", region: "Mid-Atlantic", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Public Policy", "Journalism"], website: "https://umd.edu" },
  { id: "rutgers", name: "Rutgers University", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Pharmacy", "Engineering", "Business/Finance", "Public Health", "Computer Science"], website: "https://www.rutgers.edu" },
  { id: "uminn", name: "University of Minnesota", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Engineering", "Medicine", "Public Health", "Business/Finance", "Agriculture"], website: "https://twin-cities.umn.edu" },
  { id: "asu", name: "Arizona State University", country: "United States", region: "West", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Sustainability", "Journalism", "Computer Science"], website: "https://www.asu.edu" },
  { id: "psu", name: "Pennsylvania State University", country: "United States", region: "Mid-Atlantic", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Agriculture", "Geosciences", "Computer Science"], website: "https://www.psu.edu" },

  // United Kingdom — additional Russell Group + popular targets
  { id: "manchester", name: "University of Manchester", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Engineering", "Computer Science", "Medicine", "Business/Finance", "Materials Science"], website: "https://www.manchester.ac.uk" },
  { id: "kcl", name: "King's College London", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "International Relations", "Nursing", "Dentistry"], website: "https://www.kcl.ac.uk" },
  { id: "lse", name: "London School of Economics", country: "United Kingdom", region: "England", level: "global", strongMajors: ["Economics", "Political Science", "Finance", "International Relations", "Sociology"], website: "https://www.lse.ac.uk" },
  { id: "warwick", name: "University of Warwick", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Mathematics", "Economics", "Business/Finance", "Computer Science", "Engineering"], website: "https://warwick.ac.uk" },
  { id: "bristol", name: "University of Bristol", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Veterinary Medicine", "Drama"], website: "https://www.bristol.ac.uk" },
  { id: "durham", name: "Durham University", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Theology", "Law/Pre-Law", "Business/Finance", "Geography", "History"], website: "https://www.durham.ac.uk" },
  { id: "st-andrews", name: "University of St Andrews", country: "United Kingdom", region: "Scotland", level: "national", strongMajors: ["International Relations", "Philosophy", "Physics", "English/Creative Writing", "Computer Science"], website: "https://www.st-andrews.ac.uk" },
  { id: "glasgow", name: "University of Glasgow", country: "United Kingdom", region: "Scotland", level: "regional", strongMajors: ["Medicine", "Veterinary Medicine", "Engineering", "Business/Finance", "Law/Pre-Law"], website: "https://www.gla.ac.uk" },
  { id: "leeds", name: "University of Leeds", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Communications", "Law/Pre-Law"], website: "https://www.leeds.ac.uk" },
  { id: "nottingham", name: "University of Nottingham", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Pharmacy", "Engineering", "Medicine", "Veterinary Medicine", "Business/Finance"], website: "https://www.nottingham.ac.uk" },
  { id: "southampton", name: "University of Southampton", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Computer Science", "Oceanography", "Music", "Medicine"], website: "https://www.southampton.ac.uk" },
  { id: "qmul", name: "Queen Mary University of London", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Medicine", "Dentistry", "Law/Pre-Law", "Computer Science", "Business/Finance"], website: "https://www.qmul.ac.uk" },

  // Canada — additional U15
  { id: "uoft", name: "University of Toronto", country: "Canada", region: "Ontario", level: "global", strongMajors: ["Computer Science", "Engineering", "Medicine", "Business/Finance", "Mathematics"], website: "https://www.utoronto.ca" },
  { id: "ubc", name: "University of British Columbia", country: "Canada", region: "British Columbia", level: "national", strongMajors: ["Computer Science", "Engineering", "Forestry", "Business/Finance", "Medicine"], website: "https://www.ubc.ca" },
  { id: "queens-ca", name: "Queen's University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Law/Pre-Law", "Computer Science"], website: "https://www.queensu.ca" },
  { id: "western", name: "Western University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Business/Finance", "Medicine", "Engineering", "Law/Pre-Law", "Health Sciences"], website: "https://www.uwo.ca" },
  { id: "alberta", name: "University of Alberta", country: "Canada", region: "Alberta", level: "regional", strongMajors: ["Engineering", "Petroleum Engineering", "Business/Finance", "Medicine", "Agriculture"], website: "https://www.ualberta.ca" },
  { id: "sfu", name: "Simon Fraser University", country: "Canada", region: "British Columbia", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Communications", "Engineering", "Sustainability"], website: "https://www.sfu.ca" },
  { id: "york-ca", name: "York University", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Business/Finance", "Law/Pre-Law", "Computer Science", "Communications", "Public Policy"], website: "https://www.yorku.ca" },

  // Australia — Group of Eight expansion
  { id: "anu", name: "Australian National University", country: "Australia", region: "ACT", level: "global", strongMajors: ["Political Science", "International Relations", "Public Policy", "Physics", "Law/Pre-Law"], website: "https://www.anu.edu.au" },
  { id: "monash", name: "Monash University", country: "Australia", region: "Victoria", level: "national", strongMajors: ["Pharmacy", "Engineering", "Business/Finance", "Medicine", "Law/Pre-Law"], website: "https://www.monash.edu" },
  { id: "uq", name: "University of Queensland", country: "Australia", region: "Queensland", level: "national", strongMajors: ["Veterinary Medicine", "Engineering", "Business/Finance", "Medicine", "Environmental Science"], website: "https://www.uq.edu.au" },
  { id: "uwa", name: "University of Western Australia", country: "Australia", region: "Western Australia", level: "regional", strongMajors: ["Geosciences", "Engineering", "Medicine", "Business/Finance", "Agriculture"], website: "https://www.uwa.edu.au" },
  { id: "adelaide", name: "University of Adelaide", country: "Australia", region: "South Australia", level: "regional", strongMajors: ["Wine Science", "Engineering", "Medicine", "Veterinary Medicine", "Business/Finance"], website: "https://www.adelaide.edu.au" },
  { id: "uts", name: "University of Technology Sydney", country: "Australia", region: "NSW", level: "regional", strongMajors: ["Engineering", "Computer Science", "Design", "Business/Finance", "Communications"], website: "https://www.uts.edu.au" },

  // Germany — research powerhouses
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "Bavaria", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Mathematics", "Medicine"], website: "https://www.tum.de" },
  { id: "lmu", name: "Ludwig Maximilian University of Munich", country: "Germany", region: "Bavaria", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Physics", "Economics", "Philosophy"], website: "https://www.lmu.de" },
  { id: "heidelberg", name: "Heidelberg University", country: "Germany", region: "Baden-Württemberg", level: "national", strongMajors: ["Medicine", "Physics", "Chemistry", "Philosophy", "Law/Pre-Law"], website: "https://www.uni-heidelberg.de" },
  { id: "rwth-aachen", name: "RWTH Aachen University", country: "Germany", region: "North Rhine-Westphalia", level: "national", strongMajors: ["Mechanical Engineering", "Electrical Engineering", "Computer Science", "Materials Science", "Architecture"], website: "https://www.rwth-aachen.de" },
  { id: "humboldt", name: "Humboldt University of Berlin", country: "Germany", region: "Berlin", level: "regional", strongMajors: ["Philosophy", "History", "Law/Pre-Law", "Economics", "Sciences"], website: "https://www.hu-berlin.de" },

  // Netherlands
  { id: "tu-delft", name: "Delft University of Technology", country: "Netherlands", region: "South Holland", level: "global", strongMajors: ["Engineering", "Architecture", "Aerospace Engineering", "Computer Science", "Industrial Design"], website: "https://www.tudelft.nl" },
  { id: "amsterdam", name: "University of Amsterdam", country: "Netherlands", region: "North Holland", level: "national", strongMajors: ["Economics", "Communications", "Law/Pre-Law", "Computer Science", "Psychology"], website: "https://www.uva.nl" },
  { id: "leiden", name: "Leiden University", country: "Netherlands", region: "South Holland", level: "national", strongMajors: ["Law/Pre-Law", "International Relations", "History", "Medicine", "Linguistics"], website: "https://www.universiteitleiden.nl" },
  { id: "erasmus", name: "Erasmus University Rotterdam", country: "Netherlands", region: "South Holland", level: "national", strongMajors: ["Business/Finance", "Economics", "Medicine", "Public Policy", "Law/Pre-Law"], website: "https://www.eur.nl" },

  // France
  { id: "sorbonne", name: "Sorbonne University", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Humanities", "Mathematics", "Medicine", "Physics", "Law/Pre-Law"], website: "https://www.sorbonne-universite.fr" },
  { id: "polytechnique", name: "École Polytechnique", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Engineering", "Mathematics", "Physics", "Computer Science", "Economics"], website: "https://www.polytechnique.edu" },
  { id: "sciences-po", name: "Sciences Po", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Political Science", "International Relations", "Public Policy", "Economics", "Law/Pre-Law"], website: "https://www.sciencespo.fr" },
  { id: "hec-paris", name: "HEC Paris", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Business/Finance", "Economics", "Marketing", "Entrepreneurship", "Strategy"], website: "https://www.hec.edu" },

  // Switzerland
  { id: "epfl", name: "EPFL", country: "Switzerland", region: "Vaud", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Architecture", "Robotics"], website: "https://www.epfl.ch" },
  { id: "u-zurich", name: "University of Zurich", country: "Switzerland", region: "Zurich", level: "national", strongMajors: ["Medicine", "Economics", "Law/Pre-Law", "Veterinary Medicine", "Sciences"], website: "https://www.uzh.ch" },

  // Ireland
  { id: "tcd", name: "Trinity College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Computer Science", "Business/Finance", "Medicine", "Law/Pre-Law", "English/Creative Writing"], website: "https://www.tcd.ie" },
  { id: "ucd", name: "University College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Veterinary Medicine", "Agriculture"], website: "https://www.ucd.ie" },

  // Italy
  { id: "bocconi", name: "Bocconi University", country: "Italy", region: "Lombardy", level: "global", strongMajors: ["Business/Finance", "Economics", "Law/Pre-Law", "Public Policy", "Marketing"], website: "https://www.unibocconi.eu" },
  { id: "polimi", name: "Politecnico di Milano", country: "Italy", region: "Lombardy", level: "national", strongMajors: ["Engineering", "Architecture", "Industrial Design", "Computer Science", "Mathematics"], website: "https://www.polimi.it" },

  // Spain
  { id: "ie-business", name: "IE University", country: "Spain", region: "Madrid", level: "national", strongMajors: ["Business/Finance", "International Relations", "Architecture", "Communications", "Law/Pre-Law"], website: "https://www.ie.edu" },
  { id: "iese", name: "IESE Business School", country: "Spain", region: "Catalonia", level: "national", strongMajors: ["Business/Finance", "Economics", "Marketing", "Strategy", "Entrepreneurship"], website: "https://www.iese.edu" },

  // Sweden / Denmark / Norway / Finland
  { id: "kth", name: "KTH Royal Institute of Technology", country: "Sweden", region: "Stockholm", level: "national", strongMajors: ["Engineering", "Computer Science", "Architecture", "Industrial Engineering", "Materials Science"], website: "https://www.kth.se" },
  { id: "lund", name: "Lund University", country: "Sweden", region: "Skåne", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Economics", "Sciences"], website: "https://www.lu.se" },
  { id: "ku", name: "University of Copenhagen", country: "Denmark", region: "Capital Region", level: "national", strongMajors: ["Medicine", "Veterinary Medicine", "Law/Pre-Law", "Pharmacy", "Sciences"], website: "https://www.ku.dk" },
  { id: "dtu", name: "Technical University of Denmark", country: "Denmark", region: "Capital Region", level: "national", strongMajors: ["Engineering", "Computer Science", "Sustainability", "Physics", "Biotechnology"], website: "https://www.dtu.dk" },
  { id: "uio", name: "University of Oslo", country: "Norway", region: "Oslo", level: "regional", strongMajors: ["Medicine", "Law/Pre-Law", "Sciences", "Humanities", "Theology"], website: "https://www.uio.no" },
  { id: "helsinki", name: "University of Helsinki", country: "Finland", region: "Uusimaa", level: "regional", strongMajors: ["Medicine", "Law/Pre-Law", "Sciences", "Education", "Theology"], website: "https://www.helsinki.fi" },

  // UAE
  { id: "nyuad", name: "NYU Abu Dhabi", country: "United Arab Emirates", region: "Abu Dhabi", level: "global", strongMajors: ["Liberal Arts", "Computer Science", "Engineering", "Economics", "Political Science"], website: "https://nyuad.nyu.edu" },
  { id: "khalifa", name: "Khalifa University", country: "United Arab Emirates", region: "Abu Dhabi", level: "regional", strongMajors: ["Engineering", "Aerospace Engineering", "Petroleum Engineering", "Computer Science", "Sciences"], website: "https://www.ku.ac.ae" },
  { id: "aud", name: "American University in Dubai", country: "United Arab Emirates", region: "Dubai", level: "regional", strongMajors: ["Business/Finance", "Architecture", "Communications", "Engineering", "Visual Arts"], website: "https://www.aud.edu" },

  // Singapore (already has a few — add SUTD)
  { id: "sutd", name: "Singapore University of Technology and Design", country: "Singapore", region: "Singapore", level: "national", strongMajors: ["Engineering", "Architecture", "Computer Science", "Industrial Design", "Sustainability"], website: "https://www.sutd.edu.sg" },

  // South Korea
  { id: "snu", name: "Seoul National University", country: "South Korea", region: "Seoul", level: "global", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Business/Finance", "Sciences"], website: "https://www.snu.ac.kr" },
  { id: "yonsei", name: "Yonsei University", country: "South Korea", region: "Seoul", level: "national", strongMajors: ["Business/Finance", "Medicine", "International Relations", "Engineering", "Communications"], website: "https://www.yonsei.ac.kr" },

  // Japan
  { id: "u-tokyo", name: "University of Tokyo", country: "Japan", region: "Kanto", level: "global", strongMajors: ["Engineering", "Sciences", "Medicine", "Law/Pre-Law", "Economics"], website: "https://www.u-tokyo.ac.jp" },
  { id: "kyoto-u", name: "Kyoto University", country: "Japan", region: "Kansai", level: "global", strongMajors: ["Sciences", "Engineering", "Medicine", "Humanities", "Economics"], website: "https://www.kyoto-u.ac.jp" },

  // Hong Kong
  { id: "hku", name: "University of Hong Kong", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Engineering", "Architecture"], website: "https://www.hku.hk" },
  { id: "hkust", name: "Hong Kong University of Science and Technology", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Sciences", "Economics"], website: "https://www.hkust.edu.hk" },

  // Israel
  { id: "technion", name: "Technion - Israel Institute of Technology", country: "Israel", region: "Haifa", level: "global", strongMajors: ["Engineering", "Computer Science", "Architecture", "Medicine", "Aerospace Engineering"], website: "https://www.technion.ac.il" },

  // India — add more high-demand institutes
  { id: "iisc", name: "Indian Institute of Science (IISc)", country: "India", region: "Karnataka", level: "global", strongMajors: ["Sciences", "Engineering", "Computer Science", "Aerospace Engineering", "Materials Science"], website: "https://www.iisc.ac.in" },
  { id: "ashoka", name: "Ashoka University", country: "India", region: "Haryana", level: "national", strongMajors: ["Liberal Arts", "Economics", "Computer Science", "Political Science", "Psychology"], website: "https://www.ashoka.edu.in" },
  { id: "iim-a", name: "Indian Institute of Management Ahmedabad", country: "India", region: "Gujarat", level: "global", strongMajors: ["Business/Finance", "Economics", "Public Policy", "Management", "Strategy"], website: "https://www.iima.ac.in" },
  { id: "iim-b", name: "Indian Institute of Management Bangalore", country: "India", region: "Karnataka", level: "global", strongMajors: ["Business/Finance", "Economics", "Public Policy", "Entrepreneurship", "Analytics"], website: "https://www.iimb.ac.in" },
  { id: "nls", name: "National Law School of India University", country: "India", region: "Karnataka", level: "national", strongMajors: ["Law/Pre-Law", "Public Policy", "International Relations", "Business/Finance", "Political Science"], website: "https://www.nls.ac.in" },
  { id: "manipal", name: "Manipal Academy of Higher Education", country: "India", region: "Karnataka", level: "regional", strongMajors: ["Medicine", "Engineering", "Pharmacy", "Dentistry", "Business/Finance"], website: "https://manipal.edu" },

  // China
  { id: "tsinghua", name: "Tsinghua University", country: "China", region: "Beijing", level: "global", strongMajors: ["Engineering", "Computer Science", "Architecture", "Economics", "Sciences"], website: "https://www.tsinghua.edu.cn" },
  { id: "peking", name: "Peking University", country: "China", region: "Beijing", level: "global", strongMajors: ["Sciences", "Economics", "Medicine", "Law/Pre-Law", "Humanities"], website: "https://www.pku.edu.cn" },

  // Malaysia
  { id: "um-malaysia", name: "University of Malaya", country: "Malaysia", region: "Kuala Lumpur", level: "national", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Business/Finance", "Sciences"], website: "https://www.um.edu.my" },
  { id: "usm-malaysia", name: "Universiti Sains Malaysia", country: "Malaysia", region: "Penang", level: "national", strongMajors: ["Sciences", "Engineering", "Pharmacy", "Medicine", "Computer Science"], website: "https://www.usm.my" },
  { id: "ukm-malaysia", name: "Universiti Kebangsaan Malaysia", country: "Malaysia", region: "Selangor", level: "national", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Education", "Sciences"], website: "https://www.ukm.my" },

  // ===== EXPANDED — UNITED STATES (NATIONAL & STRONG REGIONAL) =====
  { id: "usc", name: "University of Southern California", country: "United States", region: "West", level: "national", strongMajors: ["Film/Cinema", "Business/Finance", "Computer Science", "Communications", "Engineering"], website: "https://www.usc.edu" },
  { id: "nyu", name: "New York University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Business/Finance", "Film/Cinema", "Computer Science", "Drama", "Economics"], website: "https://www.nyu.edu" },
  { id: "umich", name: "University of Michigan—Ann Arbor", country: "United States", region: "Midwest", level: "national", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Public Policy", "Biology/Pre-Med"], website: "https://umich.edu" },
  { id: "uva", name: "University of Virginia", country: "United States", region: "South", level: "national", strongMajors: ["Business/Finance", "Economics", "Public Policy", "Architecture", "English/Creative Writing"], website: "https://www.virginia.edu" },
  { id: "unc", name: "University of North Carolina at Chapel Hill", country: "United States", region: "South", level: "national", strongMajors: ["Journalism", "Business/Finance", "Public Health", "Biology/Pre-Med", "Political Science"], website: "https://www.unc.edu" },
  { id: "gtech", name: "Georgia Institute of Technology", country: "United States", region: "South", level: "national", strongMajors: ["Computer Science", "Engineering", "Industrial Engineering", "Architecture", "Business/Finance"], website: "https://www.gatech.edu" },
  { id: "uiuc", name: "University of Illinois Urbana-Champaign", country: "United States", region: "Midwest", level: "national", strongMajors: ["Computer Science", "Engineering", "Accounting", "Agriculture", "Physics"], website: "https://illinois.edu" },
  { id: "purdue", name: "Purdue University", country: "United States", region: "Midwest", level: "national", strongMajors: ["Engineering", "Aerospace Engineering", "Computer Science", "Agriculture", "Pharmacy"], website: "https://www.purdue.edu" },
  { id: "uw", name: "University of Washington", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Nursing", "Public Health", "Engineering", "Business/Finance"], website: "https://www.washington.edu" },
  { id: "utexas", name: "University of Texas at Austin", country: "United States", region: "South", level: "national", strongMajors: ["Business/Finance", "Engineering", "Computer Science", "Architecture", "Communications"], website: "https://www.utexas.edu" },
  { id: "wisc", name: "University of Wisconsin—Madison", country: "United States", region: "Midwest", level: "national", strongMajors: ["Engineering", "Business/Finance", "Biology/Pre-Med", "Education", "Agriculture"], website: "https://www.wisc.edu" },
  { id: "bu", name: "Boston University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Business/Finance", "Communications", "Biomedical Engineering", "International Relations", "Film/Cinema"], website: "https://www.bu.edu" },
  { id: "tufts", name: "Tufts University", country: "United States", region: "Northeast", level: "national", strongMajors: ["International Relations", "Biology/Pre-Med", "Computer Science", "Economics", "Engineering"], website: "https://www.tufts.edu" },
  { id: "wm", name: "College of William & Mary", country: "United States", region: "South", level: "national", strongMajors: ["Government", "Business/Finance", "Biology/Pre-Med", "International Relations", "English/Creative Writing"], website: "https://www.wm.edu" },
  { id: "case", name: "Case Western Reserve University", country: "United States", region: "Midwest", level: "national", strongMajors: ["Biomedical Engineering", "Computer Science", "Biology/Pre-Med", "Nursing", "Business/Finance"], website: "https://case.edu" },

  // ===== EXPANDED — UK / IRELAND =====
  { id: "warwick", name: "University of Warwick", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Mathematics", "Economics", "Business/Finance", "Computer Science", "Politics"], website: "https://warwick.ac.uk" },
  { id: "kcl", name: "King's College London", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Law/Pre-Law", "Medicine", "International Relations", "Computer Science", "Psychology"], website: "https://www.kcl.ac.uk" },
  { id: "manchester", name: "University of Manchester", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Chemistry", "Biology/Pre-Med"], website: "https://www.manchester.ac.uk" },
  { id: "bristol", name: "University of Bristol", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Engineering", "Medicine", "Economics", "Computer Science", "Aerospace Engineering"], website: "https://www.bristol.ac.uk" },
  { id: "durham", name: "Durham University", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Theology", "History", "Law/Pre-Law", "Mathematics", "Business/Finance"], website: "https://www.durham.ac.uk" },
  { id: "tcd", name: "Trinity College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Computer Science", "Business/Finance", "Law/Pre-Law", "Pharmacy", "English/Creative Writing"], website: "https://www.tcd.ie" },
  { id: "ucd", name: "University College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Agriculture", "Veterinary Science"], website: "https://www.ucd.ie" },

  // ===== EXPANDED — EUROPE =====
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "Bavaria", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Aerospace Engineering", "Mathematics"], website: "https://www.tum.de" },
  { id: "lmu", name: "Ludwig Maximilian University of Munich", country: "Germany", region: "Bavaria", level: "national", strongMajors: ["Medicine", "Sciences", "Economics", "Law/Pre-Law", "Humanities"], website: "https://www.lmu.de" },
  { id: "heidelberg", name: "Heidelberg University", country: "Germany", region: "Baden-Württemberg", level: "national", strongMajors: ["Medicine", "Physics", "Sciences", "Law/Pre-Law", "Philosophy"], website: "https://www.uni-heidelberg.de" },
  { id: "tudelft", name: "Delft University of Technology", country: "Netherlands", region: "South Holland", level: "global", strongMajors: ["Engineering", "Aerospace Engineering", "Architecture", "Computer Science", "Industrial Design"], website: "https://www.tudelft.nl" },
  { id: "uva-nl", name: "University of Amsterdam", country: "Netherlands", region: "North Holland", level: "national", strongMajors: ["Economics", "Psychology", "Communications", "Computer Science", "Political Science"], website: "https://www.uva.nl" },
  { id: "kuleuven", name: "KU Leuven", country: "Belgium", region: "Flanders", level: "national", strongMajors: ["Engineering", "Medicine", "Sciences", "Philosophy", "Theology"], website: "https://www.kuleuven.be" },
  { id: "epfl", name: "École Polytechnique Fédérale de Lausanne", country: "Switzerland", region: "Vaud", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Mathematics", "Architecture"], website: "https://www.epfl.ch" },
  { id: "eth", name: "ETH Zürich", country: "Switzerland", region: "Zürich", level: "global", strongMajors: ["Engineering", "Computer Science", "Mathematics", "Physics", "Architecture"], website: "https://ethz.ch" },
  { id: "sciences-po", name: "Sciences Po", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Political Science", "International Relations", "Public Policy", "Law/Pre-Law", "Economics"], website: "https://www.sciencespo.fr" },
  { id: "polytechnique", name: "École Polytechnique", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Engineering", "Mathematics", "Physics", "Computer Science", "Economics"], website: "https://www.polytechnique.edu" },
  { id: "bocconi", name: "Bocconi University", country: "Italy", region: "Lombardy", level: "national", strongMajors: ["Business/Finance", "Economics", "Management", "Law/Pre-Law", "Data Science"], website: "https://www.unibocconi.eu" },
  { id: "ie-spain", name: "IE University", country: "Spain", region: "Madrid", level: "national", strongMajors: ["Business/Finance", "International Relations", "Architecture", "Communications", "Law/Pre-Law"], website: "https://www.ie.edu" },
  { id: "ku-denmark", name: "University of Copenhagen", country: "Denmark", region: "Capital Region", level: "national", strongMajors: ["Sciences", "Medicine", "Veterinary Science", "Computer Science", "Pharmacy"], website: "https://www.ku.dk" },
  { id: "ki-sweden", name: "Karolinska Institute", country: "Sweden", region: "Stockholm", level: "global", strongMajors: ["Medicine", "Biology/Pre-Med", "Public Health", "Nursing", "Pharmacy"], website: "https://ki.se" },

  // ===== EXPANDED — ASIA =====
  { id: "snu", name: "Seoul National University", country: "South Korea", region: "Seoul", level: "global", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Medicine", "Sciences"], website: "https://en.snu.ac.kr" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Daejeon", level: "global", strongMajors: ["Engineering", "Computer Science", "Physics", "Aerospace Engineering", "Materials Science"], website: "https://www.kaist.ac.kr/en" },
  { id: "tokyo", name: "University of Tokyo", country: "Japan", region: "Kantō", level: "global", strongMajors: ["Engineering", "Sciences", "Medicine", "Economics", "Computer Science"], website: "https://www.u-tokyo.ac.jp/en" },
  { id: "kyoto", name: "Kyoto University", country: "Japan", region: "Kansai", level: "global", strongMajors: ["Sciences", "Engineering", "Medicine", "Humanities", "Economics"], website: "https://www.kyoto-u.ac.jp/en" },
  { id: "fudan", name: "Fudan University", country: "China", region: "Shanghai", level: "national", strongMajors: ["Economics", "Medicine", "Journalism", "International Relations", "Sciences"], website: "https://www.fudan.edu.cn" },
  { id: "sjtu", name: "Shanghai Jiao Tong University", country: "China", region: "Shanghai", level: "national", strongMajors: ["Engineering", "Medicine", "Computer Science", "Business/Finance", "Aerospace Engineering"], website: "https://en.sjtu.edu.cn" },
  { id: "iitb", name: "Indian Institute of Technology Bombay", country: "India", region: "Maharashtra", level: "global", strongMajors: ["Computer Science", "Engineering", "Aerospace Engineering", "Electrical Engineering", "Mathematics"], website: "https://www.iitb.ac.in" },
  { id: "iitd", name: "Indian Institute of Technology Delhi", country: "India", region: "Delhi", level: "global", strongMajors: ["Computer Science", "Engineering", "Electrical Engineering", "Mathematics", "Industrial Engineering"], website: "https://home.iitd.ac.in" },
  { id: "iitm", name: "Indian Institute of Technology Madras", country: "India", region: "Tamil Nadu", level: "global", strongMajors: ["Engineering", "Computer Science", "Aerospace Engineering", "Mechanical Engineering", "Data Science"], website: "https://www.iitm.ac.in" },
  { id: "iitkgp", name: "Indian Institute of Technology Kharagpur", country: "India", region: "West Bengal", level: "national", strongMajors: ["Engineering", "Computer Science", "Architecture", "Mining Engineering", "Naval Architecture"], website: "https://www.iitkgp.ac.in" },
  { id: "iitk", name: "Indian Institute of Technology Kanpur", country: "India", region: "Uttar Pradesh", level: "national", strongMajors: ["Engineering", "Computer Science", "Aerospace Engineering", "Materials Science", "Physics"], website: "https://www.iitk.ac.in" },
  { id: "bits", name: "BITS Pilani", country: "India", region: "Rajasthan", level: "national", strongMajors: ["Engineering", "Computer Science", "Pharmacy", "Sciences", "Economics"], website: "https://www.bits-pilani.ac.in" },
  { id: "delhi-u", name: "University of Delhi", country: "India", region: "Delhi", level: "national", strongMajors: ["Economics", "Commerce", "Liberal Arts", "Political Science", "English/Creative Writing"], website: "https://www.du.ac.in" },
  { id: "srcc", name: "Shri Ram College of Commerce", country: "India", region: "Delhi", level: "national", strongMajors: ["Commerce", "Economics", "Business/Finance"], website: "https://www.srcc.edu" },
  { id: "isi", name: "Indian Statistical Institute", country: "India", region: "West Bengal", level: "national", strongMajors: ["Statistics", "Mathematics", "Computer Science", "Economics", "Data Science"], website: "https://www.isical.ac.in" },

  // ===== EXPANDED — MIDDLE EAST =====
  { id: "kaust", name: "King Abdullah University of Science & Technology", country: "Saudi Arabia", region: "Mecca", level: "national", strongMajors: ["Engineering", "Computer Science", "Sciences", "Materials Science", "Marine Science"], website: "https://www.kaust.edu.sa" },
  { id: "kfupm", name: "King Fahd University of Petroleum & Minerals", country: "Saudi Arabia", region: "Eastern Province", level: "national", strongMajors: ["Engineering", "Petroleum Engineering", "Computer Science", "Business/Finance", "Sciences"], website: "https://www.kfupm.edu.sa" },
  { id: "aub", name: "American University of Beirut", country: "Lebanon", region: "Beirut", level: "national", strongMajors: ["Medicine", "Business/Finance", "Engineering", "Public Health", "Architecture"], website: "https://www.aub.edu.lb" },
  { id: "auc", name: "American University in Cairo", country: "Egypt", region: "Cairo", level: "national", strongMajors: ["Business/Finance", "International Relations", "Engineering", "Communications", "Political Science"], website: "https://www.aucegypt.edu" },
  { id: "tau", name: "Tel Aviv University", country: "Israel", region: "Tel Aviv District", level: "national", strongMajors: ["Computer Science", "Medicine", "Business/Finance", "Engineering", "Law/Pre-Law"], website: "https://www.tau.ac.il" },
  { id: "technion", name: "Technion — Israel Institute of Technology", country: "Israel", region: "Haifa District", level: "global", strongMajors: ["Engineering", "Computer Science", "Medicine", "Architecture", "Aerospace Engineering"], website: "https://www.technion.ac.il" },
  { id: "huji", name: "Hebrew University of Jerusalem", country: "Israel", region: "Jerusalem District", level: "national", strongMajors: ["Sciences", "Medicine", "Law/Pre-Law", "Computer Science", "Humanities"], website: "https://en.huji.ac.il" },

  // ===== EXPANDED — LATIN AMERICA =====
  { id: "usp", name: "University of São Paulo", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Engineering", "Medicine", "Sciences", "Law/Pre-Law", "Economics"], website: "https://www5.usp.br" },
  { id: "unicamp", name: "State University of Campinas (Unicamp)", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Engineering", "Sciences", "Computer Science", "Medicine", "Economics"], website: "https://www.unicamp.br" },
  { id: "tec-monterrey", name: "Tecnológico de Monterrey", country: "Mexico", region: "Nuevo León", level: "national", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Architecture", "Communications"], website: "https://tec.mx" },
  { id: "unam", name: "National Autonomous University of Mexico", country: "Mexico", region: "Mexico City", level: "national", strongMajors: ["Medicine", "Engineering", "Sciences", "Law/Pre-Law", "Architecture"], website: "https://www.unam.mx" },
  { id: "uba", name: "University of Buenos Aires", country: "Argentina", region: "Buenos Aires", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Economics", "Engineering", "Architecture"], website: "https://www.uba.ar" },
  { id: "uchile", name: "University of Chile", country: "Chile", region: "Santiago Metropolitan", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Economics", "Architecture"], website: "https://www.uchile.cl" },

  // ===== EXPANDED — AFRICA & OCEANIA =====
  { id: "uct", name: "University of Cape Town", country: "South Africa", region: "Western Cape", level: "national", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Law/Pre-Law", "Sciences"], website: "https://www.uct.ac.za" },
  { id: "wits", name: "University of the Witwatersrand", country: "South Africa", region: "Gauteng", level: "national", strongMajors: ["Mining Engineering", "Medicine", "Business/Finance", "Engineering", "Law/Pre-Law"], website: "https://www.wits.ac.za" },
  { id: "stellenbosch", name: "Stellenbosch University", country: "South Africa", region: "Western Cape", level: "national", strongMajors: ["Engineering", "Sciences", "Business/Finance", "Agriculture", "Medicine"], website: "https://www.sun.ac.za" },
  { id: "anu", name: "Australian National University", country: "Australia", region: "Australian Capital Territory", level: "global", strongMajors: ["Political Science", "International Relations", "Sciences", "Engineering", "Computer Science"], website: "https://www.anu.edu.au" },
  { id: "monash", name: "Monash University", country: "Australia", region: "Victoria", level: "national", strongMajors: ["Medicine", "Business/Finance", "Engineering", "Pharmacy", "Law/Pre-Law"], website: "https://www.monash.edu" },
  { id: "uq", name: "University of Queensland", country: "Australia", region: "Queensland", level: "national", strongMajors: ["Sciences", "Engineering", "Medicine", "Business/Finance", "Veterinary Science"], website: "https://www.uq.edu.au" },
  { id: "auckland", name: "University of Auckland", country: "New Zealand", region: "Auckland", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Law/Pre-Law", "Sciences"], website: "https://www.auckland.ac.nz" },

  // ===== EXPANDED — CANADA =====
  { id: "uoft", name: "University of Toronto", country: "Canada", region: "Ontario", level: "global", strongMajors: ["Computer Science", "Engineering", "Medicine", "Business/Finance", "Mathematics"], website: "https://www.utoronto.ca" },
  { id: "ubc", name: "University of British Columbia", country: "Canada", region: "British Columbia", level: "global", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Forestry", "Medicine"], website: "https://www.ubc.ca" },
  { id: "mcgill", name: "McGill University", country: "Canada", region: "Quebec", level: "global", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Law/Pre-Law", "Computer Science"], website: "https://www.mcgill.ca" },
  { id: "waterloo", name: "University of Waterloo", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Computer Science", "Engineering", "Mathematics", "Software Engineering", "Actuarial Science"], website: "https://uwaterloo.ca" },
  { id: "mcmaster", name: "McMaster University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Sciences", "Nursing"], website: "https://www.mcmaster.ca" },
  { id: "queens", name: "Queen's University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Law/Pre-Law", "Computer Science"], website: "https://www.queensu.ca" },

  // ===== EXPANSION: USA (additional national / regional flagships) =====
  { id: "umn", name: "University of Minnesota Twin Cities", country: "United States", region: "Midwest", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Public Health", "Psychology", "Computer Science"], website: "https://twin-cities.umn.edu" },
  { id: "uci", name: "UC Irvine", country: "United States", region: "West", level: "regional", strongMajors: ["Biology/Pre-Med", "Computer Science", "Business/Finance", "Public Health", "Criminology"], website: "https://uci.edu" },
  { id: "ucsd", name: "UC San Diego", country: "United States", region: "West", level: "national", strongMajors: ["Computer Science", "Biology/Pre-Med", "Oceanography", "Engineering", "Economics"], website: "https://ucsd.edu" },
  { id: "ucsb", name: "UC Santa Barbara", country: "United States", region: "West", level: "national", strongMajors: ["Physics", "Computer Science", "Environmental Science", "Economics", "Engineering"], website: "https://www.ucsb.edu" },
  { id: "ucdavis", name: "UC Davis", country: "United States", region: "West", level: "regional", strongMajors: ["Agriculture", "Veterinary Medicine", "Biology/Pre-Med", "Engineering", "Environmental Science"], website: "https://www.ucdavis.edu" },
  { id: "case", name: "Case Western Reserve University", country: "United States", region: "Midwest", level: "national", strongMajors: ["Biomedical Engineering", "Medicine", "Computer Science", "Business/Finance", "Nursing"], website: "https://case.edu" },
  { id: "rpi", name: "Rensselaer Polytechnic Institute", country: "United States", region: "Northeast", level: "national", strongMajors: ["Engineering", "Computer Science", "Architecture", "Aerospace Engineering", "Physics"], website: "https://www.rpi.edu" },
  { id: "northeastern", name: "Northeastern University", country: "United States", region: "Northeast", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Health Sciences", "International Affairs"], website: "https://www.northeastern.edu" },
  { id: "wfu", name: "Wake Forest University", country: "United States", region: "South", level: "national", strongMajors: ["Business/Finance", "Political Science", "Economics", "Biology/Pre-Med", "Law/Pre-Law"], website: "https://www.wfu.edu" },
  { id: "tulane", name: "Tulane University", country: "United States", region: "South", level: "national", strongMajors: ["Public Health", "Business/Finance", "Architecture", "Biology/Pre-Med", "Latin American Studies"], website: "https://tulane.edu" },
  { id: "lehigh", name: "Lehigh University", country: "United States", region: "Mid-Atlantic", level: "national", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Economics", "Finance"], website: "https://www1.lehigh.edu" },
  { id: "stevens", name: "Stevens Institute of Technology", country: "United States", region: "Mid-Atlantic", level: "regional", strongMajors: ["Computer Science", "Engineering", "Cybersecurity", "Quantitative Finance", "Mechanical Engineering"], website: "https://www.stevens.edu" },
  { id: "wpi", name: "Worcester Polytechnic Institute", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Engineering", "Computer Science", "Robotics", "Biomedical Engineering", "Physics"], website: "https://www.wpi.edu" },
  { id: "drexel", name: "Drexel University", country: "United States", region: "Mid-Atlantic", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Nursing", "Design"], website: "https://drexel.edu" },
  { id: "rit", name: "Rochester Institute of Technology", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Computer Science", "Engineering", "Game Design", "Photography", "Cybersecurity"], website: "https://www.rit.edu" },
  { id: "syracuse", name: "Syracuse University", country: "United States", region: "Northeast", level: "regional", strongMajors: ["Communications", "Public Policy", "Architecture", "Business/Finance", "Information Studies"], website: "https://www.syracuse.edu" },
  { id: "miami", name: "University of Miami", country: "United States", region: "South", level: "regional", strongMajors: ["Marine Science", "Business/Finance", "Music", "Communications", "Biology/Pre-Med"], website: "https://welcome.miami.edu" },
  { id: "fsu", name: "Florida State University", country: "United States", region: "South", level: "regional", strongMajors: ["Business/Finance", "Communications", "Criminology", "Computer Science", "Theatre"], website: "https://www.fsu.edu" },
  { id: "uga", name: "University of Georgia", country: "United States", region: "South", level: "regional", strongMajors: ["Business/Finance", "Agriculture", "Journalism", "Public Health", "Pharmacy"], website: "https://www.uga.edu" },
  { id: "txam", name: "Texas A&M University", country: "United States", region: "South", level: "regional", strongMajors: ["Engineering", "Agriculture", "Business/Finance", "Veterinary Medicine", "Architecture"], website: "https://www.tamu.edu" },
  { id: "smu", name: "Southern Methodist University", country: "United States", region: "South", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Communications", "Political Science", "Law/Pre-Law"], website: "https://www.smu.edu" },
  { id: "baylor", name: "Baylor University", country: "United States", region: "South", level: "regional", strongMajors: ["Business/Finance", "Nursing", "Biology/Pre-Med", "Education", "Religion"], website: "https://www.baylor.edu" },
  { id: "byu", name: "Brigham Young University", country: "United States", region: "West", level: "regional", strongMajors: ["Business/Finance", "Engineering", "Communications", "Education", "Computer Science"], website: "https://www.byu.edu" },
  { id: "utah", name: "University of Utah", country: "United States", region: "West", level: "regional", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "Medicine", "Game Design"], website: "https://www.utah.edu" },
  { id: "colorado", name: "University of Colorado Boulder", country: "United States", region: "West", level: "regional", strongMajors: ["Aerospace Engineering", "Environmental Science", "Business/Finance", "Computer Science", "Astronomy"], website: "https://www.colorado.edu" },
  { id: "oregon", name: "University of Oregon", country: "United States", region: "West", level: "regional", strongMajors: ["Journalism", "Business/Finance", "Architecture", "Psychology", "Environmental Studies"], website: "https://www.uoregon.edu" },

  // ===== EXPANSION: UNITED KINGDOM =====
  { id: "durham", name: "Durham University", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Theology", "Law/Pre-Law", "History", "Physics", "Business/Finance"], website: "https://www.durham.ac.uk" },
  { id: "standrews", name: "University of St Andrews", country: "United Kingdom", region: "Scotland", level: "national", strongMajors: ["International Relations", "Philosophy", "Physics", "Computer Science", "Medicine"], website: "https://www.st-andrews.ac.uk" },
  { id: "exeter", name: "University of Exeter", country: "United Kingdom", region: "England", level: "national", strongMajors: ["Business/Finance", "Law/Pre-Law", "Geography", "Engineering", "Psychology"], website: "https://www.exeter.ac.uk" },
  { id: "leeds", name: "University of Leeds", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Law/Pre-Law", "Computer Science"], website: "https://www.leeds.ac.uk" },
  { id: "nottingham", name: "University of Nottingham", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Medicine", "Pharmacy", "Business/Finance", "Computer Science"], website: "https://www.nottingham.ac.uk" },
  { id: "southampton", name: "University of Southampton", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Oceanography", "Computer Science", "Medicine", "Music"], website: "https://www.southampton.ac.uk" },
  { id: "sheffield", name: "University of Sheffield", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Architecture", "Medicine", "Computer Science", "Music"], website: "https://www.sheffield.ac.uk" },
  { id: "cardiff", name: "Cardiff University", country: "United Kingdom", region: "Wales", level: "regional", strongMajors: ["Journalism", "Engineering", "Medicine", "Architecture", "Law/Pre-Law"], website: "https://www.cardiff.ac.uk" },
  { id: "qmul", name: "Queen Mary University of London", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Computer Science", "Medicine", "Law/Pre-Law", "Engineering", "Business/Finance"], website: "https://www.qmul.ac.uk" },
  { id: "bath", name: "University of Bath", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Engineering", "Architecture", "Business/Finance", "Computer Science", "Sports Science"], website: "https://www.bath.ac.uk" },
  { id: "lancaster", name: "Lancaster University", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Business/Finance", "Computer Science", "Physics", "Linguistics", "Engineering"], website: "https://www.lancaster.ac.uk" },
  { id: "loughborough", name: "Loughborough University", country: "United Kingdom", region: "England", level: "regional", strongMajors: ["Sports Science", "Engineering", "Design", "Business/Finance", "Computer Science"], website: "https://www.lboro.ac.uk" },

  // ===== EXPANSION: CANADA =====
  { id: "alberta", name: "University of Alberta", country: "Canada", region: "Alberta", level: "national", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Medicine", "Sciences"], website: "https://www.ualberta.ca" },
  { id: "calgary", name: "University of Calgary", country: "Canada", region: "Alberta", level: "regional", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Veterinary Medicine", "Computer Science"], website: "https://www.ucalgary.ca" },
  { id: "western", name: "Western University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Business/Finance", "Medicine", "Engineering", "Law/Pre-Law", "Computer Science"], website: "https://www.uwo.ca" },
  { id: "yorku", name: "York University", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Business/Finance", "Law/Pre-Law", "Liberal Arts", "Communications", "Education"], website: "https://www.yorku.ca" },
  { id: "concordia", name: "Concordia University", country: "Canada", region: "Quebec", level: "regional", strongMajors: ["Business/Finance", "Film/Television", "Engineering", "Fine Arts", "Communications"], website: "https://www.concordia.ca" },
  { id: "ottawa", name: "University of Ottawa", country: "Canada", region: "Ontario", level: "regional", strongMajors: ["Law/Pre-Law", "Medicine", "Political Science", "International Relations", "Engineering"], website: "https://www.uottawa.ca" },
  { id: "simonfraser", name: "Simon Fraser University", country: "Canada", region: "British Columbia", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Communications", "Engineering", "Criminology"], website: "https://www.sfu.ca" },
  { id: "dalhousie", name: "Dalhousie University", country: "Canada", region: "Nova Scotia", level: "regional", strongMajors: ["Medicine", "Marine Science", "Law/Pre-Law", "Engineering", "Computer Science"], website: "https://www.dal.ca" },

  // ===== EXPANSION: AUSTRALIA & NEW ZEALAND =====
  { id: "unimelb", name: "University of Melbourne", country: "Australia", region: "Victoria", level: "global", strongMajors: ["Medicine", "Business/Finance", "Law/Pre-Law", "Engineering", "Architecture"], website: "https://www.unimelb.edu.au" },
  { id: "sydney", name: "University of Sydney", country: "Australia", region: "New South Wales", level: "global", strongMajors: ["Medicine", "Law/Pre-Law", "Architecture", "Business/Finance", "Veterinary Science"], website: "https://www.sydney.edu.au" },
  { id: "anu", name: "Australian National University", country: "Australia", region: "ACT", level: "global", strongMajors: ["Political Science", "International Relations", "Physics", "Asia-Pacific Studies", "Astronomy"], website: "https://www.anu.edu.au" },
  { id: "unsw", name: "UNSW Sydney", country: "Australia", region: "New South Wales", level: "global", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Medicine", "Architecture"], website: "https://www.unsw.edu.au" },
  { id: "monash", name: "Monash University", country: "Australia", region: "Victoria", level: "national", strongMajors: ["Medicine", "Pharmacy", "Engineering", "Business/Finance", "Law/Pre-Law"], website: "https://www.monash.edu" },
  { id: "uq", name: "University of Queensland", country: "Australia", region: "Queensland", level: "national", strongMajors: ["Engineering", "Medicine", "Biology/Pre-Med", "Business/Finance", "Environmental Science"], website: "https://www.uq.edu.au" },
  { id: "uwa", name: "University of Western Australia", country: "Australia", region: "Western Australia", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Geology", "Marine Science"], website: "https://www.uwa.edu.au" },
  { id: "adelaide", name: "University of Adelaide", country: "Australia", region: "South Australia", level: "regional", strongMajors: ["Medicine", "Engineering", "Wine Science", "Computer Science", "Business/Finance"], website: "https://www.adelaide.edu.au" },
  { id: "uts", name: "University of Technology Sydney", country: "Australia", region: "New South Wales", level: "regional", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Design", "Communications"], website: "https://www.uts.edu.au" },
  { id: "uoa-nz", name: "University of Auckland", country: "New Zealand", region: "Auckland", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Law/Pre-Law", "Computer Science"], website: "https://www.auckland.ac.nz" },

  // ===== EXPANSION: INDIA =====
  { id: "iitb", name: "IIT Bombay", country: "India", region: "Maharashtra", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Aerospace Engineering", "Chemical Engineering"], website: "https://www.iitb.ac.in" },
  { id: "iitd", name: "IIT Delhi", country: "India", region: "Delhi", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Mathematics", "Physics"], website: "https://home.iitd.ac.in" },
  { id: "iitm", name: "IIT Madras", country: "India", region: "Tamil Nadu", level: "global", strongMajors: ["Computer Science", "Mechanical Engineering", "Aerospace Engineering", "Electrical Engineering", "Data Science"], website: "https://www.iitm.ac.in" },
  { id: "iitk", name: "IIT Kanpur", country: "India", region: "Uttar Pradesh", level: "national", strongMajors: ["Computer Science", "Aerospace Engineering", "Electrical Engineering", "Physics", "Materials Science"], website: "https://www.iitk.ac.in" },
  { id: "iitkgp", name: "IIT Kharagpur", country: "India", region: "West Bengal", level: "national", strongMajors: ["Computer Science", "Mining Engineering", "Naval Architecture", "Mechanical Engineering", "Law/Pre-Law"], website: "https://www.iitkgp.ac.in" },
  { id: "iitr", name: "IIT Roorkee", country: "India", region: "Uttarakhand", level: "national", strongMajors: ["Civil Engineering", "Computer Science", "Earthquake Engineering", "Hydrology", "Electrical Engineering"], website: "https://www.iitr.ac.in" },
  { id: "iisc", name: "Indian Institute of Science", country: "India", region: "Karnataka", level: "global", strongMajors: ["Physics", "Mathematics", "Computer Science", "Aerospace Engineering", "Biotechnology"], website: "https://www.iisc.ac.in" },
  { id: "bits-pilani", name: "BITS Pilani", country: "India", region: "Rajasthan", level: "national", strongMajors: ["Computer Science", "Electrical Engineering", "Pharmacy", "Mechanical Engineering", "Economics"], website: "https://www.bits-pilani.ac.in" },
  { id: "iiit-h", name: "IIIT Hyderabad", country: "India", region: "Telangana", level: "national", strongMajors: ["Computer Science", "Artificial Intelligence", "Robotics", "Electronics", "Data Science"], website: "https://www.iiit.ac.in" },
  { id: "du", name: "University of Delhi", country: "India", region: "Delhi", level: "national", strongMajors: ["Economics", "English/Creative Writing", "Political Science", "Commerce", "History"], website: "https://www.du.ac.in" },
  { id: "ashoka", name: "Ashoka University", country: "India", region: "Haryana", level: "national", strongMajors: ["Economics", "Political Science", "Computer Science", "Liberal Arts", "Psychology"], website: "https://www.ashoka.edu.in" },
  { id: "manipal", name: "Manipal Academy of Higher Education", country: "India", region: "Karnataka", level: "regional", strongMajors: ["Medicine", "Engineering", "Pharmacy", "Business/Finance", "Architecture"], website: "https://manipal.edu" },
  { id: "vit", name: "VIT Vellore", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Biotechnology", "Information Technology"], website: "https://vit.ac.in" },
  { id: "srm", name: "SRM Institute of Science and Technology", country: "India", region: "Tamil Nadu", level: "regional", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Computer Science", "Biotechnology"], website: "https://www.srmist.edu.in" },
  { id: "jnu", name: "Jawaharlal Nehru University", country: "India", region: "Delhi", level: "national", strongMajors: ["International Relations", "Political Science", "Languages", "History", "Economics"], website: "https://www.jnu.ac.in" },

  // ===== EXPANSION: SINGAPORE / HONG KONG / EAST ASIA =====
  { id: "nus", name: "National University of Singapore", country: "Singapore", region: "Singapore", level: "global", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Medicine", "Law/Pre-Law"], website: "https://www.nus.edu.sg" },
  { id: "ntu-sg", name: "Nanyang Technological University", country: "Singapore", region: "Singapore", level: "global", strongMajors: ["Engineering", "Computer Science", "Business/Finance", "Communications", "Materials Science"], website: "https://www.ntu.edu.sg" },
  { id: "smu-sg", name: "Singapore Management University", country: "Singapore", region: "Singapore", level: "national", strongMajors: ["Business/Finance", "Economics", "Information Systems", "Law/Pre-Law", "Accounting"], website: "https://www.smu.edu.sg" },
  { id: "hku", name: "University of Hong Kong", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Engineering", "Architecture"], website: "https://www.hku.hk" },
  { id: "hkust", name: "Hong Kong University of Science and Technology", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Engineering", "Business/Finance", "Computer Science", "Mathematics", "Economics"], website: "https://hkust.edu.hk" },
  { id: "cuhk", name: "Chinese University of Hong Kong", country: "Hong Kong", region: "Hong Kong", level: "global", strongMajors: ["Medicine", "Business/Finance", "Engineering", "Chinese Studies", "Law/Pre-Law"], website: "https://www.cuhk.edu.hk" },
  { id: "tsinghua", name: "Tsinghua University", country: "China", region: "Beijing", level: "global", strongMajors: ["Engineering", "Computer Science", "Architecture", "Economics", "Business/Finance"], website: "https://www.tsinghua.edu.cn" },
  { id: "pku", name: "Peking University", country: "China", region: "Beijing", level: "global", strongMajors: ["Economics", "Law/Pre-Law", "Computer Science", "Medicine", "International Relations"], website: "https://english.pku.edu.cn" },
  { id: "fudan", name: "Fudan University", country: "China", region: "Shanghai", level: "global", strongMajors: ["Business/Finance", "Journalism", "Medicine", "Economics", "International Relations"], website: "https://www.fudan.edu.cn" },
  { id: "sjtu", name: "Shanghai Jiao Tong University", country: "China", region: "Shanghai", level: "global", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Computer Science", "Naval Architecture"], website: "https://en.sjtu.edu.cn" },
  { id: "utokyo", name: "University of Tokyo", country: "Japan", region: "Tokyo", level: "global", strongMajors: ["Engineering", "Physics", "Medicine", "Economics", "Law/Pre-Law"], website: "https://www.u-tokyo.ac.jp" },
  { id: "kyotou", name: "Kyoto University", country: "Japan", region: "Kyoto", level: "global", strongMajors: ["Physics", "Chemistry", "Medicine", "Engineering", "Mathematics"], website: "https://www.kyoto-u.ac.jp" },
  { id: "osaka", name: "Osaka University", country: "Japan", region: "Osaka", level: "national", strongMajors: ["Engineering", "Medicine", "Sciences", "Economics", "Law/Pre-Law"], website: "https://www.osaka-u.ac.jp" },
  { id: "snu", name: "Seoul National University", country: "South Korea", region: "Seoul", level: "global", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Law/Pre-Law", "Computer Science"], website: "https://en.snu.ac.kr" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Daejeon", level: "global", strongMajors: ["Computer Science", "Engineering", "Physics", "Mathematics", "Biotechnology"], website: "https://www.kaist.ac.kr/en" },
  { id: "yonsei", name: "Yonsei University", country: "South Korea", region: "Seoul", level: "national", strongMajors: ["Medicine", "Business/Finance", "Engineering", "International Studies", "Computer Science"], website: "https://www.yonsei.ac.kr" },

  // ===== EXPANSION: EUROPE =====
  { id: "ethz", name: "ETH Zurich", country: "Switzerland", region: "Zurich", level: "global", strongMajors: ["Computer Science", "Engineering", "Physics", "Architecture", "Mathematics"], website: "https://ethz.ch" },
  { id: "epfl", name: "EPFL", country: "Switzerland", region: "Vaud", level: "global", strongMajors: ["Computer Science", "Engineering", "Physics", "Robotics", "Architecture"], website: "https://www.epfl.ch" },
  { id: "tum", name: "Technical University of Munich", country: "Germany", region: "Bavaria", level: "global", strongMajors: ["Engineering", "Computer Science", "Mathematics", "Physics", "Aerospace Engineering"], website: "https://www.tum.de" },
  { id: "lmu", name: "LMU Munich", country: "Germany", region: "Bavaria", level: "national", strongMajors: ["Medicine", "Physics", "Psychology", "Business/Finance", "Law/Pre-Law"], website: "https://www.lmu.de" },
  { id: "heidelberg", name: "Heidelberg University", country: "Germany", region: "Baden-Württemberg", level: "national", strongMajors: ["Medicine", "Physics", "Chemistry", "Philosophy", "Law/Pre-Law"], website: "https://www.uni-heidelberg.de" },
  { id: "tudelft", name: "TU Delft", country: "Netherlands", region: "South Holland", level: "global", strongMajors: ["Engineering", "Aerospace Engineering", "Computer Science", "Architecture", "Industrial Design"], website: "https://www.tudelft.nl" },
  { id: "uva-nl", name: "University of Amsterdam", country: "Netherlands", region: "North Holland", level: "national", strongMajors: ["Economics", "Communications", "Psychology", "Computer Science", "Liberal Arts"], website: "https://www.uva.nl" },
  { id: "leiden", name: "Leiden University", country: "Netherlands", region: "South Holland", level: "national", strongMajors: ["Law/Pre-Law", "International Relations", "Medicine", "Astronomy", "Languages"], website: "https://www.universiteitleiden.nl" },
  { id: "sciencespo", name: "Sciences Po", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Political Science", "International Relations", "Economics", "Law/Pre-Law", "Public Policy"], website: "https://www.sciencespo.fr" },
  { id: "psl", name: "Université PSL", country: "France", region: "Île-de-France", level: "global", strongMajors: ["Sciences", "Engineering", "Economics", "Arts", "Humanities"], website: "https://psl.eu" },
  { id: "sorbonne", name: "Sorbonne University", country: "France", region: "Île-de-France", level: "national", strongMajors: ["Humanities", "Sciences", "Medicine", "Mathematics", "Languages"], website: "https://www.sorbonne-universite.fr" },
  { id: "kth", name: "KTH Royal Institute of Technology", country: "Sweden", region: "Stockholm", level: "national", strongMajors: ["Engineering", "Computer Science", "Architecture", "Industrial Engineering", "Physics"], website: "https://www.kth.se" },
  { id: "lund", name: "Lund University", country: "Sweden", region: "Skåne", level: "national", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Law/Pre-Law", "Computer Science"], website: "https://www.lunduniversity.lu.se" },
  { id: "copenhagen", name: "University of Copenhagen", country: "Denmark", region: "Capital Region", level: "national", strongMajors: ["Medicine", "Sciences", "Law/Pre-Law", "Humanities", "Economics"], website: "https://www.ku.dk" },
  { id: "trinity-ie", name: "Trinity College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Computer Science", "Medicine", "Law/Pre-Law", "Business/Finance", "Literature"], website: "https://www.tcd.ie" },
  { id: "ucd", name: "University College Dublin", country: "Ireland", region: "Leinster", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Computer Science", "Veterinary Medicine"], website: "https://www.ucd.ie" },
  { id: "polimi", name: "Politecnico di Milano", country: "Italy", region: "Lombardy", level: "national", strongMajors: ["Engineering", "Architecture", "Design", "Computer Science", "Aerospace Engineering"], website: "https://www.polimi.it" },
  { id: "bocconi", name: "Bocconi University", country: "Italy", region: "Lombardy", level: "global", strongMajors: ["Business/Finance", "Economics", "Law/Pre-Law", "Political Science", "Computer Science"], website: "https://www.unibocconi.eu" },
  { id: "ie-uni", name: "IE University", country: "Spain", region: "Madrid", level: "national", strongMajors: ["Business/Finance", "Law/Pre-Law", "International Relations", "Communications", "Architecture"], website: "https://www.ie.edu" },
  { id: "navarra", name: "Universidad de Navarra", country: "Spain", region: "Navarre", level: "national", strongMajors: ["Business/Finance", "Communications", "Medicine", "Law/Pre-Law", "Architecture"], website: "https://www.unav.edu" },

  // ===== EXPANSION: MIDDLE EAST & AFRICA =====
  { id: "nyuad", name: "NYU Abu Dhabi", country: "United Arab Emirates", region: "Abu Dhabi", level: "global", strongMajors: ["Computer Science", "Engineering", "Economics", "International Relations", "Liberal Arts"], website: "https://nyuad.nyu.edu" },
  { id: "aub", name: "American University of Beirut", country: "Lebanon", region: "Beirut", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Political Science", "Architecture"], website: "https://www.aub.edu.lb" },
  { id: "auc", name: "American University in Cairo", country: "Egypt", region: "Cairo", level: "national", strongMajors: ["Business/Finance", "Engineering", "Political Science", "Economics", "Computer Science"], website: "https://www.aucegypt.edu" },
  { id: "ku-uae", name: "Khalifa University", country: "United Arab Emirates", region: "Abu Dhabi", level: "national", strongMajors: ["Engineering", "Computer Science", "Aerospace Engineering", "Nuclear Engineering", "Petroleum Engineering"], website: "https://www.ku.ac.ae" },
  { id: "kfupm", name: "King Fahd University of Petroleum & Minerals", country: "Saudi Arabia", region: "Eastern Province", level: "national", strongMajors: ["Petroleum Engineering", "Engineering", "Computer Science", "Business/Finance", "Geology"], website: "https://www.kfupm.edu.sa" },
  { id: "kaust", name: "KAUST", country: "Saudi Arabia", region: "Mecca", level: "national", strongMajors: ["Computer Science", "Engineering", "Marine Science", "Bioengineering", "Materials Science"], website: "https://www.kaust.edu.sa" },
  { id: "uct", name: "University of Cape Town", country: "South Africa", region: "Western Cape", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Law/Pre-Law", "Sciences"], website: "https://www.uct.ac.za" },
  { id: "wits", name: "University of the Witwatersrand", country: "South Africa", region: "Gauteng", level: "national", strongMajors: ["Mining Engineering", "Medicine", "Business/Finance", "Law/Pre-Law", "Architecture"], website: "https://www.wits.ac.za" },
  { id: "technion", name: "Technion - Israel Institute of Technology", country: "Israel", region: "Haifa", level: "global", strongMajors: ["Engineering", "Computer Science", "Aerospace Engineering", "Medicine", "Architecture"], website: "https://www.technion.ac.il" },
  { id: "tau", name: "Tel Aviv University", country: "Israel", region: "Tel Aviv", level: "global", strongMajors: ["Computer Science", "Medicine", "Law/Pre-Law", "Business/Finance", "Engineering"], website: "https://english.tau.ac.il" },
  { id: "huji", name: "Hebrew University of Jerusalem", country: "Israel", region: "Jerusalem", level: "global", strongMajors: ["Computer Science", "Medicine", "Law/Pre-Law", "Mathematics", "Agriculture"], website: "https://en.huji.ac.il" },

  // ===== EXPANSION: LATIN AMERICA =====
  { id: "tec-mty", name: "Tecnológico de Monterrey", country: "Mexico", region: "Nuevo León", level: "national", strongMajors: ["Business/Finance", "Engineering", "Computer Science", "Architecture", "Medicine"], website: "https://tec.mx" },
  { id: "unam", name: "UNAM", country: "Mexico", region: "Mexico City", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Architecture", "Engineering", "Humanities"], website: "https://www.unam.mx" },
  { id: "puc-chile", name: "Pontificia Universidad Católica de Chile", country: "Chile", region: "Santiago", level: "national", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Architecture", "Law/Pre-Law"], website: "https://www.uc.cl" },
  { id: "uchile", name: "Universidad de Chile", country: "Chile", region: "Santiago", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Architecture", "Sciences"], website: "https://www.uchile.cl" },
  { id: "usp", name: "University of São Paulo", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Architecture", "Sciences"], website: "https://www5.usp.br" },
  { id: "unicamp", name: "Unicamp", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Engineering", "Medicine", "Computer Science", "Linguistics", "Physics"], website: "https://www.unicamp.br" },
  { id: "uba", name: "Universidad de Buenos Aires", country: "Argentina", region: "Buenos Aires", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Engineering", "Architecture", "Economics"], website: "https://www.uba.ar" },
  // ===== EXPANDED: ADDITIONAL GLOBAL COVERAGE =====
  { id: "khalifa", name: "Khalifa University", country: "United Arab Emirates", region: "Abu Dhabi", level: "national", strongMajors: ["Aerospace Engineering", "Petroleum Engineering", "Computer Science", "Electrical Engineering"], website: "https://www.ku.ac.ae" },
  { id: "aud", name: "American University in Dubai", country: "United Arab Emirates", region: "Dubai", level: "national", strongMajors: ["Business/Finance", "Architecture", "Communications", "Engineering"], website: "https://www.aud.edu" },
  { id: "uaeu", name: "United Arab Emirates University", country: "United Arab Emirates", region: "Al Ain", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Education"], website: "https://www.uaeu.ac.ae" },
  { id: "zayed-u", name: "Zayed University", country: "United Arab Emirates", region: "Dubai", level: "regional", strongMajors: ["Business/Finance", "Communications", "Education", "Computer Science"], website: "https://www.zu.ac.ae" },
  { id: "kfupm", name: "King Fahd University of Petroleum & Minerals", country: "Saudi Arabia", region: "Dhahran", level: "national", strongMajors: ["Petroleum Engineering", "Chemical Engineering", "Computer Science", "Geology/Earth Sciences"], website: "https://www.kfupm.edu.sa" },
  { id: "kaust", name: "King Abdullah University of Science and Technology", country: "Saudi Arabia", region: "Thuwal", level: "global", strongMajors: ["Computer Science", "Bioengineering", "Environmental Science", "Mathematics"], website: "https://www.kaust.edu.sa" },
  { id: "ksu-sa", name: "King Saud University", country: "Saudi Arabia", region: "Riyadh", level: "national", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Pharmacy"], website: "https://www.ksu.edu.sa" },
  { id: "qu", name: "Qatar University", country: "Qatar", region: "Doha", level: "national", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Law/Pre-Law"], website: "https://www.qu.edu.qa" },
  { id: "kuwait-u", name: "Kuwait University", country: "Kuwait", region: "Kuwait City", level: "national", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Law/Pre-Law"], website: "https://www.kuniv.edu.kw" },
  { id: "auc", name: "American University in Cairo", country: "Egypt", region: "Cairo", level: "national", strongMajors: ["Business/Finance", "Engineering", "Political Science", "Journalism"], website: "https://www.aucegypt.edu" },
  { id: "cairo-u", name: "Cairo University", country: "Egypt", region: "Cairo", level: "national", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Pharmacy"], website: "https://cu.edu.eg" },
  { id: "technion", name: "Technion - Israel Institute of Technology", country: "Israel", region: "Haifa", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Aerospace Engineering", "Biomedical Engineering"], website: "https://www.technion.ac.il" },
  { id: "tel-aviv-u", name: "Tel Aviv University", country: "Israel", region: "Tel Aviv", level: "national", strongMajors: ["Computer Science", "Medicine", "Business/Finance", "Law/Pre-Law"], website: "https://english.tau.ac.il" },
  { id: "huji", name: "Hebrew University of Jerusalem", country: "Israel", region: "Jerusalem", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Computer Science", "Mathematics"], website: "https://en.huji.ac.il" },
  { id: "uct", name: "University of Cape Town", country: "South Africa", region: "Cape Town", level: "global", strongMajors: ["Medicine", "Engineering", "Business/Finance", "Law/Pre-Law"], website: "https://www.uct.ac.za" },
  { id: "wits", name: "University of the Witwatersrand", country: "South Africa", region: "Johannesburg", level: "national", strongMajors: ["Mining Engineering", "Medicine", "Law/Pre-Law", "Business/Finance"], website: "https://www.wits.ac.za" },
  { id: "stellenbosch", name: "Stellenbosch University", country: "South Africa", region: "Stellenbosch", level: "national", strongMajors: ["Engineering", "Agriculture", "Medicine", "Business/Finance"], website: "https://www.sun.ac.za" },
  { id: "ui-nigeria", name: "University of Ibadan", country: "Nigeria", region: "Ibadan", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Agriculture", "Engineering"], website: "https://www.ui.edu.ng" },
  { id: "covenant-u", name: "Covenant University", country: "Nigeria", region: "Ota", level: "regional", strongMajors: ["Computer Science", "Business/Finance", "Engineering", "Architecture"], website: "https://covenantuniversity.edu.ng" },
  { id: "u-nairobi", name: "University of Nairobi", country: "Kenya", region: "Nairobi", level: "national", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Business/Finance"], website: "https://www.uonbi.ac.ke" },
  { id: "u-ghana", name: "University of Ghana", country: "Ghana", region: "Accra", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Political Science"], website: "https://www.ug.edu.gh" },
  { id: "amu", name: "Aligarh Muslim University", country: "India", region: "Uttar Pradesh", level: "national", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Humanities"], website: "https://www.amu.ac.in" },
  { id: "ashoka", name: "Ashoka University", country: "India", region: "Haryana", level: "national", strongMajors: ["Economics", "Political Science", "Computer Science", "English/Creative Writing"], website: "https://www.ashoka.edu.in" },
  { id: "krea", name: "Krea University", country: "India", region: "Andhra Pradesh", level: "regional", strongMajors: ["Economics", "Business/Finance", "Political Science", "Mathematics"], website: "https://krea.edu.in" },
  { id: "iiit-h", name: "IIIT Hyderabad", country: "India", region: "Telangana", level: "national", strongMajors: ["Computer Science", "Artificial Intelligence", "Electronics", "Data Science"], website: "https://www.iiit.ac.in" },
  { id: "bits-pilani", name: "BITS Pilani", country: "India", region: "Rajasthan", level: "national", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Business/Finance"], website: "https://www.bits-pilani.ac.in" },
  { id: "snu-india", name: "Shiv Nadar University", country: "India", region: "Uttar Pradesh", level: "regional", strongMajors: ["Computer Science", "Engineering", "Economics", "Mathematics"], website: "https://snu.edu.in" },
  { id: "iiit-d", name: "IIIT Delhi", country: "India", region: "Delhi", level: "national", strongMajors: ["Computer Science", "Electronics", "Artificial Intelligence", "Data Science"], website: "https://www.iiitd.ac.in" },
  { id: "nid", name: "National Institute of Design (NID)", country: "India", region: "Gujarat", level: "national", strongMajors: ["Graphic Design", "UX/Product Design", "Fine Arts", "Game Design/Development"], website: "https://www.nid.edu" },
  { id: "uva-nl", name: "University of Amsterdam", country: "Netherlands", region: "Amsterdam", level: "global", strongMajors: ["Economics", "Computer Science", "Psychology", "Law/Pre-Law"], website: "https://www.uva.nl/en" },
  { id: "tud", name: "Delft University of Technology", country: "Netherlands", region: "Delft", level: "global", strongMajors: ["Aerospace Engineering", "Architecture", "Computer Science", "Civil Engineering"], website: "https://www.tudelft.nl/en" },
  { id: "leiden", name: "Leiden University", country: "Netherlands", region: "Leiden", level: "national", strongMajors: ["Law/Pre-Law", "International Relations", "History", "Medicine"], website: "https://www.universiteitleiden.nl/en" },
  { id: "ku-leuven", name: "KU Leuven", country: "Belgium", region: "Leuven", level: "global", strongMajors: ["Medicine", "Engineering", "Computer Science", "Law/Pre-Law"], website: "https://www.kuleuven.be/english" },
  { id: "trinity-dublin", name: "Trinity College Dublin", country: "Ireland", region: "Dublin", level: "global", strongMajors: ["Computer Science", "Medicine", "Business/Finance", "Literature"], website: "https://www.tcd.ie" },
  { id: "ucd", name: "University College Dublin", country: "Ireland", region: "Dublin", level: "national", strongMajors: ["Business/Finance", "Engineering", "Veterinary Science/Animal Science", "Law/Pre-Law"], website: "https://www.ucd.ie" },
  { id: "lund", name: "Lund University", country: "Sweden", region: "Lund", level: "national", strongMajors: ["Engineering", "Medicine", "Economics", "Architecture"], website: "https://www.lunduniversity.lu.se" },
  { id: "kth", name: "KTH Royal Institute of Technology", country: "Sweden", region: "Stockholm", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Architecture"], website: "https://www.kth.se/en" },
  { id: "u-helsinki", name: "University of Helsinki", country: "Finland", region: "Helsinki", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Computer Science", "Humanities"], website: "https://www.helsinki.fi/en" },
  { id: "aalto", name: "Aalto University", country: "Finland", region: "Espoo", level: "national", strongMajors: ["Computer Science", "Engineering", "Business/Finance", "UX/Product Design"], website: "https://www.aalto.fi/en" },
  { id: "u-oslo", name: "University of Oslo", country: "Norway", region: "Oslo", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Computer Science", "Political Science"], website: "https://www.uio.no/english/" },
  { id: "u-copenhagen", name: "University of Copenhagen", country: "Denmark", region: "Copenhagen", level: "national", strongMajors: ["Medicine", "Biology/Pre-Med", "Law/Pre-Law", "Veterinary Science/Animal Science"], website: "https://www.ku.dk/english/" },
  { id: "vienna-u", name: "University of Vienna", country: "Austria", region: "Vienna", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Philosophy", "Music/Musicology"], website: "https://www.univie.ac.at/en/" },
  { id: "warsaw-u", name: "University of Warsaw", country: "Poland", region: "Warsaw", level: "national", strongMajors: ["Computer Science", "Law/Pre-Law", "Economics", "Mathematics"], website: "https://en.uw.edu.pl" },
  { id: "charles-prague", name: "Charles University", country: "Czech Republic", region: "Prague", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Philosophy", "Mathematics"], website: "https://cuni.cz/UKEN-1.html" },
  { id: "sapienza", name: "Sapienza University of Rome", country: "Italy", region: "Rome", level: "national", strongMajors: ["Medicine", "Engineering", "Architecture", "Classics"], website: "https://www.uniroma1.it/en" },
  { id: "bocconi", name: "Bocconi University", country: "Italy", region: "Milan", level: "global", strongMajors: ["Business/Finance", "Economics", "Management", "Law/Pre-Law"], website: "https://www.unibocconi.eu" },
  { id: "polimi", name: "Politecnico di Milano", country: "Italy", region: "Milan", level: "national", strongMajors: ["Architecture", "Engineering", "UX/Product Design", "Computer Science"], website: "https://www.polimi.it/en" },
  { id: "complutense", name: "Complutense University of Madrid", country: "Spain", region: "Madrid", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Political Science", "Humanities"], website: "https://www.ucm.es/english" },
  { id: "ie-university", name: "IE University", country: "Spain", region: "Madrid", level: "national", strongMajors: ["Business/Finance", "Communications", "Law/Pre-Law", "Architecture"], website: "https://www.ie.edu" },
  { id: "iese", name: "IESE Business School", country: "Spain", region: "Barcelona", level: "global", strongMajors: ["Business/Finance", "Management", "Economics", "Entrepreneurship"], website: "https://www.iese.edu" },
  { id: "uba2", name: "Universidad de los Andes (Colombia)", country: "Colombia", region: "Bogotá", level: "national", strongMajors: ["Engineering", "Business/Finance", "Law/Pre-Law", "Economics"], website: "https://uniandes.edu.co/en" },
  { id: "puc-rio", name: "Pontifical Catholic University of Rio de Janeiro", country: "Brazil", region: "Rio de Janeiro", level: "national", strongMajors: ["Engineering", "Economics", "Computer Science", "Architecture"], website: "https://www.puc-rio.br/english/" },
  { id: "fgv", name: "Fundação Getulio Vargas", country: "Brazil", region: "São Paulo", level: "national", strongMajors: ["Business/Finance", "Economics", "Law/Pre-Law", "Public Policy"], website: "https://portal.fgv.br/en" },
  { id: "ucr", name: "Universidad de Costa Rica", country: "Costa Rica", region: "San José", level: "regional", strongMajors: ["Medicine", "Engineering", "Law/Pre-Law", "Education"], website: "https://www.ucr.ac.cr" },
  { id: "u-philippines", name: "University of the Philippines Diliman", country: "Philippines", region: "Quezon City", level: "national", strongMajors: ["Engineering", "Business/Finance", "Medicine", "Computer Science"], website: "https://upd.edu.ph" },
  { id: "ateneo", name: "Ateneo de Manila University", country: "Philippines", region: "Quezon City", level: "national", strongMajors: ["Business/Finance", "Law/Pre-Law", "Communications", "Computer Science"], website: "https://www.ateneo.edu" },
  { id: "chulalongkorn", name: "Chulalongkorn University", country: "Thailand", region: "Bangkok", level: "national", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Architecture"], website: "https://www.chula.ac.th/en/" },
  { id: "mahidol", name: "Mahidol University", country: "Thailand", region: "Bangkok", level: "national", strongMajors: ["Medicine", "Pharmacy", "Public Health", "Biology/Pre-Med"], website: "https://mahidol.ac.th/en/" },
  { id: "u-malaya", name: "University of Malaya", country: "Malaysia", region: "Kuala Lumpur", level: "national", strongMajors: ["Medicine", "Engineering", "Computer Science", "Business/Finance"], website: "https://www.um.edu.my" },
  { id: "ui-indo", name: "University of Indonesia", country: "Indonesia", region: "Depok", level: "national", strongMajors: ["Engineering", "Medicine", "Law/Pre-Law", "Economics"], website: "https://www.ui.ac.id/en/" },
  { id: "vnu", name: "Vietnam National University, Hanoi", country: "Vietnam", region: "Hanoi", level: "national", strongMajors: ["Computer Science", "Engineering", "Economics", "International Relations"], website: "https://vnu.edu.vn/eng" },
  { id: "taiwan-u", name: "National Taiwan University", country: "Taiwan", region: "Taipei", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Medicine", "Business/Finance"], website: "https://www.ntu.edu.tw/english" },
  { id: "kaist", name: "KAIST", country: "South Korea", region: "Daejeon", level: "global", strongMajors: ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Physics"], website: "https://www.kaist.ac.kr/en/" },
  { id: "snu-korea", name: "Seoul National University", country: "South Korea", region: "Seoul", level: "global", strongMajors: ["Engineering", "Medicine", "Business/Finance", "Law/Pre-Law"], website: "https://en.snu.ac.kr" },
  { id: "yonsei", name: "Yonsei University", country: "South Korea", region: "Seoul", level: "national", strongMajors: ["Business/Finance", "Medicine", "Engineering", "International Relations"], website: "https://www.yonsei.ac.kr/en_sc/" },
  { id: "amu-egypt", name: "Ain Shams University", country: "Egypt", region: "Cairo", level: "regional", strongMajors: ["Medicine", "Engineering", "Pharmacy", "Education"], website: "https://www.asu.edu.eg" },
  { id: "u-istanbul", name: "Istanbul University", country: "Turkey", region: "Istanbul", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Engineering", "Humanities"], website: "https://www.istanbul.edu.tr/en" },
  { id: "bogazici", name: "Boğaziçi University", country: "Turkey", region: "Istanbul", level: "national", strongMajors: ["Engineering", "Economics", "Computer Science", "International Relations"], website: "https://www.boun.edu.tr/en_US" },
  { id: "mcgill-2", name: "Université de Montréal", country: "Canada", region: "Quebec", level: "national", strongMajors: ["Medicine", "Law/Pre-Law", "Business/Finance", "Computer Science"], website: "https://www.umontreal.ca/en/" },
  { id: "waterloo", name: "University of Waterloo", country: "Canada", region: "Ontario", level: "global", strongMajors: ["Computer Science", "Engineering", "Mathematics", "Actuarial Science"], website: "https://uwaterloo.ca" },
  { id: "queens-ca", name: "Queen's University", country: "Canada", region: "Ontario", level: "national", strongMajors: ["Business/Finance", "Engineering", "Medicine", "Law/Pre-Law"], website: "https://www.queensu.ca" },
];

const LEVEL_RANK: Record<College["level"], number> = { global: 0, national: 1, regional: 2 };

/**
 * Deduplicate by id *and* by name.
 *
 * Deduplicating on id alone left 43 schools listed twice under different ids —
 * "University of Texas at Austin" appeared as both `ut-austin` (regional) and
 * `utaustin` (national), and 20 such pairs disagreed about the tier. That
 * mattered because consumers look schools up by name and disagree about which
 * duplicate they get: `Array.find` returns the first (regional, 30–75% admit
 * band) while a name-keyed Map ends up with the last. UT Austin was being
 * scored as a regional school.
 *
 * Collisions now resolve to the most selective tier claimed for that name. The
 * conservative direction is the correct one to err in: it sets a higher bar and
 * a lower admit probability, so a student plans for the harder case.
 */
export const colleges: College[] = (() => {
  const byName = new Map<string, College>();
  const order: string[] = [];

  // Name is the merge key, not id. Merging on id first would discard entries
  // before their tier could be considered: all three Purdue rows share the id
  // `purdue`, so the two that call it national were dropped and the lone
  // `regional` row won by position alone.
  for (const c of collegesRaw) {
    const key = c.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, c);
      order.push(key);
      continue;
    }
    // Keep the earlier entry's identity, but adopt the most selective level and
    // the union of strong majors so nothing a duplicate contributed is lost.
    const merged: College = {
      ...existing,
      level: LEVEL_RANK[c.level] < LEVEL_RANK[existing.level] ? c.level : existing.level,
      strongMajors: Array.from(new Set([...existing.strongMajors, ...c.strongMajors])),
    };
    byName.set(key, merged);
  }

  // Name-merging can leave two *different* schools holding the same id — either
  // because the source data reuses one (`smu` was both Singapore Management and
  // Southern Methodist) or because a school is listed under two spellings
  // ("ETH Zurich" / "ETH Zürich"). Ids are used as React keys and are stored on
  // saved analyses, so they must stay unique; suffix any collision rather than
  // merging two genuinely distinct schools together.
  const usedIds = new Set<string>();
  return order.map((k) => {
    const c = byName.get(k)!;
    if (!usedIds.has(c.id)) {
      usedIds.add(c.id);
      return c;
    }
    let n = 2;
    while (usedIds.has(`${c.id}-${n}`)) n += 1;
    const id = `${c.id}-${n}`;
    usedIds.add(id);
    return { ...c, id };
  });
})();
