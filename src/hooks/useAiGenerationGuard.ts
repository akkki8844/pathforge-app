import { useEffect } from "react";
import { toast } from "sonner";
import { useKeepAlive } from "@/components/KeepAliveProvider";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

export function useAiGenerationGuard(active: boolean, label = "AI generation") {
  // Scopes the app-wide keep-alive stack (audio context + worker heartbeat,
  // see KeepAliveProvider) to only run while this generation is in flight,
  // instead of it running for the entire session on every route.
  useKeepAlive(active);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let wakeLock: WakeLockSentinelLike | null = null;

    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
        };
        if (document.visibilityState === "visible" && nav.wakeLock) {
          wakeLock = await nav.wakeLock.request("screen");
        }
      } catch {
        wakeLock = null;
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      } else {
        toast.warning(`${label} is still running`, {
          description: "Keep this tab open and active until it finishes, or the process may halt.",
        });
      }
    };

    void requestWakeLock();
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) void wakeLock.release().catch(() => undefined);
    };
  }, [active, label]);
}