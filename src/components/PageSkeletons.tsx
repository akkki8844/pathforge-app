import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Page-shaped loading placeholders.
 *
 * Each variant mirrors the real layout of a page family closely enough that
 * the swap from placeholder to content keeps the same header, column and
 * card positions. That is the whole point of a skeleton over a spinner: the
 * eye has already found where things will be before they arrive.
 *
 * `pageSkeletonFor(pathname)` (below) picks the variant for a route, so the same
 * component serves the route-level Suspense fallback, the auth gate and the
 * in-page data loads.
 */

/** A block whose sweep starts a little later the further down the page it is. */
function B({ className, d = 0, style }: { className?: string; d?: number; style?: CSSProperties }) {
  return <Skeleton className={className} style={{ ...style, ["--sk-delay" as string]: `${d * 0.08}s` }} />;
}

/** Announces the loading state once for the whole group of blocks. */
function Frame({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Eyebrow, title and one line of intro: the header every app page opens with. */
function Header({ wide = false, action = false, center = false }: { wide?: boolean; action?: boolean; center?: boolean }) {
  return (
    <div className={cn("flex items-end justify-between gap-6", center && "flex-col items-center text-center")}>
      <div className={cn("space-y-3", center && "flex flex-col items-center")}>
        <B className="h-3 w-24 rounded-full" />
        <B className={cn("h-10 rounded-lg", wide ? "w-80 max-w-[70vw]" : "w-56")} d={1} />
        <B className="h-4 w-[26rem] max-w-[80vw] rounded-full" d={2} />
      </div>
      {action && <B className="hidden h-10 w-36 shrink-0 rounded-xl sm:block" d={1} />}
    </div>
  );
}

function Card({ className, d = 0, lines = 2 }: { className?: string; d?: number; lines?: number }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <B className="h-3 w-20 rounded-full" d={d} />
      <B className="mt-4 h-7 w-16 rounded-md" d={d + 1} />
      {Array.from({ length: lines }).map((_, i) => (
        <B key={i} className={cn("mt-3 h-3 rounded-full", i % 2 ? "w-2/3" : "w-full")} d={d + 2 + i} />
      ))}
    </div>
  );
}

function Rows({ n = 5, d = 0, avatar = false }: { n?: number; d?: number; avatar?: boolean }) {
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          {avatar && <B className="h-10 w-10 shrink-0 rounded-full" d={d + i} />}
          <div className="min-w-0 flex-1 space-y-2">
            <B className={cn("h-4 rounded-full", i % 3 === 1 ? "w-1/3" : "w-1/2")} d={d + i} />
            <B className={cn("h-3 rounded-full", i % 2 ? "w-2/3" : "w-4/5")} d={d + i} />
          </div>
          <B className="hidden h-8 w-20 shrink-0 rounded-lg sm:block" d={d + i} />
        </div>
      ))}
    </div>
  );
}

/** A list placeholder for a section that loads inside an already-drawn page. */
export function RowsSkeleton({ n = 5, avatar = false, label = "Loading", className }: { n?: number; avatar?: boolean; label?: string; className?: string }) {
  return (
    <Frame label={label} className={className}>
      <Rows n={n} avatar={avatar} />
    </Frame>
  );
}

/** A card-grid placeholder for a section that loads inside an already-drawn page. */
export function CardsSkeleton({ n = 4, label = "Loading", className }: { n?: number; label?: string; className?: string }) {
  return (
    <Frame label={label} className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {Array.from({ length: n }).map((_, i) => <Card key={i} d={i} lines={2} className="h-36" />)}
    </Frame>
  );
}

