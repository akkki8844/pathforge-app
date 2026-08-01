import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PREF_KEY = (uid: string) => `pf_notif_prefs_${uid}`;

export type NotifChannel = "inApp" | "toast";
export type NotifPrefs = {
  aiTasks: boolean;
  toasts: boolean;
};

export function getNotifPrefs(userId: string | undefined | null): NotifPrefs {
  if (!userId) return { aiTasks: true, toasts: true };
  try {
    const raw = localStorage.getItem(PREF_KEY(userId));
    if (!raw) return { aiTasks: true, toasts: true };
    return { aiTasks: true, toasts: true, ...JSON.parse(raw) };
  } catch {
    return { aiTasks: true, toasts: true };
  }
}

export function setNotifPrefs(userId: string, prefs: NotifPrefs) {
  try {
    localStorage.setItem(PREF_KEY(userId), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * Persist an in-app notification (bell) and optionally show a toast.
 * Used when AI tasks finish (essay refine, resume generation, evaluations, etc.)
 */
export async function notifyTaskComplete(opts: {
  title: string;
  message: string;
  showToast?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const prefs = getNotifPrefs(user.id);
  if (!prefs.aiTasks) return;

  const { showToast = true } = opts;
  if (showToast && prefs.toasts) {
    toast.success(opts.title, { description: opts.message });
  }

  try {
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: opts.title,
      message: opts.message,
    });
  } catch {
    /* fail silently — toast already shown */
  }
}
