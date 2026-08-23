import { useMemo, useState } from "react";
import { motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

interface VariableFontHoverProps {
  label: string;
  className?: string;
  onClick?: () => void;
  fromFontVariationSettings: string;
  toFontVariationSettings: string;
  transition?: Transition;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | number;
}

/**
 * A label whose letters animate their `font-variation-settings` (weight) on
 * hover, staggered per-letter. Requires a variable font on the element for
 * the weight axis to actually move — on a static font this is a harmless
 * no-op, so it's safe to drop onto any label.
 */
export function VariableFontHover({
  label,
  className,
  onClick,
  fromFontVariationSettings,
  toFontVariationSettings,
  transition = { type: "spring", duration: 0.4 },
  staggerDuration = 0.03,
  staggerFrom = "first",
}: VariableFontHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const letters = useMemo(() => Array.from(label), [label]);

  const getStaggerDelay = (index: number, total: number) => {
    if (staggerFrom === "first") return index * staggerDuration;
    if (staggerFrom === "last") return (total - 1 - index) * staggerDuration;
    if (staggerFrom === "center") {
      const center = (total - 1) / 2;
      return Math.abs(center - index) * staggerDuration;
    }
    return Math.abs(staggerFrom - index) * staggerDuration;
  };

  return (
    <span
      className={cn("inline-flex", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          className="inline-block whitespace-pre"
          style={{ fontVariationSettings: fromFontVariationSettings }}
          animate={{
            fontVariationSettings: isHovered ? toFontVariationSettings : fromFontVariationSettings,
          }}
          transition={{ ...transition, delay: getStaggerDelay(i, letters.length) }}
        >
          {letter === " " ? " " : letter}
        </motion.span>
      ))}
    </span>
  );
}
