/**
 * Read the *real* error out of a `supabase.functions.invoke()` result.
 *
 * supabase-js does not throw on a non-2xx edge function response. It resolves
 * with `{ data: null, error: FunctionsHttpError }`, and that error's `.message`
 * is the constant string "Edge Function returned a non-2xx status code" — the
 * JSON body the function carefully returned (`{ error: "Daily credit limit
 * reached…" }`) is stashed on `error.context`, which is the raw `Response`.
 *
 * Every call site in this codebase was written as:
 *
 *     const { data, error } = await supabase.functions.invoke(...)
 *     if (error) throw error;          // <- opaque message shown to the user
 *     if (data?.error) throw ...       // <- unreachable, data is null on 4xx/5xx
 *
 * so users saw "Edge Function returned a non-2xx status code" for *every*
 * recoverable condition: out of credits, rate limited, profile too thin,
 * LinkedIn not imported yet. This helper unwraps the body so the message the
 * function author wrote is the message the user reads.
 */

type InvokeError = {
  message?: string;
  name?: string;
  context?: unknown;
};

function isResponseLike(v: unknown): v is Response {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as Response).status === "number" &&
    typeof (v as Response).text === "function"
  );
}

/** Pull `{ error: "…" }` (or `{ message: "…" }`) out of a JSON body string. */
function messageFromBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const msg = parsed?.error ?? parsed?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    // Not JSON — a plain-text body (e.g. a platform-level 502) is still more
    // useful than the generic wrapper message, as long as it isn't HTML.
    if (!trimmed.startsWith("<") && trimmed.length <= 300) return trimmed;
  }
  return null;
}

const STATUS_FALLBACKS: Record<number, string> = {
  401: "Your session expired. Please sign in again.",
  402: "You're out of AI credits. Upgrade your plan to continue.",
  403: "You don't have access to this feature on your current plan.",
  429: "Too many requests right now. Try again in a moment.",
  500: "Something went wrong on our side. Please try again.",
  502: "The AI service is unavailable right now. Please try again.",
  503: "The AI service is unavailable right now. Please try again.",
  504: "That took too long to generate. Please try again.",
};

export interface EdgeFailure {
  message: string;
  status: number | null;
}

/**
 * Normalise an invoke result into either `null` (success) or a failure with a
 * human-readable message.
 *
 * Handles all three ways an edge function call can fail:
 *   1. non-2xx  -> `error` is a FunctionsHttpError, body is on `error.context`
 *   2. network  -> `error` is a FunctionsFetchError with a useful message
 *   3. 200 with `{ error }` in the payload -> some functions signal this way
 */
export async function readEdgeError(
  result: { data: unknown; error: unknown },
): Promise<EdgeFailure | null> {
  const { data, error } = result;

  if (error) {
    const err = error as InvokeError;
    const ctx = err.context;
    let status: number | null = null;

    if (isResponseLike(ctx)) {
      status = ctx.status;
      // `context` is a Response that supabase-js has not consumed. Clone
      // defensively so a caller that also inspects it isn't left with a
      // locked stream.
      try {
        const body = await (typeof ctx.clone === "function" ? ctx.clone() : ctx).text();
        const fromBody = messageFromBody(body);
        if (fromBody) return { message: fromBody, status };
      } catch {
        /* fall through to the status/message fallbacks below */
      }
    }

    if (status && STATUS_FALLBACKS[status]) {
      return { message: STATUS_FALLBACKS[status], status };
    }

    const raw = typeof err.message === "string" ? err.message.trim() : "";
    const useless =
      !raw ||
      raw === "Edge Function returned a non-2xx status code" ||
      raw === "Failed to send a request to the Edge Function";
    return {
      message: useless ? "That request failed. Please try again." : raw,
      status,
    };
  }

  // A 2xx response that still reports a failure in its payload.
  if (data && typeof data === "object") {
    const payloadError = (data as Record<string, unknown>).error;
    if (typeof payloadError === "string" && payloadError.trim()) {
      return { message: payloadError.trim(), status: 200 };
    }
  }

  return null;
}

/** Convenience wrapper: invoke, and throw a useful `Error` on failure. */
export async function invokeEdgeFunction<T = unknown>(
  invoke: Promise<{ data: unknown; error: unknown }>,
): Promise<T> {
  const result = await invoke;
  const failure = await readEdgeError(result);
  if (failure) throw new Error(failure.message);
  return result.data as T;
}
