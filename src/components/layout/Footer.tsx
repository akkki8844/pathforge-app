import { motion } from "framer-motion";
import { Mail } from 'lucide-react';
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

const FOOTER_LINKS = [
  { to: "/pricing", label: "Pricing" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/refund-policy", label: "Refunds" },
  { to: "/contact", label: "Contact" },
];

const footerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background py-6 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="section-container relative z-10">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground/70">
            <span>Founder — Govind Mulchandani</span>
            <span className="hidden sm:inline opacity-30">·</span>
            <span>Co-founder — Avyaay Rathi</span>
            <span className="hidden sm:inline opacity-30">·</span>
            <span>Co-founder — Zachary Samuel</span>
          </div>
          <motion.a
            href="mailto:pathforge.co@gmail.com"
            className="flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-accent transition-colors"
            whileHover={{ scale: 1.05, y: -1 }}
          >
            <Mail className="h-3 w-3" />
            pathforge.co@gmail.com
          </motion.a>
          <motion.nav
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70"
            variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {FOOTER_LINKS.map((link, i) => (
              <Fragment key={link.to}>
                {i > 0 && (
                  <motion.span variants={footerItem} className="opacity-30" aria-hidden>
                    ·
                  </motion.span>
                )}
                <motion.span variants={footerItem}>
                  <Link to={link.to} className="hover:text-accent transition-colors">
                    {link.label}
                  </Link>
                </motion.span>
              </Fragment>
            ))}
          </motion.nav>
          <motion.p
            className="text-[10px] text-muted-foreground/40 mt-2"
            whileHover={{ scale: 1.05 }}
          >
            Built by students, for students
          </motion.p>
        </motion.div>
      </div>
    </footer>
  );
}
