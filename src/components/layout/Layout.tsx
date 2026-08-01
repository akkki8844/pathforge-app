import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { GuestNavbar } from "./GuestNavbar";
import { Footer } from "./Footer";
import { PageTransition } from "@/components/animations/PageTransition";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { AuroraBackdrop } from "@/components/visual/AuroraBackdrop";
import { UpgradeCelebration } from "@/components/UpgradeCelebration";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  // Guest visitors on the landing page get a minimal navbar (sign-in only).
  const useGuestNav = !user && location.pathname === "/";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {!useGuestNav && <AuroraBackdrop />}
      <div className="relative z-10 flex min-h-screen flex-col">
        {!useGuestNav && <Navbar />}
        {!useGuestNav && <AnnouncementBanner />}
        {!useGuestNav && <EmailVerificationBanner />}
        {!useGuestNav && <GuestModeBanner />}
        <main className="flex-1 min-w-0">
          <PageTransition>{children}</PageTransition>
        </main>
        {!useGuestNav && <Footer />}
        {user && <FeedbackWidget />}
        {user && <UpgradeCelebration />}
      </div>
    </div>
  );
}
