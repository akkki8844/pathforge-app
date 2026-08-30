import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiUniversityCombobox } from "@/components/UniversityCombobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Add schools to the target list from the Dashboard.
 *
 * The list on this page is `onboarding_data.target_universities`, the same
 * column Settings → General writes and the same one the admissions model,
 * the college-fit calibration, the essay prompts and the journey roadmap all
 * read. So this writes to that column and nowhere else: there is no dashboard
 * copy of the list to drift out of sync, and a school added here is on the
 * student's profile and in every other surface the moment the write lands.
 *
 * The five-school cap is the product's existing rule, set in Settings and
 * assumed by the per-school admissions run. It is stated in the dialog rather
 * than enforced silently, because a picker that quietly stops accepting
 * choices reads as broken.
 */
const MAX_TARGETS = 5;

export function AddUniversityDialog({
  trigger,
  className,
}: {
  trigger?: React.ReactNode;
  className?: string;
}) {
  const { user, onboardingData, refreshOnboardingData } = useAuth();
  const saved = onboardingData?.target_universities ?? [];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(saved);
  const [saving, setSaving] = useState(false);

  // Reseed from the saved list every time the dialog opens, so an abandoned
  // edit is discarded rather than resurfacing on the next open.
  useEffect(() => {
    if (open) setDraft(onboardingData?.target_universities ?? []);
  }, [open, onboardingData]);

  const dirty =
    draft.length !== saved.length || draft.some((name, i) => name !== saved[i]);

  const save = async () => {
    if (!user) {
      toast.error("Sign in to change your list.");
      return;
    }
    setSaving(true);
    // Update, not upsert. `onboarding_data` has seven NOT NULL columns
    // (country, curriculum, application_year, extracurricular_level and the
    // rest), so an upsert of just these two fields would either be rejected by
    // the database or insert a stub row that the onboarding flow then has to
    // reconcile. A student with no row has not finished onboarding, and the
    // honest response is to say so — the same answer support-chat gives when
    // asked to change a major before onboarding is complete.
    const { data: updated, error } = await supabase
      .from("onboarding_data")
      .update({ target_universities: draft })
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    setSaving(false);

    if (error) {
      toast.error(error.message || "Couldn't save your list.");
      return;
    }
    if (!updated) {
      toast.error("Finish onboarding first — your list saves with the rest of your profile.");
      return;
    }

    await refreshOnboardingData();
    setOpen(false);
    toast.success(
      draft.length === 0
        ? "Your list is empty."
        : `Saved — ${draft.length} school${draft.length === 1 ? "" : "s"} on your list.`
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className={cn(
              "w-full justify-center border-dotted border-2 border-border/80 text-muted-foreground hover:text-foreground",
              className
            )}
          >
            <Plus
              className="opacity-60 -ms-1 me-2"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            Add university
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Your target universities</DialogTitle>
          <DialogDescription>
            Up to {MAX_TARGETS}. This is the list the rest of Pathforge calibrates
            to — admissions odds, requirements, essay prompts and your roadmap all
            read from it.
          </DialogDescription>
        </DialogHeader>

        {/* No country filter here. Settings narrows the pool to the student's
            declared study destinations; this entry point is for adding a school
            outright, so it searches the whole curated dataset. */}
        <MultiUniversityCombobox
          values={draft}
          onChange={setDraft}
          max={MAX_TARGETS}
          placeholder="Search universities"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
