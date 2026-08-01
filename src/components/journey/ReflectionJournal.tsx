import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface JournalEntry {
  id: string;
  response: string;
  created_at: string;
  question_key: string;
}

const REFLECTION_PROMPTS = [
  "What's one thing you accomplished this week that you're proud of?",
  "What's currently blocking your progress? How can you overcome it?",
  "What's one thing you learned this week that changed your perspective?",
  "If you could focus on only one thing next week, what would it be?",
  "What activity or project excited you most recently? Why?",
  "What's something you've been putting off? What's the first small step?",
];

export function ReflectionJournal() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const [pastEntries, setPastEntries] = useState<JournalEntry[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");

  useEffect(() => {
    // Pick a prompt based on day of week
    const dayIndex = new Date().getDay();
    setCurrentPrompt(REFLECTION_PROMPTS[dayIndex % REFLECTION_PROMPTS.length]);
  }, []);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("micro_question_responses")
      .select("*")
      .eq("user_id", user.id)
      .eq("context_type", "reflection_journal")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setPastEntries(data as JournalEntry[]);
  }, [user]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSubmit = async () => {
    if (!user || !entry.trim()) return;
    setSaving(true);
    try {
      await supabase.from("micro_question_responses").insert({
        user_id: user.id,
        question_key: `reflection_${new Date().toISOString().slice(0, 10)}`,
        response: entry.trim(),
        context_type: "reflection_journal",
        context_id: currentPrompt,
      });
      toast.success("Reflection saved!");
      setEntry("");
      await loadEntries();
    } catch (e) {
      toast.error("Could not save reflection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">Weekly Reflection</h3>
        </div>
        {pastEntries.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Past entries
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      <p className="text-xs text-accent font-medium mb-2 italic">"{currentPrompt}"</p>

      <Textarea
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        placeholder="Write your thoughts..."
        className="min-h-[80px] text-sm resize-none mb-2"
      />
      <Button
        onClick={handleSubmit}
        disabled={!entry.trim() || saving}
        size="sm"
        className="w-full btn-accent text-xs h-8"
      >
        <Send className="h-3 w-3 mr-1.5" />
        {saving ? "Saving..." : "Save Reflection"}
      </Button>

      <AnimatePresence>
        {expanded && pastEntries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-2"
          >
            {pastEntries.map((e) => (
              <div key={e.id} className="p-2.5 rounded-lg bg-muted/50 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-foreground leading-relaxed">{e.response}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
