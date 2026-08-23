import { motion } from "framer-motion";
import { Mail, Linkedin, Instagram } from 'lucide-react';
import { Fragment } from "react";
import { Link } from "react-router-dom";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

const PRODUCT_LINKS = [
  { to: "/journey", label: "Journey" },
  { to: "/advisor", label: "Advisor" },
  { to: "/activities", label: "Activities" },
  { to: "/outcomes", label: "Outcomes" },
  { to: "/application-builder", label: "Application Builder" },
  { to: "/admissions-probability", label: "Admissions" },
  { to: "/weekly-planner", label: "Planner" },
];

const RESOURCE_LINKS = [
  { to: "/requirements", label: "Requirements" },
  { to: "/college-readiness", label: "Readiness" },
  { to: "/exemplar-essays", label: "Exemplar Essays" },
  { to: "/scholarships", label: "Scholarships" },
  { to: "/past-admits", label: "Past Admits" },
  { to: "/lor", label: "Professors" },
];

const COMPANY_LINKS = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
  { to: "/guides/ivy-league-admissions", label: "Ivy League guide" },
  { to: "/guides/ivy-league-study-tools", label: "Ivy League study tools" },
  { to: "/teacher/auth", label: "Counsellor workspace" },
];

const LEGAL_LINKS = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/refund-policy", label: "Refunds" },
];

const SOCIAL_LINKS = [
  { href: "https://linkedin.com/company/pathforge-tech", label: "LinkedIn", icon: Linkedin },
  { href: "https://instagram.com/pathforge.co.in", label: "Instagram", icon: Instagram },
];

const footerItem = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT_EXPO } },
};

function LinkColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="inline-flex min-h-[32px] items-center text-sm text-white/70 transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black py-14 text-white">
      <motion.div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="section-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]"
        >
          {/* Brand column — logo + text, like the navbar */}
          <div className="lg:pr-6">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={pathforgeLogo}
                alt="Pathforge logo"
                width={96}
                height={96}
                className="h-9 w-auto object-contain"
              />
              <span className="font-display text-lg font-semibold text-white">Pathforge</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              A single, evolving profile for your college application — journey, essays, activities,
              and advisor, all in one place.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-accent hover:text-accent"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <LinkColumn title="Product" links={PRODUCT_LINKS} />
          <LinkColumn title="Resources" links={RESOURCE_LINKS} />
          <LinkColumn title="Company" links={COMPANY_LINKS} />
          <LinkColumn title="Legal" links={LEGAL_LINKS} />
        </motion.div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <motion.div
            className="flex flex-col items-center gap-3 text-center"
            variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1 text-xs text-white/50">
              <span>Founder — Govind Mulchandani</span>
              <span className="hidden sm:inline opacity-30">·</span>
              <span>Co-founder — Avyaay Rathi</span>
              <span className="hidden sm:inline opacity-30">·</span>
              <span>Co-founder — Zachary Samuel</span>
            </div>
            <motion.a
              href="mailto:pathforge.co@gmail.com"
              className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-white/50 hover:text-accent transition-colors"
              whileHover={{ scale: 1.05, y: -1 }}
            >
              <Mail className="h-3 w-3" />
              pathforge.co@gmail.com
            </motion.a>
            <motion.p className="text-[10px] text-white/30 mt-1" whileHover={{ scale: 1.05 }}>
              Built by students, for students
            </motion.p>
            <p className="text-[10px] text-white/25">
              © {year} Pathforge. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}
