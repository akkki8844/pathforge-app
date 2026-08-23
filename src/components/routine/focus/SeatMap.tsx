/**
 * The seat map.
 *
 * The step that turns booking from a form into a journey. Choosing a seat is
 * the last thing you do before a real flight becomes yours, and it is the only
 * point in this flow where the student touches the aircraft itself rather than
 * a map or a card.
 *
 * It carries real weight beyond theatre: the seat is where the session's
 * *category* is chosen. Tapping a seat opens the question the whole flight
 * exists to answer — what are you actually doing for the next 45 minutes — so
 * the answer is attached to a place on the plane rather than buried in a
 * dropdown three steps earlier.
 *
 * The cabin is drawn, not photographed: a fuselage outline in CSS, a 2-2 seat
 * grid, row numbers down the aisle. Narrowbody layout with A/C and D/F, which
 * is what makes "18F" read as a window seat to anyone who has flown.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EASE_OUT_EXPO } from "@/lib/motion";
import type { FocusIntent } from "@/lib/focus-flight/flight";

/**
 * What a student can be doing up there.
 *
 * Each maps onto one of the four intents the rest of the feature already
 * files sessions under, so a richer vocabulary here does not fork the data
 * model — `Read` and `Deep work` are both study-shaped, and both land in the
 * same column of `routine_focus_sessions`.
 */
export interface FocusCategory {
  key: string;
  label: string;
  intent: FocusIntent;
  /** Tailwind classes for the chip. One hue each, tinted not saturated. */
  tint: string;
  glyph: string;
}

export const FOCUS_CATEGORIES: FocusCategory[] = [
  { key: "focus", label: "Focus", intent: "study", tint: "bg-amber-400/15 text-amber-200 ring-amber-300/25", glyph: "✻" },
  { key: "work", label: "Work", intent: "work", tint: "bg-sky-400/15 text-sky-200 ring-sky-300/25", glyph: "▤" },
  { key: "meditate", label: "Meditate", intent: "review", tint: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/25", glyph: "✦" },
  { key: "read", label: "Read", intent: "study", tint: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/25", glyph: "▥" },
  { key: "exercise", label: "Exercise", intent: "work", tint: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/25", glyph: "↻" },
];

const ROWS = Array.from({ length: 22 }, (_, i) => i + 1);
const LEFT = ["A", "C"] as const;
const RIGHT = ["D", "F"] as const;

/** Seats already flown, so the cabin fills up as a term goes on. */
export function SeatMap({
  takenSeats,
  onConfirm,
  onBack,
}: {
  takenSeats?: Set<string>;
  onConfirm: (seat: string, category: FocusCategory) => void;
  onBack: () => void;
}) {
  const [seat, setSeat] = useState<string | null>(null);
  const [category, setCategory] = useState<FocusCategory | null>(null);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#0a0b0d]">
      {/* Fuselage ------------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-40 pt-4">
        <div className="mx-auto w-full max-w-[19rem]">
          {/* Nose. A rounded cap, so the grid below reads as inside an
              aircraft rather than as a spreadsheet. */}
          <div
            className="mx-auto h-24 w-full rounded-t-[100%] border-x border-t border-white/[0.07] bg-white/[0.02]"
            aria-hidden="true"
          />

          <div className="rounded-b-3xl border-x border-b border-white/[0.07] bg-white/[0.02] px-3 pb-6 pt-2">
            {/* Column letters */}
            <div className="mb-2 grid grid-cols-[1fr_2.25rem_1fr] items-center gap-2 px-1">
              <div className="grid grid-cols-2 gap-2">
                {LEFT.map((l) => (
                  <span key={l} className="text-center text-[10px] font-medium text-white/25">
                    {l}
                  </span>
                ))}
              </div>
              <span />
              <div className="grid grid-cols-2 gap-2">
                {RIGHT.map((l) => (
                  <span key={l} className="text-center text-[10px] font-medium text-white/25">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {ROWS.map((row) => (
                <div key={row} className="grid grid-cols-[1fr_2.25rem_1fr] items-center gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {LEFT.map((l) => (
                      <Seat
                        key={l}
                        id={`${row}${l}`}
                        selected={seat === `${row}${l}`}
                        taken={takenSeats?.has(`${row}${l}`)}
                        category={seat === `${row}${l}` ? category : null}
                        onSelect={(id) => {
                          setSeat(id);
                          setCategory(null);
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-center font-sans text-[11px] tabular-nums text-white/30">
                    {String(row).padStart(2, "0")}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {RIGHT.map((l) => (
                      <Seat
                        key={l}
                        id={`${row}${l}`}
                        selected={seat === `${row}${l}`}
                        taken={takenSeats?.has(`${row}${l}`)}
                        category={seat === `${row}${l}` ? category : null}
                        onSelect={(id) => {
                          setSeat(id);
                          setCategory(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category sheet ------------------------------------------------- */}
      <AnimatePresence>
        {seat && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4"
          >
            <div className="pointer-events-auto mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/85 p-4 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <p className="text-xs text-white/45">Seat {seat}</p>
              <p className="mt-0.5 text-base font-semibold text-white">
                What do you want to focus on?
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {FOCUS_CATEGORIES.map((c) => {
                  const active = category?.key === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition-all",
                        c.tint,
                        active ? "scale-[1.03] ring-2 ring-white/60" : "hover:brightness-125",
                      )}
                    >
                      <span aria-hidden="true">{c.glyph}</span>
                      {c.label}
                    </button>
                  );
                })}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/35 ring-1 ring-white/10">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  className="text-white/55 hover:bg-white/5 hover:text-white"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={!category}
                  onClick={() => seat && category && onConfirm(seat, category)}
                  className="flex-1 rounded-full bg-white text-slate-950 hover:bg-white/90"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!seat && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-center">
          <p className="text-sm text-white/40">Pick a seat to choose what this flight is for.</p>
        </div>
      )}
    </div>
  );
}

function Seat({
  id,
  selected,
  taken,
  category,
  onSelect,
}: {
  id: string;
  selected: boolean;
  taken?: boolean;
  category: FocusCategory | null;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-label={`Seat ${id}`}
      aria-pressed={selected}
      className={cn(
        "flex aspect-square w-full items-center justify-center rounded-lg text-[11px] transition-all",
        selected
          ? "bg-flight-yellow text-slate-950 shadow-[0_0_0_2px_hsl(52_96%_56%/0.35)]"
          : taken
            ? "bg-white/[0.14] text-white/30"
            : "bg-white/[0.055] text-transparent hover:bg-white/[0.11]",
      )}
    >
      {selected ? (
        category ? (
          <span aria-hidden="true">{category.glyph}</span>
        ) : (
          <Check className="h-3 w-3" aria-hidden="true" />
        )
      ) : null}
    </button>
  );
}
