// Admin-only: regenerate a temporary password for an existing counsellor.
// Lets the admin retrieve credentials at any time after creation, without
// relying on the original welcome email reaching the inbox.
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
  // Guarantee at least one of each required class (upper, lower, digit)
  // to satisfy Supabase Auth's character-class password policy.
  const required = pick(upper, 2) + pick(lower, 2) + pick(digits, 2) + pick(symbols, 1);
  const rest = pick(all, 9);
  const combined = (required + rest).split("");
  // Fisher-Yates shuffle
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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdminData, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || !isAdminData) {
      return json({ error: "Forbidden — admin role required" }, 403);
    }

    let body: { target_user_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const targetId = body.target_user_id?.trim();
    if (!targetId) return json({ error: "target_user_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Confirm the target is actually a teacher/counsellor.
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetId)
      .eq("role", "teacher")
      .maybeSingle();
    if (!roleRow) return json({ error: "User is not a counsellor" }, 404);

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("user_id", targetId)
      .maybeSingle();

    const password = generatePassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetId, {
      password,
    });
    if (updateErr) {
      console.error("updateUserById failed:", updateErr);
      return json({ error: "Could not reset password" }, 500);
    }

    return json({
      success: true,
      user_id: targetId,
      email: profile?.email ?? null,
      temporary_password: password,
    });
  } catch (e) {
    console.error("admin-reset-counsellor-password error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
