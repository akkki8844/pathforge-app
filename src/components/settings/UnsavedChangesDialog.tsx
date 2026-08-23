import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useSettingsForm, type SectionKey } from "./SettingsFormContext";

/** Same labels the settings sidebar uses, so the dialog names sections the
 *  way the page just named them. */
const SECTION_LABEL: Record<SectionKey, string> = {
  general: "Profile",
  preferences: "Preferences",
  advisor: "Advisor",
  language: "Language",
  appearance: "Appearance",
  notifications: "Notifications",
  privacy: "Privacy",
};

/**
 * Guards navigation away from the settings page while the single page-level
 * Save still has work to do.
 *
 * It reads the draft store's existing `dirtyCount` — the same flag that enables
 * the Save button — rather than tracking dirtiness a second time, and it calls
 * the store's existing `saveAll` / `discardAll`. Nothing about how saving works
 * changes here.
 */
export function UnsavedChangesDialog() {
  const { dirtyCount, dirtyBySection, saving, saveAll, discardAll } = useSettingsForm();

  const handleSave = useCallback(async () => {
    const results = await saveAll();
    // `saveAll` reports per-destination results and returns [] when there was
    // nothing to write. Only leave if every group that was attempted committed.
    return results.every((r) => r.ok);
  }, [saveAll]);

  const { blocked, stay, discardAndLeave, saveAndLeave } = useUnsavedChangesGuard({
    when: dirtyCount > 0,
    onSave: handleSave,
    onDiscard: discardAll,
  });

  const sections = (Object.keys(dirtyBySection) as SectionKey[])
    .filter((k) => dirtyBySection[k] > 0)
    .map((k) => SECTION_LABEL[k]);

  return (
    <AlertDialog open={blocked !== null} onOpenChange={(open) => !open && stay()}>
      <AlertDialogContent className="max-w-[41rem]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[19px] tracking-tight">
            You have unsaved changes
          </AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            <span className="font-medium text-foreground tabular-nums">{dirtyCount}</span>{" "}
            {dirtyCount === 1 ? "change hasn't" : "changes haven't"} been saved to your account
            yet. Leaving this page now discards {dirtyCount === 1 ? "it" : "them"}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {sections.length > 0 && (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-3">
            {sections.map((label) => (
              <span
                key={label}
                className="rounded-md bg-background px-2 py-0.5 text-[12px] font-medium text-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.6)]"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:space-x-0">
          {/* Staying is safe at any moment, including mid-save, so this one is
              never disabled. */}
          <AlertDialogCancel className="mt-0">Stay on this page</AlertDialogCancel>
          {/* Plain buttons, not AlertDialogAction: the dialog stays open while
              the save is in flight and closes from the guard's own state. */}
          <Button
            variant="outline"
            disabled={saving}
            onClick={discardAndLeave}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Discard and leave
          </Button>
          <Button disabled={saving} onClick={() => void saveAndLeave()}>
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save and leave"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
