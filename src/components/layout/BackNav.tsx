import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { useAuth } from "@/contexts/AuthContext";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The header for marketing and legal pages (about, pricing, contact, terms,
 * privacy, refund-policy, faq) — for every visitor, logged in or not. These
 * pages are not part of the authenticated app, so they never show the account
 * Navbar or the lateral-navigation GuestNavbar.
 *
 * It used to carry the logo and a single "Back" button and nothing else, which
 * made each of these pages a dead end: a visitor who followed "About" from the
 * landing header could not move sideways to Pricing or FAQ, and the only way
 * on was backwards. GuestNavbar had already been given cross-links for exactly
 * this reason; routing these paths here reintroduced the problem they fixed.
 *
 * The link for the page you are already on is dropped rather than rendered
 * inert, so the row always answers "where else can I go" and never "click here
 * to stay put".
 */
const MARKETING_LINKS = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function BackNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const elsewhere = MARKETING_LINKS.filter((link) => link.to !== pathname);

  return (
    <motion.header
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <nav className="section-container" aria-label="Site navigation">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link to="/" className="flex flex-shrink-0 items-center gap-2" aria-label="Pathforge home">
            <img
              src={pathforgeLogo}
              alt="Pathforge logo"
              width={96}
              height={96}
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Below `sm` the row cannot hold four links plus a CTA without
                wrapping; the footer carries all of them on every one of these
                pages, so hiding them here loses no destination. */}
            {elsewhere.map((link) => (
              <Button key={link.to} asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to={link.to}>{link.label}</Link>
              </Button>
            ))}
            <Button asChild size="sm">
              <Link to={user ? "/dashboard" : "/auth?role=student&view=signup"}>
                {user ? "Open workspace" : "Get started"}
              </Link>
            </Button>
            <BackButton to="/" label="Back" />
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
