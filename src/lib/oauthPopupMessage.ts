/**
 * Whether a `message` event really came from one of our own OAuth popups.
 *
 * The three connection hooks (Google Calendar, GitHub, Composio) listen on
 * `window` for a "…-oauth-complete" ping and refetch the connection when they
 * see one. Without an origin check, any page that can get a handle on this
 * window — an opener, an iframe embedding us — could fire that ping. The
 * payload carries nothing, so the worst case is a spurious refetch of the
 * user's own data rather than injected state, but a listener that accepts
 * messages from anywhere is the kind of thing that becomes a real bug the
 * moment somebody adds a field to the payload.
 *
 * The popup is served by the edge function, so it posts from the Supabase
 * functions origin, not from ours — both are accepted, and nothing else is.
 */
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL as string).origin;
  } catch {
    return null;
  }
})();

export function isTrustedOAuthMessage(event: MessageEvent): boolean {
  if (typeof window === "undefined") return false;
  return event.origin === window.location.origin || event.origin === SUPABASE_ORIGIN;
}