/** The signed-in top bar, for fallbacks that replace the whole screen. */
export function NavbarSkeleton() {
  return (
    <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 pad-safe-top backdrop-blur-md">
      <div className="section-container flex h-16 items-center justify-between gap-6">
        <B className="h-10 w-10 rounded-xl" />
        <div className="hidden flex-1 items-center justify-center gap-6 lg:flex">
          {[64, 56, 72, 76, 48, 64, 64, 52].map((w, i) => (
            <B key={i} className="h-4 rounded-full" style={{ width: w }} d={i * 0.5} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <B className="hidden h-10 w-20 rounded-full sm:block" />
          <B className="h-9 w-9 rounded-full" />
          <B className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// -- Variants ---------------------------------------------------------------

function GenericSkeleton() {
  return (
    <div className="section-container space-y-8 py-8 sm:py-10">
      <Header />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <Card key={i} d={2 + i} lines={3} className="h-44" />)}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="section-container space-y-4 py-6 sm:py-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-primary/15 p-6">
          <B className="h-7 w-28 rounded-lg bg-primary/20" />
          <B className="mt-4 h-4 w-3/4 rounded-full bg-primary/20" d={1} />
          <B className="mt-2 h-4 w-1/2 rounded-full bg-primary/20" d={2} />
          <div className="h-16" />
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <B className="h-7 w-28 rounded-lg" />
          <B className="mt-4 h-4 w-2/3 rounded-full" d={1} />
          <B className="mt-6 h-10 w-full rounded-xl" d={2} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Card key={i} d={3 + i} lines={3} className="h-48" />)}
      </div>
      <div className="space-y-3 pt-6">
        <B className="h-8 w-64 rounded-lg" d={8} />
        <B className="h-4 w-80 max-w-full rounded-full" d={9} />
      </div>
    </div>
  );
}

function JourneySkeleton() {
  return (
    <div className="section-container space-y-5 py-6 sm:py-8">
      <div className="flex items-center gap-4">
        <B className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <B className="h-3 w-32 rounded-full" d={1} />
          <B className="h-7 w-56 rounded-lg" d={2} />
        </div>
        <B className="hidden h-11 w-36 rounded-xl sm:block" d={1} />
      </div>
      <div className="relative overflow-hidden rounded-2xl border bg-muted/30">
        <B className="h-[62svh] min-h-[420px] w-full rounded-none opacity-60" d={2} />
        {/* The road the 3D world will draw, so the space reads as a map. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-full border-4 border-background/80 bg-background/60 shadow-sm"
              style={{ transform: `translateY(${[24, -18, 12, -26, 8][i]}px)` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatSkeleton({ rail = true }: { rail?: boolean }) {
  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-[480px]">
      {rail && (
        <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-muted/20 p-4 md:flex">
          <B className="h-5 w-24 rounded-full" />
          <B className="h-9 w-full rounded-lg" d={1} />
          <B className="h-9 w-full rounded-lg" d={2} />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <B key={i} className="h-4 rounded-full" style={{ width: `${60 + ((i * 17) % 35)}%` }} d={3 + i} />)}
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col items-center justify-between px-6 py-10">
        <div className="w-full max-w-3xl space-y-4 pt-[8vh]">
          <B className="h-10 w-40 rounded-lg" />
          <B className="h-10 w-96 max-w-full rounded-lg" d={1} />
          <div className="grid grid-cols-2 gap-3 pt-6 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <B key={i} className="h-28 rounded-xl" d={2 + i} />)}
          </div>
        </div>
        <B className="h-24 w-full max-w-3xl rounded-2xl" d={4} />
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="section-container space-y-4 py-6">
      <div className="flex gap-2">
        {[64, 64, 84, 110].map((w, i) => <B key={i} className="h-8 rounded-full" style={{ width: w }} d={i} />)}
      </div>
      <div className="grid h-[70svh] gap-4 md:grid-cols-[18rem_1fr]">
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <B className="h-6 w-20 rounded-md" />
          <B className="h-9 w-full rounded-lg" d={1} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 pt-2">
              <B className="h-10 w-10 shrink-0 rounded-full" d={2 + i} />
              <div className="flex-1 space-y-2">
                <B className="h-3 w-2/3 rounded-full" d={2 + i} />
                <B className="h-3 w-1/2 rounded-full" d={2 + i} />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden rounded-2xl border bg-card md:block" />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="section-container space-y-5 py-6 sm:py-8">
      <Header action />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <B className="h-7 w-48 rounded-lg" d={2} />
        <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <B key={i} className="h-9 w-16 rounded-lg" d={2 + i} />)}</div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="flex justify-center p-3"><B className="h-3 w-8 rounded-full" d={3} /></div>)}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 border-b border-r p-2 sm:h-24">
              <B className="h-3 w-4 rounded-full" d={4 + Math.floor(i / 7)} />
              {i % 5 === 3 && <B className="mt-3 h-4 w-full rounded" d={4 + Math.floor(i / 7)} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListSkeleton({ stats = true }: { stats?: boolean }) {
  return (
    <div className="section-container space-y-6 py-6 sm:py-8">
      <Header action />
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Card key={i} d={2 + i} lines={0} className="h-28" />)}
        </div>
      )}
      <B className="h-11 w-full rounded-xl" d={3} />
      <Rows n={6} d={4} />
    </div>
  );
}

function DocsSkeleton() {
  return (
    <div className="section-container space-y-5 py-6 sm:py-8">
      <Header />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">{[0, 1, 2].map((i) => <B key={i} className="h-9 w-20 rounded-lg" d={2 + i} />)}</div>
        <div className="flex gap-2">{[0, 1, 2].map((i) => <B key={i} className="h-9 w-28 rounded-lg" d={2 + i} />)}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-3">
            <B className="aspect-[4/5] w-full rounded-lg" d={3 + Math.floor(i / 5)} />
            <B className="mt-3 h-3 w-3/4 rounded-full" d={3 + Math.floor(i / 5)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto w-full max-w-[860px] space-y-4 px-4 py-6 sm:px-6">
        <B className="h-9 w-52 rounded-lg" />
        <B className="h-11 w-full rounded-lg" d={1} />
        <div className="space-y-3 rounded-lg bg-card p-10 shadow-sm">
          {Array.from({ length: 14 }).map((_, i) => (
            <B key={i} className="h-3.5 rounded-full" style={{ width: `${i % 5 === 4 ? 45 : 88 + ((i * 7) % 12)}%` }} d={2 + i * 0.4} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <Header wide />
      <B className="h-16 w-full rounded-xl" d={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <B className="h-4 w-24 rounded-full" d={4} />
            <B className="h-11 w-full rounded-lg" d={4} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <B className="h-4 w-24 rounded-full" d={5} />
        <B className="h-64 w-full rounded-lg" d={5} />
      </div>
    </div>
  );
}

function OutcomesSkeleton() {
  return (
    <div className="section-container space-y-5 py-6 sm:py-8">
      <Header wide action />
      <div className="grid gap-8 rounded-2xl border bg-card p-6 sm:p-8 lg:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <B className="h-3 w-20 rounded-full" d={2} />
          <B className="h-20 w-24 rounded-xl" d={3} />
          <B className="h-2 w-full rounded-full" d={4} />
        </div>
        <div className="space-y-4">
          <B className="h-9 w-3/4 rounded-lg" d={2} />
          <B className="h-9 w-1/2 rounded-lg" d={3} />
          <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <B className="h-3 w-16 rounded-full" d={4 + i} />
                <B className="h-4 w-24 rounded-full" d={4 + i} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Rows n={3} d={5} />
        <Rows n={3} d={6} />
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="section-container space-y-8 py-8 sm:py-10">
      <Header wide />
      <div className="grid gap-8 md:grid-cols-[15rem_1fr]">
        <div className="hidden space-y-2 md:block">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
              <B className="h-8 w-8 shrink-0 rounded-lg" d={2 + i * 0.5} />
              <div className="flex-1 space-y-1.5">
                <B className="h-3 w-20 rounded-full" d={2 + i * 0.5} />
                <B className="h-2.5 w-28 rounded-full" d={2 + i * 0.5} />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <B className="h-7 w-40 rounded-lg" d={2} />
          <B className="h-4 w-2/3 rounded-full" d={3} />
          <B className="h-52 w-full rounded-2xl" d={4} />
          <B className="h-40 w-full rounded-2xl" d={5} />
        </div>
      </div>
    </div>
  );
}

function TestPrepSkeleton() {
  return (
    <div className="flex">
      <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r py-6 md:flex">
        {[0, 1, 2, 3, 4].map((i) => <B key={i} className="h-6 w-6 rounded-md" d={i} />)}
      </div>
      <div className="section-container flex-1 space-y-5 py-6 sm:py-8">
        <Header action />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="h-60" d={2} lines={4} />
          <Card className="h-60" d={3} lines={4} />
          <div className="h-60 rounded-2xl bg-primary/15 p-5">
            <B className="h-3 w-16 rounded-full bg-primary/20" d={4} />
            <B className="mt-4 h-7 w-32 rounded-lg bg-primary/20" d={5} />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <B className="h-48 rounded-2xl" d={5} />
          <div className="space-y-3">{[0, 1, 2].map((i) => <B key={i} className="h-14 rounded-xl" d={5 + i} />)}</div>
        </div>
      </div>
    </div>
  );
}

function MarketingSkeleton() {
  return (
    <div className="section-container space-y-10 py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <B className="h-3 w-32 rounded-full" />
        <B className="h-12 w-[36rem] max-w-full rounded-xl" d={1} />
        <B className="h-4 w-[28rem] max-w-full rounded-full" d={2} />
        <B className="h-4 w-[22rem] max-w-full rounded-full" d={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Card key={i} className="h-80" d={3 + i} lines={5} />)}
      </div>
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="relative flex min-h-[100svh] flex-col bg-[hsl(222_30%_10%)]">
      <div className="section-container flex h-16 w-full items-center justify-between">
        <B className="h-8 w-32 rounded-lg bg-white/10" />
        <div className="hidden gap-6 md:flex">{[0, 1, 2, 3].map((i) => <B key={i} className="h-4 w-16 rounded-full bg-white/10" />)}</div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <B className="h-16 w-[34rem] max-w-full rounded-2xl bg-white/10" d={1} />
        <B className="h-16 w-[42rem] max-w-full rounded-2xl bg-white/10" d={2} />
        <B className="mt-4 h-4 w-[30rem] max-w-full rounded-full bg-white/10" d={3} />
        <div className="mt-6 flex gap-3">
          <B className="h-12 w-48 rounded-xl bg-white/15" d={4} />
          <B className="h-12 w-40 rounded-xl bg-white/10" d={4} />
        </div>
      </div>
    </div>
  );
}

function AuthSkeleton() {
  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[1.4fr_1fr]">
      <div className="hidden flex-col justify-center gap-4 bg-muted/40 px-16 lg:flex">
        <B className="h-10 w-4/5 rounded-xl" />
        <B className="h-10 w-3/4 rounded-xl" d={1} />
        <B className="h-10 w-2/3 rounded-xl" d={2} />
      </div>
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4">
          <B className="h-8 w-40 rounded-lg" />
          <B className="h-4 w-56 rounded-full" d={1} />
          <B className="mt-4 h-11 w-full rounded-lg" d={2} />
          <B className="h-11 w-full rounded-lg" d={3} />
          <B className="mt-4 h-11 w-full rounded-lg" d={4} />
          <B className="h-11 w-full rounded-lg" d={5} />
          <B className="h-11 w-full rounded-lg bg-primary/20" d={6} />
        </div>
      </div>
    </div>
  );
}

// -- Routing ----------------------------------------------------------------

export type PageSkeletonKind =
  | "generic" | "dashboard" | "journey" | "advisor" | "messages" | "calendar"
  | "list" | "docs" | "editor" | "form" | "outcomes" | "settings" | "testprep"
  | "marketing" | "landing" | "auth";

const VARIANTS: Record<PageSkeletonKind, () => JSX.Element> = {
  generic: GenericSkeleton,
  dashboard: DashboardSkeleton,
  journey: JourneySkeleton,
  advisor: () => <ChatSkeleton />,
  messages: MessagesSkeleton,
  calendar: CalendarSkeleton,
  list: () => <ListSkeleton />,
  docs: DocsSkeleton,
  editor: EditorSkeleton,
  form: FormSkeleton,
  outcomes: OutcomesSkeleton,
  settings: SettingsSkeleton,
  testprep: TestPrepSkeleton,
  marketing: MarketingSkeleton,
  landing: LandingSkeleton,
  auth: AuthSkeleton,
};

/** Pages that paint their own full-screen chrome, so no navbar goes above them. */
const CHROMELESS: PageSkeletonKind[] = ["landing", "auth", "editor"];

function pageSkeletonFor(pathname: string): PageSkeletonKind {
  const p = pathname.replace(/\/+$/, "") || "/";
  const is = (...prefixes: string[]) => prefixes.some((x) => p === x || p.startsWith(x + "/"));
  if (p === "/") return "landing";
  if (is("/auth", "/teacher/auth", "/reset-password", "/app-login")) return "auth";
  if (is("/docs/d")) return "editor";
  if (p === "/dashboard" || p === "/teacher") return "dashboard";
  if (is("/teacher")) return "list";
  if (is("/journey")) return "journey";
  if (is("/advisor")) return "advisor";
  if (is("/communications")) return "messages";
  if (is("/calendar", "/routine", "/weekly-planner")) return "calendar";
  if (is("/docs")) return "docs";
  if (is("/essays", "/resume", "/application", "/application-builder", "/profile-builder", "/linkedin")) return "form";
  if (is("/outcomes", "/college-readiness", "/admissions-probability")) return "outcomes";
  if (is("/profile")) return "settings";
  if (is("/test-prep")) return "testprep";
  if (is("/pricing", "/about", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/cookie-policy", "/cookies", "/guides")) return "marketing";
  if (is("/activities", "/scholarships", "/leaderboard", "/professors", "/lor", "/requirements", "/recommendations", "/past-admits", "/exemplar-essays", "/admin", "/admin-panel")) return "list";
  return "generic";
}

/**
 * The loading placeholder for a page.
 *
 * `shell` adds the navbar, for fallbacks that replace the whole screen (the
 * auth gate, the top-level Suspense). Inside Layout the real navbar is
 * already up, so it is left off.
 */
export function PageSkeleton({
  kind, pathname, shell = false, label = "Loading page",
}: { kind?: PageSkeletonKind; pathname?: string; shell?: boolean; label?: string }) {
  const k = kind ?? pageSkeletonFor(pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/"));
  const Variant = VARIANTS[k];
  const withNav = shell && !CHROMELESS.includes(k);
  return (
    <Frame label={label} className={cn(shell && "min-h-[100svh] bg-background")}>
      {withNav && <NavbarSkeleton />}
      <Variant />
    </Frame>
  );
}
