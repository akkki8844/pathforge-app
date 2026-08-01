import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function weekStartKey(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function eventStartDate(event: CalendarEvent) {
  const raw = event.start?.dateTime ?? event.start?.date;
  return raw ? new Date(raw) : null;
}

function eventHours(event: CalendarEvent, start: Date) {
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (!endRaw || event.start?.date) return 1;
  const hours = (new Date(endRaw).getTime() - start.getTime()) / 3_600_000;
  return Math.max(0.5, Math.min(12, Math.round(hours * 2) / 2));
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
  const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tokenRow } = await admin
      .from("user_google_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!tokenRow) return json({ error: "not_connected" }, 400);

    let accessToken = tokenRow.access_token as string;
    if (Date.now() > new Date(tokenRow.expires_at).getTime() - 60_000) {
      if (!tokenRow.refresh_token) return json({ error: "expired_no_refresh" }, 400);
      const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
      if (!refreshed) return json({ error: "refresh_failed" }, 401);
      accessToken = refreshed.access_token;
      await admin.from("user_google_tokens").update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      }).eq("user_id", userData.user.id);
    }

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const timeMin = typeof body.timeMin === "string" ? body.timeMin : new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const timeMax = typeof body.timeMax === "string" ? body.timeMax : new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });

    const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const calJson = await calRes.json();
    if (!calRes.ok) return json({ error: calJson.error?.message ?? "calendar_sync_failed" }, calRes.status);

    const grouped = new Map<string, any[]>();
    for (const event of (calJson.items ?? []) as CalendarEvent[]) {
      if (!event.id || event.summary === "Canceled" || (event as any).status === "cancelled") continue;
      const start = eventStartDate(event);
      if (!start || Number.isNaN(start.getTime())) continue;
      const weekStart = weekStartKey(start);
      const activity = {
        id: `google_${event.id.replace(/[^a-zA-Z0-9_-]/g, "_")}_${start.toISOString().slice(0, 10)}`,
        googleEventId: event.id,
        source: "google_calendar",
        name: event.summary?.slice(0, 180) || "Google Calendar event",
        category: "personal-development",
        subject: event.location || undefined,
        plannedHours: eventHours(event, start),
        actualHours: 0,
        dayOfWeek: start.getDay(),
        completed: false,
        notes: [event.description, event.htmlLink].filter(Boolean).join("\n\n").slice(0, 1200) || undefined,
      };
      grouped.set(weekStart, [...(grouped.get(weekStart) ?? []), activity]);
    }

    let imported = 0;
    for (const [weekStart, activities] of grouped) {
      const { data: existing } = await admin
        .from("weekly_plans")
        .select("activities, recommendations")
        .eq("user_id", userData.user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      const current = Array.isArray(existing?.activities) ? existing.activities : [];
      const keys = new Set(current.map((a: any) => a.googleEventId || a.id));
      const additions = activities.filter((a) => !keys.has(a.googleEventId) && !keys.has(a.id));
      imported += additions.length;
      await admin.from("weekly_plans").upsert({
        user_id: userData.user.id,
        week_start: weekStart,
        activities: [...current, ...additions],
        recommendations: existing?.recommendations ?? [],
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,week_start" });
    }

    return json({ ok: true, imported, scanned: (calJson.items ?? []).length, weeks: grouped.size });
  } catch (e) {
    console.error("google-calendar-sync error", e);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}