import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Search, RotateCcw, Home, Flag, CornerDownLeft,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Every entry here is checked against the route table in App.tsx. Two of them
 * used to point at routes that do not exist (`/colleges`, `/readiness`), so
 * searching from the 404 page landed the visitor on another 404, the one
 * place in the product where a dead link is least forgivable. Add a row here
 * only alongside a real `<Route path>`.
 */
const SEARCH_INDEX = [
  { label: "Dashboard", path: "/dashboard", terms: ["dashboard", "home"], app: true },
  { label: "Journey", path: "/journey", terms: ["journey", "levels", "tasks", "roadmap", "plan"], app: true },
  { label: "Advisor", path: "/advisor", terms: ["advisor", "ai", "chat", "counsellor", "counselor"], app: true },
  { label: "Activities", path: "/activities", terms: ["activities", "extracurriculars", "competitions", "olympiads"], app: true },
  { label: "Outcomes", path: "/outcomes", terms: ["outcomes", "achievements", "record"], app: true },
  { label: "Admissions probability", path: "/admissions-probability", terms: ["chances", "probability", "odds", "admissions"], app: true },
  { label: "College readiness", path: "/college-readiness", terms: ["readiness", "colleges", "universities", "schools", "report"], app: true },
  { label: "Requirements", path: "/requirements", terms: ["requirements", "deadlines", "checklist"], app: true },
  { label: "Recommendations", path: "/recommendations", terms: ["recommendations", "recs", "suggestions", "next steps"], app: true },
  { label: "Essays", path: "/essays", terms: ["essays", "personal statement", "writing", "drafts"], app: true },
  { label: "Exemplar essays", path: "/exemplar-essays", terms: ["exemplar", "sample essays", "examples"] },
  { label: "Professors", path: "/professors", terms: ["lor", "letters", "recommendation letters", "teachers", "professors", "recommenders"], app: true },
  { label: "Application builder", path: "/application-builder", terms: ["application", "common app", "builder", "submit"], app: true },
  { label: "Profile builder", path: "/profile-builder", terms: ["profile builder", "linkedin", "presence"], app: true },
  { label: "Resume", path: "/resume", terms: ["resume", "cv", "one pager"], app: true },
  { label: "Past admits", path: "/past-admits", terms: ["past admits", "admitted", "profiles"] },
  { label: "Scholarships", path: "/scholarships", terms: ["scholarships", "financial aid", "funding", "money"], app: true },
  { label: "Study planner", path: "/routine/study-planner", terms: ["study planner", "schedule", "subjects"], app: true },
  { label: "Calendar", path: "/routine/calendar", terms: ["calendar", "weekly planner", "week", "month", "planning", "today", "routine", "daily", "agenda", "tasks", "to do", "todo"], app: true },
  { label: "Chats", path: "/communications/chats", terms: ["chat", "messages", "dm"], app: true },
  { label: "Teams", path: "/communications/teams", terms: ["teams", "groups", "collaboration"], app: true },
  { label: "Profile", path: "/profile", terms: ["profile", "account", "settings"], app: true },
  { label: "Pricing", path: "/pricing", terms: ["pricing", "plans", "subscription", "credits", "billing"] },
  { label: "About", path: "/about", terms: ["about", "team", "company"] },
  { label: "Contact", path: "/contact", terms: ["contact", "support", "help"] },
  { label: "FAQ", path: "/faq", terms: ["faq", "questions", "help"] },
  { label: "Privacy", path: "/privacy", terms: ["privacy", "policy", "data"] },
  { label: "Terms", path: "/terms", terms: ["terms", "conditions"] },
];
type Entry = (typeof SEARCH_INDEX)[number];

function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * The page the visitor most likely meant, from a typo'd or outdated URL:
 * "/esays" -> Essays, "/colleges" -> College readiness (via its terms).
 * Only returned when it is close enough to be a real guess.
 */
function guessFor(pathname: string, pool: Entry[]): Entry | null {
  const words = pathname.toLowerCase().split("/").filter(Boolean).map((w) => w.replace(/[-_]+/g, " "));
  if (!words.length) return null;
  let best: { e: Entry; score: number } | null = null;
  for (const e of pool) {
    const candidates = [e.path.slice(1).replace(/[-/]+/g, " "), e.label.toLowerCase(), ...e.terms];
    for (const w of words) {
      for (const c of candidates) {
        const d = editDistance(w, c) / Math.max(w.length, c.length);
        if (!best || d < best.score) best = { e, score: d };
      }
    }
  }
  return best && best.score <= 0.34 ? best.e : null;
}

// -- The maze ---------------------------------------------------------------

const COLS = 9;
const ROWS = 6;
type Cell = { r: boolean; b: boolean }; // wall on the right / bottom

