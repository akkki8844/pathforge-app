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
  /** Who makes the model underneath. Shown next to the label, with its logo. */
  vendor: ModelVendor;
  /** The model's public name, e.g. "Gemini 2.5 Flash". Never hidden. */
  modelName: string;
}

export type ModelVendor = "google" | "openai" | "nvidia" | "zai";

export const VENDOR_NAMES: Record<ModelVendor, string> = {
  google: "Google",
  openai: "OpenAI",
  nvidia: "NVIDIA",
  zai: "Z.ai",
};

export const ADVISOR_MODELS: readonly AdvisorModel[] = [
  {
    id: "pfa-5.5",
    label: "PFA 5.5",
    blurb: "Fast, balanced everyday advising",
    gateway: "google/gemini-2.5-flash",
    requiredPlan: "free",
    weight: 1,
    vendor: "google",
    modelName: "Gemini 2.5 Flash",
  },
  {
    id: "pfa-6.5",
    label: "PFA 6.5",
    blurb: "Deeper analysis for tough calls",
    gateway: "openai/gpt-5-mini",
    requiredPlan: "pro",
    weight: 2,
    vendor: "openai",
    modelName: "GPT-5 mini",
  },
  {
    id: "pfa-7",
    label: "PFA 7",
    blurb: "Top reasoning for high-stakes decisions",
    gateway: "google/gemini-2.5-pro",
    requiredPlan: "max",
    weight: 3,
    vendor: "google",
    modelName: "Gemini 2.5 Pro",
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

/**
 * The public name and maker of any model id the advisor can come back with.
 *
 * The id is the one the server reports for the turn, which is not always the
 * one the student picked: a retired or failing model falls back to Gemini 2.5
 * Flash, and when the primary gateway is out of credit the answer is written
 * by a backup provider's open model. Disclosing the tier's usual model would
 * then name the wrong company, so the label is derived from what actually ran.
 */
const SERVED_MODELS: { match: RegExp; vendor: ModelVendor; name: string }[] = [
  { match: /gemini-2\.5-pro/, vendor: "google", name: "Gemini 2.5 Pro" },
  { match: /gemini-2\.5-flash-lite/, vendor: "google", name: "Gemini 2.5 Flash-Lite" },
  { match: /gemini-2\.5-flash/, vendor: "google", name: "Gemini 2.5 Flash" },
  { match: /gemini-3\.1-flash-lite/, vendor: "google", name: "Gemini 3.1 Flash-Lite" },
  { match: /gemini-3\.5-flash/, vendor: "google", name: "Gemini 3.5 Flash" },
  { match: /gemini-3-flash/, vendor: "google", name: "Gemini 3 Flash" },
  { match: /gemini/, vendor: "google", name: "Gemini" },
  { match: /gpt-5-nano/, vendor: "openai", name: "GPT-5 nano" },
  { match: /gpt-5-mini/, vendor: "openai", name: "GPT-5 mini" },
  { match: /gpt-5/, vendor: "openai", name: "GPT-5" },
  { match: /gpt/, vendor: "openai", name: "GPT" },
  { match: /nemotron/, vendor: "nvidia", name: "Nemotron" },
  { match: /glm/, vendor: "zai", name: "GLM" },
];

export function describeServedModel(
  id: string | null | undefined,
): { vendor: ModelVendor; name: string } | null {
  if (!id) return null;
  const lower = id.toLowerCase();
  const hit = SERVED_MODELS.find((m) => m.match.test(lower));
  return hit ? { vendor: hit.vendor, name: hit.name } : null;
}
