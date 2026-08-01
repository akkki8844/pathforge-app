import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, Clock, TrendingDown, ArrowRight } from "lucide-react";
import type { RosterStudent } from "@/hooks/useTeacherRoster";
import type { UpcomingDeadline, InactiveStudent } from "@/hooks/useCounselorActivity";
import type { Followup } from "@/hooks/useCounselorFollowups";

export interface InterventionAlert {
  id: string;
  studentId: string;
  studentName: string;
  severity: "urgent" | "warn" | "info";
  reason: string;
  detail: string;
}

interface Props {
  students: RosterStudent[];
  inactive: InactiveStudent[];
  deadlines: UpcomingDeadline[];
  followups: Followup[];
  loading?: boolean;
}

/**
 * Detects when a counsellor needs to step in based on real signals:
 *   • No activity in 10+ days
 *   • Approaching deadlines (≤14 days away)
 *   • Weak profile vs targets (low score + ≥1 reach uni)
 *   • Overdue followups
 */
export function buildInterventionAlerts({
  students, inactive, deadlines, followups,
}: Pick<Props, "students" | "inactive" | "deadlines" | "followups">): InterventionAlert[] {
  const out: InterventionAlert[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const nameOf = (id: string) =>
    students.find((s) => s.user_id === id)?.username
    || students.find((s) => s.user_id === id)?.email
    || "Student";

  // Inactivity ≥ 10 days
  inactive.filter((i) => i.daysInactive >= 10).forEach((i) => {
    out.push({
      id: `inactive-${i.user_id}`,
      studentId: i.user_id,
      studentName: i.display_name,
      severity: i.daysInactive >= 21 ? "urgent" : "warn",
      reason: `${i.daysInactive} days inactive`,
      detail: "Reach out to re-engage — no journey or feature activity recently.",
    });
  });

  // Deadlines ≤ 14 days
  deadlines.filter((d) => d.daysAway <= 14).forEach((d) => {
    out.push({
      id: `deadline-${d.id}`,
      studentId: d.student_id,
      studentName: d.display_name,
      severity: d.daysAway <= 3 ? "urgent" : d.daysAway <= 7 ? "warn" : "info",
      reason: d.daysAway < 0
        ? `${Math.abs(d.daysAway)}d past ${d.college_name} deadline`
        : `${d.college_name} deadline in ${d.daysAway}d`,
      detail: `Stage: ${d.stage}. Confirm submission readiness.`,
    });
  });

  // Weak profile vs targets
  students.forEach((s) => {
    if (s.overall_score > 0 && s.overall_score < 45 && (s.target_universities?.length ?? 0) > 0) {
      out.push({
        id: `weak-${s.user_id}`,
        studentId: s.user_id,
        studentName: s.username || s.email || "Student",
        severity: s.overall_score < 30 ? "urgent" : "warn",
        reason: `Profile ${s.overall_score}/100 vs ${s.target_universities!.length} target uni${s.target_universities!.length === 1 ? "" : "s"}`,
        detail: "Profile signal looks light for chosen targets — strategy review recommended.",
      });
    }
  });

  // Overdue followups
  followups.filter((f) => f.status === "open" && f.due_date < today).forEach((f) => {
    out.push({
      id: `followup-${f.id}`,
      studentId: f.student_id,
      studentName: nameOf(f.student_id),
      severity: "warn",
      reason: `Overdue follow-up`,
      detail: f.note,
    });
  });

  // Sort: urgent → warn → info
  const rank = { urgent: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 10);
}

const TONE: Record<InterventionAlert["severity"], string> = {
  urgent: "border-destructive/30 bg-destructive/5",
  warn: "border-orange-500/30 bg-orange-500/5",
  info: "border-accent/30 bg-accent/5",
};
const ICON_TONE: Record<InterventionAlert["severity"], string> = {
  urgent: "text-destructive",
  warn: "text-orange-600 dark:text-orange-400",
  info: "text-accent",
};

export function InterventionAlertsPanel({ students, inactive, deadlines, followups, loading }: Props) {
  const alerts = buildInterventionAlerts({ students, inactive, deadlines, followups });

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-elevated overflow-hidden"
    >
      <div className="p-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">Intervention alerts</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "Calculating…" : `${alerts.length} signal${alerts.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          <div className="h-12 rounded-md bg-muted/40 animate-pulse" />
          <div className="h-12 rounded-md bg-muted/40 animate-pulse" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No intervention alerts. Everyone looks on track.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {alerts.map((a) => (
            <li key={a.id}>
              <Link
                to={`/teacher/students/${a.studentId}`}
                className={`group flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors border-l-2 ${TONE[a.severity]}`}
              >
                <SignalIcon severity={a.severity} reason={a.reason} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{a.studentName}</p>
                    <span className={`text-[10px] uppercase tracking-wide font-semibold ${ICON_TONE[a.severity]}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-xs text-foreground mt-0.5">{a.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.detail}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 mt-1 transition-opacity" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.section>
  );
}

function SignalIcon({ severity, reason }: { severity: InterventionAlert["severity"]; reason: string }) {
  const Icon =
    reason.includes("inactive") ? Clock
    : reason.includes("deadline") ? CalendarClock
    : reason.includes("Profile") ? TrendingDown
    : AlertTriangle;
  return <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${ICON_TONE[severity]}`} />;
}
