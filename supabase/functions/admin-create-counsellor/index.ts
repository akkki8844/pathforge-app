// Admin-only: create a counsellor (teacher) account end-to-end.
// 1. Verifies the caller is an admin via is_admin() RPC (RLS-enforced).
// 2. Generates a strong random password.
// 3. Creates the auth user (email auto-confirmed so they can sign in instantly).
// 4. Inserts a 'teacher' role and an empty teacher_profile (optionally linked to a school).
// 5. Sends a welcome email with the temporary password via the transactional
//    email pipeline (counsellor-invite template).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// 16-char password mixing alpha+digits+symbols. Easy to read aloud once and
// strong enough to pass typical password policies. The recipient is told to
// change it on first sign-in.
function pick(set: string, n: number): string {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < n; i++) out += set[buf[i] % set.length];
  return out;
}

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const required = pick(upper, 2) + pick(lower, 2) + pick(digits, 2) + pick(symbols, 1);
  const rest = pick(all, 9);
  const combined = (required + rest).split("");
  const rand = new Uint32Array(combined.length);
  crypto.getRandomValues(rand);
  for (let i = combined.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return json({ error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    // Caller-scoped client — verifies the user is an admin via RLS-protected RPC.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdminData, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || !isAdminData) {
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    let body: { email?: string; name?: string; school_id?: string | null };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const email = body.email?.trim().toLowerCase();
    const displayName = body.name?.trim() || null;
    const schoolId = body.school_id || null;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Block duplicates — query the profiles table (which mirrors auth users via trigger).
    const { data: existing } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return json(
        { error: "An account with this email already exists." },
        409,
      );
    }

    const password = generatePassword();

    // Create the auth user, auto-confirmed so they can log in immediately.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : {},
    });
    if (createErr || !created.user) {
      console.error("createUser failed:", createErr);
      return json(
        { error: "Failed to create counsellor account" },
        500,
      );
    }

    const newUserId = created.user.id;

    // Assign teacher role (skip duplicates if trigger already inserted one).
    const { error: roleInsertErr } = await admin
      .from("user_roles")
      .upsert(
        { user_id: newUserId, role: "teacher" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    if (roleInsertErr) {
      console.warn("user_roles insert warning:", roleInsertErr.message);
    }

    // Pre-create a teacher_profile so the counsellor can land directly in
    // their workspace. Marked verified=true since an admin vouched for them.
    const { error: profErr } = await admin.from("teacher_profiles").upsert(
      {
        user_id: newUserId,
        title: "Counsellor",
        school_id: schoolId,
        verified: true,
        verified_at: new Date().toISOString(),
        onboarding_completed: false,
      },
      { onConflict: "user_id" },
    );
    if (profErr) {
      console.warn("teacher_profiles insert warning:", profErr.message);
    }

    // If a username can be derived from the display name, set it (best-effort).
    if (displayName) {
      await admin
        .from("profiles")
        .update({ username: displayName })
        .eq("user_id", newUserId);
    }

    // Send the welcome email. Failure to enqueue should NOT fail the whole
    // request — the account is already created. We surface the warning instead.
    const loginUrl = "https://pathforge.co.in/auth";
    let emailWarning: string | null = null;
    try {
      // Call send-transactional-email via direct fetch — supabase-js's
      // functions.invoke from inside an edge function does not reliably
      // attach the Authorization header, which causes UNAUTHORIZED_INVALID_JWT_FORMAT
      // when the target function has verify_jwt = true.
      const emailResp = await fetch(
        `${SUPABASE_URL}/functions/v1/send-transactional-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE}`,
            "apikey": SERVICE_ROLE,
          },
          body: JSON.stringify({
            templateName: "counsellor-invite",
            recipientEmail: email,
            idempotencyKey: `counsellor-invite-${newUserId}`,
            templateData: {
              name: displayName,
              email,
              password,
              loginUrl,
            },
          }),
        },
      );
      const emailRes = await emailResp.json().catch(() => ({}));
      if (!emailResp.ok) {
        emailWarning = `Email could not be queued (${emailResp.status}): ${
          (emailRes as any)?.error || emailResp.statusText
        }`;
        console.error("send-transactional-email failed:", emailResp.status, emailRes);
      } else if ((emailRes as any)?.success === false) {
        emailWarning = `Email skipped (${(emailRes as any).reason || "unknown"})`;
      }
    } catch (e) {
      emailWarning = "Email delivery failed";
      console.error(e);
    }

    return json({
      success: true,
      user_id: newUserId,
      email,
      // Returned so the admin can manually share if email delivery fails.
      // Front-end should display this in a toast and clear from memory ASAP.
      temporary_password: password,
      email_sent: !emailWarning,
      warning: emailWarning,
    });
  } catch (e) {
    console.error("admin-create-counsellor unexpected error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
