import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCollegeNews } from "@/hooks/useCollegeNews";
import { useDocuments } from "@/hooks/useDocuments";
import { useUsage } from "@/contexts/UsageContext";
import { MORALE_MAX, MORALE_MIN, MORALE_WORDS, weekLabel, type WeeklyCheckinsData } from "@/hooks/useWeeklyCheckins";
import { TIER_LABELS } from "@/lib/collegeCalibration";
import { formatTime } from "@/lib/routine/dates";
import { focus, mmss, PRESETS, useFocusTimer } from "./focus";
import { LeaveContext } from "./leave";
import { plan, usePlan, PLAN_LINES } from "./plan";
import { sound, useSound, type SoundKind } from "./audio";
import { daysUntil, useLive } from "./live";
import { STATIONS, type StationId } from "./stage";

/*
 * The dashboard, one panel per station.
 *
 * Every number is the student's own, read from the same hooks the dashboard
 * page reads (see live.ts). A panel with nothing to show says so and says how
 * to fill it; nothing here is sampled or made up. Links that need the full
 * app leave Zen and go there, since the study covers every page.
 */


/* ------------------------------------------------------------- primitives */

function Panel({
  id,
  meta,
  children,
  wide,
}: {
  id: StationId;
  meta?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const i = STATIONS.findIndex((s) => s.id === id);
  const station = STATIONS[i];
  return (
    <section
      className={`zen-panel ${wide ? "w-[min(460px,calc(100vw-32px))]" : "w-[min(400px,calc(100vw-32px))]"} max-h-[min(640px,calc(100dvh-180px))] overflow-y-auto overscroll-contain`}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={station.title}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-[color:var(--zen-line)] px-4 py-3">
        <h2 className="flex items-baseline gap-3">
          <span className="zen-mono text-[11px] text-[color:var(--zen-mute)] tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">{station.title}</span>
        </h2>
        {meta && <span className="zen-mono truncate text-[11px] uppercase text-[color:var(--zen-mute)]">{meta}</span>}
      </header>
      <div className="zen-rise space-y-5 p-4">{children}</div>
    </section>
  );
}

function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="zen-mono mb-2 flex items-center justify-between gap-3 text-[11px] uppercase text-[color:var(--zen-mute)]">
      <span>{children}</span>
      {right && <span className="tabular-nums">{right}</span>}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <span className="block h-[2px] w-full bg-[color:var(--zen-line)]">
      <span
        className="zen-grow block h-full origin-left bg-[color:var(--zen-cobalt)]"
        style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }}
      />
    </span>
  );
}

function Big({ children, unit }: { children: ReactNode; unit?: string }) {
  return (
    <div className="zen-mono text-[40px] leading-none tabular-nums">
      {children}
      {unit && <span className="ml-2 text-[12px] uppercase text-[color:var(--zen-mute)]">{unit}</span>}
    </div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] leading-relaxed text-[color:var(--zen-mute)]">{children}</p>;
}

/** A way out of Zen to the page that owns the data. */
function Go({ to, children }: { to: string; children: ReactNode }) {
  const leave = useContext(LeaveContext);
  return (
    <button type="button" className="zen-btn -ml-1.5" onClick={() => leave(to)}>
      [{children}]
    </button>
  );
}

function Links({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-2 border-t border-[color:var(--zen-line)] pt-3">{children}</div>;
}

function Loading() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className="zen-shimmer block h-4" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}

const stop = (e: React.KeyboardEvent) => {
  // Typing stays in the field; Esc still steps back out.
  if (e.key !== "Escape") e.stopPropagation();
};

/* ------------------------------------------------------------------ focus */

