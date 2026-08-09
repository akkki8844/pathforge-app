// TEMPORARY dev-only fixture page for visually checking the dashboard without a
// signed-in session. Delete before shipping.
import { Flame, Gem, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { CollegeList, Ledger, NextMove, Reading, Upcoming } from "@/components/dashboard/panels";
import { calibrateList, standingFor, tierFor } from "@/lib/collegeCalibration";

const dt = (days: number) => {
  const x = new Date();
  x.setDate(x.getDate() + days);
  return x;
};

const pillars = {
  academics: 78,
  activities: 52,
  leadership: 31,
  competitions: 64,
  testPrep: 45,
};
const coverage = {
  academics: true,
  activities: true,
  leadership: true,
  competitions: true,
  testPrep: false,
};

const targets = [
  "Massachusetts Institute of Technology",
  "Georgia Institute of Technology",
  "Carnegie Mellon University",
  "Purdue University",
];

const calibration = calibrateList(pillars, coverage, targets);

function Pill({ icon: Icon, value, label, className }: any) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
      <Icon className={className} />
      <span className="font-serif text-[13px] tabular-nums leading-none">{value}</span>
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

export default function DashboardPreview() {
  const colleges = targets.map((name) => {
    const hit = calibration.colleges.find((c) => c.name === name);
    return {
      name,
      tier: hit?.tier ?? tierFor(name),
      fit: hit?.standing ?? standingFor(0),
      readinessIndex: hit?.index ?? 0,
      probability: name.includes("Purdue") ? 61 : null,
      hasRequirements: false,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {new Date().toDateString()}
          </span>
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Good evening, Aarav.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={Trophy} value={4} label="Level" className="h-3.5 w-3.5 text-primary" />
          <Pill icon={Flame} value={9} label="days" className="h-3.5 w-3.5 text-amber-500" />
          <Pill icon={Gem} value={120} label="Gems" className="h-3.5 w-3.5 text-primary" />
          <Link
            to="/profile"
            className="rounded-full border border-border bg-card px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Profile
          </Link>
        </div>
      </header>

      <div className="space-y-3">
        <Reading calibration={calibration} />

        <div className="grid gap-3 lg:grid-cols-3">
          <NextMove
            title="Publish your research project write-up"
            body="A public artifact turns a claim into evidence. Admissions readers can verify it; a bullet point they cannot."
            href="/journey"
            cta="Open the task"
            priority={calibration.headline.priority}
          />
          <CollegeList colleges={colleges} />
          <Upcoming
            deadlines={[
              { id: "1", label: "Early Decision / Early Action", detail: "Most selective US colleges", date: dt(11), kind: "application" },
              { id: "2", label: "Letter from Dr. Mehta", detail: "Physics · requested", date: dt(40), kind: "recommender" },
              { id: "3", label: "Regular Decision", detail: "Common App standard deadline", date: dt(82), kind: "application" },
            ]}
          />
        </div>

        <Ledger
          essays={{ started: 6, refined: 3, words: 4210 }}
          totalEssaySections={28}
          lettersRequested={2}
          lettersSubmitted={1}
          portfolio={{
            courses: 8, projects: 4, leadership: 3, competitions: 5,
            internships: 1, research: 2, creative: 1, service: 1, total: 25,
          }}
        />
      </div>
    </div>
  );
}
