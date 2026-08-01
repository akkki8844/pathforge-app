// Admissions Probability Calculator
// Generalized mathematical model - realistic, conservative probabilities
// Strong profiles get meaningful increases; weak profiles get appropriately low chances

import { colleges, College } from './colleges';

// ============= CORE MATHEMATICAL MODEL =============
// Tier base rates with wider probability ranges for stronger differentiation

const tierBaseRates: Record<string, { baseRate: number; perfectProfileRate: number; minFloor: number }> = {
  'global': { baseRate: 0.04, perfectProfileRate: 0.25, minFloor: 0.02 },    // Top 20 global: 4-25%
  'national': { baseRate: 0.12, perfectProfileRate: 0.55, minFloor: 0.05 },  // Top national: 12-55%
  'regional': { baseRate: 0.30, perfectProfileRate: 0.75, minFloor: 0.15 },  // Regional: 30-75%
};

// ============= GENERALIZED SCORING FUNCTIONS =============

/**
 * Converts GPA to a 0-4.0 normalized scale
 */
function normalizeGPA(gpa: string | null, curriculum: string): number {
  if (!gpa) return 0;
  
  const numericGPA = parseFloat(gpa);
  if (isNaN(numericGPA) || numericGPA < 0) return 0;
  
  let normalized: number;

  // Convert all scales to 0-4.0
  if (curriculum === 'IB') {
    // IB is 24–45, not 0–45: a 24 is a pass, 45 is near-unheard-of. Mapping
    // linearly from zero made every IB student look far weaker than they are
    // (a 38 — roughly top decile — scored like a 3.4 GPA). Anchor the usable
    // band instead: 24 -> 2.0, 45 -> 4.0.
    normalized = numericGPA <= 0 ? 0 : 2.0 + ((Math.min(45, numericGPA) - 24) / 21) * 2.0;
  } else if (curriculum === 'A-Levels') {
    // A-Levels are lettered (A*–E). Users enter either a UMS/percentage
    // (0–100) or a small points total; treating a "3" as 3% was scoring
    // strong A-Level candidates at zero.
    normalized = numericGPA > 10 ? (numericGPA / 100) * 4.0 : (numericGPA / 4.0) * 4.0;
  } else if (numericGPA > 4.0 && numericGPA <= 5.0) {
    // Weighted 5.0 scale. Dividing by 5.0 punished weighted GPAs: a 4.5W
    // mapped to 3.6 and therefore scored *below* an unweighted 4.0, which is
    // backwards — a 4.5W is the stronger profile. Treat 4.0+ on a weighted
    // scale as at-or-above the unweighted ceiling.
    normalized = 4.0;
  } else if (numericGPA > 5.0) {
    // Percentage scale
    normalized = (numericGPA / 100) * 4.0;
  } else {
    normalized = numericGPA;
  }

  return Math.min(4.0, Math.max(0, normalized));
}

/**
 * GPA scoring with gentler curve for strong GPAs
 * Perfect 4.0 = 100, 3.8 = ~90, 3.5 = ~75, 3.0 = ~50
 */
function scoreGPA(gpa: string | null, curriculum: string): number {
  const normalized = normalizeGPA(gpa, curriculum);
  if (normalized === 0) return 0;
  
  // Use a polynomial curve that rewards high GPAs more
  // score = 100 * (gpa/4.0)^1.5 for gentler decay at high end
  const ratio = normalized / 4.0;
  const score = 100 * Math.pow(ratio, 1.3);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * SAT scoring - 1500+ gets excellent scores
 */
function scoreSAT(score: number): number {
  if (score < 400) return 0;
  if (score >= 1600) return 100;
  
  // Piece-wise linear for clarity:
  // 400-1000: 0-30
  // 1000-1300: 30-60
  // 1300-1500: 60-90
  // 1500-1600: 90-100
  
  if (score < 1000) {
    return ((score - 400) / 600) * 30;
  } else if (score < 1300) {
    return 30 + ((score - 1000) / 300) * 30;
  } else if (score < 1500) {
    return 60 + ((score - 1300) / 200) * 30;
  } else {
    return 90 + ((score - 1500) / 100) * 10;
  }
}

/**
 * ACT scoring - 34+ gets excellent scores
 */
function scoreACT(score: number): number {
  if (score < 1) return 0;
  if (score >= 36) return 100;
  
  // 1-20: 0-40
  // 20-30: 40-70
  // 30-34: 70-90
  // 34-36: 90-100
  
  if (score < 20) {
    return (score / 20) * 40;
  } else if (score < 30) {
    return 40 + ((score - 20) / 10) * 30;
  } else if (score < 34) {
    return 70 + ((score - 30) / 4) * 20;
  } else {
    return 90 + ((score - 34) / 2) * 10;
  }
}

/**
 * Combined test score function
 */
function scoreTestScores(satScore: string | null, actScore: string | null): number {
  const sat = satScore ? parseInt(satScore) : 0;
  const act = actScore ? parseInt(actScore) : 0;
  
  const satScoreVal = sat >= 400 ? scoreSAT(sat) : 0;
  const actScoreVal = act >= 1 ? scoreACT(act) : 0;
  
  return Math.max(satScoreVal, actScoreVal);
}

/**
 * AP/IB exam scoring - rewards both quality and quantity
 */
function scoreAPExams(apScores: string | null): number {
  if (!apScores || apScores.trim() === '') return 0;
  
  const scores = apScores.split(/[,\s]+/)
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n >= 1 && n <= 7); // Support both AP (1-5) and IB (1-7)
  
  if (scores.length === 0) return 0;
  
  // Average score contribution (scaled for AP 1-5, IB 1-7)
  const maxScore = Math.max(...scores) <= 5 ? 5 : 7;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const avgContribution = ((avgScore - 1) / (maxScore - 1)) * 60;
  
  // Count bonus (more exams = better, with diminishing returns)
  const countBonus = Math.min(40, scores.length * 5);
  
  return Math.min(100, avgContribution + countBonus);
}

