import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MicroQuestion {
  key: string;
  question: string;
  options: { id: string; label: string }[];
  contextType?: string;
  contextId?: string;
}

const microQuestions: Record<string, MicroQuestion> = {
  'week-1-action': {
    key: 'week-1-action',
    question: 'Have you acted on any of the recommendations we gave you?',
    options: [
      { id: 'yes-started', label: 'Yes, I started something new' },
      { id: 'yes-researching', label: 'Yes, I\'m researching options' },
      { id: 'not-yet', label: 'Not yet, but I plan to' },
      { id: 'no-unsure', label: 'No, I\'m unsure where to start' },
    ],
  },
  'activity-skip': {
    key: 'activity-skip',
    question: 'Why did you skip this activity?',
    options: [
      { id: 'no-time', label: 'No time right now' },
      { id: 'not-interested', label: 'Not interested in this type' },
      { id: 'too-hard', label: 'Seems too competitive' },
      { id: 'not-relevant', label: 'Not relevant to my goals' },
    ],
  },
  'probability-surprise': {
    key: 'probability-surprise',
    question: 'What surprised you about your admissions probability?',
    options: [
      { id: 'higher', label: 'It was higher than expected' },
      { id: 'lower', label: 'It was lower than expected' },
      { id: 'about-right', label: 'About what I expected' },
      { id: 'confused', label: 'I don\'t understand the score' },
    ],
  },
  'planner-feedback': {
    key: 'planner-feedback',
    question: 'How realistic was your planned schedule this week?',
    options: [
      { id: 'perfect', label: 'Stuck to it perfectly' },
      { id: 'mostly', label: 'Followed most of it' },
      { id: 'struggled', label: 'Struggled to keep up' },
      { id: 'abandoned', label: 'Had to abandon it' },
    ],
  },
};

interface MicroQuestionModalProps {
  questionKey: string;
  contextType?: string;
  contextId?: string;
  onClose: () => void;
  onAnswer: (response: string) => void;
}

export function MicroQuestionModal({ 
  questionKey, 
  contextType, 
  contextId, 
  onClose, 
  onAnswer 
}: MicroQuestionModalProps) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = microQuestions[questionKey];

  if (!question) return null;

  const handleSubmit = async () => {
    if (!selectedOption || !user) return;

    setIsSubmitting(true);

    try {
      await supabase.from('micro_question_responses').insert({
        user_id: user.id,
        question_key: questionKey,
        response: selectedOption,
        context_type: contextType,
        context_id: contextId,
      });

      onAnswer(selectedOption);
      onClose();
    } catch (error) {
      console.error('Error saving micro-question response:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-accent">
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">Quick Question</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {question.question}
            </h3>

            <div className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedOption(option.id)}
                  className={`w-full p-3 rounded-lg border text-left text-sm transition-colors ${
                    selectedOption === option.id
                      ? 'border-accent bg-accent/10 text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-accent/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-between items-center">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              className="btn-accent"
            >
              {isSubmitting ? 'Saving...' : 'Submit'}
            </Button>
          </div>

          <p className="px-4 pb-4 text-xs text-center text-muted-foreground">
            Your answer helps us personalize your recommendations
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to trigger micro-questions based on context
export function useMicroQuestion() {
  const { user } = useAuth();
  const [activeQuestion, setActiveQuestion] = useState<{
    key: string;
    contextType?: string;
    contextId?: string;
  } | null>(null);

  const triggerQuestion = async (
    questionKey: string,
    contextType?: string,
    contextId?: string
  ) => {
    if (!user) return;

    // Check if user already answered this question recently
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data } = await supabase
      .from('micro_question_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_key', questionKey)
      .gte('created_at', oneWeekAgo.toISOString())
      .limit(1);

    if (!data || data.length === 0) {
      setActiveQuestion({ key: questionKey, contextType, contextId });
    }
  };

  const closeQuestion = () => setActiveQuestion(null);

  return { activeQuestion, triggerQuestion, closeQuestion };
}
