import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RouteSkeleton } from "@/components/RouteSkeleton";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import { GeneralSection } from "@/components/settings/sections/GeneralSection";
import { AccountSection } from "@/components/settings/sections/AccountSection";
import { PrivacySection } from "@/components/settings/sections/PrivacySection";
import { BillingSection } from "@/components/settings/sections/BillingSection";
import { UsageSection } from "@/components/settings/sections/UsageSection";
import { ConnectorsSection } from "@/components/settings/sections/ConnectorsSection";
import { AppearanceSection } from "@/components/settings/sections/AppearanceSection";
import { NotificationsSection } from "@/components/settings/sections/NotificationsSection";
import { PreferencesSection } from "@/components/settings/sections/PreferencesSection";
import { LanguageSection } from "@/components/settings/sections/LanguageSection";
import { AdvisorSettingsSection } from "@/components/settings/sections/AdvisorSettingsSection";
import { Seo } from "@/components/Seo";


export default function Profile() {
  const { onboardingData, isAdmin } = useAuth();

  if (isAdmin) return <Navigate to="/admin" replace />;

  if (!onboardingData) {
    return <RouteSkeleton />;
  }

  return (
    <>
    <Seo title="Settings — Pathforge" description="Manage your Pathforge account, preferences, notifications, connectors, and billing." path="/profile" />
    {/* One draft store above the sections. SettingsShell unmounts inactive
        sections, so per-section state could never survive a tab switch —
        which is why edits used to silently vanish before you hit save. */}
    <SettingsFormProvider>
    <SettingsShell
      sections={{
        general: <GeneralSection />,
        preferences: <PreferencesSection />,
        advisor: <AdvisorSettingsSection />,
        language: <LanguageSection />,
        appearance: <AppearanceSection />,
        notifications: <NotificationsSection />,
        connectors: <ConnectorsSection />,
        account: <AccountSection />,
        privacy: <PrivacySection />,
        billing: <BillingSection />,
        usage: <UsageSection />,
      }}
    />
    </SettingsFormProvider>
    </>
  );
}

