/**
 * Natural-language parsing for the Routine quick-add bar.
 *
 * Deliberately a deterministic local parser, not an AI call. Three reasons:
 * "add a task" is CRUD and must never spend a credit; a student typing into a
 * quick-add box expects the preview to update as they type, which a network
 * round trip can't do; and a rule-based parse is inspectable — when it gets
 * something wrong the student can see which words it took and fix the phrasing,
 * where a model would just be wrong again differently.
 *
 * It reports what it understood ({@link QuickAddDraft}) rather than committing
 * anything, so the UI can show a preview and let the student correct the kind or
 * the time before it is saved. Nothing here throws: an unparseable string falls
 * back to a plain task titled with the whole input, which is always a sane
 * outcome.
 */
import { addDays, atTimeOn, dateKey, startOfDay } from "./dates";
import type { AgendaKind, Priority } from "./types";

export type QuickAddKind = "task" | "reminder" | "study" | "habit" | "goal" | "event";

export interface QuickAddDraft {
  kind: QuickAddKind;
  title: string;
  /** The resolved instant, for kinds anchored to a clock. */
  at: Date | null;
  /** Whether a time-of-day was actually stated, or defaulted. */
  timeStated: boolean;
  /** "YYYY-MM-DD" — for study blocks and habits, which are day-scoped. */
  day: string | null;
  durationMinutes: number | null;
  subject: string | null;
  priority: Priority;
  repeat: "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
  /** Words consumed while parsing, for the "understood as" hint in the UI. */
  matched: string[];
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/** Strips a matched fragment out of the working title and records it. */
function consume(state: { text: string; matched: string[] }, fragment: string) {
  if (!fragment) return;
  state.matched.push(fragment.trim());
  state.text = state.text.replace(fragment, " ");
}

function tidy(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "")
    .trim();
}

