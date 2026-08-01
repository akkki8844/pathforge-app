import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import pathforgeLogo from "@/assets/pathforge-logo.png";

/**
 * Minimal navbar shown to unauthenticated visitors on the landing page.
 * Only the three sign-in entry points + theme toggle. No product links.
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
            
            <Button asChild size="sm" variant="ghost">
              <Link to="/?explore=1#preview-tools">Explore platform</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
              <Link to="/teacher/auth">Counsellor sign in</Link>
            </Button>
            <Button asChild size="sm" variant="default">
              <Link to="/auth">Student sign in</Link>
            </Button>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}
