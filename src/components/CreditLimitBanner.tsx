import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { ProjectBanner } from "@/components/ui/project-banner";

/**
 * Credits are deducted server-side on every AI call (`consume_credit` RPC) —
 * there is no client-visible meter or burn animation anymore. This banner is
 * the only surface that ever mentions credits, and only once the bucket is
 * actually empty.
 */
export function CreditLimitBanner() {
  const { isAdmin, isTeacher, user } = useAuth();
  const { creditData, creditsRemaining, unlimited, loading, periodLabel, getResetTime } = useCredits();
  const navigate = useNavigate();

  if (!user || isAdmin || isTeacher || loading || !creditData || unlimited) return null;
  if (creditsRemaining > 0) return null;

  return (
    <ProjectBanner
      variant="error"
      icon={<Zap className="h-4 w-4" />}
      label={
        <>
          You've hit your {periodLabel} credit limit. Resets in {getResetTime()}.
        </>
      }
      callToAction={{
        label: "Upgrade for more credits",
        onClick: () => navigate("/pricing"),
      }}
    />
  );
}
