import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { GuestNavbar } from "./GuestNavbar";
import { BackNav } from "./BackNav";
import { Footer } from "./Footer";
import { PageTransition } from "@/components/animations/PageTransition";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { UsageLimitBanner } from "@/components/UsageLimitBanner";
import { AuroraBackdrop } from "@/components/visual/AuroraBackdrop";
import { UpgradeCelebration } from "@/components/UpgradeCelebration";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Guest visitors on the landing page get the whole minimal chrome (Index
  // ships its own header/footer, so the app's is redundant there).
  const useGuestNav = !user && location.pathname === "/";
  // These are marketing/legal pages, not the authenticated app — nobody
  // browsing them, logged in or not, should see the account Navbar (with its
  // Journey/Activities/Builders links) or the lateral-nav GuestNavbar. They
  // get a logo + back button instead.
  const MARKETING_PATHS = ["/pricing", "/about", "/contact", "/terms", "/privacy", "/refund-policy", "/faq", "/guides/ivy-league-admissions", "/guides/ivy-league-study-tools"];
  const isMarketingPage = MARKETING_PATHS.includes(location.pathname);
  // The sitewide footer is marketing chrome: Pricing, About, Terms, the guides.
  // It belongs on the public site, not under a signed-in workspace page — on
  // /journey it put a dark full-width link farm below the app UI and pointed a
  // student mid-task back out to the sales pages. Signed-out visitors keep it
  // everywhere they browse; the authenticated app only gets it on the
  // marketing/legal routes, which are the same pages whether or not you're in.
  // `user` starts `null` while AuthContext is still resolving the session
  // (`loading`), which used to read exactly like signed-out and flash the
  // marketing footer under the workspace UI on every hard refresh of an app
  // page before flipping it back off once the session loaded.
  const showFooter = !useGuestNav && (isMarketingPage || (!user && !loading));

  return (
    /*
     * Two things this deliberately does NOT do.
     *
     * No `overflow-x-hidden` here: an `overflow` value on an ancestor makes that
     * element the containing block for `position: sticky`, which quietly broke
     * the sticky navbar on every page. Horizontal containment now lives on
     * `html, body` in index.css, where it can't capture a descendant's sticky.
     *
     * No `min-h-screen` (100vh): on iOS Safari that resolves to the *largest*
     * viewport, so the page always ran taller than the visible area and the
     * footer hid under the browser chrome. `100svh` is the small viewport —
     * correct with the toolbars shown, which is the state the user is in.
     */
    <div className="relative flex min-h-[100svh] flex-col">
      {!useGuestNav && <AuroraBackdrop />}
      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {!useGuestNav && (isMarketingPage ? <BackNav /> : user ? <Navbar /> : <GuestNavbar />)}
        {!useGuestNav && <AnnouncementBanner />}
        {!useGuestNav && <EmailVerificationBanner />}
        {!useGuestNav && <UsageLimitBanner />}
        {!useGuestNav && <GuestModeBanner />}
        <main className="flex-1 min-w-0">
          <PageTransition>{children}</PageTransition>
        </main>
        {showFooter && <Footer />}
        {user && <FeedbackWidget />}
        {user && <UpgradeCelebration />}
      </div>
    </div>
  );
}
