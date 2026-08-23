import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "@/components/ui/back-button";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The header for marketing pages (about, pricing, contact, terms, privacy,
 * refund-policy, faq) — for every visitor, logged in or not. These pages are
 * not part of the authenticated app, so they never show the account Navbar
 * or the lateral-navigation GuestNavbar; just the logo and a way back home.
 */
export function BackNav() {
  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="section-container">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img
              src={pathforgeLogo}
              alt="Pathforge logo"
              width={96}
              height={96}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <BackButton to="/" label="Back" />
        </div>
      </nav>
    </motion.header>
  );
}
