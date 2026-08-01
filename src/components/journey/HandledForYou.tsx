import { motion } from "framer-motion";
import { ShieldCheck, CalendarClock, TrendingUp, BellRing } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  { icon: CalendarClock, title: "Deadlines tracked", desc: "We watch competition, scholarship & application dates so you don't miss them." },
  { icon: TrendingUp,   title: "Recommendations updated", desc: "Activities & tasks re-rank as you progress and as new opportunities open." },
  { icon: BellRing,     title: "Profile gaps flagged",   desc: "If something critical is missing for your major, we surface it as a warning." },
];

export function HandledForYou() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Handled for You</h3>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Things Pathforge runs in the background so you can focus on the work.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ITEMS.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <it.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm font-semibold text-foreground">{it.title}</div>
              <p className="text-[11px] text-muted-foreground leading-snug">{it.desc}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
