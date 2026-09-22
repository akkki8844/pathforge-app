/**
 * The two side panes: what the document is made of, and what it adds up to.
 *
 * Outline is navigation. It is built from the headings in the document rather
 * than from a table the student maintains, so it is never out of date, and the
 * heading the caret is in is marked — in a long essay that is the only way to
 * know where you are without scrolling.
 *
 * Insights is arithmetic, from `lib/documents/insights.ts`. Every number is
 * counted from the text in front of the student; nothing here is a judgement
 * and nothing is sent anywhere to be scored.
 */

import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { easeBand, formatMinutes, type DocumentStats } from "@/lib/documents/insights";
import { cn } from "@/lib/utils";

/* ── Outline ────────────────────────────────────────────────────────── */

interface Heading {
  level: number;
  text: string;
  pos: number;
}

export function OutlinePane({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const headings = useMemo(() => {
    const found: Heading[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        found.push({
          level: Number(node.attrs.level) || 1,
          text: node.textContent.trim(),
          pos,
        });
      }
      return true;
    });
    return found;
  }, [editor.state.doc]);

  const caret = editor.state.selection.from;
  const activeIndex = headings.reduce(
    (best, heading, index) => (heading.pos <= caret ? index : best),
    -1,
  );

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border/60 bg-muted/20 lg:flex">
      <PaneHeader title="Outline" onClose={onClose} />
      {/*
        Radix lays the scroll viewport's content out as a table, so a child
        sizes to its own content and a long heading runs past the pane's edge
        instead of truncating. `block` puts it back on the pane's width.
      */}
      <ScrollArea className="flex-1 [&>div>div]:!block">
        {headings.length === 0 ? (
          <p className="px-3 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            No headings yet. Give a section a heading and it appears here, ready to jump to.
          </p>
        ) : (
          <nav className="px-1.5 py-2">
            {headings.map((heading, index) => (
              <button
                key={`${heading.pos}-${index}`}
                type="button"
                onClick={() =>
                  editor.chain().focus().setTextSelection(heading.pos + 1).scrollIntoView().run()
                }
                className={cn(
                  "block w-full truncate rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  index === activeIndex
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground",
                )}
                style={{ paddingLeft: 8 + (heading.level - 1) * 12 }}
                title={heading.text || "Untitled heading"}
              >
                {heading.text || "Untitled heading"}
              </button>
            ))}
          </nav>
        )}
      </ScrollArea>
    </aside>
  );
}

/* ── Insights ───────────────────────────────────────────────────────── */

export function InsightsPane({
  stats,
  pages,
  onClose,
}: {
  stats: DocumentStats;
  pages: number;
  onClose: () => void;
}) {
  return (
    <aside className="hidden w-[268px] shrink-0 flex-col border-l border-border/60 bg-muted/20 xl:flex">
      <PaneHeader title="Insights" onClose={onClose} />
      <ScrollArea className="flex-1 [&>div>div]:!block">
        <div className="space-y-5 px-3 py-3">
          <section>
            <Caption>Count</Caption>
            <dl className="mt-1.5 space-y-1">
              <Row label="Words" value={stats.words.toLocaleString()} />
              <Row label="Characters" value={stats.characters.toLocaleString()} />
              <Row
                label="Characters, no spaces"
                value={stats.charactersNoSpaces.toLocaleString()}
              />
              <Row label="Sentences" value={stats.sentences.toLocaleString()} />
              <Row label="Paragraphs" value={stats.paragraphs.toLocaleString()} />
              <Row label="Pages" value={String(pages)} />
            </dl>
          </section>

          <section>
            <Caption>Time</Caption>
            <dl className="mt-1.5 space-y-1">
              <Row label="To read" value={formatMinutes(stats.readingMinutes)} />
              <Row label="To read aloud" value={formatMinutes(stats.speakingMinutes)} />
            </dl>
          </section>

          <section>
            <Caption>Readability</Caption>
            {stats.words < 30 ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                Write about thirty words and these scores start to mean something.
              </p>
            ) : (
              <>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="text-[22px] font-semibold leading-none tabular-nums text-foreground">
                    {Math.round(stats.readingEase)}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    {easeBand(stats.readingEase)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, Math.min(100, stats.readingEase))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  Flesch reading ease. Higher is plainer; most essays sit between 40 and 60.
                </p>
                <dl className="mt-2.5 space-y-1">
                  <Row label="Grade level" value={stats.gradeLevel.toFixed(1)} />
                  <Row label="Words a sentence" value={stats.wordsPerSentence.toFixed(1)} />
                  <Row label="Letters a word" value={stats.charactersPerWord.toFixed(1)} />
                </dl>
              </>
            )}
          </section>

          {stats.longestSentence && stats.longestSentence.words > 24 && (
            <section>
              <Caption>Longest sentence</Caption>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                <span className="font-medium tabular-nums text-foreground">
                  {stats.longestSentence.words} words.
                </span>{" "}
                “
                {stats.longestSentence.text.length > 140
                  ? `${stats.longestSentence.text.slice(0, 140)}…`
                  : stats.longestSentence.text}
                ”
              </p>
            </section>
          )}

          {stats.topWords.length > 0 && (
            <section>
              <Caption>Most used</Caption>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {stats.topWords.map((entry) => (
                  <li
                    key={entry.word}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[12px]"
                  >
                    <span className="text-foreground">{entry.word}</span>
                    <span className="tabular-nums text-muted-foreground">{entry.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

/* ── Shared ─────────────────────────────────────────────────────────── */

function PaneHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Close ${title.toLowerCase()}`}
        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
      {children}
    </h3>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <dt className="truncate text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