export function FocusPanel() {
  const t = useFocusTimer();
  const running = t.state === "running";
  return (
    <Panel id="laptop" meta={`${t.sessionsToday} done today`}>
      <div>
        <div className="zen-mono text-[56px] leading-none tabular-nums">{t.state === "done" ? "Done" : mmss(t.remaining)}</div>
        <div className="mt-4">
          <Bar value={t.progress * 100} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className="zen-btn"
            aria-pressed={t.minutes === m}
            style={t.minutes === m ? { color: "var(--zen-cobalt)" } : undefined}
            onClick={() => focus.setMinutes(m)}
          >
            [{m} min]
          </button>
        ))}
        <span className="mx-1 h-3 w-px bg-[color:var(--zen-line)]" aria-hidden />
        <button type="button" className="zen-btn" onClick={() => (running ? focus.pause() : focus.start())}>
          [{running ? "Pause" : t.state === "paused" ? "Resume" : "Start"}]
        </button>
        <button type="button" className="zen-btn" onClick={() => focus.reset()}>
          [Reset]
        </button>
      </div>
      <div>
        <Label right={`${t.sessionsToday * t.minutes} min`}>Today</Label>
        <div className="flex flex-wrap gap-1.5" aria-label={`${t.sessionsToday} sessions finished today`}>
          {Array.from({ length: Math.max(4, t.sessionsToday + (running ? 1 : 0)) }, (_, i) => (
            <span
              key={i}
              className="h-2.5 w-6"
              style={{
                background:
                  i < t.sessionsToday
                    ? "var(--zen-cobalt)"
                    : i === t.sessionsToday && running
                      ? "rgba(95,130,255,0.45)"
                      : "var(--zen-line)",
              }}
            />
          ))}
        </div>
      </div>
      <Quiet>The timer keeps running if you leave Zen. It chimes when the session ends.</Quiet>
    </Panel>
  );
}

/* ------------------------------------------------------------------- plan */

const NOTES_KEY = "pf-zen-notes";

function Scratch() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(NOTES_KEY) ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(NOTES_KEY, text);
      } catch {
        /* private mode: kept for this visit */
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [text]);
  return (
    <div>
      <Label right={text.length ? `${text.length} / 2000` : undefined}>Scratch</Label>
      <textarea
        className="zen-input block h-24 w-full resize-none p-2 text-[13.5px] leading-relaxed"
        value={text}
        maxLength={2000}
        placeholder="Anything you need out of your head. Kept in this browser."
        aria-label="Scratch notes"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={stop}
      />
    </div>
  );
}

export function PlanPanel() {
  const items = usePlan();
  const filled = items.filter((i) => i.text.trim());
  const done = filled.filter((i) => i.done).length;
  return (
    <Panel id="board" meta={filled.length ? `${done} of ${filled.length} done` : "Five lines"}>
      <ul className="space-y-2">
        {items.slice(0, PLAN_LINES).map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <button
              type="button"
              aria-label={it.done ? `Mark line ${i + 1} not done` : `Mark line ${i + 1} done`}
              aria-pressed={it.done}
              disabled={!it.text.trim()}
              onClick={() => plan.toggle(i)}
              className="zen-check grid h-4 w-4 shrink-0 place-items-center border border-[color:var(--zen-line)] disabled:opacity-30"
            >
              <span className="h-2 w-2 bg-[color:var(--zen-cobalt)]" style={{ transform: `scale(${it.done ? 1 : 0})` }} />
            </button>
            <input
              className="zen-input w-full py-1.5 text-[14px]"
              style={it.done ? { textDecoration: "line-through", opacity: 0.55 } : undefined}
              value={it.text}
              maxLength={80}
              placeholder={i === 0 ? "The one thing that matters today" : ""}
              aria-label={`Plan line ${i + 1}`}
              onChange={(e) => plan.setText(i, e.target.value)}
              onKeyDown={stop}
            />
          </li>
        ))}
      </ul>
      <Scratch />
      <Quiet>Finished lines are wiped tomorrow; unfinished ones carry over.</Quiet>
    </Panel>
  );
}

/* ------------------------------------------------------------------ today */

