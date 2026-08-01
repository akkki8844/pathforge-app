import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { JourneyScores } from "@/hooks/useJourneyData";

interface Props {
  scores: JourneyScores;
  onboardingData: any;
  completedMilestones: string[];
  totalMilestones: number;
}

interface Alert {
  id: string;
  message: string;
  severity: "warning" | "critical";
  actionLabel?: string;
  actionLink?: string;
  category?: string;
}

export function GapAlerts({ scores, onboardingData, completedMilestones, totalMilestones }: Props) {
  const alerts = useMemo(() => {
    if (!onboardingData) return [];
    const items: Alert[] = [];
    const grade = onboardingData.grade || "11";
    const gradeNum = parseInt(grade.match(/\d+/)?.[0] || "11");
    const completionRate = totalMilestones > 0 ? completedMilestones.length / totalMilestones : 0;
    const major = onboardingData.intended_major || "";

    // No test prep
    if (scores.test_prep_score === 0 && gradeNum >= 10) {
      items.push({
        id: "no-test",
        message: "You haven't started test prep yet — students at your stage typically begin now.",
        severity: gradeNum >= 11 ? "critical" : "warning",
        actionLabel: "Update Scores",
        actionLink: "/outcomes",
        category: "Test Prep",
      });
    }

    // No leadership
    if (scores.leadership_score === 0 && gradeNum >= 10) {
      items.push({
        id: "no-leadership",
        message: "No leadership roles logged. Universities look for initiative — even small leadership counts.",
        severity: gradeNum >= 11 ? "critical" : "warning",
        actionLabel: "Log Leadership",
        actionLink: "/outcomes",
        category: "Leadership",
      });
    }

    // No research (derived from low activities + competitions)
    const researchScore = Math.min(100, scores.activities_score * 0.6 + scores.competitions_score * 0.4);
    if (researchScore < 15 && gradeNum >= 10) {
      items.push({
        id: "no-research",
        message: `No research experience detected for ${major}. Research is highly valued by top universities and sets you apart.`,
        severity: gradeNum >= 11 ? "critical" : "warning",
        actionLabel: "Find Research Opportunities",
        actionLink: "/activities",
        category: "Research",
      });
    }

    // Low activities
    if (scores.activities_score < 20 && gradeNum >= 10) {
      items.push({
        id: "low-activities",
        message: `Your activity profile is thin for a ${major} applicant. Focus on 1-2 deep projects.`,
        severity: "warning",
        actionLabel: "Browse Activities",
        actionLink: "/activities",
        category: "Activities",
      });
    }

    // Weak academic narrative
    if (scores.academics_score < 30 && gradeNum >= 10) {
      items.push({
        id: "weak-academics",
        message: "Your academic record needs strengthening. Consider taking advanced courses aligned with your major.",
        severity: gradeNum >= 11 ? "critical" : "warning",
        actionLabel: "Review Courses",
        actionLink: "/outcomes",
        category: "Academics",
      });
    }

    // No community/impact
    const communityScore = Math.min(100, scores.leadership_score * 0.7 + scores.activities_score * 0.3);
    if (communityScore < 15 && gradeNum >= 10) {
      items.push({
        id: "no-community",
        message: "No community impact activities detected. Service and impact projects strengthen your application narrative.",
        severity: "warning",
        actionLabel: "Find Service Projects",
        actionLink: "/activities",
        category: "Community Impact",
      });
    }

    // No major-related activities
    if (scores.competitions_score === 0 && scores.activities_score < 30 && gradeNum >= 10) {
      items.push({
        id: "no-major-activities",
        message: `You have no competitions or deep activities specifically related to ${major}. This is a significant gap.`,
        severity: gradeNum >= 11 ? "critical" : "warning",
        actionLabel: "Find ${major} Activities",
        actionLink: "/activities",
        category: major,
      });
    }

    // No progress
    if (completionRate < 0.1 && completedMilestones.length === 0 && totalMilestones > 3) {
      items.push({
        id: "no-progress",
        message: "You haven't completed any milestones yet. Start with your weekly focus tasks above!",
        severity: "warning",
      });
    }

    // Senior with low score
    if (gradeNum >= 12 && scores.overall_score < 40) {
      items.push({
        id: "senior-low",
        message: "You're a senior with significant gaps. Focus on essays and your strongest 2-3 activities.",
        severity: "critical",
        category: "Application",
      });
    }

    return items.slice(0, 5);
  }, [scores, onboardingData, completedMilestones, totalMilestones]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <span className="text-xs font-semibold text-foreground">Key Gaps to Address ({alerts.length})</span>
      </div>
      {alerts.map((alert, i) => (
        <motion.div
          key={alert.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-start gap-2.5 p-3 rounded-xl border ${
            alert.severity === "critical"
              ? "border-destructive/30 bg-destructive/5"
              : "border-accent/20 bg-accent/5"
          }`}
        >
          <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
            alert.severity === "critical" ? "text-destructive" : "text-accent"
          }`} />
          <div className="flex-1 min-w-0">
            {alert.category && (
              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                alert.severity === "critical" ? "text-destructive" : "text-accent"
              }`}>
                {alert.category}
              </span>
            )}
            <p className="text-xs text-foreground leading-relaxed">{alert.message}</p>
            {alert.actionLink && (
              <Link
                to={alert.actionLink}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent mt-1 hover:underline"
              >
                {alert.actionLabel} <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
