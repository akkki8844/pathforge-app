import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { PersonAvatar } from "@/components/comms/chat/PersonAvatar";
import { accent } from "@/lib/comms/accents";
import { TEAM_CATEGORY_LABELS } from "@/lib/comms/types";
import { listTimestamp } from "@/lib/comms/format";
import type { PersonMap } from "@/hooks/comms/usePeople";
import type { TeamCard as TeamCardData } from "@/hooks/comms/useTeams";

/**
 * A team, as a card.
 *
 * The tinted header band is the one place a gradient earns its keep: it is what
 * makes a grid of teams distinguishable at a glance without needing anyone to
 * upload an image. The tint comes from a closed palette of literal class strings
 * — Tailwind's JIT only emits CSS for classes it can find in the source, so a
 * colour built by interpolating a stored value renders as nothing at all.
 */
export function TeamCard({
  team,
  people,
  memberIds,
  index = 0,
}: {
  team: TeamCardData;
  people: PersonMap;
  /** A few member ids for the avatar stack. */
  memberIds: string[];
  index?: number;
}) {
  const tint = accent(team.accent);
  const shown = memberIds.slice(0, 4);
  const extra = team.member_count - shown.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={`/communications/teams/${team.id}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-accent/40"
      >
        <div className={cn("h-16 bg-gradient-to-br", tint.header)} />

        <div className="-mt-8 px-4 pb-4">
          <span
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-card font-display text-lg font-bold shadow-sm",
              tint.avatar,
            )}
            aria-hidden
          >
            {team.name.trim().slice(0, 2).toUpperCase()}
          </span>

          <h3 className="mt-3 truncate font-display text-base font-bold text-foreground">
            {team.name}
          </h3>

          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span className={cn("rounded-full border px-1.5 py-0.5", tint.chip)}>
              {TEAM_CATEGORY_LABELS[team.category] ?? "Team"}
            </span>
            {team.role && team.role !== "member" && (
              <span className="rounded-full border border-border px-1.5 py-0.5 capitalize text-muted-foreground">
                {team.role}
              </span>
            )}
          </p>

          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {team.description || "No description yet."}
          </p>

          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
            <span className="flex -space-x-2">
              {shown.map((id) => (
                <PersonAvatar key={id} person={people[id]} size="xs" className="ring-2 ring-card" />
              ))}
              {extra > 0 && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card">
                  +{extra}
                </span>
              )}
            </span>

            <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1" title="Members">
                <Users className="h-3.5 w-3.5" />
                {team.member_count}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1",
                  team.open_objectives > 0 && "font-semibold text-warning",
                )}
                title="Open objectives"
              >
                <Target className="h-3.5 w-3.5" />
                {team.open_objectives}
              </span>
              {team.conversation_id && (
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
              )}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground">
            Active {listTimestamp(team.last_activity_at)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
