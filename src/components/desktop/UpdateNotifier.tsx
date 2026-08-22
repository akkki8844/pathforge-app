import { useEffect } from "react";
import { toast } from "sonner";
import { desktop } from "@/lib/desktop";

/**
 * Updates download silently in the background (electron/main.cjs). This only
 * surfaces the moment a restart would apply one — the user never has to
 * notice a download happened, just choose when to take the 5-second restart.
 * If they never click Restart, the update still applies on the next normal
 * quit (main.cjs sets `autoInstallOnAppQuit`), so this is a convenience, not
 * the only path to getting updated.
 */
export function UpdateNotifier() {
  useEffect(() => {
    const bridge = desktop();
    if (!bridge) return;

    return bridge.onUpdateStatus((payload) => {
      if (payload.status !== "downloaded") return;
      toast("Update ready", {
        description: "Restart PathForge to finish updating.",
        duration: Infinity,
        action: {
          label: "Restart now",
          onClick: () => void bridge.installUpdate(),
        },
      });
    });
  }, []);

  return null;
}
