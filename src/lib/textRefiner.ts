// Text refinement utilities for LinkedIn Builder
// These are CLIENT-SIDE transformations for LinkedIn sections ONLY
// Application Builder uses the AI edge function exclusively

/**
 * Helper to capitalize first letter properly
 */
function capitalize(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Clean up spacing and punctuation
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])([A-Za-z])/g, '$1 $2')
    .replace(/([.!?]){2,}/g, '$1')
    .trim();
}

/**
 * Extract key topics from input for dynamic content generation
 */
function extractKeywords(input: string): string[] {
  const stopWords = new Set(['i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'my', 'like', 'really', 'also', 'about', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'doing', 'would', 'could', 'should', 'might', 'must']);
  
  return input
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 5);
}

// ============================================
// LinkedIn Section Refiners
// ============================================

export function refineHeadline(input: string): string {
  const keywords = extractKeywords(input);
  const mainKeyword = keywords[0] || 'professional development';
  
  const capitalized = mainKeyword
    .split(' ')
    .map(w => capitalize(w))
    .join(' ');
  
  const lower = input.toLowerCase();
  
  // Detect field and create contextual headline
  let field = 'General';
  if (lower.match(/tech|software|code|programming|developer|computer|data|ai|machine learning/)) {
    field = 'Technology';
  } else if (lower.match(/business|entrepreneur|marketing|finance|management/)) {
    field = 'Business';
  } else if (lower.match(/medicine|health|doctor|nurse|medical|pre-med|biology/)) {
    field = 'Healthcare';
  } else if (lower.match(/law|legal|policy|government|politics/)) {
    field = 'Law & Policy';
  } else if (lower.match(/engineer|robotics|mechanical|electrical|civil/)) {
    field = 'Engineering';
  } else if (lower.match(/research|science|physics|chemistry|laboratory/)) {
    field = 'Science & Research';
  } else if (lower.match(/art|design|creative|music|film|media/)) {
    field = 'Creative Arts';
  } else if (lower.match(/education|teaching|tutor|mentor/)) {
    field = 'Education';
  }
  
  // Generate unique headline based on content
  const descriptors = ['Aspiring', 'Emerging', 'Future', 'Dedicated', 'Passionate'];
  const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
  
  const roles: Record<string, string[]> = {
    'Technology': ['Developer', 'Innovator', 'Engineer', 'Creator'],
    'Business': ['Leader', 'Strategist', 'Entrepreneur', 'Analyst'],
    'Healthcare': ['Professional', 'Practitioner', 'Advocate', 'Specialist'],
    'Law & Policy': ['Advocate', 'Professional', 'Analyst', 'Specialist'],
    'Engineering': ['Engineer', 'Designer', 'Innovator', 'Builder'],
    'Science & Research': ['Researcher', 'Scientist', 'Scholar', 'Analyst'],
    'Creative Arts': ['Creator', 'Artist', 'Designer', 'Storyteller'],
    'Education': ['Educator', 'Mentor', 'Leader', 'Advocate'],
    'General': ['Professional', 'Leader', 'Learner', 'Achiever']
  };
  
  const roleOptions = roles[field] || roles['General'];
  const role = roleOptions[Math.floor(Math.random() * roleOptions.length)];
  
  return `${descriptor} ${field} ${role} | ${capitalize(capitalized)} Focus | Committed to Excellence`;
}

export function refineAbout(input: string): string {
  if (!input.trim()) return '';
  
  const keywords = extractKeywords(input);
  const cleaned = cleanText(input);
  
  // Build a dynamic about section based on actual content
  let about = '';
  
  if (keywords.length >= 2) {
    const primary = capitalize(keywords[0]);
    const secondary = capitalize(keywords[1]);
    about = `A driven student exploring the intersection of ${primary} and ${secondary}. `;
  } else if (keywords.length === 1) {
    about = `A dedicated student with deep interest in ${capitalize(keywords[0])}. `;
  } else {
    about = `${capitalize(cleaned)} `;
  }
  
  // Add context based on what they wrote
  if (input.length > 50) {
    about += 'My academic journey has shaped both my analytical thinking and collaborative approach. ';
  }
  
  about += 'Open to connecting with professionals and peers who share similar interests.';
  
  return cleanText(about);
}

export function refineExperience(input: string): string {
  if (!input.trim()) return '';
  
  const sentences = input
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
  
  if (sentences.length === 0) {
    return `• ${capitalize(input.trim())}`;
  }
  
  // Transform each sentence into a professional bullet
  const bullets = sentences.map((sentence, index) => {
    let refined = sentence
      .replace(/^(i |i am |i was |i have |i've |my )/gi, '')
      .replace(/^(we |we are |we have |we've )/gi, '')
      .trim();
    
    refined = capitalize(refined);
    
    // Ensure it ends properly
    if (!/[.!?]$/.test(refined)) {
      refined += '.';
    }
    
    return `• ${refined}`;
  });
  
  return bullets.join('\n');
}

export function refineEducation(input: string): string {
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i go to |i attend |i'm at |i am at |i study at )/gi, '')
    .replace(/^(currently at |studying at |enrolled at )/gi, '')
    .trim();
  
  refined = capitalize(refined);
  
  if (!/[.!?]$/.test(refined)) {
    refined += '.';
  }
  
  if (refined.split(' ').length < 10) {
    refined += ' Focused on academic excellence while developing leadership skills through extracurricular engagement.';
  }
  
  return cleanText(refined);
}

export function refineSkills(input: string): string {
  if (!input.trim()) return '';
  
  const skills = input
    .split(/[,\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1)
    .map(s => capitalize(s));
  
  // Remove duplicates
  const unique = [...new Set(skills.map(s => s.toLowerCase()))].map(s => capitalize(s));
  
  if (unique.length === 0) {
    return `• ${capitalize(input)}`;
  }
  
  // Categorize skills
  const technical: string[] = [];
  const interpersonal: string[] = [];
  const other: string[] = [];
  
  const techTerms = ['programming', 'python', 'java', 'javascript', 'code', 'software', 'excel', 'data', 'analysis', 'web', 'computer', 'ai', 'machine learning', 'sql', 'html', 'css', 'react', 'database', 'cloud', 'linux', 'git', 'api', 'engineering', 'design'];
  const softTerms = ['leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving', 'creative', 'organized', 'time management', 'public speaking', 'presentation', 'writing', 'interpersonal', 'adaptability', 'critical thinking', 'mentoring'];
  
  unique.forEach(skill => {
    const lower = skill.toLowerCase();
    if (techTerms.some(t => lower.includes(t))) {
      technical.push(skill);
    } else if (softTerms.some(t => lower.includes(t))) {
      interpersonal.push(skill);
    } else {
      other.push(skill);
    }
  });
  
  const sections: string[] = [];
  
  if (technical.length > 0) {
    sections.push(`Technical: ${technical.join(' • ')}`);
  }
  if (interpersonal.length > 0) {
    sections.push(`Interpersonal: ${interpersonal.join(' • ')}`);
  }
  if (other.length > 0) {
    sections.push(`Additional: ${other.join(' • ')}`);
  }
  
  return sections.join('\n') || unique.map(s => `• ${s}`).join('\n');
}

export function refinePosts(input: string): string {
  if (!input.trim()) return '';
  
  const cleaned = cleanText(input);
  const capitalized = capitalize(cleaned);
  
  // Dynamic post structure based on content length and type
  let post = capitalized;
  
  if (!/[.!?]$/.test(post)) {
    post += '.';
  }
  
  // Add a brief reflection if content is short
  if (input.length < 100) {
    post += '\n\nLooking forward to continued growth and learning.';
  }
  
  // Add relevant hashtags based on content
  const hashtags: string[] = ['#Growth', '#Learning'];
  const lower = input.toLowerCase();
  
  if (lower.match(/intern|job|work|career/)) hashtags.push('#CareerDevelopment');
  if (lower.match(/award|achieve|accomplish|win/)) hashtags.push('#Achievement');
  if (lower.match(/volunteer|community|help|serve/)) hashtags.push('#CommunityService');
  if (lower.match(/research|study|science/)) hashtags.push('#Research');
  if (lower.match(/team|collaborate|together/)) hashtags.push('#Teamwork');
  
  post += '\n\n' + hashtags.slice(0, 4).join(' ');
  
  return post;
}

// ============================================
// Application Section Refiners
// These are FALLBACK ONLY - the AI edge function should be used
// ============================================

export function refineExtracurriculars(input: string): string {
  // This should NOT be called - Application Builder uses AI edge function
  // Keeping as minimal fallback only
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i |i am |i was |i'm )/gi, '')
    .trim();
  
  return `• ${capitalize(refined)}`;
}

export function refineResearch(input: string): string {
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i |i am |i was |i'm |i worked |i work )/gi, '')
    .trim();
  
  return capitalize(refined);
}

export function refineAwards(input: string): string {
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i |i am |i was |i'm |i won |i got |i received )/gi, '')
    .trim();
  
  return `• ${capitalize(refined)}`;
}

export function refineCourses(input: string): string {
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i |i am |i was |i'm |i took |i take |i'm taking )/gi, '')
    .replace(/\bap\b/gi, 'AP')
    .replace(/\bib\b/gi, 'IB')
    .replace(/\bhonors\b/gi, 'Honors')
    .trim();
  
  return capitalize(refined);
}

export function refineVolunteering(input: string): string {
  if (!input.trim()) return '';
  
  let refined = input
    .replace(/^(i |i am |i was |i'm |i volunteer |i help )/gi, '')
    .trim();
  
  return `• ${capitalize(refined)}`;
}

// ============================================
// LinkedIn Section Wrapper for Edge Function
// ============================================

// Synchronous LinkedIn section refiner for client-side use
export function refineLinkedInSection(section: string, input: string): string {
  if (!input.trim()) return '';
  
  // For LinkedIn, use local refiners for speed
  // These are specifically designed for LinkedIn's format
  switch (section) {
    case 'headline':
      return refineHeadline(input);
    case 'about':
      return refineAbout(input);
    case 'experience':
      return refineExperience(input);
    case 'education':
      return refineEducation(input);
    case 'skills':
      return refineSkills(input);
    case 'posts':
      return refinePosts(input);
    default:
      return cleanText(capitalize(input));
  }
}

// ============================================
// Essay Refinement - for Essays page
// ============================================

export function refineEssay(input: string, essayType: string): string {
  if (!input.trim()) return '';
  
  let refined = input.trim();
  
  // Clean up common informal patterns
  refined = refined
    .replace(/\bi think\b/gi, 'I believe')
    .replace(/\bi feel like\b/gi, 'I am confident that')
    .replace(/\bkinda\b/gi, 'somewhat')
    .replace(/\bsorta\b/gi, 'somewhat')
    .replace(/\breally\s+/gi, '')
    .replace(/\bjust\s+/gi, '')
    .replace(/\blike,?\s+/gi, '')
    .replace(/\byou know,?\s+/gi, '')
    .replace(/\bbasically,?\s+/gi, '');
  
  // Expand contractions for formal tone
  refined = refined
    .replace(/\bcan't\b/gi, 'cannot')
    .replace(/\bwon't\b/gi, 'will not')
    .replace(/\bdon't\b/gi, 'do not')
    .replace(/\bdoesn't\b/gi, 'does not')
    .replace(/\bdidn't\b/gi, 'did not')
    .replace(/\bisn't\b/gi, 'is not')
    .replace(/\bit's\b/gi, 'it is')
    .replace(/\bi'm\b/gi, 'I am')
    .replace(/\bi've\b/gi, 'I have')
    .replace(/\bi'll\b/gi, 'I will');
  
  // Clean up spacing
  refined = cleanText(refined);
  
  // Ensure proper sentence endings
  if (!/[.!?]$/.test(refined)) {
    refined += '.';
  }
  
  return refined;
}
