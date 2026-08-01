// Admin-only edge function: hard-delete a user from auth + all public data.
// Verifies the caller is an admin via RLS-checked is_admin() RPC, then wipes
// public schema rows via admin_delete_user_data() and finally removes the
// auth.users row using the service-role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caller-scoped client to verify admin status
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdminData, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || !isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wipe public-schema data via SECURITY DEFINER RPC (caller must be admin)
    const { error: wipeErr } = await userClient.rpc("admin_delete_user_data", {
      _target_user_id: target_user_id,
    });
    if (wipeErr) {
      return new Response(JSON.stringify({ error: "Failed to delete user data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now wipe the auth.users row with service role
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error: authErr } = await adminClient.auth.admin.deleteUser(target_user_id);
    if (authErr) {
      console.error("auth.admin.deleteUser failed:", authErr);
      // Public data already gone; report partial success
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Auth record could not be removed — contact support.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
