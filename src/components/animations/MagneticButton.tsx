import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRef, ReactNode } from "react";
import { useFinePointer } from "@/hooks/useFinePointer";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  /** Cap on how far the element may be pulled, in px. */
  maxOffset?: number;
}

export function MagneticButton({
  children,
  className = "",
  strength = 0.3,
  maxOffset = 14,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const finePointer = useFinePointer();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Clamped so a wide button can't drift far enough to overlap its neighbours.
    const clamp = (v: number) => Math.max(-maxOffset, Math.min(maxOffset, v));
    x.set(clamp((e.clientX - centerX) * strength));
    y.set(clamp((e.clientY - centerY) * strength));
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Nothing to chase without a mouse, and the pull is exactly the kind of
  // motion reduced-motion users are asking us to drop.
  if (prefersReduced || !finePointer) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      data-magnetic
    >
      {children}
    </motion.div>
  );
}
