import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mic } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Seo } from "@/components/Seo";
import { WelcomeTourDialog } from "@/components/WelcomeTourDialog";
import { Eyebrow, Panel, Tag } from "@/components/cluely/primitives";

interface Recommendation {
  type: 'do' | 'improve' | 'stop';
  title: string;
  description: string;
  reason: string;
}

// Generate personalized recommendations based on user data
function generateRecommendations(data: any): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // High-impact activity based on work style and major
  if (data.preferred_work_types?.includes('competitions')) {
    recommendations.push({
      type: 'do',
      title: 'Prioritize Competitions in Your Field',
      description: `Focus on olympiads or hackathons related to ${data.intended_major || 'your major'}.`,
      reason: `You prefer competitions and have ${data.weekly_hours_available || '10-15 hours'} weekly.`,
    });
  } else if (data.preferred_work_types?.includes('long-term')) {
    recommendations.push({
      type: 'do',
      title: 'Start a Long-Term Research Project',
      description: `Initiate a 6-month research project in ${data.intended_major || 'your area'}.`,
      reason: 'Long-term projects align with your preferred work style.',
    });
  } else if (data.preferred_work_types?.includes('independent')) {
    recommendations.push({
      type: 'do',
      title: 'Build an Independent Portfolio Project',
      description: 'Create a self-directed project that showcases your skills.',
      reason: 'Independent work is your strength — use it strategically.',
    });
  } else {
    recommendations.push({
      type: 'do',
      title: 'Join a Collaborative Club or Initiative',
      description: 'Find a team-based activity that aligns with your interests.',
      reason: 'Team-based work is where you thrive.',
    });
  }

  // Skill gap based on constraint
  const constraintMap: Record<string, Recommendation> = {
    time: {
      type: 'improve',
      title: 'Master Time Blocking',
      description: 'Use the Calendar to allocate focused 2-hour blocks.',
      reason: 'You identified time as your biggest constraint.',
    },
    guidance: {
      type: 'improve',
      title: 'Use the Voice Advisor Regularly',
      description: 'Ask for direction when feeling stuck — clarity compounds.',
      reason: 'You need more structured guidance to move forward.',
    },
    confidence: {
      type: 'improve',
      title: 'Start Small, Build Evidence',
      description: 'Complete one small win this week to build momentum.',
      reason: 'Confidence grows from proof, not preparation.',
    },
    resources: {
      type: 'improve',
      title: 'Maximize Free Online Opportunities',
      description: 'Focus on competitions and programs with no cost barrier.',
      reason: 'We\'ll prioritize accessible opportunities for you.',
    },
  };
  
  if (data.biggest_constraint && constraintMap[data.biggest_constraint]) {
    recommendations.push(constraintMap[data.biggest_constraint]);
  }

  // Deprioritize something based on major confidence
  if (data.major_confidence < 50) {
    recommendations.push({
      type: 'stop',
      title: 'Don\'t Over-Specialize Yet',
      description: 'Explore 2-3 related fields before committing to one path.',
      reason: `Your ${data.major_confidence}% confidence suggests exploration is wise.`,
    });
  } else if (data.major_confidence >= 80) {
    recommendations.push({
      type: 'stop',
      title: 'Stop Dabbling — Go Deep',
      description: 'Reduce breadth activities and focus on depth in your major.',
      reason: 'High confidence means specialization pays off.',
    });
  } else {
    recommendations.push({
      type: 'stop',
      title: 'Avoid Prestige Chasing',
      description: 'Skip activities done purely for resume padding.',
      reason: 'Authentic engagement beats superficial involvement.',
    });
  }

  // Fear-based recommendation
  const fearAdvice: Record<string, Recommendation> = {
    rejection: {
      type: 'improve',
      title: 'Build a Balanced College List',
      description: 'Include 3 safety schools you\'d genuinely be happy at.',
      reason: 'Reducing all-or-nothing pressure helps performance.',
    },
    essays: {
      type: 'do',
      title: 'Start Essay Brainstorming Now',
      description: 'Use our Essay Builder to capture authentic stories early.',
      reason: 'Essays are your biggest concern — address it head-on.',
    },
    'standing-out': {
      type: 'do',
      title: 'Find Your Unique Angle',
      description: 'Identify what\'s unusual about your combination of interests.',
      reason: 'Standing out comes from specificity, not more activities.',
    },
    time: {
      type: 'improve',
      title: 'Create a Countdown Calendar',
      description: 'Map key deadlines backwards from application dates.',
      reason: 'Visibility reduces time anxiety.',
    },
    competition: {
      type: 'stop',
      title: 'Stop Comparing to Others',
      description: 'Focus on your own trajectory, not perceived competition.',
      reason: 'Competition anxiety doesn\'t improve outcomes.',
    },
    uncertainty: {
      type: 'improve',
      title: 'Learn the Process Step-by-Step',
      description: 'Use our chatbot to get clear answers about the application process.',
      reason: 'Understanding the process reduces uncertainty.',
    },
  };

  if (data.biggest_fear && fearAdvice[data.biggest_fear]) {
    recommendations.push(fearAdvice[data.biggest_fear]);
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

function generateSummary(data: any): string {
  const grade = data.grade || 'high school';
  const major = data.intended_major || 'your chosen field';
  const hours = data.weekly_hours_available || 'limited time';
  const constraint = data.biggest_constraint || 'some challenges';
  
  const constraintText: Record<string, string> = {
    time: 'you\'re short on time',
    guidance: 'you need clearer direction',
    confidence: 'building confidence is key',
    resources: 'you need accessible opportunities',
  };

  return `As a ${grade} student interested in ${major}, with ${hours} available and ${constraintText[constraint] || 'unique constraints'}, here's what matters most right now.`;
}

export default function Recommendations() {
  const { onboardingData, profile } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);

  useEffect(() => {
    if (onboardingData) {
      setRecommendations(generateRecommendations(onboardingData));
      setSummary(generateSummary(onboardingData));
    }
  }, [onboardingData]);

  // Fires exactly once: OnboardingSurvey sets this right before routing here
  // on submit, so a later revisit to /recommendations (bookmark, back button)
  // never re-shows the tour.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('pf:justOnboarded') === '1') {
        sessionStorage.removeItem('pf:justOnboarded');
        setShowWelcomeTour(true);
      }
    } catch { /* ignore */ }
  }, []);

  const typeLabels = {
    do: 'Focus on',
    improve: 'Work on',
    stop: 'Deprioritize',
  };

  const typeTone: Record<Recommendation["type"], "accent" | "neutral" | "muted"> = {
    do: "accent",
    improve: "neutral",
    stop: "muted",
  };

  return (
    <div data-cluely className="min-h-svh bg-background py-12 font-cluely">
      <Seo title='Recommendations' description='High-impact, personalized actions to strengthen your college profile based on your major and goals.' path='/recommendations' />
      <WelcomeTourDialog
        open={showWelcomeTour}
        onOpenChange={setShowWelcomeTour}
        firstName={profile?.full_name?.trim().split(/\s+/)[0]}
      />
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Eyebrow>Personalized for you</Eyebrow>
          <h1 className="mt-2 max-w-[22ch] text-balance font-cluely text-[clamp(1.7rem,5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
            Your recommended focus
          </h1>
          <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </motion.div>

        <div className="mb-10 space-y-3">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Panel className="p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  <Tag tone={typeTone[rec.type]}>{typeLabels[rec.type]}</Tag>
                </div>
                <h3 className="font-cluely text-[14.5px] font-semibold tracking-[-0.01em] text-foreground">{rec.title}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{rec.description}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Why: {rec.reason}
                </p>
              </Panel>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col justify-center gap-3 sm:flex-row"
        >
          <Button onClick={() => navigate('/advisor')} size="lg" className="gap-2">
            <Mic className="h-4 w-4" />
            Talk to your advisor
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
          These recommendations will evolve as you make progress and share more about your journey.
        </p>
      </div>
    </div>
  );
}