/**
 * Extracurricular level scoring
 */
function scoreExtracurriculars(level: string): number {
  const levels: Record<string, number> = {
    'national': 100,
    'state': 80,
    'regional': 65,
    'local': 45,
    'beginner': 25,
  };
  return levels[level] || 25;
}

/**
 * Class rank scoring (percentile-based)
 */
function scoreClassRank(rank: number | null, classSize: number | null): number {
  if (!rank || !classSize || classSize < rank) return 0;
  
  const percentile = 1 - (rank / classSize);
  // Top 5% = 100, Top 10% = 90, Top 25% = 70, Top 50% = 50
  return Math.pow(percentile, 0.6) * 100;
}

/**
 * Academic rigor scoring
 */
function scoreAcademicRigor(
  apCourseCount: number,
  honorsCourseCount: number,
  curriculum: string
): number {
  // IB curriculum is inherently rigorous
  if (curriculum === 'IB') {
    return Math.min(100, 70 + apCourseCount * 4);
  }
  
  // A-Levels considered rigorous
  if (curriculum === 'A-Levels') {
    return Math.min(100, 65 + apCourseCount * 4);
  }
  
  // Standard US curriculum - AP/Honors courses matter
  const apScore = Math.min(60, apCourseCount * 7);
  const honorsScore = Math.min(25, honorsCourseCount * 2.5);
  const baseScore = 15;
  
  return Math.min(100, baseScore + apScore + honorsScore);
}

/**
 * Major fit scoring
 */
function scoreMajorRelevance(intendedMajor: string, collegeStrongMajors: string[]): number {
  if (!intendedMajor || !collegeStrongMajors.length) return 60;
  
  const majorLower = intendedMajor.toLowerCase();
  
  // Direct match
  for (const strongMajor of collegeStrongMajors) {
    if (strongMajor.toLowerCase().includes(majorLower) || 
        majorLower.includes(strongMajor.toLowerCase())) {
      return 100;
    }
  }
  
  // Related field matches
  const relatedFields: Record<string, string[]> = {
    'computer science': ['electrical engineering', 'mathematics', 'data science', 'artificial intelligence', 'engineering'],
    'business': ['economics', 'finance', 'marketing', 'management', 'accounting'],
    'medicine': ['biology', 'pre-med', 'chemistry', 'neuroscience', 'healthcare', 'biochemistry'],
    'engineering': ['physics', 'mathematics', 'mechanical', 'electrical', 'civil', 'computer science'],
    'law': ['political science', 'philosophy', 'international relations', 'history'],
  };
  
  for (const [field, related] of Object.entries(relatedFields)) {
    if (majorLower.includes(field)) {
      for (const strongMajor of collegeStrongMajors) {
        if (related.some(r => strongMajor.toLowerCase().includes(r))) {
          return 75;
        }
      }
    }
  }
  
  return 55;
}

/**
 * Timeline scoring
 */
function scoreTimeline(grade: string, applicationYear: string): number {
  const currentYear = new Date().getFullYear();
  const appYear = parseInt(applicationYear, 10);
  const gradeNum = parseInt(grade, 10);
  
  if (isNaN(gradeNum) || isNaN(appYear)) return 70;
  
  const expectedAppYear = currentYear + (12 - gradeNum);
  const difference = Math.abs(appYear - expectedAppYear);
  
  return Math.max(30, 100 - difference * 15);
}

// ============= MAIN CALCULATION =============

