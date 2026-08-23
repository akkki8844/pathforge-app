import { supabase } from "@/integrations/supabase/client";

/**
 * Transport for the advisor.
 *
 * `supabase.functions.invoke` buffers the whole response, which makes a stop
 * button meaningless — there is nothing to stop, and nothing partial to keep.
 * So this talks to the edge function directly, with an AbortSignal wired all
 * the way through to `fetch`.
 *
 * It also degrades: if the deployed function answers with plain JSON instead of
 * an event stream (an older deployment, or the major-change short-circuit that
 * never reaches the model), the same call resolves with the same shape.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * "tokens" is the advisor's own monthly token budget; "credits" is the app-wide
 * pool that artifact generation still draws on. They are different pools and
 * the notice a user sees has to say which one ran out, so they stay separate
 * here rather than collapsing into one "limit" case.
 */
export type AdvisorLimitKind = "credits" | "rate" | "tokens";

export class AdvisorLimitError extends Error {
  kind: AdvisorLimitKind;
  constructor(kind: AdvisorLimitKind, message: string) {
    super(message);
    this.name = "AdvisorLimitError";
    this.kind = kind;
  }
}

export interface StreamedToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface AdvisorStreamCallbacks {
  /** First byte received — the placeholder can become a real bubble. */
  onStart?: () => void;
  onReasoning?: (delta: string) => void;
  onText?: (delta: string) => void;
  onStatus?: (label: string) => void;
  onTool?: (call: StreamedToolCall) => void;
  onArtifact?: (artifact: unknown) => void;
  /** Skills loaded for this turn, announced with the first frame. */
  onSkills?: (skills: { slug: string; name: string }[]) => void;
}

export interface AdvisorStreamResult {
  response: string;
  reasoning: string;
  suggestions: string[];
  topics: string[];
  title: string | null;
  artifact: unknown | null;
  toolCalls: StreamedToolCall[];
  /** False when the server never sent a terminal frame (aborted, or cut off). */
  completed: boolean;
  action?: { type: string; value?: string } | null;
  /**
   * Post-charge token balance from the server, when the turn finished. Null on
   * an aborted stream — the charge still happened server-side, but this client
   * never saw the frame carrying the new number, so the meter refetches.
   */
  tokens: unknown | null;
  /** Installed skills whose full instructions were loaded for this turn. */
  skills: { slug: string; name: string }[];
}

export interface AdvisorRequest {
  message: string;
  onboardingData: Record<string, unknown>;
  conversationHistory: { role: "user" | "advisor"; text: string }[];
  generateTitle: boolean;
  attachments: unknown[];
  conversationId: string | null;
  language: string;
}

/**
 * The model appends `[SUGGESTIONS] a | b | c` as its last line. Mid-stream we
 * see that marker arrive character by character, so a naive render flashes
 * "[SUG", "[SUGGE"… before the final frame cleans it up. Cut both the complete
 * marker and any trailing prefix of it.
 */
const SUGGESTION_MARKER = "[SUGGESTIONS]";

export function stripSuggestionMarker(text: string): string {
  const full = text.indexOf(SUGGESTION_MARKER);
  if (full !== -1) return text.slice(0, full).trimEnd();
  // Trailing partial: the longest suffix of `text` that is a prefix of the marker.
  const max = Math.min(text.length, SUGGESTION_MARKER.length - 1);
  for (let len = max; len > 0; len--) {
    if (SUGGESTION_MARKER.startsWith(text.slice(text.length - len))) {
      return text.slice(0, text.length - len).trimEnd();
    }
  }
  return text;
}

/** One SSE frame. Every field is optional — the `type` decides which apply. */
interface StreamFrame {
  type?: string;
  delta?: unknown;
  label?: unknown;
  id?: unknown;
  name?: unknown;
  args?: unknown;
  artifact?: unknown;
  response?: unknown;
  reasoning?: unknown;
  suggestions?: unknown;
  topics?: unknown;
  title?: unknown;
  message?: unknown;
  tokens?: unknown;
  skills?: unknown;
}

async function readErrorBody(res: Response): Promise<{ code?: string; message?: string }> {
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      return { code: j?.error, message: j?.message || j?.error };
    } catch {
      return { message: text.slice(0, 300) };
    }
  } catch {
    return {};
  }
}

/** Trust nothing from the wire: keep only well-formed `{slug, name}` pairs. */
function readSkills(raw: unknown): { slug: string; name: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const row = s as Record<string, unknown> | null;
      const slug = typeof row?.slug === "string" ? row.slug : "";
      const name = typeof row?.name === "string" ? row.name : "";
      return slug && name ? { slug, name } : null;
    })
    .filter((s): s is { slug: string; name: string } => s !== null)
    .slice(0, 4);
}

