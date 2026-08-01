import { motion, useMotionValue, useMotionTemplate, useSpring, useReducedMotion } from "framer-motion";
import { useRef, ReactNode } from "react";
import { useFinePointer } from "@/hooks/useFinePointer";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  /** Degrees of tilt at the card's edge. 0 keeps the glow but drops the tilt. */
  tilt?: number;
}

export function GlowCard({ children, className = "", tilt = 4 }: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const finePointer = useFinePointer();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(0, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 20 });
  const glowOpacity = useSpring(0, { stiffness: 150, damping: 25 });

  // A motion template keeps the gradient bound to the motion values.
  // Interpolating mouseX.get() into a plain style string reads the value once
  // at render, so the glow used to freeze wherever it was first painted.
  const glow = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, hsl(var(--accent) / 0.14), transparent 60%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX.set(x);
    mouseY.set(y);
    if (tilt > 0) {
      // Normalised to [-1, 1] so the tilt reads the same on any card size —
      // the old fixed /20 divisor made tall cards lurch.
      rotateX.set(((y - rect.height / 2) / (rect.height / 2)) * -tilt);
      rotateY.set(((x - rect.width / 2) / (rect.width / 2)) * tilt);
    }
  };

  const handleMouseEnter = () => glowOpacity.set(1);

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    glowOpacity.set(0);
  };

  // `group` stays on the wrapper either way — children style themselves off it.
  if (prefersReduced || !finePointer) {
    return <div className={`relative overflow-hidden group ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={`relative overflow-hidden group ${className}`}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: glow, opacity: glowOpacity }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
