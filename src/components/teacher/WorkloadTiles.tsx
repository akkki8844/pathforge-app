import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Bell, AlertCircle } from "lucide-react";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import type { InactiveStudent } from "@/hooks/useCounselorActivity";
import type { Followup } from "@/hooks/useCounselorFollowups";
import type { InterventionAlert } from "./InterventionAlertsPanel";

interface Props {
  students: RosterStudent[];
  inactive: InactiveStudent[];
  followups: Followup[];
  alerts: InterventionAlert[];
}

/**
 * Hairline-grid workload row — visually consistent with the rest of the
 * counsellor command-centre. Five tiles share a single rounded shell with
 * 1px dividers (the bg-border + gap-px trick), so it reads like one
 * continuous instrument panel rather than five floating cards.
 */
export function WorkloadTiles({ students, inactive, followups, alerts }: Props) {
  const total = students.length;
  const inactiveCount = inactive.filter((i) => i.daysInactive >= 7).length;
  const active = Math.max(0, total - inactiveCount);
  const today = new Date().toISOString().slice(0, 10);
  const openFollowups = followups.filter((f) => f.status === "open").length;
  const overdueFollowups = followups.filter(
    (f) => f.status === "open" && f.due_date < today,
  ).length;
  const urgent = alerts.filter((a) => a.severity === "urgent").length;

  const tiles = [
    {
      label: "Total students",
      value: total,
      icon: Users,
      tone: "neutral",
      hint:
        total === 0
          ? "Invite your first cohort"
          : "Across all linked classes & schools",
    },
    {
      label: "Active",
      value: active,
      icon: UserCheck,
      tone: "good",
      hint:
        total > 0
          ? `${Math.round((active / Math.max(1, total)) * 100)}% engaged this week`
          : "—",
    },
    {
      label: "Inactive",
      value: inactiveCount,
      icon: UserX,
      tone: inactiveCount > 0 ? "warn" : "neutral",
      hint: inactiveCount > 0 ? "≥ 7 days quiet" : "Everyone is checking in",
    },
    {
      label: "Pending follow-ups",
      value: openFollowups,
      icon: Bell,
      tone: openFollowups > 0 ? "accent" : "neutral",
      hint: overdueFollowups > 0 ? `${overdueFollowups} overdue` : "All on schedule",
    },
    {
      label: "Urgent cases",
      value: urgent,
      icon: AlertCircle,
      tone: urgent > 0 ? "danger" : "neutral",
      hint: urgent > 0 ? "Need attention today" : "No fires right now",
    },
  ] as const;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
        <Users className="h-7 w-7 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">No students linked yet</p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          Workload metrics appear here as soon as students from your school complete
          onboarding or join your classes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="bg-card p-5 lg:p-6 flex flex-col group hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {t.label}
            </span>
            <t.icon
              className={`h-3.5 w-3.5 ${TONE_ICON[t.tone]}`}
              strokeWidth={1.75}
            />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span
              className={`text-[2rem] lg:text-[2.25rem] font-semibold tracking-tight tabular-nums leading-none ${TONE_NUM[t.tone]}`}
            >
              {t.value}
            </span>
            {t.tone === "danger" && t.value > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {t.hint}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

const TONE_ICON: Record<string, string> = {
  neutral: "text-muted-foreground",
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-orange-600 dark:text-orange-400",
  accent: "text-accent",
  danger: "text-destructive",
};

const TONE_NUM: Record<string, string> = {
  neutral: "text-foreground",
  good: "text-foreground",
  warn: "text-foreground",
  accent: "text-foreground",
  danger: "text-destructive",
};
