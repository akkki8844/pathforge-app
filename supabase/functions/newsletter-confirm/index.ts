import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://pathforge.co.in";

// Confirms a newsletter subscription via a one-time token sent by email
// (double opt-in). Accepts ?token=... via GET (redirects to a thank-you page)
// or POST { token } as JSON. Tokens older than 7 days are rejected.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let token = "";
    if (req.method === "GET") {
      token = new URL(req.url).searchParams.get("token") || "";
    } else {
      const body = await req.json().catch(() => ({} as any));
      token = String(body?.token || "");
    }
    token = token.trim();
    if (!token || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) {
      return redirectOrJson(req, false, "Invalid confirmation link");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: lookupErr } = await supabase
      .from("newsletter_subscribers")
      .select("id, email, confirmed_at, confirmation_sent_at")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (lookupErr || !row) {
      return redirectOrJson(req, false, "Confirmation link not found");
    }

    // Token expiry: 7 days from when it was sent
    const sentAt = row.confirmation_sent_at ? new Date(row.confirmation_sent_at).getTime() : 0;
    if (sentAt && Date.now() - sentAt > 7 * 24 * 60 * 60 * 1000) {
      return redirectOrJson(req, false, "Confirmation link has expired");
    }

    if (!row.confirmed_at) {
      const { error: updErr } = await supabase
        .from("newsletter_subscribers")
        .update({ confirmed_at: new Date().toISOString(), confirmation_token: null })
        .eq("id", row.id);
      if (updErr) {
        console.error("newsletter-confirm update error:", updErr);
        return redirectOrJson(req, false, "Could not confirm subscription");
      }

      // Now that consent is verified, send the welcome email (idempotent).
      const { error: emailError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            templateName: "newsletter-welcome",
            recipientEmail: row.email,
            idempotencyKey: `newsletter-welcome-${row.email}`,
          },
        },
      );
      if (emailError) console.error("newsletter welcome email error:", emailError);
    }

    return redirectOrJson(req, true, "Subscription confirmed");
  } catch (e) {
    console.error("newsletter-confirm error:", e);
    return redirectOrJson(req, false, "Internal server error");
  }
});

function redirectOrJson(req: Request, ok: boolean, message: string) {
  if (req.method === "GET") {
    const dest = new URL(`${SITE_URL}/newsletter/confirmed`);
    dest.searchParams.set("ok", ok ? "1" : "0");
    dest.searchParams.set("msg", message);
    return Response.redirect(dest.toString(), 302);
  }
  return new Response(JSON.stringify({ ok, message }), {
    status: ok ? 200 : 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
