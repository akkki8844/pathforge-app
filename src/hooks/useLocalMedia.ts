/**
 * The candidate's own camera and microphone — the small window of yourself in
 * the corner of a video call.
 *
 * It is not decoration. Seeing your own face is most of what makes a mock
 * interview feel like an interview: you sit up, you notice you're looking at
 * the wrong part of the screen, you catch yourself fidgeting. A practice tool
 * that hides the self-view removes the one signal that changes behaviour.
 *
 * The stream is used for display and for a level meter only. Nothing is
 * recorded, nothing is uploaded, and no MediaRecorder is constructed anywhere
 * in this feature — the transcript comes from the Web Speech API, which does
 * its own capture.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type MediaStatus = "idle" | "requesting" | "ready" | "denied" | "unsupported";

export interface LocalMedia {
  stream: MediaStream | null;
  status: MediaStatus;
  /** 0-1, live microphone level. Read in a rAF loop, never in render. */
  levelRef: React.MutableRefObject<number>;
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  /** Ask for permission. Must be called from a user gesture. */
  request: () => Promise<void>;
  /** Release the devices — the camera light must go out when the call ends. */
  release: () => void;
  error: string | null;
}

export function useLocalMedia(): LocalMedia {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>("idle");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const levelRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const release = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    levelRef.current = 0;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setStatus("idle");
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("This browser can't open a camera.");
      return;
    }
    setStatus("requesting");
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480}, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = media;
      setStream(media);
      setStatus("ready");

      // A separate AudioContext from the voice hook's, deliberately: this one
      // only ever reads the microphone and is never connected to the
      // destination, so the candidate's own voice is never played back at them.
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          ctxRef.current = ctx;
          const src = ctx.createMediaStreamSource(media);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.6;
          src.connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            levelRef.current = Math.min(1, Math.sqrt(sum / buf.length) * 5);
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        }
      } catch (e) {
        // No meter is a cosmetic loss. The call still works.
        console.warn("local media: level meter unavailable", e);
      }
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError("Camera and microphone access was blocked. You can still do the interview with just the mic, or allow access in your browser's address bar.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setStatus("denied");
        setError("No camera or microphone found on this device.");
      } else {
        setStatus("denied");
        setError("Couldn't open your camera. Check nothing else is using it.");
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }, []);

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  useEffect(() => release, [release]);

  return {
    stream, status, levelRef, cameraOn, micOn,
    toggleCamera, toggleMic, request, release, error,
  };
}
