import { Gauge } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { ProjectBanner } from "@/components/ui/project-banner";

/**
 * Shown only once the plan's usage allowance is fully spent.
 *
 * Metering happens server-side on every AI call; the running figure lives in
 * Settings › Usage as a percentage. This banner is the one place that
 * interrupts, and only at 100% — a meter that shouts before it is full trains
 * people to ignore it.
 */
export function UsageLimitBanner() {
  const { isAdmin, isTeacher, user } = useAuth();
  const { usageData, hasAllowance, unlimited, loading, periodLabel, getResetTime } = useUsage();
  const navigate = useNavigate();

  if (!user || isAdmin || isTeacher || loading || !usageData || unlimited) return null;
  if (hasAllowance) return null;

  return (
    <ProjectBanner
      variant="error"
      icon={<Gauge className="h-4 w-4" />}
      label={
        <>
          You've used 100% of your {periodLabel} allowance. Resets in {getResetTime()}.
        </>
      }
      callToAction={{
        label: "Upgrade for a larger allowance",
        onClick: () => navigate("/pricing"),
      }}
    />
  );
}
