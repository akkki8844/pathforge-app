import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { useUsage } from "@/contexts/UsageContext";
import { MORALE_MAX, MORALE_MIN, MORALE_WORDS, weekLabel, type WeeklyCheckinsData } from "@/hooks/useWeeklyCheckins";
import { TIER_LABELS } from "@/lib/collegeCalibration";
import { formatTime } from "@/lib/routine/dates";
import { focus, mmss, PRESETS, useFocusTimer } from "./focus";
import { directoryIntent, GoContext, LeaveContext } from "./leave";
import { NAVBAR_MAIN_LINKS, NAVBAR_OTHER_GROUPS } from "@/components/layout/Navbar";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { COMMUNICATIONS_DESTINATIONS } from "@/lib/comms/nav";
import { TEST_PREP_TESTS } from "@/lib/testprep/nav";
import { plan, usePlan, PLAN_LINES } from "./plan";
import { sound, useSound, type SoundKind } from "./audio";
import { daysUntil, useLive } from "./live";
import { canSpeak, desk, hasLocalVoice, useDesk } from "./newsdesk";
import { PAGES, stationOfPage, type PageLink } from "./pages";
import { STATIONS, ZONES, type StationId } from "./stage";

/*
 * The app, one panel per station.
 *
 * Every number is the student's own, read from the same hooks the app's pages
 * read (see live.ts). A panel with nothing to show says so and says how to
 * fill it; nothing here is sampled or made up. Below its figures each panel
 * lists the pages that live at that object (pages.ts); opening one leaves Zen
 * for that page.
 */

/* ------------------------------------------------------------- primitives */

const station = (id: StationId) => STATIONS.find((s) => s.id === id)!;
const zoneTitle = (id: StationId) => ZONES.find((z) => z.id === station(id).zone)?.title ?? "";

function Panel({
  id,
  meta,
  children,
  wide,
  pages = true,
}: {
  id: StationId;
  meta?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  /** Whether to list the station's pages at the foot. */
  pages?: boolean;
}) {
  const s = station(id);
  const links = pages ? PAGES[id] : undefined;
  return (
    <section
      className={`zen-panel ${wide ? "w-[min(480px,calc(100vw-32px))]" : "w-[min(420px,calc(100vw-32px))]"} max-h-[56dvh] overflow-y-auto overscroll-contain sm:max-h-[min(700px,calc(100dvh-168px))]`}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={s.title}
    >
      <header className="zen-panel-head">
        <div className="zen-kicker">
          <span className="truncate">{zoneTitle(id)}</span>
          <span className="zen-kicker-dot" aria-hidden />
          <span className="truncate">{s.place.replace(/^The /, "")}</span>
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-4">
          <h2 className="zen-title">{s.title}</h2>
          {meta && <span className="zen-meta">{meta}</span>}
        </div>
      </header>
      <div className="zen-rise space-y-6 px-[22px] pb-[22px] pt-1">
        {children}
        {links && links.length > 0 && <Pages title="Open in Pathforge" links={links} />}
      </div>
    </section>
  );
}

function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="zen-label mb-2.5 flex items-center justify-between gap-3">
      <span>{children}</span>
      {right && <span className="tabular-nums normal-case tracking-normal">{right}</span>}
    </div>
  );
}

function Bar({ value, tall }: { value: number; tall?: boolean }) {
  return (
    <span className={`block w-full overflow-hidden rounded-full bg-[color:var(--zen-line)] ${tall ? "h-2" : "h-1.5"}`}>
      <span
        className="zen-grow block h-full origin-left rounded-full bg-[color:var(--zen-blue)]"
        style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }}
      />
    </span>
  );
}

function Big({ children, unit, xl }: { children: ReactNode; unit?: string; xl?: boolean }) {
  return (
    <div className={`zen-big ${xl ? "zen-big-xl" : ""}`}>
      {children}
      {unit && <span className="zen-unit">{unit}</span>}
    </div>
  );
}

function Stat({ value, name, to }: { value: ReactNode; name: string; to?: string }) {
  const leave = useContext(LeaveContext);
  const body = (
    <>
      <div className="zen-stat-value">{value}</div>
      <div className="zen-stat-name">{name}</div>
    </>
  );
  return to ? (
    <button type="button" className="zen-stat w-full" onClick={() => leave(to)}>
      {body}
    </button>
  ) : (
    <div className="zen-stat">{body}</div>
  );
}

function Quiet({ children }: { children: ReactNode }) {
  return <p className="max-w-[48ch] text-[13px] leading-[1.6] text-[color:var(--zen-mute)]">{children}</p>;
}