const DAY = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
const SHORT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function TodayPanel() {
  const { ready, classesToday, hasTimetable, deadlines } = useLive();
  const next = deadlines[0];
  const later = deadlines.slice(1, 4);
  return (
    <Panel id="clock" meta={DAY.format(new Date())}>
      <div>
        <Label right={classesToday.length ? `${classesToday.length} ${classesToday.length === 1 ? "class" : "classes"}` : undefined}>
          Classes
        </Label>
        {!ready ? (
          <Loading />
        ) : classesToday.length ? (
          <ul className="divide-y divide-[color:var(--zen-line)]">
            {classesToday.slice(0, 7).map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-4 py-2 first:pt-0">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{c.subject}</span>
                  {c.location && <span className="block truncate text-[12px] text-[color:var(--zen-mute)]">{c.location}</span>}
                </span>
                <span className="zen-mono shrink-0 text-[12px] tabular-nums text-[color:var(--zen-mute)]">
                  {formatTime(c.start_time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Quiet>{hasTimetable ? "No classes today." : "No timetable yet. Add your week and today's classes show here."}</Quiet>
        )}
      </div>
      <div>
        <Label>Next deadline</Label>
        {!ready ? (
          <Loading />
        ) : next ? (
          <>
            <Big unit={daysUntil(next.date) === 1 ? "day" : "days"}>{daysUntil(next.date)}</Big>
            <p className="mt-2 truncate text-[14px] font-medium">{next.label}</p>
            <p className="text-[12px] text-[color:var(--zen-mute)]">{SHORT.format(next.date)}</p>
            {later.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {later.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate">{x.label}</span>
                    <span className="zen-mono shrink-0 text-[11px] tabular-nums text-[color:var(--zen-mute)]">
                      {daysUntil(x.date)}d
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <Quiet>No dates on file yet. Add your application year in your profile and the standard rounds appear here.</Quiet>
        )}
      </div>
      <Links>
        <Go to="/routine/timetable">Timetable</Go>
        <Go to="/requirements">Deadlines</Go>
      </Links>
    </Panel>
  );
}

/* --------------------------------------------------------------- colleges */

export function CollegesPanel() {
  const { ready, d } = useLive();
  const colleges = d?.colleges ?? [];
  return (
    <Panel id="pinboard" meta={colleges.length ? `${colleges.length} on your list` : undefined} wide>
      {!ready ? (
        <Loading />
      ) : colleges.length ? (
        <ul className="divide-y divide-[color:var(--zen-line)]">
          {colleges.map((c) => (
            <li key={c.name} className="py-2.5 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px] font-medium">{c.name}</span>
                <span className="zen-mono shrink-0 text-[11px] uppercase" style={{ color: c.fit === "Safety" || c.fit === "Match" ? "var(--zen-ink)" : "var(--zen-mute)" }}>
                  {c.fit}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="w-[112px] shrink-0 truncate text-[12px] text-[color:var(--zen-mute)]">{TIER_LABELS[c.tier]}</span>
                <Bar value={c.readinessIndex} />
                <span className="zen-mono w-7 shrink-0 text-right text-[11px] tabular-nums text-[color:var(--zen-mute)]">
                  {Math.round(c.readinessIndex)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Quiet>Nothing on your list yet. Add a few schools and the rest of Pathforge calibrates to them.</Quiet>
      )}
      <Quiet>The bar is your readiness against each school's admitted bar; 100 is at it.</Quiet>
      <Links>
        <Go to="/admissions-probability">Chances</Go>
        <Go to="/dashboard">Add schools</Go>
      </Links>
    </Panel>
  );
}

/* --------------------------------------------------------------- progress */

const PILLARS = [
  ["academics", "Academics"],
  ["activities", "Activities"],
  ["leadership", "Leadership"],
  ["competitions", "Competitions"],
  ["testPrep", "Test prep"],
] as const;

export function ProgressPanel() {
  const { ready, d } = useLive();
  if (!ready || !d)
    return (
      <Panel id="compass">
        <Loading />
      </Panel>
    );
  const peak = Math.max(1, ...d.momentum.map((w) => w.count));
  return (
    <Panel id="compass" meta={`Level ${d.currentLevel}`} wide>
      <div className="grid grid-cols-[auto_1fr] items-end gap-5">
        <div>
          <Label>Readiness</Label>
          <Big unit="/ 100">{Math.round(d.overall)}</Big>
        </div>
        <dl className="space-y-1.5">
          {PILLARS.map(([key, name]) => {
            const v = Math.round(d.pillars[key] ?? 0);
            return (
              <div key={key} className="flex items-center gap-2 text-[12px]">
                <dt className="w-[84px] shrink-0 truncate text-[color:var(--zen-mute)]">{name}</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  <Bar value={v} />
                  <span className="zen-mono w-6 shrink-0 text-right text-[11px] tabular-nums">{v}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div>
        <Label right={`${d.activeDays} active days / 12 weeks`}>Streak</Label>
        <div className="flex items-end gap-5">
          <Big unit={d.currentStreak === 1 ? "day" : "days"}>{d.currentStreak}</Big>
          <div
            role="img"
            aria-label={`Activity over the last ${d.momentum.length} weeks, up to ${peak} in a week.`}
            className="flex h-10 flex-1 items-end gap-[3px]"
          >
            {d.momentum.map((w, i) => (
              <span
                key={w.weekStart.toISOString()}
                className="zen-bar flex-1"
                style={{
                  height: `${Math.max(8, (w.count / peak) * 100)}%`,
                  background: w.count > 0 ? "var(--zen-cobalt)" : "var(--zen-line)",
                  animationDelay: `${120 + i * 25}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label right={d.totalEssaySections ? `${d.essays.started} of ${d.totalEssaySections}` : undefined}>Essays</Label>
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Started", d.essays.started],
            ["Refined", d.essays.refined],
            ["Words", d.essays.words.toLocaleString()],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-[12px] text-[color:var(--zen-mute)]">{k}</dt>
              <dd className="zen-mono mt-0.5 text-[18px] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Links>
        <Go to="/outcomes">Readiness</Go>
        <Go to="/journey">Journey</Go>
        <Go to="/essays">Essays</Go>
      </Links>
    </Panel>
  );
}

/* ---------------------------------------------------------------- library */

const AGO = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function since(iso: string | null): string {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "just now";
  if (h < 24) return AGO.format(-Math.round(h), "hour");
  return AGO.format(-Math.round(h / 24), "day");
}

export function LibraryPanel() {
  const { live: nodes, loading } = useDocuments();
  const { percentUsed, unlimited, periodLabel, getResetTime } = useUsage();
  const recent = useMemo(
    () =>
      nodes
        .filter((n) => n.kind !== "folder")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 4),
    [nodes],
  );
  const docs = nodes.filter((n) => n.kind === "doc").length;
  const files = nodes.filter((n) => n.kind === "file").length;
  return (
    <Panel id="shelves" meta={loading ? undefined : `${docs} docs / ${files} files`}>
      <div>
        <Label>Recent documents</Label>
        {loading ? (
          <Loading />
        ) : recent.length ? (
          <ul className="divide-y divide-[color:var(--zen-line)]">
            {recent.map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                <span className="truncate text-[14px]">{n.title}</span>
                <span className="zen-mono shrink-0 text-[11px] text-[color:var(--zen-mute)]">{since(n.updated_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Quiet>Nothing saved yet. Documents you write or upload in Pathforge show here.</Quiet>
        )}
      </div>
      <div>
        <Label right={unlimited ? undefined : `resets in ${getResetTime()}`}>AI allowance, {periodLabel}</Label>
        {unlimited ? (
          <Quiet>This account is not metered.</Quiet>
        ) : (
          <>
            <Big unit="used">{Math.round(percentUsed)}%</Big>
            <div className="mt-3">
              <Bar value={percentUsed} />
            </div>
          </>
        )}
      </div>
      <Links>
        <Go to="/docs">Documents</Go>
        <Go to="/test-prep">Practice tests</Go>
        <Go to="/essays">Essays</Go>
      </Links>
    </Panel>
  );
}

/* ------------------------------------------------------------------- news */

export function NewsPanel() {
  const { data, isLoading, isError } = useCollegeNews(6);
  return (
    <Panel id="reader" meta="Admissions" wide>
      {isLoading ? (
        <Loading />
      ) : isError || !data?.length ? (
        <Quiet>No news in today. The feed refreshes once a day.</Quiet>
      ) : (
        <ul className="divide-y divide-[color:var(--zen-line)]">
          {data.map((n) => (
            <li key={n.id} className="py-3 first:pt-0">
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="group block">
                <span className="zen-mono block text-[11px] uppercase text-[color:var(--zen-mute)]">
                  {n.source}
                  {n.published_at ? ` / ${since(n.published_at)}` : ""}
                </span>
                <span className="mt-1 block text-[14.5px] font-medium leading-snug transition-colors duration-100 group-hover:text-[color:var(--zen-cobalt)]">
                  {n.title}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <Quiet>Stories open in a new tab, so the study stays where it is.</Quiet>
    </Panel>
  );
}

/* --------------------------------------------------------------- check-in */

export function CheckInPanel() {
  const w = useLive().week;
  if (!w)
    return (
      <Panel id="notebook">
        <Loading />
      </Panel>
    );
  return <CheckInForm w={w} />;
}

function CheckInForm({ w }: { w: WeeklyCheckinsData }) {
  const [morale, setMorale] = useState(0);
  const [progress, setProgress] = useState("");
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const seeded = useRef(false);
  const filed = w.current;

  // Fill in this week's entry once it arrives, so filing twice edits it.
  useEffect(() => {
    if (seeded.current || w.loading) return;
    seeded.current = true;
    if (filed) {
      setMorale(filed.morale);
      setProgress(filed.progress);
      setReflection(filed.reflection ?? "");
    }
  }, [w.loading, filed]);

  const submit = async () => {
    setStatus(null);
    const res = await w.save({ morale, progress, reflection });
    setStatus(res.ok ? { ok: true, text: w.current ? "Updated." : "Filed for this week." } : { ok: false, text: res.error ?? "Could not save." });
  };

  return (
    <Panel id="notebook" meta={weekLabel(w.currentWeekKey)}>
      {w.loading ? (
        <Loading />
      ) : (
        <>
          <div>
            <Label right={morale ? MORALE_WORDS[morale] : undefined}>How did the week land?</Label>
            <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="How the week went">
              {Array.from({ length: MORALE_MAX - MORALE_MIN + 1 }, (_, i) => i + MORALE_MIN).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={morale === n}
                  aria-label={MORALE_WORDS[n]}
                  title={MORALE_WORDS[n]}
                  onClick={() => setMorale(n)}
                  className="zen-seg h-8 border border-[color:var(--zen-line)]"
                  style={{
                    background: morale >= n && morale ? `rgba(95,130,255,${0.25 + (n / MORALE_MAX) * 0.6})` : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>What got done</Label>
            <textarea
              className="zen-input block h-20 w-full resize-none p-2 text-[13.5px] leading-relaxed"
              value={progress}
              maxLength={2000}
              placeholder="Two drafts, one practice test, the Stanford supplement outline..."
              aria-label="What you got done this week"
              onChange={(e) => setProgress(e.target.value)}
              onKeyDown={stop}
            />
          </div>
          <div>
            <Label>One thing to change</Label>
            <input
              className="zen-input w-full py-1.5 text-[13.5px]"
              value={reflection}
              maxLength={2000}
              placeholder="Optional"
              aria-label="One thing to change next week"
              onChange={(e) => setReflection(e.target.value)}
              onKeyDown={stop}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="zen-btn -ml-1.5" disabled={w.saving} onClick={() => void submit()}>
              [{w.saving ? "Saving..." : w.current ? "Update" : "File this week"}]
            </button>
            {status && (
              <span
                role="status"
                className="zen-mono text-[11px]"
                style={{ color: status.ok ? "var(--zen-cobalt)" : "#ff8a7a" }}
              >
                {status.text}
              </span>
            )}
          </div>
          <div>
            <Label right={w.streak ? `${w.streak} week streak` : undefined}>Last 12 weeks</Label>
            <div className="flex h-8 items-end gap-[3px]" role="img" aria-label="How each of the last twelve weeks landed">
              {w.trend.map((t, i) => (
                <span
                  key={t.weekKey}
                  className="zen-bar flex-1"
                  style={{
                    height: t.morale ? `${(t.morale / MORALE_MAX) * 100}%` : "3px",
                    background: t.morale ? "var(--zen-cobalt)" : "var(--zen-line)",
                    animationDelay: `${120 + i * 25}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ sound */

const SOUNDS: Array<{ kind: SoundKind; name: string; note: string }> = [
  { kind: "rain", name: "Rain", note: "On the window, in gusts" },
  { kind: "brown", name: "Brown noise", note: "Low and even, shuts a room out" },
  { kind: "off", name: "Silence", note: "Just the clock" },
];

export function SoundPanel() {
  const s = useSound();
  return (
    <Panel id="cassette" meta={s.kind === "off" ? "Off" : "Playing"}>
      <ul className="space-y-1" role="radiogroup" aria-label="Sound">
        {SOUNDS.map((o) => {
          const on = s.kind === o.kind;
          return (
            <li key={o.kind}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => sound.play(o.kind)}
                className="zen-row flex w-full items-center gap-3 border px-3 py-2.5 text-left"
                style={{ borderColor: on ? "var(--zen-cobalt)" : "var(--zen-line)" }}
              >
                <span className="grid h-3 w-3 place-items-center border border-[color:var(--zen-line)]">
                  <span className="h-1.5 w-1.5 bg-[color:var(--zen-cobalt)]" style={{ transform: `scale(${on ? 1 : 0})`, transition: "transform 160ms cubic-bezier(0.2,0,0,1)" }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{o.name}</span>
                  <span className="block text-[12px] text-[color:var(--zen-mute)]">{o.note}</span>
                </span>
                {on && o.kind !== "off" && <span className="zen-eq" aria-hidden><i /><i /><i /></span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <Label right={`${Math.round(s.volume * 100)}%`}>Volume</Label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(s.volume * 100)}
          onChange={(e) => sound.setVolume(Number(e.target.value) / 100)}
          onKeyDown={stop}
          className="zen-range w-full"
          aria-label="Volume"
        />
      </div>
      <Quiet>Made in your browser as you listen; nothing downloads. M toggles it from anywhere in the room.</Quiet>
    </Panel>
  );
}

/* ---------------------------------------------------------------- breathe */

const BREATH = [
  { label: "Breathe in", scale: 1 },
  { label: "Hold", scale: 1 },
  { label: "Breathe out", scale: 0.45 },
  { label: "Hold", scale: 0.45 },
];

export function BreathGuide() {
  const [i, setI] = useState(0);
  const [rounds, setRounds] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () =>
        setI((n) => {
          if (n === BREATH.length - 1) setRounds((r) => r + 1);
          return (n + 1) % BREATH.length;
        }),
      4000,
    );
    return () => window.clearInterval(id);
  }, []);
  const step = BREATH[i];
  return (
    <div className="pointer-events-none flex flex-col items-center gap-6">
      <div className="relative grid h-48 w-48 place-items-center">
        <div className="absolute inset-0 rounded-full border border-[color:var(--zen-line)]" />
        <div
          className="h-full w-full rounded-full border border-[color:var(--zen-cobalt)]"
          style={{
            transform: `scale(${step.scale})`,
            transition: "transform 4000ms cubic-bezier(0.37, 0, 0.63, 1)",
          }}
        />
        <div className="zen-mono absolute text-[12px] tabular-nums text-[color:var(--zen-mute)]">{rounds}</div>
      </div>
      <div className="text-center">
        <div key={i} className="zen-fade text-[22px] font-medium">
          {step.label}
        </div>
        <div className="zen-mono mt-1 text-[11px] uppercase text-[color:var(--zen-mute)]">Box breathing / four counts each</div>
      </div>
    </div>
  );
}

/** Which panel belongs to which station. The window's is drawn centred, over the view. */
export function StationPanel({ id }: { id: StationId }) {
  switch (id) {
    case "laptop":
      return <FocusPanel />;
    case "board":
      return <PlanPanel />;
    case "clock":
      return <TodayPanel />;
    case "pinboard":
      return <CollegesPanel />;
    case "compass":
      return <ProgressPanel />;
    case "shelves":
      return <LibraryPanel />;
    case "reader":
      return <NewsPanel />;
    case "notebook":
      return <CheckInPanel />;
    case "cassette":
      return <SoundPanel />;
    case "window":
      return <BreathGuide />;
  }
}
