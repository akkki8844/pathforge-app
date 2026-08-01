// Daily cron: emails every user whose weekly_plan contains an activity
// happening "tomorrow". Enqueues via the existing send-transactional-email
// pipeline so retries / suppression / rate limits are handled centrally.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlannerActivity {
  id: string;
  name: string;
  category: string;
  dayOfWeek: number;
  plannedHours: number;
  completed: boolean;
  notes?: string;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekStartFor(d: Date): string {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return toYMD(c);
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Require service-role bearer auth — this is a cron-only endpoint. Checked
  // via the JWT's own role claim (like process-email-queue) rather than exact
  // string equality against SUPABASE_SERVICE_ROLE_KEY: the caller's token
  // comes from a vault-cached copy that goes stale on key rotation, while any
  // genuinely-signed service-role token is valid regardless of when it was cached.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || parseJwtRole(token) !== "service_role") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDow = tomorrow.getDay();
  const tomorrowWeek = weekStartFor(tomorrow);

  const { data: plans, error } = await admin
    .from("weekly_plans")
    .select("user_id, activities")
    .eq("week_start", tomorrowWeek);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let queued = 0;
  for (const row of plans ?? []) {
    const activities: PlannerActivity[] = Array.isArray(row.activities) ? row.activities : [];
    const tomorrowActs = activities.filter((a) => a.dayOfWeek === tomorrowDow && !a.completed);
    if (tomorrowActs.length === 0) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("email, username")
      .eq("user_id", row.user_id)
      .maybeSingle();

    const email = profile?.email;
    if (!email) continue;

    const itemsHtml = tomorrowActs
      .map((a) => `<li style="margin:4px 0"><strong>${escapeHtml(a.name)}</strong> · ${escapeHtml(a.plannedHours)}h</li>`)
      .join("");
    const itemsText = tomorrowActs.map((a) => `• ${a.name} (${a.plannedHours}h)`).join("\n");
    const greeting = profile?.username ? `Hi ${escapeHtml(profile.username)},` : "Hi,";

    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f5f7;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
        <h2 style="margin:0 0 8px;color:#0f172a">Reminder: activities scheduled for tomorrow</h2>
        <p style="margin:0 0 14px;color:#475569">${greeting} you have ${tomorrowActs.length} planned activit${tomorrowActs.length === 1 ? "y" : "ies"} for tomorrow on your Pathforge weekly planner.</p>
        <ul style="padding-left:18px;color:#0f172a">${itemsHtml}</ul>
        <p style="margin:18px 0 0;color:#475569;font-size:13px">Open Pathforge to mark them complete once you're done.</p>
      </div>
    </body></html>`;

    const text = `${greeting}\n\nYou have ${tomorrowActs.length} planned activit${tomorrowActs.length === 1 ? "y" : "ies"} for tomorrow:\n\n${itemsText}\n\nOpen Pathforge to mark them complete once you're done.`;

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          to: email,
          subject: `You have ${tomorrowActs.length} activit${tomorrowActs.length === 1 ? "y" : "ies"} tomorrow`,
          html,
          text,
          purpose: "transactional",
          idempotency_key: `activity-reminder:${row.user_id}:${toYMD(tomorrow)}`,
        }),
      });
      if (resp.ok) queued++;
    } catch (_e) { /* ignore individual failures, cron will retry */ }
  }

  return new Response(JSON.stringify({ ok: true, queued }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
