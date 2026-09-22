/**
 * Domain types for the Interview Simulator.
 *
 * Declared here rather than in `integrations/supabase/types.ts` for the same
 * reason Routine and Communications do it: that file is machine-generated and
 * re-emitted wholesale on re-introspection, so anything hand-added to it is
 * erased on the next regeneration and every `from("interview_sessions")` call
 * silently degrades to `never`. `@/integrations/supabase/interview` re-types the
 * one live client from these declarations instead.
 */

/* ───────────────────────────────────────────────────────── school format ── */

/**
 * How a school actually runs its interview.
 *
 * This is the single most load-bearing fact in the whole feature: a student
 * prepping for Georgetown (required, evaluative, alumni, and the interviewer
 * files a rated report) needs a different hour than one prepping for Penn
 * (non-evaluative "Alumni Conversation", explicitly does not affect the
 * decision). Generic prep collapses that difference; this type is what stops
 * us doing the same.
 */
export type InterviewFormat =
  /** One alumnus, usually off-campus or over video. The default shape. */
  | "alumni"
  /** An admissions officer or other staff member. Higher stakes, tighter. */
  | "admissions"
  /** More than one interviewer at once — rare at undergrad, real at some. */
  | "panel"
  /** A current undergraduate, often a senior. Warmer, more peer-shaped. */
  | "student"
  /** Asynchronous recorded answers to timed prompts. No conversation at all. */
  | "video"
  /** The school does not interview undergraduate applicants. */
  | "none";

/** How much the conversation actually counts. */
export type InterviewWeight =
  /** A written, often rated, report goes into the file. */
  | "evaluative"
  /** Notes may be attached, but it is not scored and rarely moves a decision. */
  | "light"
  /** Explicitly for the applicant's benefit; does not affect the decision. */
  | "informational";

/** Whether the student can ask for one, or has to be picked. */
export type InterviewAvailability =
  | "required"
  | "strongly-recommended"
  | "optional"
  /** Offered only if the school reaches out — the student cannot request it. */
  | "by-invitation"
  | "not-offered";

export interface SchoolInterviewProfile {
  /** Matches `src/lib/colleges.ts` ids where one exists, so the two can join. */
  id: string;
  name: string;
  /** What a student would actually call it. Used in headings and speech. */
  shortName: string;
  /** Root domain, for the crest lookup in `SchoolCrest`. */
  domain: string;
  /** The school's real primary colour, as a hex string. Drives the room accent. */
  color: string;
  /** A second brand colour where the school has one; falls back to `color`. */
  colorSecondary?: string;
  format: InterviewFormat;
  weight: InterviewWeight;
  availability: InterviewAvailability;
  /** Realistic wall-clock length. Used to pace the simulation, not to time it. */
  typicalMinutes: number;
  /** Who is across the table, in the school's own vocabulary. */
  conductedBy: string;
  /**
   * What this specific school's interviewers actually dig at. Fed to the model
   * as the interviewer's private brief — it is the difference between "tell me
   * about yourself" and the question a Chicago interviewer would really ask.
   */
  emphasis: string[];
  /** One or two sentences of ground truth shown to the student before they start. */
  notes: string;
  /** Where the policy was last checked, so this stays maintainable. */
  source?: string;
}

/* ──────────────────────────────────────────────────────────── interviewer ── */

/** The temperament the model plays. Changes pacing and follow-up appetite. */
export type InterviewerTemperament =
  /** Relaxed, curious, lets silences sit. The coffee-shop alum. */
  | "warm"
  /** Precise, keeps returning to specifics. The one who takes notes. */
  | "exacting"
  /** Fast, enthusiastic, interrupts to agree. Hardest to keep pace with. */
  | "brisk"
  /** Quiet and a little formal. Long pauses; the student fills them or doesn't. */
  | "reserved";

export interface InterviewerPersona {
  key: string;
  /** Full name. The lower-third badge and the sign-off both use it. */
  name: string;
  /** "Class of '09 · Software Engineer" — the line under the name. */
  credential: string;
  /** Which formats this persona is plausible for. */
  formats: InterviewFormat[];
  temperament: InterviewerTemperament;
  /** ElevenLabs voice id. Overridable per-deployment via the edge function. */
  voiceId: string;
  /** Where they appear to be sitting. Drives the generated backdrop. */
  setting: "cafe" | "home-office" | "campus-office" | "conference-room" | "library";
  /**
   * Portrait frames, public paths under `/interviewers/`.
   *
   * Three stills rather than a video: `rest` (mouth closed, listening),
   * `talk-a` and `talk-b` (mid-sentence, different mouth shapes). The room
   * crossfades between them on the live amplitude of the speech audio, which
   * reads as a slightly-compressed video call — which is what a real alumni
   * interview over Zoom looks like anyway.
   */
  frames: { rest: string; talkA: string; talkB: string };
  /** A one-line self-description the model uses to stay in character. */
  brief: string;
  /**
   * Simli face id, if this persona has a live streaming face.
   *
   * Optional and unset by default: face ids are account-specific and chosen in
   * Simli's dashboard, so inventing one here would fail at the worst possible
   * moment rather than falling back cleanly. With none set, the room uses the
   * project-wide `SIMLI_DEFAULT_FACE_ID`, and with neither it uses the still
   * frames below.
   */
  simliFaceId?: string;
}

