/**
 * The people on the other side of the call.
 *
 * Eight rather than one, because "who is interviewing you" is the second
 * biggest variable after "which school" — a Georgetown alumna filing a rated
 * report and a Pomona senior having a peer conversation are not the same
 * half hour, and practising only one of them teaches the wrong instincts.
 *
 * Each persona carries three things the room needs: a voice (ElevenLabs), a
 * temperament (which changes how long they let a silence sit and how hard they
 * follow up), and a set of portrait frames.
 *
 * ── On the frames, and why this isn't video ──
 * A real alumni interview happens over Zoom on a domestic connection. What you
 * actually see is a slightly soft, slightly compressed head-and-shoulders that
 * holds still while the other person listens and moves while they talk. Three
 * stills crossfaded on the live amplitude of the speech audio reproduce that
 * closely, cost nothing per session, and never desync from the words the way a
 * pre-rendered clip does. A looping video would be heavier, would stutter on
 * the first play, and would visibly repeat inside a 40-minute conversation.
 */
import type { InterviewerPersona, InterviewFormat } from "./types";

/**
 * ElevenLabs premade voice ids.
 *
 * Named constants rather than inline strings so a voice swap is one edit, and
 * so the reason a given persona sounds the way they do is legible here rather
 * than buried in a 20-character id.
 */
const VOICE = {
  /** Warm, unhurried American woman. The default alumni voice. */
  sarah: "EXAVITQu4vr4xnSDxMaL",
  /** Deep, steady American man. Reads as senior without sounding stern. */
  brian: "nPczCjzI2devNBz1zQrb",
  /** Confident British woman. Crisp consonants — good for the Oxbridge tutors. */
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  /** Measured British man, lower register. The formal end of the range. */
  daniel: "onwK4e9ZLuTAKqWW03F9",
  /** Bright, friendly American woman. The peer-shaped student interviewer. */
  matilda: "XrExE9yKIg1WjnnlVkGX",
  /** Casual American man, conversational pace. The coffee-shop alum. */
  chris: "iP95p4xoKVk53GoZ742B",
} as const;

/**
 * Where a persona's frames live.
 *
 * The public `interviewer-portraits` storage bucket, not `public/`. The images
 * are generated once by the `interview-portraits` edge function and cached
 * there, so the repo never carries 24 binary headshots and the persona list can
 * grow without anyone sourcing a photograph that matches "reserved, mid-fifties,
 * college library".
 *
 * Until that function has run for a persona, these URLs 404 — which every
 * consumer handles by falling back to a monogram tile, so an ungenerated
 * interviewer looks deliberate rather than broken.
 */
