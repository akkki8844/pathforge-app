import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle, Calendar } from "lucide-react";

interface Deadline {
  id: string;
  label: string;
  date: Date;
  category: string;
  urgent: boolean;
}

function getPersonalizedDeadlines(onboardingData: any): Deadline[] {
  if (!onboardingData) return [];
  const now = new Date();
  const year = parseInt(onboardingData.application_year) || now.getFullYear() + 1;
  const grade = onboardingData.grade || "11";
  const gradeNum = parseInt(grade.match(/\d+/)?.[0] || "11");
  const country = onboardingData.country || "";
  const deadlines: Deadline[] = [];

  // SAT deadlines (roughly quarterly)
  if (gradeNum >= 10) {
    const satDates = [
      new Date(year, 2, 8),  // March
      new Date(year, 4, 3),  // May
      new Date(year, 5, 7),  // June
      new Date(year - 1, 9, 5), // October (prev year cycle)
      new Date(year - 1, 11, 7), // December
    ].filter(d => d > now);

    if (satDates.length > 0) {
      deadlines.push({
        id: "sat-next",
        label: `Next SAT Test Date`,
        date: satDates[0],
        category: "Test Prep",
        urgent: (satDates[0].getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Early Decision deadlines
  if (gradeNum >= 11) {
    const edDeadline = new Date(year, 10, 1); // Nov 1
    if (edDeadline > now) {
      deadlines.push({
        id: "early-decision",
        label: "Early Decision Deadline (typical)",
        date: edDeadline,
        category: "Application",
        urgent: (edDeadline.getTime() - now.getTime()) < 60 * 24 * 60 * 60 * 1000,
      });
    }

    const rdDeadline = new Date(year + 1, 0, 1); // Jan 1
    if (rdDeadline > now) {
      deadlines.push({
        id: "regular-decision",
        label: "Regular Decision Deadline (typical)",
        date: rdDeadline,
        category: "Application",
        urgent: (rdDeadline.getTime() - now.getTime()) < 60 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Recommendation letter request
  if (gradeNum === 11) {
    const recDeadline = new Date(year, 8, 1); // Sept
    if (recDeadline > now) {
      deadlines.push({
        id: "rec-letters",
        label: "Request recommendation letters by",
        date: recDeadline,
        category: "Application",
        urgent: (recDeadline.getTime() - now.getTime()) < 45 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Summer program applications (typically Jan-March)
  if (gradeNum <= 11) {
    const summerDeadline = new Date(now.getFullYear() + (now.getMonth() > 3 ? 1 : 0), 2, 1);
    if (summerDeadline > now) {
      deadlines.push({
        id: "summer-programs",
        label: "Summer program applications open",
        date: summerDeadline,
        category: "Activities",
        urgent: (summerDeadline.getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000,
      });
    }
  }

  // Country-specific
  if (country === "India") {
    const jeeDate = new Date(year, 3, 15);
    if (jeeDate > now && gradeNum >= 11) {
      deadlines.push({ id: "jee", label: "JEE Main (approximate)", date: jeeDate, category: "Test Prep", urgent: (jeeDate.getTime() - now.getTime()) < 60 * 24 * 60 * 60 * 1000 });
    }
  }

  if (country === "United Kingdom") {
    const ucasDeadline = new Date(year, 0, 15);
    if (ucasDeadline > now) {
      deadlines.push({ id: "ucas", label: "UCAS Deadline", date: ucasDeadline, category: "Application", urgent: (ucasDeadline.getTime() - now.getTime()) < 60 * 24 * 60 * 60 * 1000 });
    }
  }

  return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function DeadlineCountdowns({ onboardingData }: { onboardingData: any }) {
  const deadlines = useMemo(() => getPersonalizedDeadlines(onboardingData), [onboardingData]);

  if (deadlines.length === 0) return null;

  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground text-sm">Upcoming Deadlines</h3>
      </div>
      <div className="space-y-3">
        {deadlines.map((d, i) => {
          const days = daysUntil(d.date);
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                d.urgent ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {d.urgent ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{d.label}</p>
                  <p className="text-[10px] text-muted-foreground">{d.category} · {d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <div className={`text-right flex-shrink-0 ml-2 ${d.urgent ? "text-destructive" : "text-accent"}`}>
                <span className="text-sm font-bold">{days}</span>
                <span className="text-[10px] block">days</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
