/**
 * The ruler.
 *
 * A word processor puts one above the page because indentation is a measured
 * thing, and a measurement wants a scale next to it. It shows where the
 * margins are, an inch scale counted from the text column, and the two markers
 * Word puts there: the first line of the paragraph, and the rest of it.
 *
 * It is drawn in the page's own pixels, scaled by the zoom, so a marker is
 * always exactly above the text it controls. The ticks themselves are not
 * scaled — at 50% a scaled ruler is unreadable, and the numbers on it are the
 * whole point.
 *
 * Dragging a marker moves a preview; the document is changed once, when the
 * mouse is let go. Setting the indent on every mouse move would make one drag
 * fifty entries in the undo stack.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { INDENT_STEP } from "./extensions";
import type { PageBox } from "@/lib/documents/page";
import { cn } from "@/lib/utils";

/** 96dpi: an inch of paper. */
const INCH = 96;
/** Markers snap to an eighth of an inch, as Word's do. */
const SNAP = INCH / 8;
/** How far a block may be pushed in, in px. */
const MAX_INDENT = INDENT_STEP * 5;

type Marker = "first" | "left";

export interface RulerProps {
  editor: Editor;
  box: PageBox;
  zoom: number;
}

export function Ruler({ editor, box, zoom }: RulerProps) {
  const rail = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ marker: Marker; value: number } | null>(null);

  const attributes = editor.isActive("heading")
    ? editor.getAttributes("heading")
    : editor.isActive("blockquote")
      ? editor.getAttributes("blockquote")
      : editor.getAttributes("paragraph");

  const indent = Number(attributes.indent ?? 0) || 0;
  const firstLine = Number(attributes.firstLine ?? 0) || 0;

  const shown = {
    left: drag?.marker === "left" ? drag.value : indent,
    first: drag?.marker === "first" ? drag.value : indent + firstLine,
  };

  /** Where the pointer is, in page px measured from the text column's edge. */
  const readAt = useCallback(
    (clientX: number) => {
      const rect = rail.current?.getBoundingClientRect();
      if (!rect) return 0;
      const inPage = (clientX - rect.left) / (zoom || 1) - box.padX;
      return Math.round(inPage / SNAP) * SNAP;
    },
    [box.padX, zoom],
  );

  const start = (marker: Marker) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    // Capture keeps the marker following the pointer past the ruler's edge.
    // A pointer the browser has already forgotten cannot be captured, and that
    // is not a reason to refuse the drag.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* Nothing to capture; the window listeners still end the drag. */
    }
    setDrag({ marker, value: marker === "left" ? indent : indent + firstLine });
  };

  const moveTo = (marker: Marker, value: number) =>
    setDrag({
      marker,
      value:
        marker === "left"
          ? Math.max(0, Math.min(MAX_INDENT, value))
          : // The first line may hang to the left of the paragraph, which is
            // how a bibliography entry is set.
            Math.max(-INDENT_STEP, Math.min(MAX_INDENT, value)),
    });

  /*
   * The drag is read from a ref rather than from inside a state updater.
   * React may run an updater while it is rendering, and a transaction
   * dispatched from there updates the editor — and so the page around it —
   * mid-render, which React reports as "cannot update a component while
   * rendering a different component".
   */
  const held = useRef(drag);
  held.current = drag;

  const commit = useCallback(() => {
    const current = held.current;
    if (!current) return;
    held.current = null;
    setDrag(null);
    const chain = editor.chain().focus();
    if (current.marker === "left") {
      // The first line keeps its distance from the paragraph, as in Word.
      chain.setBlockIndent(current.value).run();
    } else {
      chain.setFirstLineIndent(current.value - indent).run();
    }
  }, [editor, indent]);

  /* A drag that ends outside the marker — or outside the window — still ends. */
  useEffect(() => {
    if (!drag) return;
    const up = () => commit();
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, commit]);

  const ticks: { at: number; size: "inch" | "half" | "eighth"; label?: string }[] = [];
  const minorsFit = SNAP * zoom >= 7;
  for (let at = 0; at <= box.width; at += SNAP) {
    const fromMargin = at - box.padX;
    const onInch = Math.abs(fromMargin % INCH) < 0.5;
    const onHalf = Math.abs(Math.abs(fromMargin % INCH) - INCH / 2) < 0.5;
    if (onInch) {
      const inches = Math.round(Math.abs(fromMargin) / INCH);
      ticks.push({ at, size: "inch", label: inches ? String(inches) : undefined });
    } else if (onHalf) {
      ticks.push({ at, size: "half" });
    } else if (minorsFit) {
      ticks.push({ at, size: "eighth" });
    }
  }

  return (
    <div
      ref={rail}
      className="pf-ruler relative mx-auto h-[22px] select-none rounded-[2px] border border-border/50 bg-background"
      style={{ width: box.width * zoom }}
      aria-hidden={false}
    >
      {/* The margins, as the paper's unusable edges. */}
      <div
        className="absolute inset-y-0 left-0 bg-muted/70"
        style={{ width: box.padX * zoom }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-muted/70"
        style={{ width: box.padX * zoom }}
      />

      {ticks.map((tick) => (
        <div
          key={tick.at}
          className={cn(
            "absolute w-px bg-foreground/25",
            tick.size === "inch" ? "top-[5px] h-[6px]" : tick.size === "half" ? "top-[8px] h-[5px]" : "top-[10px] h-[3px]",
          )}
          style={{ left: tick.at * zoom }}
        >
          {tick.label && (
            <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 text-[8.5px] leading-none tabular-nums text-muted-foreground">
              {tick.label}
            </span>
          )}
        </div>
      ))}

      <Handle
        kind="first"
        label="First line indent"
        at={(box.padX + shown.first) * zoom}
        value={shown.first}
        dragging={drag?.marker === "first"}
        onPointerDown={start("first")}
        onPointerMove={(event) =>
          drag?.marker === "first" && moveTo("first", readAt(event.clientX))
        }
        onStep={(delta) => {
          moveTo("first", shown.first + delta * SNAP);
        }}
        onCommit={commit}
      />
      <Handle
        kind="left"
        label="Left indent"
        at={(box.padX + shown.left) * zoom}
        value={shown.left}
        dragging={drag?.marker === "left"}
        onPointerDown={start("left")}
        onPointerMove={(event) => drag?.marker === "left" && moveTo("left", readAt(event.clientX))}
        onStep={(delta) => moveTo("left", shown.left + delta * SNAP)}
        onCommit={commit}
      />

      {/* The right margin is where the line ends; it is shown, not moved. */}
      <div
        className="absolute bottom-[3px] h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-foreground/30"
        style={{ left: (box.width - box.padX) * zoom - 5 }}
      />
    </div>
  );
}

function Handle({
  kind,
  label,
  at,
  value,
  dragging,
  onPointerDown,
  onPointerMove,
  onStep,
  onCommit,
}: {
  kind: Marker;
  label: string;
  at: number;
  value: number;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onStep: (delta: 1 | -1) => void;
  onCommit: () => void;
}) {
  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round((value / INCH) * 100) / 100}
      aria-valuetext={`${(value / INCH).toFixed(2)} inches`}
      title={`${label} — ${(value / INCH).toFixed(2)}"`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onCommit}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        onStep(event.key === "ArrowRight" ? 1 : -1);
      }}
      onKeyUp={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") onCommit();
      }}
      className={cn(
        "absolute h-0 w-0 cursor-ew-resize border-l-[6px] border-r-[6px] border-l-transparent border-r-transparent",
        kind === "first"
          ? "top-[1px] border-t-[7px] border-t-foreground/55"
          : "bottom-[1px] border-b-[7px] border-b-foreground/55",
        dragging && (kind === "first" ? "border-t-primary" : "border-b-primary"),
      )}
      style={{ left: at - 6 }}
    />
  );
}
