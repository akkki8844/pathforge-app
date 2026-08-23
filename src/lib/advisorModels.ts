import type { PlanTier } from "@/lib/plans";

/**
 * The advisor model ladder — the single source of truth for what the three
 * tiers are called and which gateway model each one actually runs on.
 *
 * `id` is what we persist (localStorage + `advisor_settings.model` is derived
 * from `gateway`). `label` is cosmetic and safe to rename. `gateway` is the
 * real model identifier the edge function forwards to the AI gateway — it is
 * validated again server-side against its own allowlist, so a tampered client
 * value can never buy a more expensive model.
 *
 * Every `gateway` value here must also appear in ALLOWED_MODELS inside
 * `supabase/functions/voice-advisor/index.ts`, and all three are GA ids
 * rather than `-preview` ones: preview models get retired upstream without
 * notice, which previously left users' stored preference pointing at a dead id.
 */
export interface AdvisorModel {
  id: string;
  label: string;
  blurb: string;
  gateway: string;
  requiredPlan: PlanTier;
  /**
   * Token burn multiplier. Display only — the number that actually meters the
   * account is `advisor_model_weight()` in the database, which is keyed on the
   * same `gateway` string. These two must agree; a mismatch would show the
   * student a rate they are not being charged.
   */
  weight: number;
}

export const ADVISOR_MODELS: readonly AdvisorModel[] = [
  {
    id: "pfa-5.5",
    label: "PFA 5.5",
    blurb: "Fast, balanced everyday advising",
    gateway: "google/gemini-2.5-flash",
    requiredPlan: "free",
    weight: 1,
  },
  {
    id: "pfa-6.5",
    label: "PFA 6.5",
    blurb: "Deeper analysis for tough calls",
    gateway: "openai/gpt-5-mini",
    requiredPlan: "pro",
    weight: 2,
  },
  {
    id: "pfa-7",
    label: "PFA 7",
    blurb: "Top reasoning for high-stakes decisions",
    gateway: "google/gemini-2.5-pro",
    requiredPlan: "max",
    weight: 3,
  },
] as const;

export const DEFAULT_ADVISOR_MODEL = ADVISOR_MODELS[0];

export const LOCAL_MODEL_KEY = "pf_advisor_model";

/**
 * Every value we have ever persisted for a model preference, mapped onto a
 * current id.
 *
 * Three generations are in the wild:
 *  - tier ids from the cosmetic picker (`core` / `pro` / `max`),
 *  - display labels, in case anything ever stored the label instead of the id,
 *  - raw gateway ids, which is what `advisor_settings.model` holds.
 *
 * Anything unrecognised falls back to the entry level rather than throwing, so
 * a stale preference degrades to a working model instead of a broken picker.
 */
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  // Previous cosmetic tier ids
  core: "pfa-5.5",
  pro: "pfa-6.5",
  max: "pfa-7",
  // Previous display labels
  "pathforge core": "pfa-5.5",
  "pathforge pro": "pfa-6.5",
  "pathforge max": "pfa-7",
  // Raw gateway ids that used to be selectable in Settings
  "google/gemini-2.5-flash": "pfa-5.5",
  "google/gemini-2.5-flash-lite": "pfa-5.5",
  "google/gemini-3-flash-preview": "pfa-5.5",
  "google/gemini-3.1-flash-lite-preview": "pfa-5.5",
  "google/gemini-3.5-flash": "pfa-5.5",
  "openai/gpt-5-nano": "pfa-5.5",
  "openai/gpt-5-mini": "pfa-6.5",
  "google/gemini-2.5-pro": "pfa-7",
  // `openai/gpt-5` was offered in Settings but was never on the server
  // allowlist, so it silently fell back. Point it at the real top tier.
  "openai/gpt-5": "pfa-7",
};

/** Resolve any stored/legacy preference onto a live model. Never returns null. */
export function resolveAdvisorModel(stored: string | null | undefined): AdvisorModel {
  if (!stored) return DEFAULT_ADVISOR_MODEL;
  const raw = stored.trim();
  const direct = ADVISOR_MODELS.find((m) => m.id === raw);
  if (direct) return direct;
  const aliased = LEGACY_MODEL_ALIASES[raw.toLowerCase()];
  if (aliased) {
    const hit = ADVISOR_MODELS.find((m) => m.id === aliased);
    if (hit) return hit;
  }
  return DEFAULT_ADVISOR_MODEL;
}

/** Resolve from a gateway id (what `advisor_settings.model` stores). */
export function modelFromGateway(gateway: string | null | undefined): AdvisorModel {
  if (!gateway) return DEFAULT_ADVISOR_MODEL;
  const exact = ADVISOR_MODELS.find((m) => m.gateway === gateway);
  return exact ?? resolveAdvisorModel(gateway);
}

/**
 * Read the browser-side preference, rewriting legacy values in place so the
 * migration happens once rather than on every read.
 */
export function readStoredModel(): AdvisorModel {
  if (typeof window === "undefined") return DEFAULT_ADVISOR_MODEL;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(LOCAL_MODEL_KEY);
  } catch {
    return DEFAULT_ADVISOR_MODEL;
  }
  const model = resolveAdvisorModel(stored);
  if (stored !== model.id) {
    try {
      localStorage.setItem(LOCAL_MODEL_KEY, model.id);
    } catch {
      /* private mode — the resolved value is still correct for this session */
    }
  }
  return model;
}

export function writeStoredModel(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_MODEL_KEY, id);
  } catch {
    /* ignore */
  }
}
