// Re-export from comprehensive data files
export { colleges as collegeObjects, getCollegesByCountry, getCollegeNames } from './colleges';
export type { College } from './colleges';
export { majors as majorObjects, getMajorNames, getMajorsByCategory, searchMajors } from './majors';
export type { Major } from './majors';
export { 
  activities, 
  calculatePriority, 
  generatePriorityExplanation,
  isActivityAvailableInCountry,
  getActivitiesByMajor,
  getActivitiesByCountry,
  getActivityTypes,
  getActivityCategories,
  avoidActivities
} from './activities';
export type { Activity } from './activities';

// Legacy exports for backward compatibility
import { getCollegeNames as _getCollegeNames } from './colleges';
import { getMajorNames as _getMajorNames } from './majors';

export const colleges = _getCollegeNames();
export const majors = _getMajorNames();

// Essay types for the Essays page
export const essayTypes = [
  { value: "personal", label: "Personal Statement" },
  { value: "why-us", label: "Why This College" },
  { value: "activity", label: "Activity Description" },
  { value: "challenge", label: "Challenge/Failure Essay" },
  { value: "diversity", label: "Diversity/Background Essay" },
  { value: "intellectual", label: "Intellectual Curiosity" },
  { value: "community", label: "Community/Leadership" },
];

// Essay checklist items
export const essayChecklist = [
  "Does the essay answer the prompt directly?",
  "Is there a clear central theme or message?",
  "Does it show rather than tell?",
  "Is your authentic voice present throughout?",
  "Have you avoided clichés and generic phrases?",
  "Is the structure logical and easy to follow?",
  "Does the conclusion leave a strong impression?",
  "Have you proofread for grammar and spelling?",
];

// LinkedIn sections for the LinkedIn page
export const linkedinSections = [
  {
    id: "headline",
    title: "Headline",
    description: "Your professional tagline that appears below your name",
    placeholder: "e.g., I'm a student interested in AI and machine learning, currently building projects..."
  },
  {
    id: "about",
    title: "About Section",
    description: "A summary of your background, interests, and aspirations",
    placeholder: "e.g., I love coding and have been doing it since 8th grade. I won some hackathons..."
  },
  {
    id: "experience",
    title: "Experience",
    description: "Describe your work, internship, or volunteer experience",
    placeholder: "e.g., I interned at a startup where I helped build their website..."
  },
  {
    id: "internships",
    title: "Internships",
    description: "Internships, research positions, lab work, and shadowing experiences",
    placeholder: "e.g., Summer ML research intern at XYZ University — preprocessed dataset, trained models, presented findings..."
  },
  {
    id: "projects",
    title: "Featured Projects",
    description: "Highlight your most impressive projects",
    placeholder: "e.g., Built an app that helps students track their homework assignments..."
  },
  {
    id: "education",
    title: "Education",
    description: "Schools, courses, GPA, and relevant academic highlights",
    placeholder: "e.g., XYZ High School, Class of 2026 — GPA 3.95, AP Calc BC, AP CS A, AP Physics..."
  },
  {
    id: "honors",
    title: "Honors & Awards",
    description: "Competitions, scholarships, and recognitions",
    placeholder: "e.g., USACO Gold (2024), Regional Math Olympiad — 2nd place, National Merit Commended..."
  },
  {
    id: "certifications",
    title: "Licenses & Certifications",
    description: "Online courses, professional credentials, and certifications",
    placeholder: "e.g., Coursera Machine Learning (Stanford), Google IT Support, AWS Cloud Practitioner..."
  },
  {
    id: "skills",
    title: "Skills & Endorsements",
    description: "List your technical and soft skills",
    placeholder: "e.g., Python, JavaScript, public speaking, team leadership..."
  },
  {
    id: "volunteer",
    title: "Volunteer Experience",
    description: "Organizations you've volunteered with and what you did",
    placeholder: "e.g., Volunteered at the local animal shelter every weekend, walked dogs and helped with adoption events..."
  },
  {
    id: "publications",
    title: "Publications & Patents",
    description: "Papers, preprints, articles, or patents you've authored or filed",
    placeholder: "e.g., Co-authored a paper on machine learning for crop disease detection, presented at a regional science fair..."
  },
  {
    id: "languages",
    title: "Languages",
    description: "Languages you speak and your actual proficiency level",
    placeholder: "e.g., Native in English, conversational in Spanish after 4 years of school study..."
  },
  {
    id: "recommendations",
    title: "Recommendations",
    description: "A short note for someone you're asking to write you a recommendation",
    placeholder: "e.g., Asking my robotics coach to write about my leadership on the team over 2 years..."
  },
  {
    id: "featured",
    title: "Featured Links & Media",
    description: "Portfolio links, articles, or media you want to showcase",
    placeholder: "e.g., Link to my personal project website, a video of my science fair presentation..."
  },
  {
    id: "test-scores",
    title: "Test Scores",
    description: "Standardized test scores, presented exactly as earned",
    placeholder: "e.g., SAT 1520, AP Calculus BC 5, AP Computer Science A 5..."
  },
  {
    id: "posts",
    title: "LinkedIn Post",
    description: "Turn your casual thoughts into a professional post",
    placeholder: "e.g., Just got my certificate for completing the Google IT course! So excited..."
  }
];
