import { memo, useState } from "react";
import { mmss, useFocusTimer } from "./focus";
import { usePlan } from "./plan";
import { useSound } from "./audio";
import { daysUntil, useLive } from "./live";
import { STATIONS, type HotspotId, type StationId } from "./stage";

/*
 * The index: the dashboard at a glance, down the left edge of the room.
 *
 * One line per station, each with the one number that matters there, so the
 * room answers "how am I doing" without a click. Hovering a line traces its
 * object in the room; clicking it (or its number key) flies the camera there.
 * On a phone it becomes a strip along the bottom.
 */

function useMeta(): Record<StationId, string> {
  const t = useFocusTimer();
  const items = usePlan();
  const s = useSound();
  const { ready, d, deadlines, classesToday, hasTimetable, week } = useLive();
  const filled = items.filter((i) => i.text.trim());
  const next = deadlines[0];
  return {
    laptop: t.state === "running" || t.state === "paused" ? mmss(t.remaining) : t.state === "done" ? "Done" : `${t.minutes} min`,
    board: filled.length ? `${filled.filter((i) => i.done).length}/${filled.length}` : "Empty",
    clock: !ready
      ? ""
      : classesToday.length
        ? `${classesToday.length} ${classesToday.length === 1 ? "class" : "classes"}`
        : next
          ? `${daysUntil(next.date)}d to go`
          : hasTimetable
            ? "Free day"
            : "",
    pinboard: ready && d ? (d.colleges.length ? `${d.colleges.length} schools` : "None yet") : "",
    compass: ready && d ? `${Math.round(d.overall)} / 100` : "",
    shelves: "",
    reader: "",
    notebook: week && !week.loading ? (week.current ? "Filed" : "Due") : "",
    cassette: s.kind === "off" ? "Off" : s.kind === "rain" ? "Rain" : "Brown",
    window: "4-4-4-4",
  };
}

const FOLD_KEY = "pf-zen-index-folded";

function readFolded() {
  try {
    return localStorage.getItem(FOLD_KEY) === "1";
  } catch {
    return false;
  }
}

export const StationIndex = memo(function StationIndex({
  active,
  visible,
  stripVisible,
  onGo,
  onHover,
}: {
  active: StationId | null;
  visible: boolean;
  /** The phone strip hides in a close-up, where the panel takes the bottom. */
  stripVisible: boolean;
  onGo: (id: StationId) => void;
  onHover: (id: HotspotId | null) => void;
}) {
  const meta = useMeta();
  // Folded, the index is just its header: the room with nothing over it.
  const [folded, setFolded] = useState(readFolded);
  const fold = () =>
    setFolded((f) => {
      try {
        localStorage.setItem(FOLD_KEY, f ? "0" : "1");
      } catch {
        /* private mode: remembered for this visit only */
      }
      return !f;
    });
  return (
    <>
      <nav
        aria-label="Stations"
        className="zen-index pointer-events-auto absolute left-4 top-1/2 hidden w-[224px] -translate-y-1/2 md:block lg:left-6"
        data-in={visible || undefined}
        onPointerLeave={() => onHover(null)}
      >
        <div
          className="zen-mono flex items-center justify-between px-3 py-1.5 text-[11px] uppercase text-[color:var(--zen-mute)]"
          style={{ borderBottom: folded ? "0" : "1px solid var(--zen-line)" }}
        >
          <span>Stations{folded ? "" : " / keys 1-0"}</span>
          <button type="button" className="zen-btn -mr-1.5 text-[11px]" onClick={fold} aria-expanded={!folded}>
            [{folded ? "Show" : "Hide"}]
          </button>
        </div>
        <ol className="px-3 py-1.5" hidden={folded}>
          {STATIONS.map((s, i) => {
            const on = active === s.id;
            return (
              <li key={s.id} style={{ transitionDelay: visible ? `${i * 28}ms` : "0ms" }}>
                <button
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => onGo(s.id)}
                  onPointerEnter={() => onHover(s.id)}
                  onFocus={() => onHover(s.id)}
                  onBlur={() => onHover(null)}
                  className="zen-index-row zen-mono flex w-full items-baseline gap-3 py-[5px] text-left text-[12px]"
                >
                  <span className="w-4 shrink-0 tabular-nums text-[color:var(--zen-mute)]">{s.key}</span>
                  <span className="zen-index-name shrink-0">{s.title}</span>
                  <span className="zen-index-rule min-w-2 flex-1" aria-hidden />
                  <span className="shrink-0 tabular-nums text-[color:var(--zen-mute)]">{meta[s.id]}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <nav
        aria-label="Stations"
        className="zen-strip pointer-events-auto absolute inset-x-0 bottom-[72px] flex gap-1 overflow-x-auto px-4 md:hidden"
        data-in={stripVisible || undefined}
      >
        {STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={active === s.id || undefined}
            onClick={() => onGo(s.id)}
            className="zen-mono shrink-0 whitespace-nowrap border border-[color:var(--zen-line)] bg-[color:var(--zen-panel)] px-3 py-2 text-[12px]"
          >
            {s.title}
            {meta[s.id] && <span className="ml-2 text-[color:var(--zen-mute)]">{meta[s.id]}</span>}
          </button>
        ))}
      </nav>
    </>
  );
});
