import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { MilestoneItem, JourneyScores } from "@/hooks/useJourneyData";
import { competitionCalendar, getCompetitionStatusInfo, daysUntil } from "@/lib/competitionCalendar";

interface Props {
  milestones: MilestoneItem[];
  scores: JourneyScores;
  onboardingData: any;
}

export function NextBestAction({ milestones, scores, onboardingData }: Props) {
  const action = useMemo(() => {
    if (!onboardingData) return null;
    const major = onboardingData.intended_major;
    const targets = onboardingData.target_universities || [];

    // 1. Check for urgent open competitions first
    const urgentComps = competitionCalendar.filter(c => {
      const info = getCompetitionStatusInfo(c);
      if (info.status !== "registration_open") return false;
      if (c.registrationClose && daysUntil(c.registrationClose) <= 21 && daysUntil(c.registrationClose) > 0) {
        // Check major relevance
        const majorLower = major.toLowerCase();
        return c.relevantMajors.some(m => majorLower.includes(m.toLowerCase()) || m.toLowerCase().includes(majorLower));
      }
      return false;
    });

    if (urgentComps.length > 0) {
      const comp = urgentComps[0];
      const days = comp.registrationClose ? daysUntil(comp.registrationClose) : null;
      return {
        title: `Register for ${comp.name}`,
        reason: `Registration closes in ${days} days. This competition aligns with ${major} and is valued by ${targets[0] || "top universities"}.`,
        link: comp.applyUrl || comp.url,
        isExternal: true,
        urgency: "critical" as const,
      };
    }

    // 2. Find weakest score area and recommend a critical milestone
    const scoreMap = [
      { key: "academics_score", label: "Academics", cat: "academics" },
      { key: "activities_score", label: "Activities/Research", cat: "activities" },
      { key: "leadership_score", label: "Leadership", cat: "leadership" },
      { key: "competitions_score", label: "Competitions", cat: "competitions" },
      { key: "test_prep_score", label: "Test Prep", cat: "test_prep" },
    ];

    const weakest = scoreMap.sort((a, b) => (scores as any)[a.key] - (scores as any)[b.key])[0];
    const incompleteMilestone = milestones.find(
      m => !m.completed && m.category === weakest.cat && m.priority === "critical"
    ) || milestones.find(
      m => !m.completed && m.category === weakest.cat
    ) || milestones.find(
      m => !m.completed && m.priority === "critical"
    );

    if (incompleteMilestone) {
      return {
        title: incompleteMilestone.title,
        reason: `Your ${weakest.label} score is ${(scores as any)[weakest.key]}/100 — your weakest area. ${incompleteMilestone.why.slice(0, 120)}...`,
        link: incompleteMilestone.link || "/activities",
        isExternal: incompleteMilestone.link ? !incompleteMilestone.link.startsWith("/") : false,
        urgency: incompleteMilestone.priority === "critical" ? "critical" as const : "high" as const,
      };
    }

    return null;
  }, [milestones, scores, onboardingData]);

  if (!action) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-elevated rounded-2xl p-5 border-l-4 ${
        action.urgency === "critical" ? "border-l-destructive" : "border-l-accent"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Next Best Action</h3>
          <p className="text-[10px] text-muted-foreground">Your highest-impact move right now</p>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground mt-2">{action.title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.reason}</p>

      <div className="mt-3">
        {action.isExternal ? (
          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 btn-accent"
            onClick={() => window.open(action.link, "_blank")}
          >
            Take Action <ExternalLink className="h-3 w-3" />
          </Button>
        ) : (
          <Button asChild size="sm" className="text-xs h-8 gap-1.5 btn-accent">
            <Link to={action.link || "/activities"}>
              Take Action <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
