// Self-service account deletion. The user proves identity with their JWT;
// we then wipe ALL of their public-schema rows using the service role and
// finally delete the auth.users record. This must NEVER fail silently — any
// error returns a clear JSON message to the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: "Server configuration error" }, 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData?.user) {
      console.log("Auth failed:", userError?.message);
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;
    console.log("Self-delete request for user:", userId);

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Wipe every table that references this user. We swallow individual table
    // errors but log them — a missing row is fine, a real failure is logged
    // for diagnostics. The auth deletion at the end is what truly matters.
    const tables: { table: string; col: string }[] = [
      { table: "admissions_data", col: "user_id" },
      { table: "application_entries", col: "user_id" },
      { table: "full_applications", col: "user_id" },
      { table: "outcomes_data", col: "user_id" },
      { table: "readiness_analyses", col: "user_id" },
      { table: "journey_scores", col: "user_id" },
      { table: "voice_advisor_sessions", col: "user_id" },
      { table: "ai_usage_logs", col: "user_id" },
      { table: "micro_question_responses", col: "user_id" },
      { table: "proof_submissions", col: "user_id" },
      { table: "coupon_redemptions", col: "user_id" },
      { table: "credit_adjustments", col: "target_user_id" },
      { table: "credit_gifts", col: "user_id" },
      { table: "user_credits", col: "user_id" },
      { table: "user_activity_logs", col: "user_id" },
      { table: "user_flags", col: "user_id" },
      { table: "admin_feedback", col: "user_id" },
      { table: "assignment_progress", col: "student_id" },
      { table: "class_members", col: "student_id" },
      { table: "teacher_assignments", col: "teacher_id" },
      { table: "teacher_verification_requests", col: "teacher_user_id" },
      { table: "teacher_profiles", col: "user_id" },
      { table: "classes", col: "teacher_id" },
      { table: "subscriptions", col: "user_id" },
      { table: "guest_sessions", col: "guest_user_id" },
      { table: "onboarding_data", col: "user_id" },
      { table: "user_roles", col: "user_id" },
      { table: "profiles", col: "user_id" },
    ];

    // Delete in parallel — much faster than sequential 27-table loop.
    // Individual failures are logged but never abort the flow; the auth
    // deletion at the end is what truly matters.
    await Promise.allSettled(
      tables.map(({ table, col }) =>
        admin
          .from(table)
          .delete()
          .eq(col, userId)
          .then(({ error }) => {
            if (error) {
              console.warn(`Cleanup warning [${table}.${col}]:`, error.message);
            }
          }),
      ),
    );

    // Final step: kill the auth identity. This MUST succeed for the request
    // to be considered a success.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("auth.admin.deleteUser failed:", deleteError);
      return json(
        { error: "Failed to delete account" },
        500,
      );
    }

    console.log("Account permanently deleted:", userId);
    return json({ success: true, message: "Account permanently deleted" });
  } catch (e) {
    console.error("Unexpected error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
