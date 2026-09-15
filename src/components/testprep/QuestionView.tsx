import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, Eraser, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { DifficultyTag, SourceNote } from "@/components/testprep/primitives";
import { skillName } from "@/lib/testprep/blueprints";
import { isCorrect } from "@/lib/testprep/select";
import { FOCUS } from "@/lib/testprep/ui";
import type { Question } from "@/lib/testprep/types";

/**
 * One question, as the student sees it.
 *
 * Shared by the practice runner and the exam runner, because a question that
 * looks different in practice than it does on the exam is practice for the
 * wrong thing. The two modes differ in exactly one prop: `revealed`. Practice
 * marks each answer immediately; the exam never does.
 *
 * A choice has four states — untouched, selected, right, wrong — and each is
 * carried by border, ground and the letter badge together, so none of them
 * depends on colour alone.
 */
export function QuestionView({
  question,
  value,
  onChange,
  revealed = false,
  disabled = false,
  bookmarked,
  onToggleBookmark,
  flagged,
  onToggleFlag,
  showMeta = true,
}: {
  question: Question;
  /** Selected choice id, or the typed response. Empty string for unanswered. */
  value: string;
  onChange: (value: string) => void;
  /** Show which choice was right and why. Practice only. */
  revealed?: boolean;
  disabled?: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  /** The skill and difficulty line. Hidden during an exam. */
  showMeta?: boolean;
}) {
  const reduced = useReducedMotion();
  const answeredCorrectly = revealed && value !== "" && isCorrect(question, value);

  return (
    <motion.div
      key={question.id}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
    >
      <div className="flex items-start justify-between gap-4">
        {showMeta ? (
          <p className="text-xs text-muted-foreground">
            {skillName(question.skillId)} · <DifficultyTag value={question.difficulty} />
          </p>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-1">
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              aria-pressed={flagged}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                FOCUS,
                flagged
                  ? "bg-warning/10 font-medium text-warning"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Flag className={cn("h-3.5 w-3.5", flagged && "fill-current")} />
              Mark for review
            </button>
          )}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={onToggleBookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this question"}
              className={cn(
                "inline-flex items-center rounded-md px-2 py-1 transition-colors",
                FOCUS,
                bookmarked
                  ? "text-[hsl(var(--bb-blue))]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Bookmark className={cn("h-3.5 w-3.5", bookmarked && "fill-current")} />
            </button>
          )}
        </div>
      </div>

      {question.stimulus && (
        <div className="mt-3 whitespace-pre-line rounded-lg border border-border/70 bg-muted/25 p-4 text-sm leading-relaxed text-foreground">
          {question.stimulus}
        </div>
      )}

      <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">
        {question.prompt}
      </p>

      {question.choices ? (
        <ul className="mt-4 space-y-2">
          {question.choices.map((choice) => {
            const selected = value === choice.id;
            const right = revealed && choice.id === question.answer;
            const wrong = revealed && selected && choice.id !== question.answer;
            return (
              <li key={choice.id}>
                <motion.button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(choice.id)}
                  aria-pressed={selected}
                  whileTap={disabled || reduced ? undefined : { scale: 0.995 }}
                  transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
                    "disabled:cursor-default",
                    FOCUS,
                    right
                      ? "border-success bg-success/10 text-foreground"
                      : wrong
                        ? "border-destructive bg-destructive/10 text-foreground"
                        : selected
                          ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue-soft))] text-foreground"
                          : "border-border/70 hover:border-[hsl(var(--bb-blue)/0.5)] hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                      right
                        ? "border-success bg-success text-success-foreground"
                        : wrong
                          ? "border-destructive bg-destructive text-destructive-foreground"
                          : selected
                            ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
                            : "border-border text-muted-foreground",
                    )}
                  >
                    {choice.id}
                  </span>
                  <span className="min-w-0 leading-relaxed">{choice.text}</span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4 max-w-xs">
          <label
            htmlFor={`tp-answer-${question.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Your answer
          </label>
          <Input
            id={`tp-answer-${question.id}`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer"
            inputMode="text"
            className={cn(
              "tabular-nums",
              revealed &&
                (answeredCorrectly
                  ? "border-success focus-visible:ring-success"
                  : "border-destructive focus-visible:ring-destructive"),
            )}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Fractions and decimals are both accepted.
          </p>
        </div>
      )}

      {revealed && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO, delay: 0.04 }}
          className="mt-4 rounded-lg border border-border/70 bg-muted/25 p-4"
        >
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.14em]",
              answeredCorrectly ? "text-success" : "text-destructive",
            )}
          >
            {answeredCorrectly ? "Correct" : "Not quite"}
          </p>
          {!question.choices && (
            <p className="mt-2 text-sm text-foreground">
              Correct answer: <span className="font-semibold tabular-nums">{question.answer}</span>
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-foreground">{question.explanation}</p>
        </motion.div>
      )}

      <div className="mt-4">
        <SourceNote source={question.source} />
      </div>
    </motion.div>
  );
}


/**
 * A single answer choice inside {@link ExamQuestionCard}.
 *
 * Two independent affordances live on one row: clicking the body selects the
 * choice (unless it's been struck out — an eliminated choice takes a second,
 * deliberate click on its own letter to come back, matching how the digital
 * SAT's own eliminator behaves), and the right-hand letter circle — shown only
 * while the eliminator tool is on — toggles the strike-through without ever
 * selecting the choice.
 */
function EliminableChoice({
  choice,
  selected,
  eliminated,
  eliminatorOn,
  disabled,
  onSelect,
  onToggleEliminate,
}: {
  choice: NonNullable<Question["choices"]>[number];
  selected: boolean;
  eliminated: boolean;
  eliminatorOn: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleEliminate: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      whileTap={disabled || reduced ? undefined : { scale: 0.995 }}
      transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
        eliminated
          ? "border-border/50 bg-muted/20"
          : selected
            ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue-soft))]"
            : "border-border/70 hover:border-[hsl(var(--bb-blue)/0.5)] hover:bg-muted/40",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !eliminated && onSelect()}
        aria-pressed={selected}
        className={cn("flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default", FOCUS)}
      >
        <span
          className={cn(
            "mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
            selected && !eliminated
              ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue))] text-[hsl(var(--bb-blue-foreground))]"
              : "border-border text-muted-foreground",
          )}
        >
          {choice.id}
        </span>
        <span
          className={cn(
            "min-w-0 leading-relaxed text-foreground",
            eliminated && "text-muted-foreground line-through decoration-2",
          )}
        >
          {choice.text}
        </span>
      </button>

      {eliminatorOn && (
        <button
          type="button"
          onClick={onToggleEliminate}
          aria-pressed={eliminated}
          aria-label={eliminated ? `Restore choice ${choice.id}` : `Cross out choice ${choice.id}`}
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
            FOCUS,
            eliminated
              ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))] line-through decoration-2"
              : "border-border/70 text-muted-foreground hover:border-[hsl(var(--bb-blue)/0.5)]",
          )}
        >
          {choice.id}
        </button>
      )}
    </motion.div>
  );
}

/**
 * The exam runner's question card — the right-hand pane of its two-column
 * module view. A different shape from {@link QuestionView} on purpose: the
 * exam adds a numbered badge and an answer-eliminator tool that practice has
 * no use for, and never reveals correctness, so the two were growing apart
 * into "one component with half its props always the same value."
 */
export function ExamQuestionCard({
  question,
  number,
  value,
  onChange,
  flagged,
  onToggleFlag,
  eliminatorOn,
  onToggleEliminator,
  eliminated,
  onToggleEliminate,
}: {
  question: Question;
  /** 1-based position within the module, for the number badge. */
  number: number;
  value: string;
  onChange: (value: string) => void;
  flagged: boolean;
  onToggleFlag: () => void;
  eliminatorOn: boolean;
  onToggleEliminator: () => void;
  /** Choice ids currently struck out for this question. */
  eliminated: ReadonlySet<string>;
  onToggleEliminate: (choiceId: string) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={question.id}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[hsl(var(--bb-navy))] text-sm font-bold text-[hsl(var(--bb-navy-foreground))]">
            {number}
          </span>
          <button
            type="button"
            onClick={onToggleFlag}
            aria-pressed={flagged}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              FOCUS,
              flagged
                ? "text-warning"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Flag className={cn("h-3.5 w-3.5", flagged && "fill-current")} />
            Mark for Review
          </button>
        </div>
        {question.choices && (
          <button
            type="button"
            onClick={onToggleEliminator}
            aria-pressed={eliminatorOn}
            aria-label="Toggle answer eliminator"
            title="Cross out choices you've ruled out"
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors",
              FOCUS,
              eliminatorOn
                ? "border-[hsl(var(--bb-blue))] bg-[hsl(var(--bb-blue-soft))] text-[hsl(var(--bb-blue))]"
                : "border-border/70 hover:border-[hsl(var(--bb-blue)/0.5)]",
            )}
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">
        {question.prompt}
      </p>

      {question.choices ? (
        <div className="mt-4 space-y-2">
          {question.choices.map((choice) => (
            <EliminableChoice
              key={choice.id}
              choice={choice}
              selected={value === choice.id}
              eliminated={eliminated.has(choice.id)}
              eliminatorOn={eliminatorOn}
              disabled={false}
              onSelect={() => onChange(choice.id)}
              onToggleEliminate={() => onToggleEliminate(choice.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 max-w-xs">
          <label
            htmlFor={`tp-exam-answer-${question.id}`}
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Your answer
          </label>
          <Input
            id={`tp-exam-answer-${question.id}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer"
            inputMode="text"
            className="tabular-nums"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Fractions and decimals are both accepted.
          </p>
        </div>
      )}

      <div className="mt-4">
        <SourceNote source={question.source} />
      </div>
    </motion.div>
  );
}
