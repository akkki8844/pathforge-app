import type { ReactNode } from "react";
import { Github, Linkedin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";
import { Panel } from "./primitives";
import { RECORD_SECTIONS, type SectionCount } from "@/lib/outcomesSections";

/**
 * The record's identity card.
 *
 * The profile card a LinkedIn profile opens with, doing the job this page had
 * no component for: saying whose file this is, what it is being read against,
 * and how much of it exists, before the twelve sections below it.
 *
 * What it replaces was a panel headed "The record / Everything you have done"
 * carrying three lines explaining that the record is sectioned and saves as
 * you type. Both of those are things the page demonstrates the moment you
 * look at it, so the space now states the file instead of describing it.
 *
 * The two imports sit here because both write into this record and a student
 * choosing between them is choosing a source, not a feature.
 *
 * Grade and testing are the `controls` slot at the foot of this card rather
 * than a card of their own. They were a second panel directly underneath,
 * which meant the page stated the student's grade twice inside 200px: once as
 * the card's subtitle and once as the value in the control below it. They are
 * facts about the student, so they belong on the card that states who the
 * student is, and the subtitle no longer repeats what the control already
 * shows.
 */
export function RecordIdentity({
  name,
  avatarUrl,
  seed,
  tierLabel,
  counts,
  githubLoading,
  onSyncGithub,
  linkedinLoading,
  onImportLinkedIn,
  controls,
}: {
  name: string;
  avatarUrl?: string | null;
  seed?: string | null;
  tierLabel: string;
  counts: Record<string, SectionCount>;
  githubLoading: boolean;
  onSyncGithub: () => void;
  linkedinLoading: boolean;
  onImportLinkedIn: () => void;
  /** Grade and testing, rendered as this card's last row. */
  controls: ReactNode;
}) {
  const totals = RECORD_SECTIONS.reduce(
    (acc, s) => {
      const c = counts[s.id] ?? { total: 0, verified: 0 };
      return {
        entries: acc.entries + c.total,
        verified: acc.verified + c.verified,
        filled: acc.filled + (c.total > 0 ? 1 : 0),
      };
    },
    { entries: 0, verified: 0, filled: 0 }
  );

  const figures: { label: string; value: string }[] = [
    { label: "On file", value: String(totals.entries) },
    { label: "Verified", value: String(totals.verified) },
    { label: "Sections filled", value: `${totals.filled} of ${RECORD_SECTIONS.length}` },
  ];

  return (
    <Panel flush>
      <div className="flex flex-wrap items-start gap-x-5 gap-y-4 p-4 sm:p-5">
        <PathforgeAvatar stored={avatarUrl} seed={seed || name} size={56} className="shrink-0" />

        <div className="min-w-0 flex-1">
          <h2 className="truncate font-cluely text-[20px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
            {name}
          </h2>
          <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">
            Read against {tierLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            disabled={githubLoading}
            onClick={onSyncGithub}
          >
            {githubLoading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Github className="mr-1.5 h-3.5 w-3.5" />
            )}
            Import from GitHub
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            disabled={linkedinLoading}
            onClick={onImportLinkedIn}
          >
            {linkedinLoading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Linkedin className="mr-1.5 h-3.5 w-3.5" />
            )}
            Import from LinkedIn
          </Button>
        </div>
      </div>

      {/* Three counts, not three cards. Each is already computed for the rail. */}
      <dl className="grid grid-cols-3 divide-x divide-border border-t border-border">
        {figures.map((f) => (
          <div key={f.label} className="px-4 py-3 sm:px-5">
            <dt className="font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-1 font-cluely text-[17px] font-semibold tabular-nums tracking-[-0.02em] text-foreground">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-border p-4 sm:p-5">{controls}</div>
    </Panel>
  );
}
