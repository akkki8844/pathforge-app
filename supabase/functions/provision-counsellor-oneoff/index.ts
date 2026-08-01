// One-off admin utility: provision a counsellor account with a fixed password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return json({ error: "email and password required" }, 400);

  let userId: string | null = null;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    // Already exists — find and reset the password instead.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === email);
    if (!found) return json({ error: createErr.message }, 500);
    userId = found.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    userId = created.user!.id;
  }

  await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "teacher" }, { onConflict: "user_id,role", ignoreDuplicates: true });

  await admin.from("teacher_profiles").upsert(
    {
      user_id: userId,
      title: "Counsellor",
      verified: true,
      verified_at: new Date().toISOString(),
      onboarding_completed: false,
    },
    { onConflict: "user_id" },
  );

  return json({ success: true, user_id: userId, email });
});
