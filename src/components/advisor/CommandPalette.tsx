import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { transition } from "@/lib/motion";
import {
  COMMAND_GROUP_LABEL,
  type AdvisorCommand,
  type CommandGroup,
} from "@/lib/advisorCommands";

/**
 * The `/` menu above the composer.
 *
 * Not a modal and not a `cmdk` dialog: the user is mid-sentence in a textarea
 * they must keep focus in, so this is a listbox that the textarea drives by
 * `aria-activedescendant` while never giving up the caret. Arrow keys, Tab and
 * Enter are handled by the composer and passed down as `activeIndex` — this
 * component owns rendering and scroll-into-view, nothing else.
 */

const GROUP_ORDER: CommandGroup[] = ["context", "session", "tools", "skill", "navigate"];

export interface CommandPaletteProps {
  commands: AdvisorCommand[];
  activeIndex: number;
  onPick: (command: AdvisorCommand) => void;
  onHover: (index: number) => void;
  id: string;
}

export function CommandPalette({
  commands,
  activeIndex,
  onPick,
  onHover,
  id,
}: CommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Grouped for reading, flat for keyboard: the index the composer moves is an
  // index into `commands`, so each row carries its own flat position rather
  // than being renumbered per group.
  const grouped = useMemo(() => {
    const buckets = new Map<CommandGroup, { command: AdvisorCommand; index: number }[]>();
    commands.forEach((command, index) => {
      const list = buckets.get(command.group) ?? [];
      list.push({ command, index });
      buckets.set(command.group, list);
    });
    return GROUP_ORDER.filter((g) => buckets.has(g)).map((g) => ({
      group: g,
      rows: buckets.get(g)!,
    }));
  }, [commands]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (commands.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={transition.fast}
      className="mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      <div
        ref={listRef}
        id={id}
        role="listbox"
        aria-label="Advisor commands"
        className="max-h-[min(20rem,45svh)] overflow-y-auto py-1.5"
      >
        {grouped.map(({ group, rows }) => (
          <div key={group} className="px-1.5 py-1">
            <div className="px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {COMMAND_GROUP_LABEL[group]}
            </div>
            {rows.map(({ command, index }) => (
              <button
                key={`${group}-${command.id}`}
                type="button"
                role="option"
                id={`${id}-opt-${index}`}
                data-index={index}
                aria-selected={index === activeIndex}
                // onMouseDown, not onClick: the textarea must not lose focus,
                // and a click fires after blur has already closed the palette.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(command);
                }}
                onMouseEnter={() => onHover(index)}
                className={cn(
                  "flex w-full items-baseline gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  index === activeIndex ? "bg-secondary" : "hover:bg-secondary/50",
                )}
              >
                <span className="shrink-0 font-display text-[13px] font-semibold tracking-tight text-foreground">
                  /{command.id}
                </span>
                {command.argHint && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground/70">
                    {command.argHint}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-relaxed text-muted-foreground">
                  {command.summary}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        ↑↓ to move · ↵ to run · esc to dismiss
      </div>
    </motion.div>
  );
}
