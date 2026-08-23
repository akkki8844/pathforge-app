import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, LayoutDashboard, Map, Mic, Zap } from "lucide-react";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

interface WelcomeTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName?: string | null;
}

/**
 * Shown once, right after a student finishes the onboarding survey and
 * lands on their personalized recommendations. Every step names a real
 * route and a real feature — no placeholder screenshots, no generic
 * "boost your productivity" copy.
 */
const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Your Dashboard",
    description:
      "See where you stand against every school on your list, and the one action worth doing next — not a wall of numbers, just the next move.",
  },
  {
    icon: Map,
    title: "The Journey",
    description:
      "300 quests across 15 levels, built around your major, country and grade. Every task is proof-gated, so a completed level means real, verified progress.",
  },
  {
    icon: Mic,
    title: "Ask the Advisor",
    description:
      "Chat or talk anytime — it knows your whole profile, can draft essays and resumes, and can take you straight to the right page in the app.",
  },
  {
    icon: Zap,
    title: "Your credits",
    description:
      "AI actions use credits from the meter in the corner. Free renews daily; paid plans renew monthly. Nothing here is a surprise charge.",
  },
];

export function WelcomeTourDialog({ open, onOpenChange, firstName }: WelcomeTourDialogProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === total - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setStep(0);
      }}
    >
      <DialogContent className="max-w-[41rem] gap-0 p-0">
        <div className="p-6 pb-0 text-center">
          <img src={pathforgeLogo} alt="Pathforge" className="mx-auto mb-3 h-12 w-12 rounded-xl shadow-sm" />
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {step === 0 ? `Welcome to Pathforge${firstName ? `, ${firstName}` : ""}` : current.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 pb-6 pt-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-6 w-6" />
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              {step === 0
                ? "Your recommendations below are already personalized to what you just told us. Here's a 30-second tour of the four things you'll use most."
                : current.description}
            </DialogDescription>
          </div>

          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full bg-accent transition-all",
                  i === step ? "w-6" : "w-1.5 opacity-25",
                )}
              />
            ))}
          </div>

          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Skip
              </Button>
            </DialogClose>
            {isLast ? (
              <DialogClose asChild>
                <Button type="button">See my recommendations</Button>
              </DialogClose>
            ) : (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