/** Capitalises the first letter only — never touches the rest, so "IB Maths" survives. */
function sentenceCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddDraft {
  const raw = input.trim();
  const state = { text: ` ${raw.toLowerCase()} `, matched: [] as string[] };

  // ── Kind ────────────────────────────────────────────────────────────
  // Checked most-specific first: "remind me to study chemistry" is a reminder,
  // not a study block, and the reverse order would get that wrong.
  let kind: QuickAddKind = "task";
  const kindPatterns: [QuickAddKind, RegExp][] = [
    ["reminder", /\b(remind me to|remind me|reminder to|reminder:)\s*/],
    ["habit", /\b(create a habit to|habit:|new habit|every (?:night|morning|day|week))\s*/],
    ["goal", /\b(goal:|my goal is to|set a goal to)\s*/],
    ["study", /\b(study|revise|revision for|practice|prep for|prepare for)\b\s*/],
    ["event", /\b(exam|test|meeting|appointment|deadline for)\b\s*/],
  ];
  for (const [candidate, pattern] of kindPatterns) {
    const hit = state.text.match(pattern);
    if (hit) {
      kind = candidate;
      // "study" and the event nouns are part of the sentence, so only the
      // explicit command prefixes are stripped from the title.
      if (candidate === "reminder" || candidate === "goal" || candidate === "habit") {
        consume(state, hit[0]);
      } else {
        state.matched.push(hit[0].trim());
      }
      break;
    }
  }

  // ── Repeat ──────────────────────────────────────────────────────────
  let repeat: QuickAddDraft["repeat"] = "none";
  const repeatPatterns: [QuickAddDraft["repeat"], RegExp][] = [
    ["daily", /\bevery ?day\b|\bdaily\b|\bevery (?:night|morning|evening)\b/],
    ["weekdays", /\bevery weekday\b|\bon weekdays\b|\bweekdays\b/],
    ["weekly", /\bevery week\b|\bweekly\b/],
    ["monthly", /\bevery month\b|\bmonthly\b/],
    ["yearly", /\bevery year\b|\bannually\b|\byearly\b/],
  ];
  for (const [value, pattern] of repeatPatterns) {
    const hit = state.text.match(pattern);
    if (hit) {
      repeat = value;
      consume(state, hit[0]);
      break;
    }
  }

  // ── Duration ────────────────────────────────────────────────────────
  // "for 45 minutes", "for 1h30", "45m", "1.5 hours".
  let durationMinutes: number | null = null;
  const hm = state.text.match(/\b(?:for\s+)?(\d+)\s*h(?:ou)?r?s?\s*(\d+)\s*m(?:in)?/);
  const hours = state.text.match(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*h(?:ou)?rs?\b/);
  const mins = state.text.match(/\b(?:for\s+)?(\d+)\s*m(?:in(?:ute)?s?)?\b/);
  if (hm) {
    durationMinutes = Number(hm[1]) * 60 + Number(hm[2]);
    consume(state, hm[0]);
  } else if (hours) {
    durationMinutes = Math.round(Number(hours[1]) * 60);
    consume(state, hours[0]);
  } else if (mins) {
    durationMinutes = Number(mins[1]);
    consume(state, mins[0]);
  }

  // ── Day ─────────────────────────────────────────────────────────────
  let day = startOfDay(now);
  let dayStated = false;
  const relative: [RegExp, number][] = [
    [/\bday after tomorrow\b/, 2],
    [/\btomorrow\b|\btmr\b|\btmrw\b/, 1],
    [/\btonight\b|\bthis evening\b|\btoday\b/, 0],
    [/\byesterday\b/, -1],
  ];
  let dayHandled = false;
  for (const [pattern, offset] of relative) {
    const hit = state.text.match(pattern);
    if (hit) {
      day = startOfDay(addDays(now, offset));
      dayStated = true;
      dayHandled = true;
      consume(state, hit[0]);
      break;
    }
  }
  if (!dayHandled) {
    // "on friday" / "next monday" → the next occurrence of that weekday. "next"
    // pushes a whole week past it, matching how people say it.
    const wd = state.text.match(
      /\b(?:on\s+|this\s+|next\s+)?(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thu|friday|fri|saturday|sat)\b/,
    );
    if (wd) {
      const target = WEEKDAYS[wd[1]];
      let delta = (target - now.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "on friday" said on a Friday means next Friday
      if (/\bnext\s/.test(wd[0])) delta += delta <= 7 ? 0 : 7;
      day = startOfDay(addDays(now, delta));
      dayStated = true;
      consume(state, wd[0]);
    } else {
      const inDays = state.text.match(/\bin (\d+) days?\b/);
      const nextWeek = state.text.match(/\bnext week\b/);
      if (inDays) {
        day = startOfDay(addDays(now, Number(inDays[1])));
        dayStated = true;
        consume(state, inDays[0]);
      } else if (nextWeek) {
        day = startOfDay(addDays(now, 7));
        dayStated = true;
        consume(state, nextWeek[0]);
      }
    }
  }

  // ── Time of day ─────────────────────────────────────────────────────
  let at: Date | null = null;
  let timeStated = false;
  const clock = state.text.match(
    /\b(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bat\s+(\d{1,2}):(\d{2})\b/,
  );
  const inMins = state.text.match(/\bin (\d+)\s*(m(?:in(?:ute)?s?)?|h(?:ou)?rs?)\b/);
  if (clock) {
    let h: number;
    let m: number;
    if (clock[3]) {
      h = Number(clock[1]) % 12;
      m = Number(clock[2] ?? 0);
      if (clock[3] === "pm") h += 12;
    } else {
      h = Number(clock[4]);
      m = Number(clock[5]);
    }
    at = atTimeOn(day, `${h}:${m}`);
    timeStated = true;
    consume(state, clock[0]);
  } else if (inMins) {
    const n = Number(inMins[1]);
    at = new Date(now.getTime() + (inMins[2].startsWith("h") ? n * 60 : n) * 60_000);
    day = startOfDay(at);
    timeStated = true;
    dayStated = true;
    consume(state, inMins[0]);
  }

  // A reminder with no stated time is useless, so it gets a sensible default
  // rather than being rejected: 9am on the named day, or an hour from now if the
  // day wasn't stated either.
  if (!at) {
    if (kind === "reminder" || kind === "event") {
      at = dayStated ? atTimeOn(day, "09:00") : new Date(now.getTime() + 60 * 60_000);
    } else if (dayStated) {
      at = atTimeOn(day, "17:00");
    }
  }

  // ── Priority ────────────────────────────────────────────────────────
  let priority: Priority = "medium";
  const urgent = state.text.match(/\b(urgent|asap|important|high priority|!!)\b/);
  const low = state.text.match(/\b(whenever|low priority|someday|no rush)\b/);
  if (urgent) { priority = "high"; consume(state, urgent[0]); }
  else if (low) { priority = "low"; consume(state, low[0]); }

  // ── Title and subject ───────────────────────────────────────────────
  // The leftover text, with filler verbs and dangling prepositions removed. The
  // original casing is recovered by matching the cleaned words back against the
  // raw input, so "Physics" doesn't come back as "physics".
  let title = tidy(state.text)
    .replace(/^(?:add|create|new|make|set up|set)\s+(?:a|an|the)?\s*/i, "")
    .replace(/^(?:task|todo|to-do|note)\s*:?\s*/i, "")
    .replace(/\b(?:for|at|on|to|in|of)\s*$/i, "");
  title = tidy(title);

  let subject: string | null = null;
  if (kind === "study") {
    // "study chemistry", "revise organic chemistry for the test" → the words
    // immediately after the study verb are the subject.
    const m = raw.match(
      /\b(?:study|revise|revision for|practice|prep for|prepare for)\s+(?:for\s+)?(?:my\s+|the\s+)?([\w&+\- ]{2,40}?)(?=\s+(?:for|at|on|tomorrow|today|tonight|in|every|next)\b|[,.]|$)/i,
    );
    if (m) subject = tidy(m[1]);
    if (!subject) subject = title || null;
  }

  // Recover original casing for the title where possible.
  if (title) {
    const words = title.split(" ").filter(Boolean);
    if (words.length) {
      const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
      const original = raw.match(new RegExp(pattern, "i"));
      if (original) title = tidy(original[0]);
    }
  }

  return {
    kind,
    title: sentenceCase(title) || raw || "Untitled",
    at,
    timeStated,
    day: kind === "study" || kind === "habit" ? dateKey(day) : dayStated ? dateKey(day) : null,
    durationMinutes,
    subject: subject ? sentenceCase(subject) : null,
    priority,
    repeat: kind === "habit" && repeat === "none" ? "daily" : repeat,
    matched: state.matched.filter(Boolean),
  };
}

/** The agenda kind a draft will become, for previewing with the right icon. */
export const DRAFT_AGENDA_KIND: Record<QuickAddKind, AgendaKind> = {
  task: "task",
  reminder: "reminder",
  study: "study",
  habit: "habit",
  event: "event",
  goal: "task",
};

export const QUICK_ADD_EXAMPLES = [
  "Study chemistry for 45 minutes at 7pm",
  "Remind me to email my counsellor Friday",
  "Submit physics assignment tomorrow at 7pm urgent",
  "Create a habit to read 20 minutes every night",
] as const;
