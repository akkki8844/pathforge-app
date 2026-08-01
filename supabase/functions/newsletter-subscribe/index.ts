import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter (per warm instance). Public subscribe is intentional
// for the landing page, so we throttle by IP + by email to prevent bulk abuse
// and to prevent attackers from spamming confirmation emails to victims.
const ipHits = new Map<string, number[]>();
const emailHits = new Map<string, number>();
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 5;
const EMAIL_COOLDOWN_MS = 10 * 60_000; // one signup attempt per address per 10 min

function rateLimited(ip: string, email: string): boolean {
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (arr.length >= IP_MAX_PER_WINDOW) {
    ipHits.set(ip, arr);
    return true;
  }
  arr.push(now);
  ipHits.set(ip, arr);
  const last = emailHits.get(email) || 0;
  if (now - last < EMAIL_COOLDOWN_MS) return true;
  emailHits.set(email, now);
  if (ipHits.size > 5000) ipHits.clear();
  if (emailHits.size > 5000) emailHits.clear();
  return false;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // URL-safe base64
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SITE_URL = "https://pathforge.co.in";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, source } = await req.json();
    const cleaned = String(email || "").trim().toLowerCase();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) || cleaned.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (rateLimited(ip, cleaned)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up any existing subscriber to enforce double opt-in semantics:
    // - If already confirmed: do not send any email (silent OK) so we can't
    //   be used to spam confirmed addresses.
    // - If pending: refresh token + re-send confirmation (rate limiter above
    //   already enforces a per-email cooldown).
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, confirmed_at")
      .eq("email", cleaned)
      .maybeSingle();

    if (existing?.confirmed_at) {
      // Address is already an opted-in subscriber. Respond OK without sending
      // anything new.
      return new Response(JSON.stringify({ ok: true, alreadySubscribed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateToken();
    const nowIso = new Date().toISOString();

    if (existing) {
      const { error: updErr } = await supabase
        .from("newsletter_subscribers")
        .update({ confirmation_token: token, confirmation_sent_at: nowIso })
        .eq("id", existing.id);
      if (updErr) console.error("subscribe update error:", updErr);
    } else {
      const { error: insertError } = await supabase
        .from("newsletter_subscribers")
        .insert({
          email: cleaned,
          source: source || "dashboard",
          confirmation_token: token,
          confirmation_sent_at: nowIso,
        });
      if (insertError) console.error("subscribe insert error:", insertError);
    }

    const projectId = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)\./)?.[1];
    const confirmUrl = `https://${projectId}.functions.supabase.co/newsletter-confirm?token=${encodeURIComponent(token)}`;

    // Send a confirmation email (double opt-in). Welcome email is only sent
    // after the address owner clicks the confirmation link.
    const { error: emailError } = await supabase.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "newsletter-confirm",
          recipientEmail: cleaned,
          // Per-day idempotency so repeated requests collapse into one send
          // and cannot spam a victim's inbox even across cold starts.
          idempotencyKey: `newsletter-confirm-${cleaned}-${nowIso.slice(0, 10)}`,
          data: { confirmUrl },
        },
      },
    );
    if (emailError) console.error("newsletter confirmation email error:", emailError);

    return new Response(JSON.stringify({ ok: true, pendingConfirmation: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("newsletter-subscribe error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
