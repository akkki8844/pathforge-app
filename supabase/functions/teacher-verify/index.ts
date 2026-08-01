// Verify teacher account: auto-approve when signup email domain matches school domain
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const schoolId: string | undefined = body.school_id;
    const title: string = (body.title || "Counselor").toString().slice(0, 60);
    const subject: string | null = body.subject ? String(body.subject).slice(0, 80) : null;
    if (!schoolId || typeof schoolId !== "string") {
      return new Response(JSON.stringify({ error: "school_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // SECURITY: Only allow callers who ALREADY have the teacher role
    // (provisioned by an admin via admin-create-counsellor). This function
    // must never grant the teacher role on its own — that would allow any
    // authenticated student to self-promote to counsellor.
    const { data: existingRole, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "teacher")
      .maybeSingle();
    if (roleErr) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!existingRole) {
      return new Response(
        JSON.stringify({
          error:
            "Counsellor accounts must be provisioned by an administrator. Contact your school admin or Pathforge support to receive an invite.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Look up school domain
    const { data: school } = await admin
      .from("schools")
      .select("id,domain")
      .eq("id", schoolId)
      .maybeSingle();

    const userEmail = (userData.user.email || "").toLowerCase();
    const userDomain = userEmail.split("@")[1] || "";
    const schoolDomain = (school?.domain || "").toLowerCase();
    const autoVerified = !!schoolDomain && userDomain === schoolDomain;

    // Upsert teacher profile
    const { error: upsertErr } = await admin
      .from("teacher_profiles")
      .upsert(
        {
          user_id: userData.user.id,
          school_id: schoolId,
          title,
          subject,
          verified: autoVerified,
          verified_at: autoVerified ? new Date().toISOString() : null,
        },
        { onConflict: "user_id" } as never,
      );

    if (upsertErr) {
      console.error("teacher-verify upsert error:", upsertErr);
      return new Response(JSON.stringify({ error: "Could not save counsellor profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, verified: autoVerified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("teacher-verify error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
