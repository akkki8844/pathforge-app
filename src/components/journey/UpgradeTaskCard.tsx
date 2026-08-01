import { motion } from "framer-motion";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  major: string;
  currentLevel: number;
}

/**
 * Shown to advanced users (level >= 4) — invites upgrading existing work
 * rather than repeating basics.
 */
export function UpgradeTaskCard({ major, currentLevel }: Props) {
  if (currentLevel < 4) return null;

  const upgrades = [
    `Scale your strongest ${major} project — 10x its reach (more users, regional press, partnerships).`,
    `Turn your club role into a regional or national federation chapter.`,
    `Convert your research into a published paper — submit to a high-school journal or workshop.`,
    `Productise one project: launch it as a real service with paying users or active community.`,
  ];

  return (
    <Card className="bg-gradient-to-br from-amber-500/5 to-rose-500/5 border-amber-500/20">
      <CardContent className="p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Upgrade what you've built</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          You're advanced enough that the highest-ROI move is improving existing work — not starting new things.
        </p>
        <ul className="space-y-2">
          {upgrades.map((u, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <ArrowRight className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <span>{u}</span>
            </motion.li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
