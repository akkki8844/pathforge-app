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
 * "allowance" is the same monthly/daily pool every other feature draws on —
 * the advisor used to meter itself separately in tokens, but that meant a
 * student could be out of "advisor" while every other usage meter in the app
 * still read 100%. One pool now, so one kind here.
 */
export type AdvisorLimitKind = "allowance" | "rate";

export class AdvisorLimitError extends Error {
  kind: AdvisorLimitKind;
  constructor(kind: AdvisorLimitKind, message: string) {
    super(message);
    this.name = "AdvisorLimitError";
    this.kind = kind;
  }
}

/** One page the advisor consulted on this turn, as the web tools returned it. */
export interface AdvisorSource {
  title: string;
  url: string;
  snippet?: string;
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
  /**
   * A progress line from the server. `kind` says what is being waited on
   * ("image", "file"), so the UI can pick a waiting state rather than parse the
   * label. Older deployments send no kind at all, hence optional.
   */
  onStatus?: (label: string, kind?: string) => void;
  onTool?: (call: StreamedToolCall) => void;
  onArtifact?: (artifact: unknown) => void;
  /**
   * Pages the advisor read before answering. Sent as soon as the search
   * returns, which is well before the answer written from them — so the
   * student can see what is being consulted while it is still being read.
   */
  onSources?: (sources: AdvisorSource[]) => void;
  /** Skills loaded for this turn, announced with the first frame. */
  onSkills?: (skills: { slug: string; name: string }[]) => void;
  /** The model id that is actually writing this turn, as the server reports it. */
  onModel?: (model: string) => void;
}

export interface AdvisorStreamResult {
  response: string;
  reasoning: string;
  suggestions: string[];
  topics: string[];
  title: string | null;
  artifact: unknown | null;
  toolCalls: StreamedToolCall[];
  /** Pages consulted on this turn. Empty unless a web tool ran. */
  sources: AdvisorSource[];
  /** False when the server never sent a terminal frame (aborted, or cut off). */
  completed: boolean;
  action?: { type: string; value?: string } | null;
  /** Installed skills whose full instructions were loaded for this turn. */
  skills: { slug: string; name: string }[];
  /** The model id the server says wrote this turn, when it said. */
  model?: string;
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
  /** On a status frame: what the server is waiting on ("image", "file"). */
  kind?: unknown;
  id?: unknown;
  name?: unknown;
  args?: unknown;
  artifact?: unknown;
  sources?: unknown;
  response?: unknown;
  reasoning?: unknown;
  suggestions?: unknown;
  topics?: unknown;
  title?: unknown;
  message?: unknown;
  skills?: unknown;
  model?: unknown;
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
/**
 * Sources as they arrive off the wire.
 *
 * Validated rather than trusted: these originate at a search provider, reach
 * the model, and are rendered as links a student will click. A row without a
 * usable https URL is dropped rather than rendered as a dead or hostile link.
 */
function readSources(raw: unknown): AdvisorSource[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const row = entry as Record<string, unknown> | null;
      const url = typeof row?.url === "string" ? row.url : "";
      if (!/^https:\/\//i.test(url)) return null;
      const title = typeof row?.title === "string" && row.title.trim() ? row.title : url;
      const snippet = typeof row?.snippet === "string" ? row.snippet : undefined;
      const source: AdvisorSource = { title, url };
      if (snippet) source.snippet = snippet;
      return source;
    })
    .filter((x): x is AdvisorSource => x !== null)
    .slice(0, 6);
}

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
    if (code === "OUT_OF_CREDITS" || res.status === 402) {
      throw new AdvisorLimitError("allowance", message || "You have used 100% of your allowance.");
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
    sources: [],
    completed: false,
    action: null,
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
    result.sources = readSources(data?.sources);
    if (result.sources.length) callbacks.onSources?.(result.sources);
    if (typeof data?.model === "string" && data.model) {
      result.model = data.model;
      callbacks.onModel?.(data.model);
    }
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
            if (typeof frame.model === "string" && frame.model) {
              result.model = frame.model;
              callbacks.onModel?.(frame.model);
            }
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
            if (typeof frame.label === "string") {
              callbacks.onStatus?.(
                frame.label,
                typeof frame.kind === "string" ? frame.kind : undefined,
              );
            }
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
          case "sources": {
            const found = readSources(frame.sources);
            if (found.length) {
              result.sources = found;
              callbacks.onSources?.(found);
            }
            break;
          }
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
            // The done frame is canonical, but a mid-stream `sources` frame is
            // the same list — keep what we have if the terminal frame omits it.
            {
              const finalSources = readSources(frame.sources);
              if (finalSources.length) result.sources = finalSources;
            }
            if (frame.artifact) result.artifact = frame.artifact;
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
