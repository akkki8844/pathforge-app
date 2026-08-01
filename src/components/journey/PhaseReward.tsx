import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "@/components/icons/FlatIcons";

interface Props {
  phaseName: string;
  show: boolean;
  onDismiss: () => void;
}

export function PhaseReward({ phaseName, show, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="relative p-8 rounded-3xl border border-accent/30 bg-card shadow-2xl max-w-sm mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>

            <motion.div
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <TrophyIcon className="h-24 w-24 mx-auto mb-2" />
            </motion.div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Phase Complete!
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              You've completed the <span className="font-semibold text-accent">{phaseName}</span> phase
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Amazing work! You're one step closer to your dream college.
            </p>

            <Button onClick={onDismiss} className="btn-accent w-full">
              Continue My Journey
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
