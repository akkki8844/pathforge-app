/**
 * The ribbon's parts.
 *
 * A word processor's toolbar is forty controls that must stay legible at a
 * glance, so they are built from four shapes and nothing else: a square icon
 * button, a labelled group, a dropdown, and a popover that asks for one thing.
 * Keeping them here leaves `Ribbon.tsx` as a readable list of what the editor
 * can do.
 *
 * Buttons carry a native `title` rather than a tooltip component. There are
 * enough of them that forty portals would be forty subscriptions to mouse
 * movement, and the browser's own tooltip is the one a student already knows
 * how to dismiss.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ── Frames ─────────────────────────────────────────────────────────── */

/** A ribbon group: its controls, with the group's name under them. */
export function Group({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-col items-center gap-1 px-2.5", className)}>
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/** A vertical rule between two groups. */
export function GroupDivider() {
  return <div className="my-1 w-px shrink-0 self-stretch bg-border/70" />;
}

/** A row inside a group, for controls stacked two-high. */
export function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

/* ── Controls ───────────────────────────────────────────────────────── */

export function Tool({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // The editor loses the selection to any control that takes focus, so no
      // control in the ribbon does: the press happens on mousedown-prevented
      // buttons and the caret stays where the student left it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/75 transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-35",
        active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** A labelled button, for actions whose icon alone would not say enough. */
export function WideTool({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-foreground/80 transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-35",
        active && "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {label}
    </button>
  );
}

export function Dropdown({
  value,
  onValue,
  options,
  width = 132,
  title,
  onRefocus,
}: {
  value: string;
  onValue: (value: string) => void;
  options: { value: string; label: string; style?: React.CSSProperties }[];
  width?: number;
  title: string;
  /** Called after the menu closes, to put the caret back in the document. */
  onRefocus?: () => void;
}) {
  return (
    <Select value={value} onValueChange={onValue}>
      <SelectTrigger
        title={title}
        aria-label={title}
        className="h-8 gap-1 border-border/70 bg-background px-2 text-[12.5px]"
        style={{ width }}
      >
        <SelectValue />
      </SelectTrigger>
      {/*
        Radix hands focus back to the trigger when the menu closes, which takes
        it off the document: the next thing typed goes to a button, and on a
        button Radix reads letters as its own type-ahead — so typing after
        choosing a heading silently changed the heading again. The document
        asks for it back instead.
      */}
      <SelectContent
        className="max-h-[320px]"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} style={option.style}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ── Colour ─────────────────────────────────────────────────────────── */

/** Word's palette: greys across the top, then a row of ordinary colours. */
const SWATCHES = [
  "#000000", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8", "#ffffff",
  "#b91c1c", "#ea580c", "#ca8a04", "#15803d", "#0e7490", "#1d4ed8",
  "#6d28d9", "#be185d", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#fca5a5", "#fed7aa",
];

export function ColorPicker({
  icon: Icon,
  label,
  value,
  onPick,
  onClear,
  clearLabel,
  onRefocus,
}: {
  icon: LucideIcon;
  label: string;
  /** The bar under the icon, so the current colour is visible without opening. */
  value: string | null;
  onPick: (color: string) => void;
  onClear: () => void;
  clearLabel: string;
  onRefocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const custom = useRef<HTMLInputElement | null>(null);

  /*
   * The colour input reports every colour the pointer passes over inside the
   * operating system's picker, and React calls all of them `change`. Applying
   * each one would put forty steps in the undo stack for one choice, so the
   * live ones only tint the swatch, and the document is changed on the input's
   * own `change` event — the one that means "chosen".
   */
  useEffect(() => {
    const element = custom.current;
    if (!element) return;
    const commit = () => {
      setDraft(null);
      onPick(element.value);
    };
    element.addEventListener("change", commit);
    return () => element.removeEventListener("change", commit);
  }, [onPick, open]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDraft(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className="flex flex-col items-center gap-0.5">
            <Icon className="h-4 w-4" />
            <span
              className="h-[3px] w-4 rounded-full border border-border/50"
              style={{ background: draft ?? value ?? "transparent" }}
            />
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[212px] p-2.5"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        <div className="grid grid-cols-6 gap-1.5">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              title={swatch}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onPick(swatch);
                setOpen(false);
              }}
              className={cn(
                "h-6 w-6 rounded-[5px] border border-border/60 transition-transform hover:scale-110",
                value?.toLowerCase() === swatch && "ring-2 ring-primary ring-offset-1",
              )}
              style={{ background: swatch }}
            />
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2 border-t border-border/60 pt-2.5">
          <label className="flex flex-1 cursor-pointer items-center gap-2 text-[12.5px] text-muted-foreground">
            <input
              ref={custom}
              type="color"
              value={draft ?? value ?? "#000000"}
              onChange={(event) => setDraft(event.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-border/60 bg-transparent p-0"
            />
            Custom
          </label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            {clearLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Table ──────────────────────────────────────────────────────────── */

/** The drag-a-grid table picker, up to 8 × 10. */
export function TablePicker({
  icon: Icon,
  onInsert,
  onRefocus,
}: {
  icon: LucideIcon;
  onInsert: (rows: number, cols: number) => void;
  onRefocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  const rows = 8;
  const cols = 10;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert table"
          aria-label="Insert table"
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-2.5"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${cols}, 16px)` }}
          onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const row = Math.floor(i / cols) + 1;
            const col = (i % cols) + 1;
            const on = row <= hover.rows && col <= hover.cols;
            return (
              <button
                key={i}
                type="button"
                aria-label={`${row} by ${col}`}
                onMouseEnter={() => setHover({ rows: row, cols: col })}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onInsert(row, col);
                  setOpen(false);
                }}
                className={cn(
                  "h-4 w-4 rounded-[2px] border transition-colors",
                  on ? "border-primary bg-primary/30" : "border-border/70 bg-muted/40",
                )}
              />
            );
          })}
        </div>
        <p className="mt-2 text-center text-[12px] tabular-nums text-muted-foreground">
          {hover.rows ? `${hover.rows} × ${hover.cols}` : "Drag to size"}
        </p>
      </PopoverContent>
    </Popover>
  );
}

/* ── Link ───────────────────────────────────────────────────────────── */

export function LinkPopover({
  icon: Icon,
  href,
  onApply,
  onRemove,
  open: openProp,
  onOpenChange,
  onRefocus,
}: {
  icon: LucideIcon;
  href: string;
  onApply: (href: string) => void;
  onRemove: () => void;
  /** Controlled, so Ctrl+K can open it from inside the document. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRefocus?: () => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = openProp ?? uncontrolled;
  const [value, setValue] = useState(href);

  const setOpen = (next: boolean) => {
    setUncontrolled(next);
    onOpenChange?.(next);
    if (next) setValue(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Link (Ctrl+K)"
          aria-label="Link"
          onMouseDown={(event) => event.preventDefault()}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground",
            href && "bg-primary/15 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] p-3"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApply(value.trim());
            setOpen(false);
          }}
        >
          <label className="text-[12px] font-medium text-muted-foreground" htmlFor="pf-link">
            Address
          </label>
          <Input
            id="pf-link"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://"
            className="mt-1 h-8 text-[13px]"
          />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px]"
              disabled={!href}
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
            >
              Remove
            </Button>
            <Button type="submit" size="sm" className="h-7 px-3 text-[12px]">
              Apply
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/* ── Image ──────────────────────────────────────────────────────────── */

export function ImagePopover({
  icon: Icon,
  onFile,
  onUrl,
  onRefocus,
}: {
  icon: LucideIcon;
  onFile: (file: File) => void;
  onUrl: (url: string) => void;
  onRefocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Insert picture"
          aria-label="Insert picture"
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] p-3"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 w-full text-[12.5px]"
          onClick={() => input.current?.click()}
        >
          Choose a picture…
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            onFile(file);
            setOpen(false);
          }}
        />
        <div className="my-2.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border/70" />
          or
          <span className="h-px flex-1 bg-border/70" />
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const url = value.trim();
            if (!url) return;
            onUrl(url);
            setValue("");
            setOpen(false);
          }}
        >
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Paste an image address"
            className="h-8 text-[13px]"
          />
          <Button type="submit" size="sm" className="mt-2 h-7 w-full text-[12px]">
            Insert
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/* -- Menu ------------------------------------------------------------ */

/** A button that opens a short list of actions - Word's small split menus. */
export function MenuButton({
  icon: Icon,
  label,
  items,
  width = 216,
  onRefocus,
}: {
  icon: LucideIcon;
  label: string;
  items: { label: string; hint?: string; preview?: string; onSelect: () => void }[];
  width?: number;
  onRefocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-1"
        style={{ width }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              item.onSelect();
              setOpen(false);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span>{item.preview ?? item.label}</span>
            {item.hint && (
              <span className="shrink-0 text-[11px] text-muted-foreground">{item.hint}</span>
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* -- Symbols --------------------------------------------------------- */

/**
 * The characters a keyboard has no key for.
 *
 * Not a Unicode browser - the handful an essay actually needs: the dashes and
 * quotes typography wants, the signs maths and science want, the marks a
 * citation wants, and the currencies.
 */
const SYMBOL_GROUPS: { label: string; glyphs: string[] }[] = [
  {
    label: "Punctuation",
    glyphs: ["—", "–", "…", "•", "·", "§", "¶", "†", "‡", "‹", "›", "«", "»", "“", "”", "‘", "’", " "],
  },
  {
    label: "Maths",
    glyphs: ["×", "÷", "±", "≈", "≠", "≤", "≥", "√", "∑", "∞", "π", "°", "′", "″", "½", "¼", "¾", "²"],
  },
  {
    label: "Letters",
    glyphs: ["α", "β", "γ", "δ", "θ", "λ", "μ", "σ", "φ", "ω", "Δ", "Ω", "é", "è", "ü", "ñ", "ç", "å"],
  },
  {
    label: "Marks",
    glyphs: ["©", "®", "™", "→", "←", "↔", "⇒", "★", "☆", "✓", "✗", "€", "£", "¥", "¢", "₹", "№", "‰"],
  },
];

export function SymbolPicker({
  icon: Icon,
  onInsert,
  onRefocus,
}: {
  icon: LucideIcon;
  onInsert: (glyph: string) => void;
  onRefocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Symbol"
          aria-label="Symbol"
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Icon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[300px] p-2.5"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRefocus?.();
        }}
      >
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </p>
            <div className="grid grid-cols-9 gap-1">
              {group.glyphs.map((glyph) => (
                <button
                  key={glyph}
                  type="button"
                  title={glyph === " " ? "Non-breaking space" : glyph}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onInsert(glyph);
                    setOpen(false);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/50 text-[13px] transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {glyph === " " ? "␣" : glyph}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
