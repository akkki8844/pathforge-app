import { supabase } from "@/integrations/supabase/client";

type ActionType =
  | "page_view"
  | "login"
  | "logout"
  | "signup"
  | "feature_used"
  | "credit_consumed"
  | "upgrade_clicked"
  | "onboarding_step"
  | "ai_request"
  | "click"
  | "search";

const recent = new Map<string, number>();
const DEDUPE_MS = 1500;

/**
 * Records a user activity row via the SECURITY DEFINER RPC `log_user_activity`.
 * Silently no-ops when not authenticated. Best-effort only.
 */
export async function logActivity(
  action_type: ActionType,
  page_path?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> {
  try {
    // Cheap deduper: avoid double page_view spam from React StrictMode / quick re-renders
    const key = `${action_type}:${page_path ?? ""}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last && now - last < DEDUPE_MS) return;
    recent.set(key, now);

    await supabase.rpc("log_user_activity", {
      _action_type: action_type,
      _page_path: page_path ?? null,
      _details: (details as never) ?? null,
    });
  } catch {
    /* fire and forget */
  }
}
