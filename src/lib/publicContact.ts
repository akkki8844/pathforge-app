import { supabase } from "@/integrations/supabase/client";

/**
 * Submit one of the three public forms (/contact, the enterprise enquiry on
 * /pricing, the feedback widget) through the `public-contact` edge function.
 *
 * These used to call `send-transactional-email` directly from the browser. That
 * function is service-role-only by design — it renders any template to any
 * recipient, so exposing it to the browser would make it an open phishing relay
 * — and it is not exempt from `verify_jwt`, so a signed-out visitor's request
 * was rejected at the gateway before the function ran. Nothing was ever sent.
 */
export type PublicContactKind = "contact" | "enterprise" | "feedback";

export interface PublicContactInput {
  kind: PublicContactKind;
  name?: string;
  email?: string;
  subject?: string;
  organization?: string;
  message: string;
}

/**
 * `supabase.functions.invoke()` RESOLVES on a non-2xx response rather than
 * throwing, and the `error` it hands back carries only a generic
 * "non-2xx status code" string — the function's own JSON body is stashed on
 * `error.context`, an untouched `Response`. Callers that only wrapped invoke in
 * a try/catch therefore fell straight through to their success branch, which is
 * how all three forms came to report success for submissions that failed.
 *
 * This reads the real message back out so the user is told the truth.
 */
async function extractError(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      /* not JSON — fall through to the generic message */
    }
  }
  return (
    (error as { message?: string })?.message ||
    "Something went wrong. Please try again, or email us directly."
  );
}

/** Throws with a human-readable message on any failure; resolves on success. */
export async function submitPublicForm(input: PublicContactInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke("public-contact", {
    body: input,
  });

  if (error) throw new Error(await extractError(error));

  // Belt and braces: a 200 that still carries an `error` key.
  const inline = (data as { error?: string } | null)?.error;
  if (inline) throw new Error(inline);
}
