import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddEventBody {
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime OR YYYY-MM-DD for all-day
  end?: string;  // ISO datetime OR YYYY-MM-DD for all-day; defaults to +1h
  allDay?: boolean;
  url?: string;
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
  if (!res.ok) {
    console.error("Refresh failed", await res.text());
    return null;
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as AddEventBody | null;
    if (!body || !body.summary || !body.start) {
      return new Response(JSON.stringify({ error: "Missing summary or start" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tokenRow, error: tokenErr } = await admin
      .from("user_google_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "not_connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRow.access_token as string;
    const expiresAt = new Date(tokenRow.expires_at).getTime();
    if (Date.now() > expiresAt - 60_000) {
      if (!tokenRow.refresh_token) {
        return new Response(JSON.stringify({ error: "expired_no_refresh" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
      if (!refreshed) {
        return new Response(JSON.stringify({ error: "refresh_failed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshed.access_token;
      const newExpires = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
      await admin
        .from("user_google_tokens")
        .update({ access_token: accessToken, expires_at: newExpires })
        .eq("user_id", userId);
    }

    // Build event
    const eventBody: Record<string, unknown> = {
      summary: body.summary,
    };
    if (body.description) eventBody.description = body.description;
    if (body.location) eventBody.location = body.location;
    if (body.url) {
      eventBody.description = `${eventBody.description ?? ""}\n\n${body.url}`.trim();
    }

    if (body.allDay) {
      const startDate = body.start.slice(0, 10);
      const endDate = (body.end ?? body.start).slice(0, 10);
      eventBody.start = { date: startDate };
      eventBody.end = { date: endDate };
    } else {
      const startIso = new Date(body.start).toISOString();
      const endIso = body.end
        ? new Date(body.end).toISOString()
        : new Date(new Date(body.start).getTime() + 60 * 60 * 1000).toISOString();
      eventBody.start = { dateTime: startIso };
      eventBody.end = { dateTime: endIso };
    }

    const calRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      },
    );

    const calJson = await calRes.json();
    if (!calRes.ok) {
      console.error("Calendar insert failed", calJson);
      return new Response(JSON.stringify({ error: calJson.error?.message ?? "calendar_failed" }), {
        status: calRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, htmlLink: calJson.htmlLink, id: calJson.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("calendar-add-event error", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