/** A perfect maze (one route between any two cells) by recursive backtracking. */
function makeMaze(): Cell[] {
  const cells: Cell[] = Array.from({ length: COLS * ROWS }, () => ({ r: true, b: true }));
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack[stack.length - 1];
    const x = i % COLS;
    const y = Math.floor(i / COLS);
    const next = [
      x > 0 ? i - 1 : -1,
      x < COLS - 1 ? i + 1 : -1,
      y > 0 ? i - COLS : -1,
      y < ROWS - 1 ? i + COLS : -1,
    ].filter((n) => n >= 0 && !seen.has(n));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const n = next[Math.floor(Math.random() * next.length)];
    if (n === i + 1) cells[i].r = false;
    else if (n === i - 1) cells[n].r = false;
    else if (n === i + COLS) cells[i].b = false;
    else cells[n].b = false;
    seen.add(n);
    stack.push(n);
  }
  return cells;
}

type Dir = "up" | "down" | "left" | "right";

function canMove(cells: Cell[], i: number, dir: Dir) {
  const x = i % COLS;
  const y = Math.floor(i / COLS);
  if (dir === "right") return x < COLS - 1 && !cells[i].r;
  if (dir === "left") return x > 0 && !cells[i - 1].r;
  if (dir === "down") return y < ROWS - 1 && !cells[i].b;
  return y > 0 && !cells[i - COLS].b;
}

const STEP: Record<Dir, number> = { up: -COLS, down: COLS, left: -1, right: 1 };
const KEYS: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right",
};

function MazeGame({ homeHref, homeLabel }: { homeHref: string; homeLabel: string }) {
  const reduce = useReducedMotion();
  const [cells, setCells] = useState(makeMaze);
  const [pos, setPos] = useState(0);
  const [trail, setTrail] = useState<number[]>([0]);
  const [bump, setBump] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const goal = COLS * ROWS - 1;
  const won = pos === goal;
  const hintId = useId();

  const move = useCallback(
    (dir: Dir) => {
      if (won) return;
      if (!canMove(cells, pos, dir)) {
        setBump((b) => b + 1);
        return;
      }
      const n = pos + STEP[dir];
      setPos(n);
      // Walking back over the trail rolls it back, so it always shows the
      // route actually taken rather than every dead end tried.
      setTrail((t) => (t.length > 1 && t[t.length - 2] === n ? t.slice(0, -1) : [...t, n]));
    },
    [cells, pos, won],
  );

  const reset = () => {
    setCells(makeMaze());
    setPos(0);
    setTrail([0]);
    boardRef.current?.focus();
  };

  // Arrow keys and WASD play from anywhere on the page, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const S = 40;
  const W = COLS * S;
  const H = ROWS * S;
  const cx = (i: number) => (i % COLS) * S + S / 2;
  const cy = (i: number) => Math.floor(i / COLS) * S + S / 2;
  const trailPath = trail.map((i, k) => `${k ? "L" : "M"}${cx(i)} ${cy(i)}`).join(" ");

  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">Find your way back</p>
          <p id={hintId} className="text-sm text-muted-foreground">
            <span className="hidden sm:inline">Arrow keys or WASD</span>
            <span className="sm:hidden">Swipe or use the pad</span> to reach the flag.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="h-10 shrink-0 gap-1.5">
          <RotateCcw className="h-4 w-4" /> New maze
        </Button>
      </div>

      <div
        ref={boardRef}
        tabIndex={0}
        role="application"
        aria-label={`Maze. You have taken ${trail.length - 1} steps.${won ? " You reached the flag." : ""}`}
        aria-describedby={hintId}
        className="relative touch-none select-none rounded-2xl bg-muted/40 p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
          move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        }}
      >
        <motion.svg
          viewBox={`-2 -2 ${W + 4} ${H + 4}`}
          className="block h-auto w-full"
          animate={bump && !reduce ? { x: [0, -4, 4, -2, 0] } : undefined}
          transition={{ duration: 0.22 }}
          key={bump}
        >
          <rect x={0} y={0} width={W} height={H} rx={6} className="fill-background" />
          {/* The route forged so far. */}
          <path d={trailPath} fill="none" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" className="stroke-primary/20" />
          {/* Goal */}
          <g transform={`translate(${cx(goal)} ${cy(goal)})`}>
            <circle r={14} className={cn("transition-colors", won ? "fill-success/25" : "fill-warning/20")} />
            <foreignObject x={-9} y={-9} width={18} height={18}>
              <Flag className={cn("h-[18px] w-[18px]", won ? "text-success" : "text-warning")} />
            </foreignObject>
          </g>
          {/* Walls */}
          <g className="stroke-foreground/70" strokeWidth={3} strokeLinecap="round">
            <rect x={0} y={0} width={W} height={H} rx={6} fill="none" />
            {cells.map((c, i) => {
              const x = (i % COLS) * S;
              const y = Math.floor(i / COLS) * S;
              return (
                <g key={i}>
                  {c.r && i % COLS !== COLS - 1 && <line x1={x + S} y1={y} x2={x + S} y2={y + S} />}
                  {c.b && Math.floor(i / COLS) !== ROWS - 1 && <line x1={x} y1={y + S} x2={x + S} y2={y + S} />}
                </g>
              );
            })}
          </g>
          {/* Player */}
          <motion.circle
            r={11}
            className="fill-primary"
            initial={false}
            animate={{ cx: cx(pos), cy: cy(pos) }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 38 }}
          />
        </motion.svg>

        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 p-6 text-center backdrop-blur-sm"
              role="status"
            >
              <p className="font-display text-2xl font-bold">Path found.</p>
              <p className="text-base text-muted-foreground">{trail.length - 1} steps. Now let's get you somewhere real.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild className="h-11 gap-2">
                  <Link to={homeHref}><Home className="h-4 w-4" /> {homeLabel}</Link>
                </Button>
                <Button variant="outline" onClick={reset} className="h-11 gap-2">
                  <RotateCcw className="h-4 w-4" /> Play again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm tabular-nums text-muted-foreground">{trail.length - 1} steps</span>
        {/* A pad for touch screens, where there are no arrow keys. */}
        <div className="grid grid-cols-3 gap-1.5 sm:hidden" aria-label="Move">
          <span />
          <PadButton dir="up" onMove={move} />
          <span />
          <PadButton dir="left" onMove={move} />
          <PadButton dir="down" onMove={move} />
          <PadButton dir="right" onMove={move} />
        </div>
      </div>
    </div>
  );
}

