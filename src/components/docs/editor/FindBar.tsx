/**
 * Find and replace, as a bar rather than a dialog.
 *
 * A dialog covers the document it is searching, which is exactly the wrong
 * place to put it; every editor that has learned this puts the controls in a
 * strip above the text. Enter steps forward, Shift+Enter back, Escape closes —
 * and closing clears the highlights, because leaving the document tinted
 * yellow after the search is over is a bug people report as "stuck".
 */

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { CaseSensitive, ChevronDown, ChevronUp, WholeWord, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FindBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const field = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  useEffect(() => {
    editor.commands.setSearch({ term, replacement, caseSensitive, wholeWord });
  }, [editor, term, replacement, caseSensitive, wholeWord]);

  useEffect(() => () => void editor.commands.clearSearch(), [editor]);

  const storage = editor.storage.searchReplace as { total: number; index: number };
  const total = storage?.total ?? 0;
  const index = storage?.index ?? -1;

  const step = (delta: number) => editor.commands.goToMatch(delta);

  const replaceEvery = () => {
    const count = total;
    if (!editor.commands.replaceAll()) return;
    // Word says how many it changed, and so should this: "replace all" with
    // nothing visible happening is the moment a student stops trusting it.
    toast({
      title: `Replaced ${count} ${count === 1 ? "match" : "matches"}`,
      description: replacement ? `"${term}" is now "${replacement}"` : `"${term}" was removed`,
    });
    field.current?.focus();
  };

  const replaceOne = () => {
    // Two runs, not one chain: the second command has to see the document the
    // first one produced, and a chain shares a single transaction.
    editor.commands.replaceCurrent();
    editor.commands.goToMatch(0);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Input
          ref={field}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              step(event.shiftKey ? -1 : 1);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder="Find"
          aria-label="Find"
          className="h-8 w-[180px] text-[13px]"
        />
        <span className="w-[74px] shrink-0 text-[12px] tabular-nums text-muted-foreground">
          {total ? `${index + 1} of ${total}` : term ? "No matches" : ""}
        </span>
        <Toggle
          icon={CaseSensitive}
          label="Match case"
          on={caseSensitive}
          onClick={() => setCaseSensitive((value) => !value)}
        />
        <Toggle
          icon={WholeWord}
          label="Whole words only"
          on={wholeWord}
          onClick={() => setWholeWord((value) => !value)}
        />
        <Toggle
          icon={ChevronUp}
          label="Previous match"
          disabled={!total}
          onClick={() => step(-1)}
        />
        <Toggle icon={ChevronDown} label="Next match" disabled={!total} onClick={() => step(1)} />
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              replaceOne();
            }
            if (event.key === "Escape") onClose();
          }}
          placeholder="Replace with"
          aria-label="Replace with"
          className="h-8 w-[180px] text-[13px]"
        />
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2.5 text-[12.5px]"
          disabled={!total}
          onMouseDown={(event) => event.preventDefault()}
          onClick={replaceOne}
        >
          Replace
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2.5 text-[12.5px]"
          disabled={!total}
          onMouseDown={(event) => event.preventDefault()}
          onClick={replaceEvery}
        >
          Replace all
        </Button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close find and replace"
        className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  on,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      // The find field keeps the focus: a student who clicks "next" and then
      // presses Enter means "next again", not "press this button again".
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/75 transition-colors",
        "hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-35",
        on && "bg-primary/15 text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
