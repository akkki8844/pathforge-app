/**
 * Reading the real error out of a `supabase.functions.invoke` failure.
 *
 * supabase-js does not put the edge function's response body on the thrown
 * error. On a non-2xx it throws a `FunctionsHttpError` whose `.message` is the
 * fixed string "Edge Function returned a non-2xx status code" — so the
 * `error.message.includes("429")` checks that grew up around the builders never
 * matched anything, and every real failure (dead model, credit limit, rate
 * limit) collapsed into the same generic "try again" toast with no way to tell
 * them apart. The actual body lives on `.context`, which is the raw `Response`.
 */

type InvokeError = { message?: string; context?: unknown };

/** The parsed shape of a failed invoke: HTTP status plus the server's message. */
export type FunctionErrorInfo = { status: number; message: string };

const FALLBACK = "Something went wrong. Please try again.";

/**
 * Pull `{ status, message }` off a failed invoke. Falls back to the error's own
 * message when the body isn't readable (network error, non-JSON response).
 *
 * The `Response` body can only be read once, so this must not be called twice
 * on the same error object.
 */
export async function parseFunctionError(error: unknown): Promise<FunctionErrorInfo> {
  const err = error as InvokeError | null;
  const ctx = err?.context;

  if (ctx instanceof Response) {
    let message = "";
    try {
      const body = await ctx.clone().json();
      // `message` wins over `error` when both are present. Functions that
      // distinguish the two use `error` as a machine code ("OUT_OF_CREDITS",
      // "RATE_LIMITED") and `message` as the sentence written for a student —
      // showing the code was a bug you only noticed the first time a toast said
      // "INTERVIEWER_UNAVAILABLE". Functions that send only `error` still carry
      // their human string there, so that path is unchanged.
      if (body && typeof body.message === "string" && body.message.trim()) {
        message = body.message;
      } else if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      try {
        message = (await ctx.clone().text()).slice(0, 200);
      } catch {
        /* body already consumed or unreadable */
      }
    }
    return { status: ctx.status, message: message || err?.message || FALLBACK };
  }

  return { status: 0, message: err?.message || FALLBACK };
}

/**
 * The user-facing string for a failed invoke. Prefers the edge function's own
 * message (they are already written for students, e.g. "Daily credit limit
 * reached"), and only synthesises one for statuses that arrive bare.
 */
export async function functionErrorMessage(
  error: unknown,
  fallback = FALLBACK,
): Promise<string> {
  const { status, message } = await parseFunctionError(error);

  if (message && message !== "Edge Function returned a non-2xx status code") {
    return message;
  }
  if (status === 429) return "Rate limit exceeded. Please try again in a moment.";
  if (status === 402) return "You have used 100% of your allowance. Please upgrade your plan.";
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 503) return "The writing model is unavailable right now. Please try again in a moment.";
  return fallback;
}
