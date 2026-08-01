// Generate an image from a text prompt via the Lovable AI gateway (Gemini
// image preview models — the strongest image option available to Pathforge,
// since "Pillow" is a Python-only library that doesn't run in this Deno
// runtime). The resulting PNG is uploaded to the `advisor-artifacts`
// storage bucket and recorded as an `image` artifact row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { authorized: false } as const;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { authorized: false } as const;
  return { authorized: true, userId: user.id, authHeader } as const;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid data URL");
  const mime = m[1];
  const b64 = m[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await verifyAuth(req);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, prompt, conversationId } = await req.json();
    if (!title || !prompt) {
      return new Response(JSON.stringify({ error: "title and prompt required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeTitle = String(title).slice(0, 120);
    const safePrompt = String(prompt).slice(0, 4000);

    // Call the Lovable AI gateway image-capable Gemini model. Returns an
    // assistant message whose content contains a data URL we extract below.
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: safePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("image gen failed", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: aiResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const msg = aiJson?.choices?.[0]?.message;
    let dataUrl: string | null = null;
    // Try common locations: images[], content (array), content (string)
    if (Array.isArray(msg?.images) && msg.images[0]?.image_url?.url) {
      dataUrl = msg.images[0].image_url.url;
    } else if (Array.isArray(msg?.content)) {
      for (const p of msg.content) {
        if (p?.type === "image_url" && p?.image_url?.url?.startsWith?.("data:image/")) {
          dataUrl = p.image_url.url; break;
        }
        if (typeof p?.image_url === "string" && p.image_url.startsWith("data:image/")) {
          dataUrl = p.image_url; break;
        }
      }
    }
    if (!dataUrl && typeof msg?.content === "string") {
      const m = msg.content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
      if (m) dataUrl = m[0];
    }
    if (!dataUrl) {
      console.error("no image in AI response", JSON.stringify(aiJson).slice(0, 800));
      return new Response(JSON.stringify({ error: "No image returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bytes, mime } = dataUrlToBytes(dataUrl);
    const ext = mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "png";
    const path = `${auth.userId}/${crypto.randomUUID()}/${safeTitle.replace(/[^a-z0-9-_ ]/gi, "").trim() || "image"}.${ext}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth.authHeader } } },
    );

    const { error: upErr } = await supabase.storage.from("advisor-artifacts").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase.from("advisor_artifacts").insert({
      user_id: auth.userId,
      conversation_id: conversationId || null,
      kind: "image",
      title: safeTitle,
      file_path: path,
      file_mime: mime,
    }).select().single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ artifact: row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-artifact-image error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