const PORTRAIT_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/storage/v1/object/public/interviewer-portraits`;

function frames(key: string): InterviewerPersona["frames"] {
  return {
    rest: `${PORTRAIT_BASE}/${key}-rest.png`,
    talkA: `${PORTRAIT_BASE}/${key}-talk-a.png`,
    talkB: `${PORTRAIT_BASE}/${key}-talk-b.png`,
  };
}

export const INTERVIEWERS: InterviewerPersona[] = [
  {
    key: "maya-oconnell",
    name: "Maya O'Connell",
    credential: "Class of '09 · Product lead, healthcare software",
    formats: ["alumni"],
    temperament: "warm",
    voiceId: VOICE.sarah,
    setting: "cafe",
    frames: frames("maya-oconnell"),
    brief:
      "You've been interviewing for your alma mater for eleven years and you genuinely enjoy it. You open casually, you let silences sit rather than filling them, and when something interests you, you follow it instead of moving down a list. You are not trying to catch anyone out.",
  },
  {
    key: "daniel-reyes",
    name: "Daniel Reyes",
    credential: "Class of '04 · Attorney, appellate practice",
    formats: ["alumni", "admissions"],
    temperament: "exacting",
    voiceId: VOICE.brian,
    setting: "home-office",
    frames: frames("daniel-reyes"),
    brief:
      "You take notes while people talk and you circle back to things they glossed over. You are courteous but you do not accept a vague answer — if someone says they 'led' something, you ask what they actually did on a Tuesday. You are fair, and you tell people when an answer was good.",
  },
  {
    key: "priya-raghunathan",
    name: "Priya Raghunathan",
    credential: "Senior Admissions Officer",
    formats: ["admissions"],
    temperament: "brisk",
    voiceId: VOICE.matilda,
    setting: "campus-office",
    frames: frames("priya-raghunathan"),
    brief:
      "You read forty applications a day and you move quickly. You are friendly and fast, you react out loud, and you sometimes jump in before the sentence is finished because you already see where it's going. You ask the question behind the question.",
  },
  {
    key: "james-whitlock",
    name: "James Whitlock",
    credential: "Tutor in Physics · Director of Studies",
    formats: ["panel"],
    temperament: "reserved",
    voiceId: VOICE.daniel,
    setting: "library",
    frames: frames("james-whitlock"),
    brief:
      "You interview the Oxbridge way: almost no small talk, straight into the subject, and you keep pushing until the candidate is genuinely stuck, because that is where the assessment actually starts. You are never unkind about it. You are quiet, and you wait.",
  },
  {
    key: "alina-kovac",
    name: "Dr. Alina Kovač",
    credential: "Faculty, Computer Science · Undergraduate admissions committee",
    formats: ["panel", "admissions"],
    temperament: "exacting",
    voiceId: VOICE.alice,
    setting: "conference-room",
    frames: frames("alina-kovac"),
    brief:
      "You teach first-years and you can tell within two minutes whether someone built the thing they're describing. You ask for specifics — which library, what broke, what you tried second. You are warm about failure and sharp about vagueness.",
  },
  {
    key: "theo-adeyemi",
    name: "Theo Adeyemi",
    credential: "Class of '27 · Senior, student interviewer",
    formats: ["student"],
    temperament: "warm",
    voiceId: VOICE.chris,
    setting: "cafe",
    frames: frames("theo-adeyemi"),
    brief:
      "You're a senior who was in their seat three years ago and you remember exactly how it felt. You're relaxed, you swear mildly, you share your own experience unprompted, and you ask what they're actually excited about rather than what they think you want to hear.",
  },
  {
    key: "helen-mbeki",
    name: "Helen Mbeki",
    credential: "Class of '96 · Non-profit director",
    formats: ["alumni"],
    temperament: "reserved",
    voiceId: VOICE.sarah,
    setting: "home-office",
    frames: frames("helen-mbeki"),
    brief:
      "You leave long pauses. You ask one question and then you stop talking, and you let the candidate decide whether to keep going. Most people fill the silence with their real answer. You are kind, but you are not going to rescue anyone from a gap.",
  },
  {
    key: "marcus-hale",
    name: "Marcus Hale",
    credential: "Class of '13 · Founder, climate analytics",
    formats: ["alumni", "student"],
    temperament: "brisk",
    voiceId: VOICE.brian,
    setting: "cafe",
    frames: frames("marcus-hale"),
    brief:
      "You talk fast, you interrupt to agree, and you get visibly excited when someone says something unexpected. You jump between topics on association rather than working through a list. You are generous with encouragement and allergic to a rehearsed answer.",
  },
];

const BY_KEY = new Map(INTERVIEWERS.map((p) => [p.key, p]));

export function interviewerByKey(key: string): InterviewerPersona | undefined {
  return BY_KEY.get(key);
}

/** Everyone plausible for this format. Never empty — falls back to the alumni set. */
export function interviewersForFormat(format: InterviewFormat): InterviewerPersona[] {
  const matches = INTERVIEWERS.filter((p) => p.formats.includes(format));
  if (matches.length) return matches;
  return INTERVIEWERS.filter((p) => p.formats.includes("alumni"));
}

/**
 * How long the interviewer waits before treating a pause as "your turn is over",
 * in milliseconds.
 *
 * Temperament made audible. A brisk interviewer cuts in almost immediately; a
 * reserved one sits through a silence long enough that the student starts
 * talking again — which is the single most useful thing a mock interview can
 * teach, because it's the moment real answers come out.
 */
export const ENDPOINT_SILENCE_MS: Record<InterviewerPersona["temperament"], number> = {
  brisk: 900,
  warm: 1500,
  exacting: 1700,
  reserved: 2600,
};

/**
 * Beat of dead air before the interviewer starts speaking, in milliseconds.
 *
 * A real person does not begin the instant you stop. Without this the whole
 * thing reads as a chatbot with a voice bolted on, which is the exact failure
 * this feature exists to avoid.
 */
export const RESPONSE_DELAY_MS: Record<InterviewerPersona["temperament"], number> = {
  brisk: 260,
  warm: 620,
  exacting: 780,
  reserved: 1100,
};

/** The room's backdrop treatment per setting. Tailwind gradient class strings. */
export const SETTING_BACKDROP: Record<InterviewerPersona["setting"], string> = {
  cafe: "from-amber-900/40 via-stone-900/60 to-stone-950",
  "home-office": "from-slate-800/40 via-slate-900/60 to-slate-950",
  "campus-office": "from-blue-900/40 via-slate-900/60 to-slate-950",
  "conference-room": "from-zinc-700/40 via-zinc-900/60 to-zinc-950",
  library: "from-yellow-900/30 via-stone-900/60 to-stone-950",
};

export const SETTING_LABEL: Record<InterviewerPersona["setting"], string> = {
  cafe: "Coffee shop",
  "home-office": "Home office",
  "campus-office": "Campus office",
  "conference-room": "Conference room",
  library: "College library",
};

export const TEMPERAMENT_LABEL: Record<InterviewerPersona["temperament"], string> = {
  warm: "Warm · lets silences sit",
  exacting: "Exacting · takes notes, circles back",
  brisk: "Brisk · fast, reacts out loud",
  reserved: "Reserved · long pauses, won't rescue you",
};
