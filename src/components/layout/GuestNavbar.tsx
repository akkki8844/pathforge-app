import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FlowButton } from "@/components/ui/flow-button";
import { ThemeToggle } from "@/components/ThemeToggle";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The navbar an unauthenticated visitor gets on the marketing pages.
 *
 * It used to carry only sign-in CTAs, on the reasoning that a guest on the
 * landing page needs one thing. But `Layout` also gives this bar to guests on
 * /about, /pricing and /contact — and there it was a dead end: a visitor who
 * followed "About" from the landing header arrived at a page whose only
 * outbound links were "sign in" and the logo. There was no way to move
 * sideways to Pricing, and no way back to About from Pricing.
 *
 * About and Pricing are therefore here, ahead of the sign-in buttons. They drop
 * out below the `sm` breakpoint, where the row cannot hold five controls and
 * the footer carries both.
 */
export function GuestNavbar() {
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

          <div className="flex items-center gap-2">
            
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/about">About</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/?explore=1#preview-tools">Explore platform</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="hidden lg:inline-flex">
              <Link to="/teacher/auth">Counsellor sign in</Link>
            </Button>
            <Link to="/auth">
              <FlowButton text="Student sign in" className="px-5 py-2 text-xs" />
            </Link>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
