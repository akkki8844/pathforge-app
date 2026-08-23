import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import pathforgeLogo from "@/assets/pathforge-logo.webp";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { colleges, majors } from "@/lib/data";
import { saveProfile } from "@/lib/storage";

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [targetCollege, setTargetCollege] = useState("");
  const [intendedMajor, setIntendedMajor] = useState("");

  const handleSubmit = () => {
    if (targetCollege && intendedMajor) {
      saveProfile({
        targetCollege,
        intendedMajor,
        createdAt: new Date().toISOString(),
      });
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-xl"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <img src={pathforgeLogo} alt="Pathforge" className="mx-auto mb-4 h-14 w-14 rounded-xl shadow-sm" />
          <h1 className="text-2xl font-bold text-foreground">Welcome to Pathforge</h1>
          <p className="mt-2 text-muted-foreground">
            Let's personalize your experience
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step >= 1 ? "bg-accent" : "bg-muted"
            }`}
          />
          <div
            className={`h-2 w-16 rounded-full transition-colors ${
              step >= 2 ? "bg-accent" : "bg-muted"
            }`}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GraduationCap className="h-4 w-4 text-accent" />
                  Target College
                </label>
                <Select value={targetCollege} onValueChange={setTargetCollege}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your target college" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {colleges.map((college) => (
                      <SelectItem key={college} value={college}>
                        {college}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!targetCollege}
                className="w-full h-12 btn-accent"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-accent" />
                  Intended Major
                </label>
                <Select value={intendedMajor} onValueChange={setIntendedMajor}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your intended major" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {majors.map((major) => (
                      <SelectItem key={major} value={major}>
                        {major}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!intendedMajor}
                  className="flex-1 h-12 btn-accent"
                >
                  Start Exploring
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can update these preferences anytime in your profile
        </p>
      </motion.div>
    </div>
  );
}
