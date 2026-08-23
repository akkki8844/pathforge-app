import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bot, Send, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { functionErrorMessage } from "@/lib/functionError";

/**
 * "Tell the agent" — a precise, single-purpose edit box that sits under any
 * generated draft. It does not write from nothing and it does not free-chat;
 * it takes the current draft plus one instruction and returns an edited
 * draft. The `refine-text` edge function enforces the no-hallucination rule
 * server-side (bracketed placeholders instead of invented facts) — this
 * component's job is just to show the student that the instruction was
 * actually applied, so the "precise, no hallucinations" claim is checkable,
 * not just asserted.
 */

interface LogEntry {
  instruction: string;
  ok: boolean;
}

interface AgentEditProps {
  section: string;
  currentText: string;
  onApplied: (revised: string) => void;
  className?: string;
}

export function AgentEdit({ section, currentText, onApplied, className }: AgentEditProps) {
  const reduced = useReducedMotion();
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const hasDraft = !!currentText.trim();

  const submit = async () => {
    const instr = instruction.trim();
    if (!instr || !hasDraft || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine-text", {
        body: {
          section,
          input: currentText,
          instruction: instr,
          language: localStorage.getItem("pf_language") || "en",
        },
      });
      if (error) {
        toast.error(await functionErrorMessage(error, "Could not apply that. Try again."));
        setLog((l) => [{ instruction: instr, ok: false }, ...l].slice(0, 5));
        return;
      }
      const revised = (data as { refined?: string; error?: string } | null)?.refined;
      if (revised) {
        onApplied(revised);
        setInstruction("");
        setLog((l) => [{ instruction: instr, ok: true }, ...l].slice(0, 5));
      } else {
        toast.error((data as { error?: string } | null)?.error || "No change returned.");
        setLog((l) => [{ instruction: instr, ok: false }, ...l].slice(0, 5));
      }
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("card-motion rounded-xl border border-primary/20 bg-secondary/30 p-4", className)}>
      <div className="flex items-center gap-2">
        <Bot className="h-3.5 w-3.5 text-primary" />
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          Tell the agent
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Give it one precise instruction and it edits the draft above — nothing else changes. If it
        needs a fact you haven't given it, it marks the gap instead of making one up.
      </p>

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={
            hasDraft
              ? 'e.g. "Make it shorter" or "Lead with the leadership role, not the club name"'
              : "Generate a draft first — the agent edits existing text, it doesn't write from nothing."
          }
          disabled={!hasDraft || busy}
          className="min-h-[52px] resize-none bg-card text-[13px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          size="icon"
          className="btn-accent h-[52px] w-11 shrink-0"
          onClick={submit}
          disabled={!hasDraft || busy || !instruction.trim()}
          aria-label="Apply instruction"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {log.length > 0 && (
          <motion.ul
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="mt-3 space-y-1 overflow-hidden border-t border-primary/15 pt-2.5"
          >
            {log.map((e, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {e.ok ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <X className="h-3 w-3 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span className="truncate">{e.instruction}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