export async function streamAdvisor(
  request: AdvisorRequest,
  callbacks: AdvisorStreamCallbacks,
  signal: AbortSignal,
): Promise<AdvisorStreamResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You need to be signed in to use the advisor.");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/voice-advisor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ ...request, stream: true }),
    signal,
  });

  if (!res.ok) {
    const { code, message } = await readErrorBody(res);
    if (code === "OUT_OF_TOKENS") {
      throw new AdvisorLimitError("tokens", message || "You've used your advisor tokens for this month.");
    }
    // OUT_OF_CREDITS is the pre-token-budget code. A deployment where the page
    // is newer than the edge function still needs to say something true.
    if (code === "OUT_OF_CREDITS" || res.status === 402) {
      throw new AdvisorLimitError("credits", message || "You've run out of credits.");
    }
    if (code === "RATE_LIMITED" || res.status === 429) {
      throw new AdvisorLimitError("rate", message || "You've hit your usage limit.");
    }
    throw new Error(message || `The advisor is unreachable (${res.status}).`);
  }

  const result: AdvisorStreamResult = {
    response: "",
    reasoning: "",
    suggestions: [],
    topics: [],
    title: null,
    artifact: null,
    toolCalls: [],
    completed: false,
    action: null,
    tokens: null,
    skills: [],
  };

  const contentType = res.headers.get("content-type") || "";

  // Non-streaming reply: an older deployment, or a path in the function that
  // answers before it reaches the model.
  if (!contentType.includes("text/event-stream")) {
    const data = await res.json().catch(() => null);
    callbacks.onStart?.();
    result.response = String(data?.response || "").trim();
    result.suggestions = Array.isArray(data?.suggestions)
      ? data.suggestions.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).slice(0, 3)
      : [];
    result.topics = Array.isArray(data?.topics) ? data.topics : [];
    result.title = typeof data?.title === "string" ? data.title : null;
    result.artifact = data?.artifact ?? null;
    result.action = data?.action ?? null;
    result.tokens = data?.tokens ?? null;
    if (Array.isArray(data?.toolCalls)) {
      for (const t of data.toolCalls) {
        const call: StreamedToolCall = { id: String(t?.id || crypto.randomUUID()), name: String(t?.name || ""), args: t?.args };
        result.toolCalls.push(call);
        callbacks.onTool?.(call);
      }
    }
    if (result.response) callbacks.onText?.(result.response);
    if (result.artifact) callbacks.onArtifact?.(result.artifact);
    result.completed = true;
    return result;
  }

  if (!res.body) throw new Error("The advisor returned an empty response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let started = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl = buffer.indexOf("\n");
      while (nl !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let frame: StreamFrame;
        try {
          frame = JSON.parse(payload) as StreamFrame;
        } catch {
          continue;
        }

        switch (frame?.type) {
          case "start":
            result.skills = readSkills(frame.skills);
            if (result.skills.length) callbacks.onSkills?.(result.skills);
            if (!started) {
              started = true;
              callbacks.onStart?.();
            }
            break;
          case "reasoning":
            if (typeof frame.delta === "string") {
              result.reasoning += frame.delta;
              callbacks.onReasoning?.(frame.delta);
            }
            break;
          case "text":
            if (typeof frame.delta === "string") {
              if (!started) {
                started = true;
                callbacks.onStart?.();
              }
              result.response += frame.delta;
              callbacks.onText?.(frame.delta);
            }
            break;
          case "status":
            if (typeof frame.label === "string") callbacks.onStatus?.(frame.label);
            break;
          case "tool": {
            const call: StreamedToolCall = {
              id: String(frame.id || crypto.randomUUID()),
              name: String(frame.name || ""),
              args: frame.args,
            };
            result.toolCalls.push(call);
            callbacks.onTool?.(call);
            break;
          }
          case "artifact":
            result.artifact = frame.artifact ?? null;
            if (result.artifact) callbacks.onArtifact?.(result.artifact);
            break;
          case "done":
            // Canonical values win over what we accumulated: the server has
            // stripped the suggestions block and filled in any fallback text.
            result.response = typeof frame.response === "string" ? frame.response : result.response;
            result.reasoning = typeof frame.reasoning === "string" ? frame.reasoning : result.reasoning;
            result.suggestions = Array.isArray(frame.suggestions)
              ? frame.suggestions.filter((s: unknown): s is string => typeof s === "string" && !!s.trim()).slice(0, 3)
              : [];
            result.topics = Array.isArray(frame.topics) ? frame.topics : [];
            result.title = typeof frame.title === "string" ? frame.title : null;
            if (frame.artifact) result.artifact = frame.artifact;
            if (frame.tokens) result.tokens = frame.tokens;
            result.completed = true;
            break;
          case "error":
            throw new Error(typeof frame.message === "string" ? frame.message : "The response was interrupted.");
        }
      }
    }
  } finally {
    // Releases the lock so an aborted stream doesn't keep the connection
    // half-open; on an abort the read above has already rejected.
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  return result;
}