/* ──────────────────────────────────────────────────────────────── session ── */

export type InterviewSessionStatus = "lobby" | "live" | "ended" | "abandoned";

export interface InterviewSession {
  id: string;
  user_id: string;
  school_id: string;
  school_name: string;
  format: InterviewFormat;
  interviewer_key: string;
  status: InterviewSessionStatus;
  /** Snapshot of what the interviewer was allowed to know, taken at start. */
  grounding: InterviewGrounding | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  turn_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * The student's real application, as the interviewer sees it.
 *
 * Snapshotted onto the session at start rather than re-read per turn, so a
 * report generated a week later grades the conversation that actually happened
 * — against the essays that existed when it happened, not whatever the student
 * has since rewritten.
 */
export interface InterviewGrounding {
  firstName: string;
  grade: string;
  major: string;
  school: string;
  country: string;
  essays: { label: string; text: string }[];
  activities: { title: string; role?: string; detail?: string }[];
  targets: string[];
  /** Free-text the student added in the lobby ("go easy on the robotics stuff"). */
  studentNote?: string;
}

/* ────────────────────────────────────────────────────────────────── turns ── */

export type TurnSpeaker = "interviewer" | "student";

/**
 * What the interviewer is doing with this line.
 *
 * The room reads this to decide how the person on screen behaves — a `reaction`
 * gets a nod and no question mark, a `probe` gets a lean-in. It is also what
 * lets the report say "they moved on without following up" instead of just
 * counting questions.
 */
export type TurnIntent =
  | "open"
  | "question"
  | "followup"
  | "probe"
  | "reaction"
  | "transition"
  | "closing";

export interface InterviewTurn {
  id: string;
  session_id: string;
  user_id: string;
  idx: number;
  speaker: TurnSpeaker;
  text: string;
  intent: TurnIntent | null;
  /** Which essay or activity the interviewer pulled this from, if any. */
  source_ref: string | null;
  created_at: string;
}

/* ───────────────────────────────────────────────────────────────── report ── */

export type ReportStatus = "generating" | "ready" | "failed";

/** One thing the interviewer noticed, tied to something the student actually said. */
export interface ReportMoment {
  /** The student's own words, quoted back. Never paraphrased. */
  quote: string;
  /** "strong" | "weak" | "mixed" — what this moment demonstrated. */
  verdict: "strong" | "weak" | "mixed";
  /** One or two sentences on why it landed or didn't. */
  note: string;
}

/**
 * Where a spoken answer and the written application disagree.
 *
 * The thing interviewers actually notice and nobody practises for. Split out
 * from the general feedback because it is the feature's sharpest edge.
 */
export interface ConsistencyNote {
  topic: string;
  /** What the application says. */
  written: string;
  /** What the student said out loud. */
  spoken: string;
  severity: "aligned" | "thin" | "contradiction";
  note: string;
}

export interface InterviewReport {
  id: string;
  session_id: string;
  user_id: string;
  status: ReportStatus;
  overall_score: number | null;
  clarity: number | null;
  authenticity: number | null;
  specificity: number | null;
  confidence: number | null;
  consistency: number | null;
  headline: string | null;
  summary: string | null;
  strengths: string[];
  improvements: string[];
  moments: ReportMoment[];
  consistency_notes: ConsistencyNote[];
  next_actions: string[];
  model: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** The five axes, in the order they are always displayed. */
export const SCORE_AXES = [
  { key: "clarity", label: "Clarity", blurb: "Did the answer land the first time?" },
  { key: "specificity", label: "Specificity", blurb: "Names, numbers, moments — not adjectives." },
  { key: "authenticity", label: "Authenticity", blurb: "Sounded like them, not like a script." },
  { key: "confidence", label: "Confidence", blurb: "Settled, not hedging or rushing." },
  { key: "consistency", label: "Consistency", blurb: "Matched what the application already says." },
] as const satisfies readonly { key: keyof InterviewReport; label: string; blurb: string }[];
