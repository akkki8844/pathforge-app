import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, Target, AlertTriangle, Lightbulb, Clock, TrendingUp, TrendingDown, Mic, GraduationCap } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import pathforgeLogo from '@/assets/pathforge-logo.png';
import { Seo } from "@/components/Seo";

interface Recommendation {
  type: 'do' | 'improve' | 'stop';
  title: string;
  description: string;
  reason: string;
  icon: React.ReactNode;
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
      icon: <Target className="h-5 w-5" />,
    });
  } else if (data.preferred_work_types?.includes('long-term')) {
    recommendations.push({
      type: 'do',
      title: 'Start a Long-Term Research Project',
      description: `Initiate a 6-month research project in ${data.intended_major || 'your area'}.`,
      reason: 'Long-term projects align with your preferred work style.',
      icon: <TrendingUp className="h-5 w-5" />,
    });
  } else if (data.preferred_work_types?.includes('independent')) {
    recommendations.push({
      type: 'do',
      title: 'Build an Independent Portfolio Project',
      description: 'Create a self-directed project that showcases your skills.',
      reason: 'Independent work is your strength — use it strategically.',
      icon: <Lightbulb className="h-5 w-5" />,
    });
  } else {
    recommendations.push({
      type: 'do',
      title: 'Join a Collaborative Club or Initiative',
      description: 'Find a team-based activity that aligns with your interests.',
      reason: 'Team-based work is where you thrive.',
      icon: <Target className="h-5 w-5" />,
    });
  }

  // Skill gap based on constraint
  const constraintMap: Record<string, Recommendation> = {
    time: {
      type: 'improve',
      title: 'Master Time Blocking',
      description: 'Use the Weekly Planner to allocate focused 2-hour blocks.',
      reason: 'You identified time as your biggest constraint.',
      icon: <Clock className="h-5 w-5" />,
    },
    guidance: {
      type: 'improve',
      title: 'Use the Voice Advisor Regularly',
      description: 'Ask for direction when feeling stuck — clarity compounds.',
      reason: 'You need more structured guidance to move forward.',
      icon: <Mic className="h-5 w-5" />,
    },
    confidence: {
      type: 'improve',
      title: 'Start Small, Build Evidence',
      description: 'Complete one small win this week to build momentum.',
      reason: 'Confidence grows from proof, not preparation.',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    resources: {
      type: 'improve',
      title: 'Maximize Free Online Opportunities',
      description: 'Focus on competitions and programs with no cost barrier.',
      reason: 'We\'ll prioritize accessible opportunities for you.',
      icon: <Lightbulb className="h-5 w-5" />,
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
      icon: <AlertTriangle className="h-5 w-5" />,
    });
  } else if (data.major_confidence >= 80) {
    recommendations.push({
      type: 'stop',
      title: 'Stop Dabbling — Go Deep',
      description: 'Reduce breadth activities and focus on depth in your major.',
      reason: 'High confidence means specialization pays off.',
      icon: <TrendingDown className="h-5 w-5" />,
    });
  } else {
    recommendations.push({
      type: 'stop',
      title: 'Avoid Prestige Chasing',
      description: 'Skip activities done purely for resume padding.',
      reason: 'Authentic engagement beats superficial involvement.',
      icon: <AlertTriangle className="h-5 w-5" />,
    });
  }

  // Fear-based recommendation
  const fearAdvice: Record<string, Recommendation> = {
    rejection: {
      type: 'improve',
      title: 'Build a Balanced College List',
      description: 'Include 3 safety schools you\'d genuinely be happy at.',
      reason: 'Reducing all-or-nothing pressure helps performance.',
      icon: <Target className="h-5 w-5" />,
    },
    essays: {
      type: 'do',
      title: 'Start Essay Brainstorming Now',
      description: 'Use our Essay Builder to capture authentic stories early.',
      reason: 'Essays are your biggest concern — address it head-on.',
      icon: <Lightbulb className="h-5 w-5" />,
    },
    'standing-out': {
      type: 'do',
      title: 'Find Your Unique Angle',
      description: 'Identify what\'s unusual about your combination of interests.',
      reason: 'Standing out comes from specificity, not more activities.',
      icon: <GraduationCap className="h-5 w-5" />,
    },
    time: {
      type: 'improve',
      title: 'Create a Countdown Calendar',
      description: 'Map key deadlines backwards from application dates.',
      reason: 'Visibility reduces time anxiety.',
      icon: <Clock className="h-5 w-5" />,
    },
    competition: {
      type: 'stop',
      title: 'Stop Comparing to Others',
      description: 'Focus on your own trajectory, not perceived competition.',
      reason: 'Competition anxiety doesn\'t improve outcomes.',
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    uncertainty: {
      type: 'improve',
      title: 'Learn the Process Step-by-Step',
      description: 'Use our chatbot to get clear answers about the application process.',
      reason: 'Understanding the process reduces uncertainty.',
      icon: <Lightbulb className="h-5 w-5" />,
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
  const { onboardingData } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    if (onboardingData) {
      setRecommendations(generateRecommendations(onboardingData));
      setSummary(generateSummary(onboardingData));
    }
  }, [onboardingData]);

  const typeStyles = {
    do: 'border-green-500/30 bg-green-500/5',
    improve: 'border-yellow-500/30 bg-yellow-500/5',
    stop: 'border-red-500/30 bg-red-500/5',
  };

  const typeLabels = {
    do: 'Focus On',
    improve: 'Work On',
    stop: 'Deprioritize',
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <Seo title='Personalized recommendations | Pathforge' description='High-impact, personalized actions to strengthen your college profile based on your major and goals.' path='/recommendations' />
      <div className="section-container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <img src={pathforgeLogo} alt="Pathforge logo" className="h-10 mx-auto mb-6" />
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent mb-4">
            <GraduationCap className="h-4 w-4" />
            Personalized for You
          </div>
          <h1 className="text-3xl font-bold text-foreground">Your Recommended Focus</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {summary}
          </p>
        </motion.div>

        <div className="space-y-4 mb-10">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-5 rounded-xl border ${typeStyles[rec.type]}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  rec.type === 'do' ? 'bg-green-500/20 text-green-500' :
                  rec.type === 'improve' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium uppercase tracking-wide ${
                      rec.type === 'do' ? 'text-green-500' :
                      rec.type === 'improve' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {typeLabels[rec.type]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-2 italic">
                    Why: {rec.reason}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate('/advisor')}
            size="lg"
            className="btn-accent gap-2"
          >
            <Mic className="h-5 w-5" />
            Talk to Your Advisor
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          These recommendations will evolve as you make progress and share more about your journey.
        </p>
      </div>
    </div>
  );
}
