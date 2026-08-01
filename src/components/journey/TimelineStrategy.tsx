import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, ArrowRight } from "lucide-react";
import type { MilestoneItem } from "@/hooks/useJourneyData";
import { competitionCalendar, getCompetitionStatusInfo, formatDate, daysUntil } from "@/lib/competitionCalendar";

interface Props {
  milestones: MilestoneItem[];
  onboardingData: any;
}

interface TimelineBlock {
  period: string;
  label: string;
  items: { title: string; type: "milestone" | "competition" | "deadline"; link?: string; date?: string }[];
}

export function TimelineStrategy({ milestones, onboardingData }: Props) {
  const timeline = useMemo(() => {
    if (!onboardingData) return [];

    const now = new Date();
    const country = onboardingData.country;
    const major = onboardingData.intended_major;
    const majorLower = major.toLowerCase();

    const blocks: TimelineBlock[] = [];

    // This month
    const thisMonthItems: TimelineBlock["items"] = [];
    const incompleteCritical = milestones
      .filter(m => !m.completed && m.priority === "critical")
      .slice(0, 3);
    incompleteCritical.forEach(m => {
      thisMonthItems.push({ title: m.title, type: "milestone", link: m.link });
    });

    // Any competitions closing this month
    competitionCalendar.forEach(comp => {
      const info = getCompetitionStatusInfo(comp);
      if (info.status === "registration_open" && comp.registrationClose) {
        const dLeft = daysUntil(comp.registrationClose);
        if (dLeft > 0 && dLeft <= 30) {
          const isRelevant = comp.relevantMajors.some(m =>
            majorLower.includes(m.toLowerCase()) || m.toLowerCase().includes(majorLower)
          );
          if (isRelevant && (comp.country.length === 0 || comp.country.includes(country))) {
            thisMonthItems.push({
              title: `Register for ${comp.name}`,
              type: "deadline",
              link: comp.applyUrl || comp.url,
              date: formatDate(comp.registrationClose),
            });
          }
        }
      }
    });

    if (thisMonthItems.length > 0) {
      blocks.push({
        period: "this-month",
        label: `This Month (${now.toLocaleDateString("en-US", { month: "long" })})`,
        items: thisMonthItems,
      });
    }

    // This semester (next 3 months)
    const semesterItems: TimelineBlock["items"] = [];
    const incompleteHigh = milestones
      .filter(m => !m.completed && m.priority === "high" && !incompleteCritical.includes(m))
      .slice(0, 4);
    incompleteHigh.forEach(m => {
      semesterItems.push({ title: m.title, type: "milestone", link: m.link });
    });

    // Upcoming competitions in 1-3 months
    competitionCalendar.forEach(comp => {
      const info = getCompetitionStatusInfo(comp);
      if (info.status === "upcoming" && comp.registrationOpen) {
        const dLeft = daysUntil(comp.registrationOpen);
        if (dLeft > 0 && dLeft <= 90) {
          const isRelevant = comp.relevantMajors.some(m =>
            majorLower.includes(m.toLowerCase()) || m.toLowerCase().includes(majorLower)
          );
          if (isRelevant && (comp.country.length === 0 || comp.country.includes(country))) {
            semesterItems.push({
              title: `Prepare for ${comp.name}`,
              type: "competition",
              link: comp.url,
              date: `Reg opens ${formatDate(comp.registrationOpen)}`,
            });
          }
        }
      }
    });

    if (semesterItems.length > 0) {
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 3, 1);
      blocks.push({
        period: "this-semester",
        label: `Next 3 Months (${now.toLocaleDateString("en-US", { month: "short" })} – ${endMonth.toLocaleDateString("en-US", { month: "short" })})`,
        items: semesterItems.slice(0, 5),
      });
    }

    // This year
    const yearItems: TimelineBlock["items"] = [];
    const incompleteRec = milestones
      .filter(m => !m.completed && m.priority === "recommended" && !incompleteHigh.includes(m))
      .slice(0, 3);
    incompleteRec.forEach(m => {
      yearItems.push({ title: m.title, type: "milestone", link: m.link });
    });

    if (yearItems.length > 0) {
      blocks.push({
        period: "this-year",
        label: `This Academic Year (${now.getFullYear()}–${now.getFullYear() + 1})`,
        items: yearItems,
      });
    }

    return blocks;
  }, [milestones, onboardingData]);

  if (timeline.length === 0) return null;

  const typeColors = {
    milestone: "bg-accent/10 text-accent border-accent/30",
    competition: "bg-highlight/10 text-highlight border-highlight/30",
    deadline: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-foreground text-sm">Timeline Strategy</h3>
      </div>

      <div className="space-y-5">
        {timeline.map((block, bi) => (
          <div key={block.period}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <h4 className="text-xs font-semibold text-foreground">{block.label}</h4>
            </div>
            <div className="ml-3 border-l border-border pl-4 space-y-2">
              {block.items.map((item, ii) => (
                <motion.div
                  key={ii}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: bi * 0.1 + ii * 0.03 }}
                  className={`p-2.5 rounded-lg border text-xs ${typeColors[item.type]}`}
                >
                  <p className="font-medium">{item.title}</p>
                  {item.date && (
                    <p className="text-[10px] mt-0.5 opacity-80">{item.date}</p>
                  )}
                  {item.link && !item.link.startsWith("/") && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] mt-1 hover:underline"
                    >
                      View details <ArrowRight className="h-2.5 w-2.5" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