/** A way out of Zen to the page that owns the data. */
function Go({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) {
  const leave = useContext(LeaveContext);
  return (
    <button type="button" className={`zen-btn ${primary ? "zen-btn-primary" : ""}`} onClick={() => leave(to)}>
      {children}
      <ArrowUpRight aria-hidden />
    </button>
  );
}

/** The pages that live at a station. */
function Pages({ title, links }: { title: string; links: PageLink[] }) {
  const leave = useContext(LeaveContext);
  return (
    <div>
      <Label>{title}</Label>
      <ul className="zen-pages">
        {links.map((l) => (
          <li key={l.href}>
            <button type="button" className="zen-page" onClick={() => leave(l.href)}>
              <span className="min-w-0">
                <span className="zen-page-name">{l.label}</span>
                {l.note && <span className="zen-page-note">{l.note}</span>}
              </span>
              <span className="zen-page-go" aria-hidden>
                <ArrowUpRight />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
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
        <Big xl>{t.state === "done" ? "Done" : mmss(t.remaining)}</Big>
        <div className="mt-4">
          <Bar value={t.progress * 100} tall />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="zen-btn zen-btn-primary" onClick={() => (running ? focus.pause() : focus.start())}>
          {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          {running ? "Pause" : t.state === "paused" ? "Resume" : "Start focus"}
        </button>
        <button type="button" className="zen-btn zen-btn-icon" onClick={() => focus.reset()} aria-label="Reset the timer">
          <RotateCcw aria-hidden />
        </button>
        <span className="mx-1 h-5 w-px bg-[color:var(--zen-line)]" aria-hidden />
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className="zen-btn zen-btn-sm"
            aria-pressed={t.minutes === m}
            onClick={() => focus.setMinutes(m)}
          >
            {m} min
          </button>
        ))}
      </div>
      <div>
        <Label right={`${t.sessionsToday * t.minutes} min`}>Sessions today</Label>
        <div className="flex flex-wrap gap-1.5" aria-label={`${t.sessionsToday} sessions finished today`}>
          {Array.from({ length: Math.max(4, t.sessionsToday + (running ? 1 : 0)) }, (_, i) => (
            <span
              key={i}
              className="h-2.5 w-7 rounded-full"
              style={{
                background:
                  i < t.sessionsToday
                    ? "var(--zen-blue)"
                    : i === t.sessionsToday && running
                      ? "color-mix(in srgb, var(--zen-blue) 40%, transparent)"
                      : "var(--zen-line)",
              }}
            />
          ))}
        </div>
      </div>
      <Quiet>The timer keeps running if you leave Zen, and chimes when the session ends.</Quiet>
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
        className="zen-input block h-24 w-full resize-none px-3 py-2.5 text-[13.5px] leading-relaxed"
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
      <ul className="space-y-1">
        {items.slice(0, PLAN_LINES).map((it, i) => (
          <li key={i} className="flex items-center gap-3">
            <button
              type="button"
              aria-label={it.done ? `Mark line ${i + 1} not done` : `Mark line ${i + 1} done`}
              aria-pressed={it.done}
              disabled={!it.text.trim()}
              onClick={() => plan.toggle(i)}
              className="zen-check grid h-[18px] w-[18px] shrink-0 place-items-center border-[1.5px] border-[color:var(--zen-line-strong)] disabled:opacity-30"
              style={it.done ? { borderColor: "var(--zen-blue)" } : undefined}
            >
              <span className="h-2.5 w-2.5 bg-[color:var(--zen-blue)]" style={{ transform: `scale(${it.done ? 1 : 0})` }} />
            </button>
            <input
              className="zen-input zen-input-line w-full py-2 text-[14px]"
              style={it.done ? { textDecoration: "line-through", opacity: 0.5 } : undefined}
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
      <Quiet>Finished lines are wiped tomorrow; unfinished ones carry over. The chalkboard shows the list.</Quiet>
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
              <li key={c.id} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{c.subject}</span>
                  {c.location && <span className="block truncate text-[12.5px] text-[color:var(--zen-mute)]">{c.location}</span>}
                </span>
                <span className="zen-num shrink-0 text-[13px] font-semibold text-[color:var(--zen-mute)]">
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
            <p className="mt-2 truncate text-[14px] font-semibold">{next.label}</p>
            <p className="text-[12.5px] text-[color:var(--zen-mute)]">{SHORT.format(next.date)}</p>
            {later.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {later.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate">{x.label}</span>
                    <span className="zen-num shrink-0 text-[12px] font-semibold text-[color:var(--zen-mute)]">
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
            <li key={c.name} className="py-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px] font-semibold">{c.name}</span>
                <span
                  className="shrink-0 text-[12px] font-semibold"
                  style={{ color: c.fit === "Safety" || c.fit === "Match" ? "var(--zen-good)" : "var(--zen-mute)" }}
                >
                  {c.fit}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="w-[112px] shrink-0 truncate text-[12.5px] text-[color:var(--zen-mute)]">{TIER_LABELS[c.tier]}</span>
                <Bar value={c.readinessIndex} />
                <span className="zen-num w-7 shrink-0 text-right text-[12px] font-semibold">{Math.round(c.readinessIndex)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Quiet>Nothing on your list yet. Add a few schools and the rest of Pathforge calibrates to them.</Quiet>
      )}
      {colleges.length > 0 && <Quiet>The bar is your readiness against each school's admitted bar; 100 is at it.</Quiet>}
    </Panel>
  );
}

/* ---------------------------------------------------------------- journey */

const PILLARS = [
  ["academics", "Academics"],
  ["activities", "Activities"],
  ["leadership", "Leadership"],
  ["competitions", "Competitions"],
  ["testPrep", "Test prep"],
] as const;

export function JourneyPanel() {
  const { ready, d } = useLive();
  if (!ready || !d)
    return (
      <Panel id="compass">
        <Loading />
      </Panel>
    );
  const peak = Math.max(1, ...d.momentum.map((w) => w.count));
  return (
    <Panel id="compass" meta={d.journeyStarted ? `Level ${d.currentLevel}` : "Not started"} wide>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={d.currentLevel} name="Level" to="/journey" />
        <Stat value={d.completedMilestones} name="Quests done" to="/journey" />
        <Stat value={d.gems} name="Gems" to="/journey" />
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-6">
        <div>
          <Label>Readiness</Label>
          <Big unit="/ 100">{Math.round(d.overall)}</Big>
        </div>
        <dl className="space-y-2">
          {PILLARS.map(([key, name]) => {
            const v = Math.round(d.pillars[key] ?? 0);
            return (
              <div key={key} className="flex items-center gap-2.5 text-[12.5px]">
                <dt className="w-[86px] shrink-0 truncate text-[color:var(--zen-mute)]">{name}</dt>
                <dd className="flex min-w-0 flex-1 items-center gap-2">
                  <Bar value={v} />
                  <span className="zen-num w-6 shrink-0 text-right text-[12px] font-semibold">{v}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <div>
        <Label right={`${d.activeDays} active days in 12 weeks`}>Streak</Label>
        <div className="flex items-end gap-5">
          <Big unit={d.currentStreak === 1 ? "day" : "days"}>{d.currentStreak}</Big>
          <div
            role="img"
            aria-label={`Activity over the last ${d.momentum.length} weeks, up to ${peak} in a week.`}
            className="flex h-11 flex-1 items-end gap-[3px]"
          >
            {d.momentum.map((w, i) => (
              <span
                key={w.weekStart.toISOString()}
                className="zen-bar flex-1"
                style={{
                  height: `${Math.max(8, (w.count / peak) * 100)}%`,
                  background: w.count > 0 ? "var(--zen-blue)" : "var(--zen-line)",
                  animationDelay: `${120 + i * 25}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {!d.journeyStarted && <Quiet>Your journey has not started yet. It sets your quests level by level, from where you are now.</Quiet>}
    </Panel>
  );
}

/* ----------------------------------------------------------------- essays */

const STATUS_WORD: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  complete: "Complete",
  completed: "Complete",
  draft: "Draft",
};
const statusWord = (s: string) => STATUS_WORD[s] ?? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function EssaysPanel() {
  const { ready, d } = useLive();
  if (!ready || !d)
    return (
      <Panel id="notebook">
        <Loading />
      </Panel>
    );
  const apps = d.applications.slice(0, 5);
  const recs = d.recommenders.slice(0, 4);
  return (
    <Panel id="notebook" meta={d.totalEssaySections ? `${d.essays.started} of ${d.totalEssaySections} started` : undefined} wide>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={d.essays.started} name="Started" to="/essays" />
        <Stat value={d.essays.refined} name="Refined" to="/essays" />
        <Stat value={d.essays.words.toLocaleString()} name="Words" to="/essays" />
      </div>
      <div>
        <Label right={apps.length ? `${d.applications.length}` : undefined}>Applications</Label>
        {apps.length ? (
          <ul className="divide-y divide-[color:var(--zen-line)]">
            {apps.map((a) => (
              <li key={a.university} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <span className="truncate text-[14px] font-semibold">{a.university}</span>
                <span className="shrink-0 text-[12.5px] text-[color:var(--zen-mute)]">{statusWord(a.status)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Quiet>No applications started. The Application Builder opens one per school on your list.</Quiet>
        )}
      </div>
      {recs.length > 0 && (
        <div>
          <Label right={`${d.recommenders.length}`}>Recommenders</Label>
          <ul className="divide-y divide-[color:var(--zen-line)]">
            {recs.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold">{r.name}</span>
                  {r.subject && <span className="block truncate text-[12.5px] text-[color:var(--zen-mute)]">{r.subject}</span>}
                </span>
                <span className="shrink-0 text-[12.5px] text-[color:var(--zen-mute)]">{statusWord(r.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- messages */

export function MessagesPanel() {
  const { ready, d, comms } = useLive();
  const waiting = comms.chats + comms.teams + comms.objectives + (d?.unreadNotifications ?? 0);
  return (
    <Panel id="phone" meta={ready ? (waiting ? `${waiting} waiting` : "All caught up") : undefined}>
      <div className="grid grid-cols-2 gap-2">
        <Stat value={comms.chats} name="Unread chats" to="/communications/chats" />
        <Stat value={comms.teams} name={comms.teams === 1 ? "Team invite" : "Team invites"} to="/communications/teams" />
        <Stat value={comms.objectives} name="Objectives need you" to="/communications/objectives" />
        <Stat value={d?.unreadNotifications ?? 0} name="Notifications" />
      </div>
      <Quiet>The phone on the desk shows the same counts on its lock screen.</Quiet>
    </Panel>
  );
}

/* -------------------------------------------------------------- documents */

const AGO = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function since(iso: string | null): string {
  if (!iso) return "";
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return "just now";
  if (h < 24) return AGO.format(-Math.round(h), "hour");
  return AGO.format(-Math.round(h / 24), "day");
}

export function DocumentsPanel() {
  const { live: nodes, loading } = useDocuments();
  const { percentUsed, unlimited, periodLabel, getResetTime } = useUsage();
  const recent = useMemo(
    () =>
      nodes
        .filter((n) => n.kind !== "folder")
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5),
    [nodes],
  );
  const docs = nodes.filter((n) => n.kind === "doc").length;
  const files = nodes.filter((n) => n.kind === "file").length;
  return (
    <Panel id="shelves" meta={loading ? undefined : `${docs} docs, ${files} files`}>
      <div>
        <Label>Recent</Label>
        {loading ? (
          <Loading />
        ) : recent.length ? (
          <ul className="divide-y divide-[color:var(--zen-line)]">
            {recent.map((n) => (
              <li key={n.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <span className="truncate text-[14px] font-semibold">{n.title}</span>
                <span className="shrink-0 text-[12px] text-[color:var(--zen-mute)]">{since(n.updated_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Quiet>Nothing saved yet. Documents you write or upload in Pathforge show here, and as binders on the shelf.</Quiet>
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
    </Panel>
  );
}

/* -------------------------------------------------------------- test prep */

type PrepRow = {
  id: string;
  name: string;
  href: string;
  available: boolean;
  estimate: number | null;
  target: number;
  range: [number, number];
  accuracy: number | null;
  coverage: number;
  answered: number;
  days: number | null;
  next: { skill: string; count: number; minutes: number } | null;
};

/**
 * The question bank is large, so its stats load with this panel rather than
 * with the room: a dynamic import the Test Prep pages share.
 */
function usePrepRows(): PrepRow[] | null {
  const [rows, setRows] = useState<PrepRow[] | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([import("@/lib/testprep/stats"), import("@/lib/testprep/store"), import("@/lib/testprep/blueprints")]).then(
      ([stats, store, bp]) => {
        if (!live) return;
        const profile = store.readProfile();
        setRows(
          bp.BLUEPRINTS.map((b) => {
            const mine = store.scopeProfile(profile, b.id);
            const o = stats.overallStats(mine, b);
            const n = b.available ? stats.nextBestAction(mine, b) : null;
            const nav = TEST_PREP_TESTS.find((t) => t.testId === b.id);
            return {
              id: b.id,
              name: b.name,
              href: nav?.href ?? "/test-prep",
              available: b.available,
              estimate: o.estimatedScore,
              target: mine.targetScore,
              range: b.scoreRange,
              accuracy: o.accuracy,
              coverage: o.coverage,
              answered: o.totalAttempts,
              days: mine.testDate ? stats.daysUntil(mine.testDate) : null,
              next: n ? { skill: n.skillName, count: n.count, minutes: n.minutes } : null,
            };
          }),
        );
      },
      () => live && setRows([]),
    );
    return () => {
      live = false;
    };
  }, []);
  return rows;
}

export function TestPrepPanel() {
  const rows = usePrepRows();
  const leave = useContext(LeaveContext);
  // Lead with the test the student has practised most; the SAT otherwise.
  const lead = rows?.filter((r) => r.available).sort((a, b) => b.answered - a.answered)[0];
  return (
    <Panel id="books" meta={rows ? `${rows.filter((r) => r.available).length} tests` : undefined} wide pages={false}>
      {!rows ? (
        <Loading />
      ) : (
        <>
          {lead && (
            <div>
              <Label right={lead.days !== null && lead.days >= 0 ? `${lead.days} days to test day` : undefined}>{lead.name}</Label>
              <div className="flex items-end justify-between gap-4">
                <div>
                  {lead.estimate !== null ? (
                    <Big unit={`of ${lead.range[1]}`}>{lead.estimate}</Big>
                  ) : (
                    <div className="zen-display text-[22px] font-bold tracking-[-0.02em]">No estimate yet</div>
                  )}
                  <p className="mt-2 text-[12.5px] text-[color:var(--zen-mute)]">
                    {lead.estimate !== null ? `Estimated score, target ${lead.target}` : `Answer a few questions in each section. Target ${lead.target}.`}
                  </p>
                </div>
                {lead.accuracy !== null && (
                  <div className="text-right">
                    <div className="zen-stat-value">{Math.round(lead.accuracy * 100)}%</div>
                    <div className="zen-stat-name">accuracy</div>
                  </div>
                )}
              </div>
              {lead.next && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border border-[color:var(--zen-line)] bg-[color:var(--zen-well)] px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-[color:var(--zen-blue)]">Next best set</span>
                    <span className="block truncate text-[13.5px] font-semibold">{lead.next.skill}</span>
                    <span className="block text-[12px] text-[color:var(--zen-mute)]">
                      {lead.next.count} questions, about {lead.next.minutes} min
                    </span>
                  </span>
                  <Go to={lead.href} primary>
                    Practise
                  </Go>
                </div>
              )}
            </div>
          )}
          <div>
            <Label>Every test</Label>
            <ul className="zen-pages">
              {rows.map((r) => (
                <li key={r.id}>
                  <button type="button" className="zen-page" disabled={!r.available} onClick={() => leave(r.href)} style={r.available ? undefined : { opacity: 0.5 }}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="zen-page-name">{r.name}</span>
                        <span className="text-[12px] text-[color:var(--zen-mute)]">
                          {!r.available ? "Coming soon" : r.answered ? `${r.answered} answered` : "Not started"}
                        </span>
                      </span>
                      {r.available && (
                        <span className="mt-2 flex items-center gap-2">
                          <Bar value={r.coverage * 100} />
                          <span className="zen-num w-9 shrink-0 text-right text-[11.5px] font-semibold text-[color:var(--zen-mute)]">
                            {Math.round(r.coverage * 100)}%
                          </span>
                        </span>
                      )}
                    </span>
                    <span className="zen-page-go" aria-hidden>
                      <ArrowUpRight />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Quiet>The bar is how much of each question bank you have seen. Practice is saved in this browser.</Quiet>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------- activities */

const PORTFOLIO = [
  ["projects", "Projects"],
  ["leadership", "Leadership"],
  ["competitions", "Competitions"],
  ["internships", "Internships"],
  ["research", "Research"],
  ["service", "Service"],
  ["creative", "Creative"],
  ["courses", "Courses"],
] as const;

export function ActivitiesPanel() {
  const { ready, d } = useLive();
  if (!ready || !d)
    return (
      <Panel id="trophy">
        <Loading />
      </Panel>
    );
  return (
    <Panel id="trophy" meta={`${d.portfolio.total} on record`} wide>
      <div className="grid grid-cols-4 gap-2">
        {PORTFOLIO.map(([k, name]) => (
          <Stat key={k} value={d.portfolio[k]} name={name} />
        ))}
      </div>
      <div className="space-y-2.5">
        <Label>How they score</Label>
        {(["activities", "leadership", "competitions"] as const).map((k) => {
          const v = Math.round(d.pillars[k] ?? 0);
          return (
            <div key={k} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="w-[86px] shrink-0 capitalize text-[color:var(--zen-mute)]">{k}</span>
              <Bar value={v} />
              <span className="zen-num w-6 shrink-0 text-right text-[12px] font-semibold">{v}</span>
            </div>
          );
        })}
      </div>
      {d.portfolio.total === 0 && <Quiet>Nothing on record yet. Add what you do outside class and it counts toward every school on your list.</Quiet>}
    </Panel>
  );
}

/* ------------------------------------------------------------------- news */

/** Captions land a word at a time, about as fast as she would say them. */
const WORD_MS = 70;

export function NewsPanel() {
  const { news, newsState } = useLive();
  const d = useDesk();
  const [voiceReady, setVoiceReady] = useState(hasLocalVoice);
  const count = news.length;
  const i = count ? Math.min(d.index, count - 1) : 0;
  const story = news[i];
  const lead = story ? `${story.source}. ` : "";

  // Voices load after the page does, and some browsers never have one.
  useEffect(() => {
    if (!canSpeak || voiceReady) return;
    const on = () => setVoiceReady(hasLocalVoice());
    window.speechSynthesis.addEventListener("voiceschanged", on);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", on);
  }, [voiceReady]);

  // Tell the story: caption it, and say it if the voice is on. With the voice
  // on she carries on to the next one by herself, like a bulletin.
  useEffect(() => {
    if (!story) return;
    let live = true;
    let next = 0;
    const words = story.title.split(/\s+/).length;
    if (d.voice && voiceReady) {
      void desk.say(`${lead}${story.title}`).then((finished) => {
        if (!live || !finished || i >= count - 1) return;
        next = window.setTimeout(() => desk.go(i + 1), 900);
      });
    } else desk.mouth(words * WORD_MS + 500);
    return () => {
      live = false;
      window.clearTimeout(next);
      desk.hush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, d.voice, voiceReady]);

  const titleWords = useMemo(() => {
    if (!story) return [];
    let at = lead.length;
    return story.title.split(" ").map((w) => {
      const start = at;
      at += w.length + 1;
      return { w, start };
    });
  }, [story, lead.length]);

  return (
    <Panel id="reader" meta={count ? `${count} ${count === 1 ? "story" : "stories"} today` : undefined} wide>
      {newsState === "loading" ? (
        <Loading />
      ) : !story ? (
        <Quiet>
          {newsState === "error" ? "The feed could not be read just now." : "No news in today."} The desk refreshes once a
          day, and she will have the paper when it lands.
        </Quiet>
      ) : (
        <>
          <article aria-live="polite">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[color:var(--zen-mute)]">
              <span className="zen-live" data-on={d.talking || undefined} aria-hidden />
              <span className="zen-num text-[color:var(--zen-ink)]">
                {i + 1} of {count}
              </span>
              <span aria-hidden>/</span>
              <span className="truncate">{story.source}</span>
              {story.published_at && (
                <>
                  <span aria-hidden>/</span>
                  <span className="shrink-0 font-medium">{since(story.published_at)}</span>
                </>
              )}
            </div>
            <h3 key={story.id} className="zen-headline mt-3">
              {titleWords.map(({ w, start }, k) => (
                <span
                  key={k}
                  className="zen-word"
                  data-said={d.spoken >= 0 ? (start <= d.spoken ? "1" : "0") : undefined}
                  style={{ animationDelay: `${k * WORD_MS}ms` }}
                >
                  {w}{" "}
                </span>
              ))}
            </h3>
            {story.summary && <p className="mt-3 text-[14px] leading-[1.6] text-[color:var(--zen-mute)]">{story.summary}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a className="zen-btn zen-btn-primary" href={story.url} target="_blank" rel="noopener noreferrer">
                Read the story
                <ArrowUpRight aria-hidden />
              </a>
              <button type="button" className="zen-btn zen-btn-icon" disabled={i === 0} onClick={() => desk.go(i - 1)} aria-label="Previous story">
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" className="zen-btn zen-btn-icon" disabled={i >= count - 1} onClick={() => desk.go(i + 1)} aria-label="Next story">
                <ChevronRight aria-hidden />
              </button>
              {voiceReady && (
                <button type="button" className="zen-btn" aria-pressed={d.voice} onClick={() => desk.setVoice(!d.voice)}>
                  <Volume2 aria-hidden />
                  {d.voice ? "Reading aloud" : "Read aloud"}
                </button>
              )}
            </div>
          </article>

          <div>
            <Label>Today&apos;s paper</Label>
            <ol className="-mx-2 space-y-0.5">
              {news.map((n, k) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => desk.go(k)}
                    aria-current={k === i || undefined}
                    className="zen-story flex w-full items-baseline gap-3 px-2 py-2 text-left"
                  >
                    <span className="zen-num w-4 shrink-0 text-[12px] font-semibold text-[color:var(--zen-mute)]">{k + 1}</span>
                    <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{n.title}</span>
                    <span className="max-w-[96px] shrink-0 truncate text-[11.5px] text-[color:var(--zen-mute)]">{n.source}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
      <Quiet>The same feed as your dashboard, refreshed daily. Stories open in a new tab, so the study stays put.</Quiet>
    </Panel>
  );
}

/* ----------------------------------------------------------- this week */

export function WeekPanel() {
  const w = useLive().week;
  if (!w)
    return (
      <Panel id="calendar">
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
    <Panel id="calendar" meta={weekLabel(w.currentWeekKey)}>
      {w.loading ? (
        <Loading />
      ) : (
        <>
          <div>
            <Label right={morale ? MORALE_WORDS[morale] : undefined}>How did the week land?</Label>
            <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="How the week went">
              {Array.from({ length: MORALE_MAX - MORALE_MIN + 1 }, (_, i) => i + MORALE_MIN).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={morale === n}
                  aria-label={MORALE_WORDS[n]}
                  title={MORALE_WORDS[n]}
                  onClick={() => setMorale(n)}
                  className="zen-seg h-9 border border-[color:var(--zen-line)]"
                  style={{
                    background:
                      morale >= n && morale
                        ? `color-mix(in srgb, var(--zen-blue) ${Math.round(30 + (n / MORALE_MAX) * 70)}%, transparent)`
                        : "var(--zen-well)",
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>What got done</Label>
            <textarea
              className="zen-input block h-20 w-full resize-none px-3 py-2.5 text-[13.5px] leading-relaxed"
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
              className="zen-input w-full px-3 py-2.5 text-[13.5px]"
              value={reflection}
              maxLength={2000}
              placeholder="Optional"
              aria-label="One thing to change next week"
              onChange={(e) => setReflection(e.target.value)}
              onKeyDown={stop}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="zen-btn zen-btn-primary" disabled={w.saving} onClick={() => void submit()}>
              {w.saving ? "Saving..." : w.current ? "Update check-in" : "File this week"}
            </button>
            {status && (
              <span role="status" className="text-[12.5px] font-semibold" style={{ color: status.ok ? "var(--zen-good)" : "var(--zen-bad)" }}>
                {status.text}
              </span>
            )}
          </div>
          <div>
            <Label right={w.streak ? `${w.streak} week streak` : undefined}>Last 12 weeks</Label>
            <div className="flex h-9 items-end gap-[3px]" role="img" aria-label="How each of the last twelve weeks landed">
              {w.trend.map((t, i) => (
                <span
                  key={t.weekKey}
                  className="zen-bar flex-1"
                  style={{
                    height: t.morale ? `${(t.morale / MORALE_MAX) * 100}%` : "3px",
                    background: t.morale ? "var(--zen-blue)" : "var(--zen-line)",
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
      <ul className="space-y-1.5" role="radiogroup" aria-label="Sound">
        {SOUNDS.map((o) => {
          const on = s.kind === o.kind;
          return (
            <li key={o.kind}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => sound.play(o.kind)}
                className="zen-row flex w-full items-center gap-3 border px-3.5 py-3 text-left"
                style={{
                  borderColor: on ? "var(--zen-blue)" : "var(--zen-line)",
                  background: on ? "var(--zen-soft)" : "var(--zen-well)",
                }}
              >
                <span
                  className="grid h-4 w-4 place-items-center rounded-full border-[1.5px]"
                  style={{ borderColor: on ? "var(--zen-blue)" : "var(--zen-line-strong)" }}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-[color:var(--zen-blue)]"
                    style={{ transform: `scale(${on ? 1 : 0})`, transition: "transform 160ms cubic-bezier(0.2,0,0,1)" }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{o.name}</span>
                  <span className="block text-[12.5px] text-[color:var(--zen-mute)]">{o.note}</span>
                </span>
                {on && o.kind !== "off" && (
                  <span className="zen-eq" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                )}
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
      <div className="relative grid h-52 w-52 place-items-center">
        <div className="absolute inset-0 rounded-full border border-[color:var(--zen-line-strong)] bg-[color:var(--zen-panel)] opacity-60" />
        <div
          className="h-full w-full rounded-full border-2 border-[color:var(--zen-blue)] bg-[color:var(--zen-soft)]"
          style={{
            transform: `scale(${step.scale})`,
            transition: "transform 4000ms cubic-bezier(0.37, 0, 0.63, 1)",
          }}
        />
        <div className="zen-num absolute text-[14px] font-semibold text-[color:var(--zen-blue)]">{rounds}</div>
      </div>
      <div className="zen-chip !h-auto flex-col !gap-1 !rounded-[16px] px-5 py-3 text-center">
        <div key={i} className="zen-fade zen-display text-[22px] font-bold tracking-[-0.02em] text-[color:var(--zen-ink)]">
          {step.label}
        </div>
        <div className="text-[12px] font-medium">Box breathing, four counts each</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- directory */

type Entry = { label: string; href?: string; station?: StationId; note?: string; key?: string };
type Group = { title: string; entries: Entry[] };

/** Where a page lives in the room, said the way the index says it. */
const livesAt = (href: string) => {
  const id = stationOfPage(href);
  return id ? `At ${station(id).place.replace(/^The /, "the ").replace(/^Your /, "your ")}` : undefined;
};

/** Every page a student can open, grouped the way the navigation bar groups them. */
function directoryGroups(): Group[] {
  const page = (label: string, href: string, note?: string): Entry => ({ label, href, note: livesAt(href) ?? note });
  return [
    {
      title: "In this room",
      entries: STATIONS.filter((s) => s.id !== "door").map((s) => ({ label: s.title, station: s.id, note: s.place, key: s.key })),
    },
    {
      title: "Main",
      entries: [page("Dashboard", "/dashboard", "The full dashboard"), ...NAVBAR_MAIN_LINKS.map((l) => page(l.label, l.href))],
    },
    ...NAVBAR_OTHER_GROUPS.map((g) => ({
      title: g.title,
      entries: g.links.filter((l) => !l.disabled).map((l) => page(l.label, l.href)),
    })),
    { title: "Routine", entries: ROUTINE_DESTINATIONS.map((d) => page(d.label, d.href, d.description)) },
    {
      title: "Test prep",
      entries: TEST_PREP_TESTS.filter((t) => t.available).map((t) => page(t.label, t.href)),
    },
    {
      title: "Communications",
      entries: COMMUNICATIONS_DESTINATIONS.map((d) => page(d.label, d.href, d.description)),
    },
    {
      title: "You",
      entries: [page("Documents", "/docs"), page("Profile", "/profile")],
    },
  ].filter((g) => g.entries.length);
}

const coarse = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false);

export function DirectoryPanel() {
  const leave = useContext(LeaveContext);
  const go = useContext(GoContext);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const groups = useMemo(directoryGroups, []);

  useEffect(() => {
    if (!directoryIntent.focus) return;
    directoryIntent.focus = false;
    // After the panel has landed, so the focus ring does not ride the slide.
    const id = window.setTimeout(() => input.current?.focus(), 200);
    return () => window.clearTimeout(id);
  }, []);

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? groups
        .map((g) => ({
          ...g,
          entries: g.entries.filter((e) => `${e.label} ${e.note ?? ""} ${g.title}`.toLowerCase().includes(needle)),
        }))
        .filter((g) => g.entries.length)
    : groups;
  const first = shown[0]?.entries[0];
  const open = (e: Entry) => (e.station ? go(e.station) : leave(e.href));

  return (
    <Panel id="door" meta="Every page" wide pages={false}>
      <div>
        <input
          ref={input}
          className="zen-input zen-search w-full px-4 py-3 text-[17px]"
          value={q}
          placeholder="Where to?"
          aria-label="Search every page"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && first) {
              e.preventDefault();
              open(first);
            }
            stop(e);
          }}
        />
        <div className="zen-hint mt-2">
          {needle ? (first ? `Enter opens ${first.label}` : "Nothing by that name") : coarse ? "Every page, one tap away" : "Ctrl K or / from anywhere in the room"}
        </div>
      </div>
      {shown.map((g) => (
        <div key={g.title}>
          <Label right={g.title === "In this room" ? "Stays in Zen" : undefined}>{g.title}</Label>
          <ul className="zen-pages">
            {g.entries.map((e) => (
              <li key={`${g.title}-${e.label}`}>
                <button type="button" className="zen-page" onClick={() => open(e)}>
                  <span className="min-w-0">
                    <span className="zen-page-name">{e.label}</span>
                    {e.note && <span className="zen-page-note">{e.note}</span>}
                  </span>
                  {e.station ? (
                    <span className="zen-key ml-auto">{e.key}</span>
                  ) : (
                    <span className="zen-page-go" aria-hidden>
                      <ArrowUpRight />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <Go to="">Leave Zen</Go>
      </div>
    </Panel>
  );
}

/** Which panel belongs to which station. The window's is drawn centred, over the view. */
export function StationPanel({ id }: { id: StationId }) {
  switch (id) {
    case "laptop":
      return <FocusPanel />;
    case "board":
      return <PlanPanel />;
    case "notebook":
      return <EssaysPanel />;
    case "phone":
      return <MessagesPanel />;
    case "compass":
      return <JourneyPanel />;
    case "clock":
      return <TodayPanel />;
    case "calendar":
      return <WeekPanel />;
    case "pinboard":
      return <CollegesPanel />;
    case "shelves":
      return <DocumentsPanel />;
    case "books":
      return <TestPrepPanel />;
    case "trophy":
      return <ActivitiesPanel />;
    case "reader":
      return <NewsPanel />;
    case "cassette":
      return <SoundPanel />;
    case "window":
      return <BreathGuide />;
    case "door":
      return <DirectoryPanel />;
  }
}
