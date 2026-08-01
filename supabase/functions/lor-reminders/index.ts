// LOR deadline reminders — scans recommenders with upcoming due_date,
// inserts a notification row, and advances reminder_stage so we never
// double-fire the same nudge. Designed to be cron'd daily.
//
// Stages: t14 (14d out), t7 (7d), t3 (3d), t1 (1d), overdue.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseJwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return (JSON.parse(atob(payload)) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

const STAGE_ORDER = ["t14", "t7", "t3", "t1", "overdue"] as const;
type Stage = typeof STAGE_ORDER[number];

function pickStage(daysUntil: number): Stage | null {
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 1) return "t1";
  if (daysUntil <= 3) return "t3";
  if (daysUntil <= 7) return "t7";
  if (daysUntil <= 14) return "t14";
  return null;
}

function stageIndex(s: string | null): number {
  if (!s) return -1;
  return STAGE_ORDER.indexOf(s as Stage);
}

function copy(stage: Stage, name: string, days: number) {
  switch (stage) {
    case "t14":
      return { title: "Recommender deadline in 2 weeks", message: `${name}'s letter is due in ${days} days. Now's a good moment to nudge gently if you haven't.` };
    case "t7":
      return { title: "Recommender deadline in a week", message: `${name}'s letter is due in ${days} days. Send a friendly check-in if it's still pending.` };
    case "t3":
      return { title: "Recommender deadline in 3 days", message: `${name}'s letter is due in ${days} days. Time to follow up directly.` };
    case "t1":
      return { title: "Recommender deadline tomorrow", message: `${name}'s letter is due tomorrow. Reach out today to confirm.` };
    case "overdue":
      return { title: "Recommender deadline passed", message: `${name}'s letter is overdue. Reach out today.` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cron-only endpoint: require service-role bearer auth. Without this,
    // anyone could spam notifications and corrupt reminder_stage state.
    // Checked via the JWT's role claim rather than exact string equality
    // against SUPABASE_SERVICE_ROLE_KEY, which goes stale against a
    // vault-cached caller token on key rotation.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token || parseJwtRole(token) !== "service_role") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rows, error } = await admin
      .from("recommenders")
      .select("id,user_id,name,due_date,status,reminder_stage,submitted_at")
      .not("due_date", "is", null)
      .is("submitted_at", null)
      .neq("status", "submitted");

    if (error) throw error;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let fired = 0;

    for (const r of rows ?? []) {
      const due = new Date(r.due_date as string);
      due.setUTCHours(0, 0, 0, 0);
      const days = Math.round((due.getTime() - today.getTime()) / 86400000);
      const stage = pickStage(days);
      if (!stage) continue;
      if (stageIndex(stage) <= stageIndex(r.reminder_stage as string | null)) continue;

      const { title, message } = copy(stage, r.name, Math.max(0, days));
      await admin.from("notifications").insert({
        user_id: r.user_id,
        title,
        message,
        sender_role: "system",
      });
      await admin
        .from("recommenders")
        .update({ reminder_stage: stage, last_reminder_at: new Date().toISOString() })
        .eq("id", r.id);
      fired++;
    }

    return new Response(JSON.stringify({ ok: true, fired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lor-reminders error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
