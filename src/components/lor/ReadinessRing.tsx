import { useMemo } from "react";
import { motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Recommender } from "@/hooks/useRecommenders";

interface Signal {
  label: string;
  earned: number;
  max: number;
  hint?: string;
}

export interface Readiness {
  score: number;
  band: "Not started" | "Building" | "Ready" | "Strong";
  signals: Signal[];
  missingRoles: string[];
}

const STEM_HINTS = ["math", "calc", "physics", "chem", "bio", "cs", "computer", "engineer", "stat", "science"];
const HUM_HINTS = ["english", "history", "lit", "writ", "social", "civic", "philosoph", "language", "spanish", "french"];

function classify(r: Recommender): "stem" | "humanities" | "counselor" | "other" {
  const subj = (r.subject ?? "").toLowerCase();
  const pos = (r.position ?? "").toLowerCase();
  if (/counsel/.test(pos)) return "counselor";
  if (STEM_HINTS.some((k) => subj.includes(k) || pos.includes(k))) return "stem";
  if (HUM_HINTS.some((k) => subj.includes(k) || pos.includes(k))) return "humanities";
  return "other";
}

export function computeReadiness(items: Recommender[]): Readiness {
  const n = items.length;

  // Roster size — up to 3 recommenders is typical
  const rosterEarned = Math.min(n, 3);
  const rosterMax = 3;

  // Subject coverage: STEM + Humanities + Counselor
  const roles = new Set(items.map(classify));
  const coverageRoles = ["stem", "humanities", "counselor"] as const;
  const coverageEarned = coverageRoles.filter((r) => roles.has(r)).length;
  const coverageMax = coverageRoles.length;

  // Progress: status-weighted
  const statusWeight: Record<string, number> = {
    not_requested: 0,
    requested: 0.4,
    accepted: 0.6,
    drafting: 0.8,
    submitted: 1,
  };
  const progressEarned = n === 0 ? 0 : items.reduce((s, r) => s + (statusWeight[r.status] ?? 0), 0);
  const progressMax = Math.max(n, 1);

  // Materials: brag-sheet linkage + packet generated
  const withBrag = items.filter((r) => r.brag_sheet_id).length;
  const withPacket = items.filter((r) => r.last_packet_artifact_id).length;
  const materialsEarned = Math.min(withBrag, n) + Math.min(withPacket, n);
  const materialsMax = Math.max(n, 1) * 2;

  // Deadlines: of those with a due date, share that aren't overdue + unsubmitted
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const withDue = items.filter((r) => r.due_date);
  let deadlineEarned = 0;
  let deadlineMax = 0;
  if (withDue.length > 0) {
    deadlineMax = withDue.length;
    deadlineEarned = withDue.filter((r) => {
      if (r.submitted_at) return true;
      const due = new Date(r.due_date!);
      return due.getTime() >= today.getTime();
    }).length;
  }

  const signals: Signal[] = [
    { label: "Roster size", earned: rosterEarned, max: rosterMax, hint: "Aim for 2–3 recommenders." },
    { label: "Subject coverage", earned: coverageEarned, max: coverageMax, hint: "STEM, humanities, and a counselor." },
    { label: "Request progress", earned: Math.round(progressEarned * 10) / 10, max: progressMax, hint: "Move each one from requested to submitted." },
    { label: "Materials prepared", earned: materialsEarned, max: materialsMax, hint: "Link a brag sheet and generate a packet." },
    ...(deadlineMax > 0
      ? [{ label: "Deadlines on track", earned: deadlineEarned, max: deadlineMax, hint: "No overdue, unsubmitted letters." }]
      : []),
  ];

  // Weighted score
  const weights = [0.2, 0.25, 0.25, 0.2, 0.1];
  let total = 0;
  let weightSum = 0;
  signals.forEach((s, i) => {
    const w = weights[i] ?? 0.1;
    if (s.max > 0) {
      total += (s.earned / s.max) * w;
      weightSum += w;
    }
  });
  const score = weightSum === 0 ? 0 : Math.round((total / weightSum) * 100);

  const band: Readiness["band"] =
    n === 0 ? "Not started" : score >= 80 ? "Strong" : score >= 55 ? "Ready" : "Building";

  const missingRoles: string[] = [];
  if (!roles.has("stem")) missingRoles.push("STEM teacher");
  if (!roles.has("humanities")) missingRoles.push("Humanities teacher");
  if (!roles.has("counselor")) missingRoles.push("Counselor");

  return { score, band, signals, missingRoles };
}

const SIZE = 64;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function ReadinessRing({ items }: { items: Recommender[] }) {
  const readiness = useMemo(() => computeReadiness(items), [items]);
  const { score, band, signals, missingRoles } = readiness;

  const color =
    band === "Strong"
      ? "text-emerald-500"
      : band === "Ready"
      ? "text-blue-500"
      : band === "Building"
      ? "text-amber-500"
      : "text-muted-foreground";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-3 rounded-full border bg-card px-3 py-1.5 hover:bg-muted/40 transition"
          aria-label={`Readiness ${score} of 100, ${band}`}
        >
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} className="-rotate-90">
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                className="text-muted/40"
                stroke="currentColor"
                strokeWidth={STROKE}
                fill="none"
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                className={color}
                stroke="currentColor"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${(score / 100) * C} ${C}` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
              {score}
            </div>
          </div>
          <div className="text-left pr-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Readiness
            </div>
            <div className={cn("text-sm font-medium", color)}>{band}</div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              [ Readiness breakdown ]
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{score}</span>
              <span className="text-sm text-muted-foreground">/ 100 · {band}</span>
            </div>
          </div>

          <div className="space-y-2">
            {signals.map((s) => {
              const pct = s.max === 0 ? 0 : Math.min(100, (s.earned / s.max) * 100);
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.earned} / {s.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", color.replace("text-", "bg-"))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {s.hint ? (
                    <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {missingRoles.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1.5">Missing roles</div>
              <div className="flex flex-wrap gap-1.5">
                {missingRoles.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
