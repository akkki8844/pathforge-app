import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Blocks the authenticated app shell with a one-field modal asking for the
 * user's full name when their profile is missing one. Existing users who
 * onboarded before the field was added MUST provide a name before continuing.
 *
 * Skipped for: signed-out users, guests, admins, teachers, and anyone whose
 * onboarding hasn't completed (the onboarding survey already collects name).
 */
export function NameBackfillGate() {
  const { user, profile, onboardingCompleted, isAdmin, isTeacher, isGuest, refreshOnboardingData, loading, roleLoading } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset local state when the user changes
  useEffect(() => {
    setName("");
  }, [user?.id]);

  // Only show for authenticated, onboarded students whose profile lacks a name.
  const shouldShow =
    !loading &&
    !roleLoading &&
    !!user &&
    !isGuest &&
    !isAdmin &&
    !isTeacher &&
    !!profile &&
    onboardingCompleted &&
    !profile.full_name?.trim();

  if (!shouldShow) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter your full name (at least 2 characters).",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("user_id", user!.id);
      if (error) throw error;
      await refreshOnboardingData();
      toast({ title: "Thanks!", description: `We'll address you as ${trimmed.split(/\s+/)[0]} from now on.` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't save",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
            <UserCircle className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-center">What's your name?</DialogTitle>
          <DialogDescription className="text-center">
            We need your full name so your counsellor and AI advisor can address you properly.
            This takes 5 seconds and only needs to be done once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              autoFocus
              autoComplete="name"
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={submitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || name.trim().length < 2}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
