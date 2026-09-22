/**
 * A live, lip-synced interviewer.
 *
 * The three-still portrait the room falls back on is a decent imitation of a
 * compressed video call. It is still three photographs. This replaces them,
 * when the project is configured for it, with Simli's speech-to-video stream:
 * the ElevenLabs audio we are already generating goes in, a photoreal face
 * saying those words comes back over WebRTC.
 *
 * ── Why this layer is optional and not a rewrite ──
 * Every avatar service worth using falls into one of two shapes. The full-stack
 * ones (Tavus, HeyGen's conversational products) bring their own speech
 * recognition, their own model and their own voice — adopting one would mean
 * discarding the part of this feature that is the product, which is an
 * interviewer that has read the student's essays and asks about them. Simli
 * does one job instead: audio in, a talking face out. So the grounding, the
 * turn logic, the school brief and the voice are untouched, and only the
 * picture changes.
 *
 * Everything here degrades. No `SIMLI_API_KEY`, no face id, a failed
 * handshake, or a voice running on the browser synthesiser (which exposes no
 * audio to tap) all end in the same place: `active` stays false and the room
 * renders the frames it already had.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AvatarStatus =
  /** Not asked for yet. */
  | "idle"
  /** Minting a token and opening the WebRTC connection. */
  | "connecting"
  /** Streaming. The room should show the video. */
  | "live"
  /** Deliberately off — not configured for this project. */
  | "unavailable"
  /** Tried and failed. The room falls back to the still frames. */
  | "failed";

export interface InterviewAvatar {
  status: AvatarStatus;
  /** Attach to a `<video>`; the stream renders into it. */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Attach to an `<audio>`; the service plays the speech in sync with its video. */
  audioRef: React.RefObject<HTMLAudioElement>;
  /**
   * Open the stream. Must be called after the voice graph exists, because the
   * track it hands over does not exist until then.
   */
  connect: (faceId: string | undefined, speechTrack: MediaStreamTrack | null) => Promise<boolean>;
  disconnect: () => void;
  /** Cut the avatar off mid-sentence — used when the student interrupts. */
  clearBuffer: () => void;
}

export function useInterviewAvatar(): InterviewAvatar {
  const [status, setStatus] = useState<AvatarStatus>("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Loosely typed on purpose: `simli-client` is imported dynamically so its
  // bundle only loads for the students who actually get an avatar.
  const clientRef = useRef<{ stop: () => Promise<void>; ClearBuffer: () => void } | null>(null);
  const connectingRef = useRef(false);

  const disconnect = useCallback(() => {
    const client = clientRef.current;
    clientRef.current = null;
    connectingRef.current = false;
    if (client) void client.stop().catch(() => {});
    setStatus("idle");
  }, []);

  const clearBuffer = useCallback(() => {
    try { clientRef.current?.ClearBuffer(); } catch { /* already gone */ }
  }, []);

  const connect = useCallback(
    async (faceId: string | undefined, speechTrack: MediaStreamTrack | null): Promise<boolean> => {
      if (connectingRef.current || clientRef.current) return status === "live";
      if (!videoRef.current || !audioRef.current) return false;

      // No tap means the voice is on the browser synthesiser, which gives no
      // audio node to read. A face that never moves its mouth is worse than a
      // photograph that never claimed to.
      if (!speechTrack) { setStatus("unavailable"); return false; }

      connectingRef.current = true;
      setStatus("connecting");

      try {
        const { data, error } = await supabase.functions.invoke("interview-avatar-token", {
          body: { faceId },
        });

        if (error || !data?.sessionToken) {
          // A 503 is "this project has no Simli key or face id", which is a
          // configuration state rather than a fault — the room is expected to
          // carry on with the frames and say nothing to the student about it.
          console.info("interview avatar unavailable; using still frames", error ?? data);
          setStatus("unavailable");
          connectingRef.current = false;
          return false;
        }

        const { SimliClient } = await import("simli-client");
        const client = new SimliClient(
          data.sessionToken as string,
          videoRef.current,
          audioRef.current,
          null,
        );

        const started = new Promise<boolean>((resolve) => {
          let settled = false;
          const finish = (ok: boolean) => { if (!settled) { settled = true; resolve(ok); } };
          client.on("start", () => finish(true));
          client.on("error", (detail: string) => {
            console.warn("simli error", detail);
            finish(false);
          });
          // A handshake that neither starts nor errors must not leave the room
          // waiting on a face that is never coming.
          window.setTimeout(() => finish(false), 12_000);
        });

        await client.start();
        const ok = await started;
        if (!ok) {
          void client.stop().catch(() => {});
          setStatus("failed");
          connectingRef.current = false;
          return false;
        }

        client.listenToMediastreamTrack(speechTrack);
        clientRef.current = client as unknown as { stop: () => Promise<void>; ClearBuffer: () => void };
        connectingRef.current = false;
        setStatus("live");
        return true;
      } catch (e) {
        console.warn("interview avatar failed to start; using still frames", e);
        setStatus("failed");
        connectingRef.current = false;
        return false;
      }
    },
    [status],
  );

  useEffect(() => () => { void clientRef.current?.stop().catch(() => {}); }, []);

  return { status, videoRef, audioRef, connect, disconnect, clearBuffer };
}
