import { memo, useEffect, useRef, useState } from "react";
import { List } from "lucide-react";
import { mmss, useFocusTimer } from "./focus";
import { usePlan } from "./plan";
import { useSound } from "./audio";
import { daysUntil, useLive } from "./live";
import { STATIONS, ZONES, type HotspotId, type StationId } from "./stage";

/*
 * The index: the whole app at a glance, down the left edge of the room.
 *
 * Grouped by the part of the room each station is in, one line per station
 * with the one number that matters there, so the room answers "how am I
 * doing" without a click. Hovering a line traces its object in the room;
 * clicking it (or its key) flies the camera there.
 *
 * In a close-up it folds to a rail of keys, so the object and its panel have
 * the screen, and opens again while the pointer is on it. On a phone it
 * becomes a strip along the bottom.
 */

function useMeta(): Record<StationId, string> {
  const t = useFocusTimer();
  const items = usePlan();
  const s = useSound();
  const { ready, d, deadlines, classesToday, hasTimetable, week, news, shelf, comms } = useLive();
  const filled = items.filter((i) => i.text.trim());
  const next = deadlines[0];
  const fresh = news.filter((n) => n.published_at && Date.now() - new Date(n.published_at).getTime() < 86_400_000).length;
  const waiting = comms.chats + comms.teams + comms.objectives;
  return {
    laptop: t.state === "running" || t.state === "paused" ? mmss(t.remaining) : t.state === "done" ? "Done" : `${t.minutes} min`,
    board: filled.length ? `${filled.filter((i) => i.done).length}/${filled.length}` : "Empty",
    notebook: ready && d ? `${d.essays.started} started` : "",
    phone: waiting ? `${waiting} new` : ready ? "Clear" : "",
    compass: ready && d ? `Lv ${d.currentLevel}` : "",
    clock: !ready
      ? ""
      : classesToday.length
        ? `${classesToday.length} ${classesToday.length === 1 ? "class" : "classes"}`
        : next
          ? `${daysUntil(next.date)}d to go`
          : hasTimetable
            ? "Free day"
            : "",
    calendar: week && !week.loading ? (week.current ? "Filed" : "Due") : "",
    pinboard: ready && d ? (d.colleges.length ? `${d.colleges.length} schools` : "None yet") : "",
    shelves: shelf.length ? `${shelf.length}${shelf.length >= 8 ? "+" : ""}` : "",
    books: "",
    trophy: ready && d ? `${d.portfolio.total}` : "",
    reader: fresh ? `${fresh} new` : news.length ? `${news.length}` : "",
    cassette: s.kind === "off" ? "Off" : s.kind === "rain" ? "Rain" : "Brown",
    window: "",
    door: "",
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
  // The full list is a sheet the rail opens: shown once as the HUD arrives so
  // it is found, then out of the way. The rail itself is only dots.
  const [open, setOpen] = useState(false);
  const peeked = useRef(false);
  useEffect(() => {
    if (!visible || peeked.current || readFolded()) return;
    peeked.current = true;
    setOpen(true);
    const id = window.setTimeout(() => setOpen(false), 3200);
    return () => window.clearTimeout(id);
  }, [visible]);
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(FOLD_KEY, "1");
      } catch {
        /* private mode */
      }
      return !o;
    });
  };
  const compact = active !== null;
  const sheet = open && !compact;
  let n = 0;
  return (
    <>
      <nav
        aria-label="Stations"
        className="zen-rail pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 md:block lg:left-5"
        data-in={visible || undefined}
        onPointerLeave={() => onHover(null)}
      >
        <div className="zen-rail-track pointer-events-auto">
          <button
            type="button"
            className="zen-rail-toggle"
            aria-expanded={sheet}
            aria-label={sheet ? "Hide the list of places" : "Show the list of places"}
            onClick={toggle}
          >
            <List aria-hidden />
          </button>
          {ZONES.map((z) => (
            <div key={z.id} className="zen-rail-zone" role="group" aria-label={z.title}>
              {STATIONS.filter((s) => s.zone === z.id).map((s) => {
                const on = active === s.id;
                const delay = n++ * 24;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-current={on || undefined}
                    aria-label={`${s.title}${meta[s.id] ? `, ${meta[s.id]}` : ""}`}
                    aria-keyshortcuts={s.key}
                    className="zen-dot"
                    style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
                    onClick={() => onGo(s.id)}
                    onPointerEnter={() => !compact && onHover(s.id)}
                    onFocus={() => !compact && onHover(s.id)}
                    onBlur={() => onHover(null)}
                  >
                    <span className="zen-dot-mark" />
                    <span className="zen-dot-label">
                      {s.title}
                      {meta[s.id] && <em>{meta[s.id]}</em>}
                      <kbd>{s.key}</kbd>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="zen-rail-sheet zen-panel pointer-events-none" data-open={sheet || undefined} aria-hidden={!sheet}>
          <div className="zen-index-head">
            <strong>Your study</strong>
            <span className="zen-label">Pick a place</span>
          </div>
          <div className="pb-2 pointer-events-auto">
            {ZONES.map((z) => (
              <div key={z.id}>
                <div className="zen-index-zone">{z.title}</div>
                <ol>
                  {STATIONS.filter((s) => s.zone === z.id).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        tabIndex={sheet ? 0 : -1}
                        aria-current={active === s.id || undefined}
                        onClick={() => onGo(s.id)}
                        onPointerEnter={() => onHover(s.id)}
                        className="zen-index-row w-full text-left"
                      >
                        <span className="zen-index-inner">
                          <span className="zen-key">{s.key}</span>
                          <span className="zen-index-name shrink-0">{s.title}</span>
                          <span className="zen-index-meta shrink-0">{meta[s.id]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </nav>
      <nav
        aria-label="Stations"
        className="zen-strip pointer-events-auto absolute inset-x-0 bottom-[76px] flex gap-1.5 overflow-x-auto px-4 md:hidden"
        data-in={stripVisible || undefined}
      >
        {STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-current={active === s.id || undefined}
            onClick={() => onGo(s.id)}
            className="zen-btn shrink-0"
          >
            {s.title}
            {meta[s.id] && <span className="font-medium text-[color:var(--zen-mute)]">{meta[s.id]}</span>}
          </button>
        ))}
      </nav>
    </>
  );
});
