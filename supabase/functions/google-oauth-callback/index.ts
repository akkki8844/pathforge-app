import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Public endpoint hit by Google's redirect. Verifies state from DB.
function getCallbackUrl(): string {
  const url = Deno.env.get("SUPABASE_URL")!;
  return `${url}/functions/v1/google-oauth-callback`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlPage(title: string, message: string, redirectTo: string | null) {
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.startsWith("/\\")
      ? redirectTo
      : "/";
  const t = escapeHtml(title);
  const m = escapeHtml(message);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${t}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b1220;color:#e6e9ef;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}.card{max-width:420px;text-align:center;background:#121a2c;border:1px solid #1f2a44;border-radius:16px;padding:32px}h1{font-size:18px;margin:0 0 8px;font-weight:600}p{font-size:14px;color:#9aa4b8;line-height:1.55;margin:0 0 16px}a{color:#7aa2ff;text-decoration:none;font-size:14px}</style>
</head><body><div class="card"><h1>${t}</h1><p>${m}</p><a href="${safeRedirect}">Return to app</a><script>
(function(){
  var redirect = ${JSON.stringify(safeRedirect)};
  // If we were opened as a popup, notify the opener and close ourselves
  // instead of navigating — this prevents the second "window" experience.
  try {
    if (window.opener && !window.opener.closed) {
      try { window.opener.postMessage({ type: 'google-oauth-complete' }, '*'); } catch (e) {}
      setTimeout(function(){ try { window.close(); } catch(e){} }, 600);
      return;
    }
  } catch (e) {}
  setTimeout(function(){ window.location.href = redirect; }, 1200);
})();
</script></div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(htmlPage("Setup incomplete", "Google OAuth credentials are not configured on the server.", null), {
        status: 500, headers: { "Content-Type": "text/html" },
      });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("oauth error param", error);
      return new Response(htmlPage("Connection cancelled", "Google sign-in was cancelled or denied.", null), {
        status: 200, headers: { "Content-Type": "text/html" },
      });
    }
    if (!code || !state) {
      return new Response(htmlPage("Invalid request", "Missing code or state.", null), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up + consume state
    const { data: stateRow, error: stateErr } = await admin
      .from("google_oauth_states")
      .select("user_id, redirect_to, expires_at")
      .eq("state", state)
      .maybeSingle();

    if (stateErr || !stateRow) {
      return new Response(htmlPage("Invalid state", "This OAuth attempt is unknown or already used.", null), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await admin.from("google_oauth_states").delete().eq("state", state);
      return new Response(htmlPage("Expired", "This OAuth attempt has expired. Please try again.", stateRow.redirect_to), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    // Always consume state immediately (single-use)
    await admin.from("google_oauth_states").delete().eq("state", state);

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: getCallbackUrl(),
        grant_type: "authorization_code",
      }),
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed", tokenJson);
      return new Response(htmlPage("Connection failed", "Google token exchange failed. Please try again.", stateRow.redirect_to), {
        status: 400, headers: { "Content-Type": "text/html" },
      });
    }

    const accessToken = tokenJson.access_token as string;
    const refreshToken = (tokenJson.refresh_token as string | undefined) ?? null;
    const scope = (tokenJson.scope as string | undefined) ?? null;
    const expiresIn = Number(tokenJson.expires_in ?? 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Best-effort fetch of user email
    let googleEmail: string | null = null;
    try {
      const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (ui.ok) {
        const j = await ui.json();
        googleEmail = j.email ?? null;
      }
    } catch { /* ignore */ }

    // Upsert. Preserve existing refresh_token if Google didn't return a new one.
    const { data: existing } = await admin
      .from("user_google_tokens")
      .select("refresh_token")
      .eq("user_id", stateRow.user_id)
      .maybeSingle();

    const finalRefresh = refreshToken ?? existing?.refresh_token ?? null;

    const { error: upsertErr } = await admin
      .from("user_google_tokens")
      .upsert(
        {
          user_id: stateRow.user_id,
          access_token: accessToken,
          refresh_token: finalRefresh,
          scope,
          expires_at: expiresAt,
          google_email: googleEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertErr) {
      console.error("Token upsert failed", upsertErr);
      return new Response(htmlPage("Storage failed", "Could not save Google connection. Please try again.", stateRow.redirect_to), {
        status: 500, headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(
      htmlPage("Google Calendar connected", `Connected${googleEmail ? ` as ${googleEmail}` : ""}. You can close this tab.`, stateRow.redirect_to),
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("oauth-callback error", msg);
    return new Response(htmlPage("Unexpected error", "Something went wrong. Please try again.", null), {
      status: 500, headers: { "Content-Type": "text/html" },
    });
  }
});
