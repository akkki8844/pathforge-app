import type { AdvisorModel } from "@/lib/advisorModels";

/**
 * The advisor's context window.
 *
 * The advisor used to be metered against the account's monthly token grant, so
 * a long conversation cost the student budget that the rest of the app also
 * draws on, and the only feedback was a meter draining towards a paywall. That
 * is the wrong shape for a chat: what actually limits a thread is how much of
 * it the model can still see, not how much the account has left to spend.
 *
 * So the advisor is now bounded by a working context window instead. The meter
 * in the composer reports how much of this conversation the advisor is still
 * holding; when it fills, `/compact` replaces the transcript with a summary and
 * the thread keeps going. Nothing here touches the account's credit or token
 * balance.
 *
 * WHY A *WORKING* WINDOW
 *   The underlying models advertise far larger limits than these. Advertising
 *   the raw number would give a meter that never visibly moves, and would let a
 *   thread grow until every turn carried a megabyte of history for no gain. The
 *   figures below are the budget this client will actually fill before asking
 *   for a compaction, and the edge function caps the transcript it forwards at
 *   the same budget — so the meter is a real description of what the model
 *   sees, not a decoration.
 */

/** Working window per model id, in tokens. Mirrored by HISTORY_BUDGET server-side. */
const WINDOW_BY_MODEL: Record<string, number> = {
  "pfa-5.5": 32_000,
  "pfa-6.5": 64_000,
  "pfa-7": 128_000,
};

const DEFAULT_WINDOW = 32_000;

/**
 * What the system prompt, the student's onboarding profile and the tool
 * definitions occupy before a single message is added.
 *
 * Approximate on purpose: the exact figure depends on how much of the profile
 * is filled in, and the meter's job is to tell a student when to compact, not
 * to audit a bill. Overstating it slightly is the safe direction — it makes the
 * meter pessimistic rather than optimistic about how much room is left.
 */
export const SYSTEM_OVERHEAD_TOKENS = 2_400;

/** Roughly what one installed skill's instructions add when it loads. */
export const SKILL_OVERHEAD_TOKENS = 900;

export function contextWindowFor(model: AdvisorModel): number {
  return WINDOW_BY_MODEL[model.id] ?? DEFAULT_WINDOW;
}

/**
 * Estimate the token count of a string.
 *
 * Four characters per token is the standard rule of thumb for English prose and
 * is what every provider's own "estimate before you send" guidance uses. It is
 * wrong in both directions — code and CJK run denser, long English words run
 * thinner — but it is wrong by a margin that does not change what a student
 * does with the number, and it costs nothing. The alternative is shipping a
 * tokeniser (~1MB of vocabulary) to render one label.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export interface ContextTurn {
  role: "user" | "advisor";
  text: string;
  /** Reasoning is generated, charged and then dropped — it never re-enters context. */
  reasoning?: string;
}

export type ContextLevel = "ok" | "warn" | "full";

export interface ContextUsage {
  /** Tokens the next turn will carry: overhead + skills + transcript. */
  used: number;
  window: number;
  remaining: number;
  /** 0–100, clamped. */
  pct: number;
  level: ContextLevel;
  /** Just the transcript, for the `/context` breakdown. */
  transcript: number;
  overhead: number;
}

/** Past this share of the window, the composer starts suggesting a compaction. */
const WARN_AT = 0.75;
/** Past this, it says so plainly and offers the button. */
const FULL_AT = 0.92;

export function contextUsage(
  turns: ContextTurn[],
  options: { model: AdvisorModel; enabledSkills?: number; carriedSummary?: string | null },
): ContextUsage {
  const window = contextWindowFor(options.model);
  const overhead =
    SYSTEM_OVERHEAD_TOKENS +
    (options.enabledSkills ?? 0) * SKILL_OVERHEAD_TOKENS +
    estimateTokens(options.carriedSummary || "");

  let transcript = 0;
  for (const t of turns) {
    // +4 for the role framing every provider wraps each message in.
    transcript += estimateTokens(t.text) + 4;
  }

  const used = overhead + transcript;
  const remaining = Math.max(0, window - used);
  const ratio = window > 0 ? used / window : 0;
  return {
    used,
    window,
    remaining,
    transcript,
    overhead,
    pct: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    level: ratio >= FULL_AT ? "full" : ratio >= WARN_AT ? "warn" : "ok",
  };
}

/**
 * The tail of the transcript that fits the budget, oldest-first.
 *
 * Walks backwards so the most recent exchange is never the thing that gets
 * dropped, and always keeps at least the last turn — a request with no history
 * at all is still answerable, a request whose *current* question was trimmed is
 * not.
 */
export function turnsWithinBudget<T extends ContextTurn>(turns: T[], budgetTokens: number): T[] {
  if (budgetTokens <= 0) return turns.slice(-1);
  const kept: T[] = [];
  let spent = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const cost = estimateTokens(turns[i].text) + 4;
    if (spent + cost > budgetTokens && kept.length > 0) break;
    kept.unshift(turns[i]);
    spent += cost;
  }
  return kept;
}

/**
 * The instruction that produces a compaction.
 *
 * Written as a brief to the model rather than as "summarise this": a summary
 * optimised for a human reader drops exactly the things a continuing
 * conversation needs — the decisions already made, the constraints already
 * stated, and the thread of what was being worked on. Those are named
 * explicitly so the next turn can pick up without re-asking.
 */
export const COMPACTION_PROMPT = [
  "Compact this conversation so it can continue in a fresh context.",
  "",
  "Write a factual handover note, not a recap for a reader. Cover, in this order",
  "and only where the conversation actually establishes them:",
  "",
  "1. What the student is working on and what they have decided.",
  "2. Facts about the student stated in this conversation — schools, major,",
  "   grades, activities, deadlines, constraints.",
  "3. Advice already given, so it is not repeated.",
  "4. Anything left open or promised for next time.",
  "",
  "Use short headed sections. Do not add advice, do not speculate, and do not",
  "include anything the conversation did not say. Keep it under 400 words.",
].join("\n");

/** Header the compacted transcript is replayed under. */
export const COMPACTION_HEADER = "Summary of the conversation so far";

/**
 * `48231` → `48.2k`. The meter is read at a glance; the exact figure lives in
 * the tooltip and in `/context`.
 */
export function formatContextTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 1000) return String(Math.round(n));
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}
