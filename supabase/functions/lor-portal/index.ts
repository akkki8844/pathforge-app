// LOR public portal — token-based, no auth.
// Actions:
//   load:   look up an invite token, return recommender + student info + signed packet URL
//   submit: upload the recommender's letter to private storage + mark submitted
//
// All DB access is via service role; the security-definer RPCs enforce
// token validity/expiry/revocation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXT = ["pdf", "doc", "docx"];

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.split(",")[1] : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "letter";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const token = body.token as string;

    if (!action || !token) {
      return new Response(JSON.stringify({ error: "missing action or token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "load") {
      const { data, error } = await admin.rpc("get_recommender_invite", { _token: token });
      if (error) throw error;
      const result = data as Record<string, any>;
      if (result?.error) {
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Attach signed packet URL if a packet artifact exists
      let packet_url: string | null = null;
      const artifactId = result?.recommender?.last_packet_artifact_id;
      if (artifactId) {
        const { data: art } = await admin
          .from("advisor_artifacts")
          .select("file_path")
          .eq("id", artifactId)
          .maybeSingle();
        if (art?.file_path) {
          const { data: signed } = await admin.storage
            .from("advisor-artifacts")
            .createSignedUrl(art.file_path, 60 * 30);
          packet_url = signed?.signedUrl ?? null;
        }
      }

      return new Response(JSON.stringify({ ...result, packet_url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      const file_b64 = body.file_b64 as string;
      const filename = safeName(String(body.filename ?? "letter.pdf"));
      const notes = (body.notes as string | undefined) ?? null;

      if (!file_b64) {
        return new Response(JSON.stringify({ error: "missing file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const bytes = b64ToBytes(file_b64);
      if (bytes.byteLength > MAX_BYTES) {
        return new Response(JSON.stringify({ error: "file too large (max 15 MB)" }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ext = (filename.split(".").pop() ?? "").toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return new Response(JSON.stringify({ error: "only PDF or Word documents" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token first to get user_id + recommender_id
      const { data: meta, error: metaErr } = await admin.rpc("get_recommender_invite", { _token: token });
      if (metaErr) throw metaErr;
      const m = meta as Record<string, any>;
      if (m?.error) {
        return new Response(JSON.stringify(m), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = m.user_id as string;
      const recId = m.recommender.id as string;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `${userId}/${recId}/${stamp}-${filename}`;

      const contentType = ext === "pdf"
        ? "application/pdf"
        : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/msword";

      const { error: upErr } = await admin.storage
        .from("lor-letters")
        .upload(path, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;

      const { data: subData, error: subErr } = await admin.rpc("submit_recommender_letter", {
        _token: token,
        _file_path: path,
        _notes: notes,
      });
      if (subErr) throw subErr;

      return new Response(JSON.stringify({ ok: true, result: subData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lor-portal error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