function PadButton({ dir, onMove }: { dir: Dir; onMove: (d: Dir) => void }) {
  const Icon = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight }[dir];
  return (
    <button
      type="button"
      aria-label={`Move ${dir}`}
      onClick={() => onMove(dir)}
      className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background active:scale-95"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

// -- Page -------------------------------------------------------------------

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const signedIn = !!user && !isGuest;
  const listId = useId();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // Routes marked `app` live behind ProtectedRoute. Offering them to a
  // signed-out visitor sends them to /auth instead of the thing they searched
  // for, which reads as a second dead end, so they are only listed once there
  // is a session to open them with.
  const pool = useMemo(() => SEARCH_INDEX.filter((item) => signedIn || !item.app), [signedIn]);
  const guess = useMemo(() => guessFor(location.pathname, pool), [location.pathname, pool]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, 6);
    return pool.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.terms.some((term) => term.includes(q)),
    );
  }, [query, pool]);

  useEffect(() => setActive(0), [query]);

  const go = (path: string) => navigate(path);
  const homeHref = signedIn ? "/dashboard" : "/";
  const homeLabel = signedIn ? "Dashboard" : "Home";

  return (
    <div className="relative min-h-[100svh] w-full overflow-hidden bg-background">
      <Seo
        title="Page Not Found"
        description="The page you're looking for doesn't exist. Return to Pathforge to keep planning your college journey."
        path={location.pathname}
        noindex
      />

      <div className="mx-auto grid min-h-[100svh] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16 lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">404 / Off the map</p>
          <h1 className="mt-3 text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            This path doesn't lead anywhere.
          </h1>
          <p className="mt-5 max-w-[46ch] text-pretty text-lg text-muted-foreground">
            There's nothing at{" "}
            <code className="break-all rounded-md bg-muted px-1.5 py-0.5 font-mono text-base text-foreground">{location.pathname}</code>.
            It may have moved, or the link may be out of date.
          </p>

          {guess && (
            <button
              type="button"
              onClick={() => go(guess.path)}
              className="group mt-6 flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-left transition hover:border-primary/60 hover:bg-primary/10"
            >
              <span>
                <span className="block text-sm text-muted-foreground">Did you mean</span>
                <span className="block text-lg font-semibold text-foreground">{guess.label}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </button>
          )}

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const pick = matches[active];
              if (pick) go(pick.path);
            }}
            className="relative mt-6 max-w-md"
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                  setActive((a) => Math.min(a + 1, matches.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search for a page"
              aria-label="Search Pathforge"
              role="combobox"
              aria-expanded={open && matches.length > 0}
              aria-controls={listId}
              aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
              autoComplete="off"
              className="h-14 w-full rounded-2xl border bg-background pl-12 pr-12 text-base shadow-sm outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
            <CornerDownLeft className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {open && (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border bg-popover p-1.5 shadow-lg"
              >
                {matches.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-muted-foreground">No pages match "{query}".</li>
                ) : (
                  matches.map((item, i) => (
                    <li
                      key={item.path}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item.path)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-base",
                        i === active ? "bg-primary/10 text-foreground" : "text-foreground/90",
                      )}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="truncate font-mono text-xs text-muted-foreground">{item.path}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 gap-2 text-base">
              <Link to={homeHref}><Home className="h-4 w-4" /> Take me home</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate(-1)} className="group h-12 gap-2 text-base">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Go back
            </Button>
          </div>
        </div>

        <MazeGame homeHref={homeHref} homeLabel={homeLabel} />
      </div>
    </div>
  );
};

export default NotFound;