export interface AdmissionsProbabilityResult {
  collegeName: string;
  collegeId: string;
  probability: number;
  tier: string;
  strengths: string[];
  weaknesses: string[];
  improvements: {
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  breakdown: {
    academic: number;
    testScores: number;
    apExams: number;
    extracurriculars: number;
    academicRigor: number;
    classRank: number;
    majorFit: number;
    timeline: number;
  };
}

export interface AdmissionsInput {
  gpa: string | null;
  curriculum: string;
  grade: string;
  applicationYear: string;
  satScore: string | null;
  actScore: string | null;
  apScores: string | null;
  apCourseCount: number;
  honorsCourseCount: number;
  classRank: number | null;
  classSize: number | null;
  intendedMajor: string;
  extracurricularLevel: string;
  targetUniversities: string[];
}

/**
 * Main calculation function - realistic probability scaling
 */
export function calculateAdmissionsProbability(input: AdmissionsInput): AdmissionsProbabilityResult[] {
  const results: AdmissionsProbabilityResult[] = [];
  
  // Calculate component scores
  const academicScore = scoreGPA(input.gpa, input.curriculum);
  const testScore = scoreTestScores(input.satScore, input.actScore);
  const apExamScore = scoreAPExams(input.apScores);
  const ecScore = scoreExtracurriculars(input.extracurricularLevel);
  const rigorScore = scoreAcademicRigor(input.apCourseCount || 0, input.honorsCourseCount || 0, input.curriculum);
  const rankScore = scoreClassRank(input.classRank, input.classSize);
  const timelineScore = scoreTimeline(input.grade, input.applicationYear);
  
  for (const universityName of input.targetUniversities) {
    const college = colleges.find(c => c.name === universityName);
    const tierConfig = tierBaseRates[college?.level || 'regional'];
    const majorFitScore = scoreMajorRelevance(input.intendedMajor, college?.strongMajors || []);
    
    // Component weights
    const weights = {
      academic: 0.28,
      testScores: 0.22,
      rigor: 0.12,
      apExams: 0.08,
      extracurriculars: 0.18,
      majorFit: 0.06,
      classRank: 0.04,
      timeline: 0.02,
    };
    
    // ── Absent data must not be graded as a zero ─────────────────────────
    // Previously only class rank was handled this way, so a test-optional
    // applicant silently forfeited the entire 22% test weight (scored 0), and
    // anyone on a curriculum without AP exams forfeited another 8%. Both were
    // scored as if the student had tested and done badly, which is a very
    // different claim from "did not report". We now drop absent components
    // and renormalize the surviving weights, so a profile is judged only on
    // what the student actually submitted.
    const hasTests = Boolean(
      (input.satScore && parseInt(input.satScore, 10) >= 400) ||
      (input.actScore && parseInt(input.actScore, 10) >= 1)
    );
    const hasApExams = apExamScore > 0;
    const hasClassRank = Boolean(input.classRank && input.classSize);

    const components: { score: number; weight: number }[] = [
      { score: academicScore, weight: weights.academic },
      { score: rigorScore, weight: weights.rigor },
      { score: ecScore, weight: weights.extracurriculars },
      { score: majorFitScore, weight: weights.majorFit },
      { score: timelineScore, weight: weights.timeline },
    ];
    if (hasTests) components.push({ score: testScore, weight: weights.testScores });
    if (hasApExams) components.push({ score: apExamScore, weight: weights.apExams });
    if (hasClassRank) components.push({ score: rankScore, weight: weights.classRank });

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const compositeScore = totalWeight > 0
      ? components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight
      : 0;
    
    // ============= PROBABILITY MAPPING =============
    // Use a linear-ish mapping with realistic scaling
    
    const { baseRate, perfectProfileRate, minFloor } = tierConfig;
    const probabilityRange = perfectProfileRate - baseRate;
    
    // Map composite score to probability
    // Score 0-50: baseRate to midpoint
    // Score 50-80: midpoint to high range
    // Score 80-100: high range to perfect profile rate
    
    let probability: number;
    const normalizedScore = compositeScore / 100;
    
    if (normalizedScore < 0.5) {
      // Low scores: stay near base rate
      probability = baseRate + (probabilityRange * 0.2 * (normalizedScore / 0.5));
    } else if (normalizedScore < 0.75) {
      // Mid scores: linear scaling through the middle range
      const midRangeProgress = (normalizedScore - 0.5) / 0.25;
      probability = baseRate + (probabilityRange * 0.2) + (probabilityRange * 0.4 * midRangeProgress);
    } else {
      // High scores: scale toward perfect profile rate
      const highRangeProgress = (normalizedScore - 0.75) / 0.25;
      probability = baseRate + (probabilityRange * 0.6) + (probabilityRange * 0.4 * highRangeProgress);
    }
    
    // ============= PENALTY ADJUSTMENTS =============
    // Only apply severe penalties for truly weak profiles
    
    // GPA penalty - only for significantly low GPAs
    if (academicScore < 40) {
      const penalty = (40 - academicScore) / 40;
      probability *= (1 - penalty * 0.4); // Max 40% reduction for very low GPA
    }
    
    // Test score penalty - only for low scores when tests are provided
    if (testScore > 0 && testScore < 40) {
      const penalty = (40 - testScore) / 40;
      probability *= (1 - penalty * 0.25); // Max 25% reduction
    }
    
    // Missing test penalty for global tier only
    if (testScore === 0 && college?.level === 'global') {
      probability *= 0.8; // 20% reduction - test optional exists
    }
    
    // Convert to percentage and apply floor
    probability = Math.max(minFloor, Math.min(perfectProfileRate, probability));
    probability = Math.round(probability * 100);
    
    // ============= GENERATE FEEDBACK =============
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: AdmissionsProbabilityResult['improvements'] = [];
    
    // Academic feedback
    if (academicScore >= 90) {
      strengths.push('Exceptional GPA demonstrates outstanding academic ability');
    } else if (academicScore >= 75) {
      strengths.push('Strong GPA in competitive range');
    } else if (academicScore >= 60) {
      improvements.push({
        action: 'Focus on maintaining upward grade trend in remaining courses',
        impact: 'Demonstrating improvement can offset earlier grades',
        priority: 'medium',
      });
    } else if (academicScore > 0) {
      weaknesses.push('GPA is below typical admitted student average');
      improvements.push({
        action: 'Prioritize academic performance in remaining semesters and consider additional rigorous coursework',
        impact: college?.level === 'global' 
          ? 'Top-tier schools heavily weight GPA - significant improvement needed'
          : 'Improving grades will strengthen your overall profile',
        priority: 'high',
      });
    }
    
    // Test score feedback
    if (testScore >= 90) {
      strengths.push('Excellent standardized test scores in top percentile');
    } else if (testScore >= 75) {
      strengths.push('Competitive test scores');
    } else if (testScore >= 50) {
      improvements.push({
        action: `Consider retaking with focused prep - target ${college?.level === 'global' ? '1500+ SAT or 34+ ACT' : '1400+ SAT or 32+ ACT'}`,
        impact: 'Higher scores can differentiate your application',
        priority: 'medium',
      });
    } else if (testScore > 0) {
      weaknesses.push('Test scores below competitive range');
      improvements.push({
        action: 'Intensive test prep and retake recommended',
        impact: 'Significant score improvement needed for competitive consideration',
        priority: 'high',
      });
    } else {
      improvements.push({
        action: 'Consider taking SAT or ACT if not already planned',
        impact: 'Many competitive schools still value test scores',
        priority: 'medium',
      });
    }
    
    // Academic rigor feedback
    if (rigorScore >= 85) {
      strengths.push('Excellent course rigor with challenging curriculum');
    } else if (rigorScore >= 65) {
      strengths.push('Good course rigor');
    } else if (rigorScore < 50) {
      weaknesses.push('Limited advanced coursework');
      improvements.push({
        action: 'Enroll in more AP, IB, or Honors courses if available',
        impact: 'Course rigor is a key factor in holistic review',
        priority: 'medium',
      });
    }
    
    // Extracurricular feedback
    if (ecScore >= 85) {
      strengths.push('Outstanding extracurricular achievement');
    } else if (ecScore >= 65) {
      strengths.push('Solid extracurricular involvement');
    } else if (ecScore < 50) {
      weaknesses.push('Limited extracurricular depth');
      improvements.push({
        action: 'Develop leadership roles and deeper involvement in 2-3 key activities',
        impact: 'Quality and depth of involvement matters more than quantity',
        priority: 'high',
      });
    }
    
    // Major fit feedback
    if (majorFitScore >= 80 && college) {
      strengths.push(`Strong alignment with ${college.name}'s programs in your intended field`);
    }
    
    // Class rank feedback
    if (rankScore >= 90) {
      strengths.push('Top class rank demonstrates academic excellence');
    }
    
    results.push({
      collegeName: college?.name || universityName,
      collegeId: college?.id || universityName.toLowerCase().replace(/\s+/g, '-'),
      probability,
      tier: college?.level || 'unknown',
      strengths,
      weaknesses,
      improvements,
      breakdown: {
        academic: Math.round(academicScore),
        testScores: Math.round(testScore),
        apExams: Math.round(apExamScore),
        extracurriculars: Math.round(ecScore),
        academicRigor: Math.round(rigorScore),
        classRank: Math.round(rankScore || 0),
        majorFit: Math.round(majorFitScore),
        timeline: Math.round(timelineScore),
      },
    });
  }
  
  results.sort((a, b) => b.probability - a.probability);
  
  return results;
}
