import { useMemo } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const QUOTES: { text: string; source: string; major?: string }[] = [
  { text: "The only way to do great work is to love what you do.", source: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill" },
  { text: "Your time is limited, don't waste it living someone else's life.", source: "Steve Jobs" },
  { text: "The expert in anything was once a beginner.", source: "Helen Hayes" },
  { text: "It always seems impossible until it's done.", source: "Nelson Mandela" },
  { text: "Education is the most powerful weapon which you can use to change the world.", source: "Nelson Mandela" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", source: "B.B. King" },
  { text: "Don't let what you cannot do interfere with what you can do.", source: "John Wooden" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", source: "Eleanor Roosevelt" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", source: "Ralph Waldo Emerson" },
  { text: "You don't have to be great to start, but you have to start to be great.", source: "Zig Ziglar" },
  { text: "Research is creating new knowledge.", source: "Neil Armstrong", major: "Engineering" },
  { text: "The science of today is the technology of tomorrow.", source: "Edward Teller", major: "Computer Science" },
  { text: "Medicine is a science of uncertainty and an art of probability.", source: "William Osler", major: "Pre-Med" },
];

export function MotivationQuote({ major }: { major?: string }) {
  const quote = useMemo(() => {
    // Try to find a major-specific quote first
    const majorQuotes = major ? QUOTES.filter(q => q.major && major.toLowerCase().includes(q.major!.toLowerCase())) : [];
    const pool = majorQuotes.length > 0 ? majorQuotes : QUOTES;

    // Pick based on day of year for consistency within a day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return pool[dayOfYear % pool.length];
  }, [major]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
      className="p-4 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10"
    >
      <Quote className="h-4 w-4 text-accent/40 mb-2" />
      <p className="text-sm text-foreground italic leading-relaxed">"{quote.text}"</p>
      <p className="text-[10px] text-muted-foreground mt-2">— {quote.source}</p>
    </motion.div>
  );
}
