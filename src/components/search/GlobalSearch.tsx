import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  Copy,
  FileText,
  Loader2,
  Moon,
  Search,
  Trophy,
  Compass,
  CornerDownLeft,
  LayoutGrid,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { documentsDb } from "@/integrations/supabase/documents";
import { NAVBAR_MAIN_LINKS } from "@/components/layout/Navbar";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { toggleZen, isZenShortcut, useZenMode } from "@/lib/zen";
import { OPEN_SEARCH_EVENT } from "@/lib/search";
import { toast } from "sonner";

/**
 * The search window: Ctrl + K (Cmd + K on a Mac), from anywhere in the app.
 *
 * Built for looking something up while in the middle of something else, such
 * as an olympiad's dates while writing the essay about it. So it is a window
 * over the page rather than a trip to another one: the highlighted result is
 * read in the pane beside the list, Enter copies it, and Esc puts you back
 * with the caret exactly where it was. Only Ctrl/Cmd + Enter leaves the page.
 *
 * It searches, in order: the student's own record (competitions, projects,
 * roles), their notes and docs, their verified badges, the olympiad and
 * competition calendar, the opportunities catalogue, the scholarship
 * catalogue, and finally pages and commands. Everything is loaded once, on
 * first open, and filtered locally, so typing never waits on the network.
 */


type Group = "record" | "notes" | "badges" | "olympiads" | "opportunities" | "scholarships" | "pages" | "actions";

const GROUP_LABEL: Record<Group, string> = {
  record: "Your record",
  notes: "Your notes and docs",
  badges: "Verified badges",
  olympiads: "Olympiads and competitions",
  opportunities: "Opportunities",
  scholarships: "Scholarships",
  pages: "Pages",
  actions: "Commands",
};

const GROUP_ICON: Record<Group, React.ComponentType<{ className?: string }>> = {
  record: Trophy,
  notes: FileText,
  badges: BadgeCheck,
  olympiads: Award,
  opportunities: Compass,
  scholarships: Award,
  pages: LayoutGrid,
  actions: Moon,
};

const GROUP_ORDER: Group[] = ["record", "notes", "badges", "olympiads", "opportunities", "scholarships", "pages", "actions"];
const PER_GROUP = 6;

interface Hit {
  id: string;
  group: Group;
  title: string;
  subtitle?: string;
  /** Lower-cased text the query is matched against. */
  haystack: string;
  /** Rows of label/value shown in the preview pane. */
  facts?: [string, string][];
  body?: string;
  /** In-app route, opened by Ctrl/Cmd + Enter or the Open button. */
  href?: string;
  /** Outside link, shown in the preview. */
  url?: string;
  /** Pages and commands run on Enter instead of copying. */
  run?: () => void;
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function snippet(text: string, q: string, len = 220) {
  const flat = text.replace(/[#*_>`]+/g, "").replace(/\s+/g, " ").trim();
  if (!q) return flat.slice(0, len);
  const i = flat.toLowerCase().indexOf(q);
  if (i < 0) return flat.slice(0, len);
  const start = Math.max(0, i - 60);
  return (start > 0 ? "..." : "") + flat.slice(start, start + len);
}

/** Every word in the query must appear; earlier and title hits rank higher. */
function score(hit: Hit, words: string[]): number {
  if (!words.length) return 1;
  let s = 0;
  const title = hit.title.toLowerCase();
  for (const w of words) {
    const at = hit.haystack.indexOf(w);
    if (at < 0) return 0;
    s += title.includes(w) ? (title.startsWith(w) ? 6 : 4) : 1;
  }
  return s;
}

const RECORD_BUCKETS: [string, string][] = [
  ["competitions", "Competition"],
  ["projects", "Project"],
  ["research_outputs", "Research"],
  ["leadership_roles", "Leadership"],
  ["service_roles", "Service"],
  ["internships", "Internship"],
  ["creative_works", "Creative work"],
  ["courses", "Course"],
];

async function loadHits(userId: string): Promise<Hit[]> {
  const hits: Hit[] = [];

  const [outcomes, docs, badges, calendarMod, catalogueMod, scholarshipMod] = await Promise.all([
    supabase.from("outcomes_data").select("*").eq("user_id", userId).maybeSingle(),
    documentsDb
      .from("documents")
      .select("id, title, content, kind, updated_at, trashed_at")
      .eq("user_id", userId)
      .is("trashed_at", null)
      .eq("kind", "doc")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("verified_credentials" as never).select("*").eq("user_id", userId),
    import("@/lib/competitionCalendar").catch(() => null),
    import("@/lib/activities").then((m) => m.loadActivityCatalogue()).catch(() => null),
    import("@/lib/scholarships").catch(() => null),
  ]);

  // Your record
  const row = (outcomes.data ?? null) as Record<string, unknown> | null;
  if (row) {
    for (const [bucket, label] of RECORD_BUCKETS) {
      const list = Array.isArray(row[bucket]) ? (row[bucket] as Record<string, unknown>[]) : [];
      list.forEach((e, i) => {
        const title = clean(e.name) || clean(e.title) || clean(e.role) || clean(e.course) || label;
        const facts: [string, string][] = [];
        for (const [k, v] of Object.entries(e)) {
          if (["id", "source", "evidenceState", "name", "title"].includes(k)) continue;
          const s = clean(v);
          if (s && s.length < 200) facts.push([k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").toLowerCase(), s]);
        }
        const body = clean(e.description) || clean(e.impact) || clean(e.outcome);
        hits.push({
          id: `record:${bucket}:${i}`,
          group: "record",
          title,
          subtitle: [label, clean(e.level), clean(e.result) || clean(e.organization)].filter(Boolean).join(" \u00b7 "),
          haystack: `${title} ${label} ${facts.map((f) => f[1]).join(" ")} ${body}`.toLowerCase(),
          facts: [["type", label], ...facts.slice(0, 8)],
          body,
          href: "/outcomes",
          url: clean(e.link) || undefined,
        });
      });
    }
  }

  // Notes and docs
  for (const d of ((docs.data ?? []) as { id: string; title: string; content: string | null; updated_at: string }[])) {
    const content = d.content ?? "";
    hits.push({
      id: `doc:${d.id}`,
      group: "notes",
      title: d.title || "Untitled",
      subtitle: `Edited ${fmtDate(d.updated_at)}`,
      haystack: `${d.title} ${content}`.toLowerCase(),
      body: content,
      href: `/docs/d/${d.id}`,
    });
  }

  // Verified badges
  for (const b of ((badges.error ? [] : badges.data ?? []) as Record<string, unknown>[])) {
    const name = clean(b.name);
    hits.push({
      id: `badge:${clean(b.id)}`,
      group: "badges",
      title: name,
      subtitle: [clean(b.issuer_name), fmtDate(clean(b.issued_on))].filter(Boolean).join(" \u00b7 "),
      haystack: `${name} ${clean(b.issuer_name)} ${(Array.isArray(b.skills) ? b.skills : []).join(" ")}`.toLowerCase(),
      facts: [
        ["issuer", clean(b.issuer_name)],
        ["issued", fmtDate(clean(b.issued_on))],
        ["status", b.revoked ? "Revoked by issuer" : "Verified on Credly"],
      ].filter((f) => f[1]) as [string, string][],
      body: clean(b.description),
      url: clean(b.badge_url),
      href: clean(b.category) === "test" ? "/test-prep/sat" : "/activities",
    });
  }

  // Olympiads and competitions, with their dates.
  for (const c of calendarMod?.competitionCalendar ?? []) {
    const facts: [string, string][] = [];
    if (c.registrationOpen) facts.push(["registration opens", fmtDate(c.registrationOpen)]);
    if (c.registrationClose) facts.push(["registration closes", fmtDate(c.registrationClose)]);
    if (c.competitionStart) facts.push(["competition", `${fmtDate(c.competitionStart)}${c.competitionEnd ? ` to ${fmtDate(c.competitionEnd)}` : ""}`]);
    if (c.resultDate) facts.push(["results", fmtDate(c.resultDate)]);
    if (c.eligibility) facts.push(["eligibility", c.eligibility]);
    if (c.format) facts.push(["format", c.format]);
    if (c.cost) facts.push(["cost", c.cost]);
    facts.push(["where", c.country.length ? c.country.join(", ") : "Global / online"]);
    hits.push({
      id: `comp:${c.activityId}`,
      group: "olympiads",
      title: c.name,
      subtitle: [c.category, c.registrationClose ? `closes ${fmtDate(c.registrationClose)}` : c.expectedReopenMonth ? `reopens ${c.expectedReopenMonth}` : ""]
        .filter(Boolean)
        .join(" \u00b7 "),
      haystack: `${c.name} ${c.category} ${c.relevantMajors.join(" ")} ${c.notes ?? ""} olympiad competition`.toLowerCase(),
      facts,
      body: c.notes,
      url: c.url,
      href: "/activities",
    });
  }

  // Opportunities catalogue
  for (const a of catalogueMod?.activities ?? []) {
    if (hits.some((h) => h.id === `comp:${a.id}`)) continue;
    hits.push({
      id: `act:${a.id}`,
      group: "opportunities",
      title: a.name,
      subtitle: [a.type, a.category, a.difficulty, a.cost].join(" \u00b7 "),
      haystack: `${a.name} ${a.category} ${a.type} ${a.relevantMajors.join(" ")} ${a.description}`.toLowerCase(),
      facts: [
        ["type", a.type],
        ["level", a.difficulty],
        ["cost", a.cost],
        ["grades", a.gradeSuitability],
        ...(a.deadline ? ([["deadline", a.deadline]] as [string, string][]) : []),
      ],
      body: `${a.detailedDescription || a.description}\n\nWhy it counts: ${a.whyRelevant}`,
      url: a.learnMoreUrl,
      href: "/activities",
    });
  }

  // Scholarships catalogue
  for (const s of scholarshipMod?.scholarships ?? []) {
    hits.push({
      id: `sch:${s.id}`,
      group: "scholarships",
      title: s.name,
      subtitle: [s.provider, s.amount, s.deadline ? `due ${fmtDate(s.deadline)}` : ""].filter(Boolean).join(" \u00b7 "),
      haystack: `${s.name} ${s.provider} ${s.country} ${s.eligibility.fieldOfStudy.join(" ")} scholarship`.toLowerCase(),
      facts: [
        ["provider", s.provider],
        ["amount", s.amount],
        ["deadline", fmtDate(s.deadline)],
        ["country", s.country],
        ["for", s.eligibility.fieldOfStudy.join(", ")],
      ].filter((f) => f[1]) as [string, string][],
      body: s.description,
      url: s.applicationLink,
      href: "/scholarships",
    });
  }

  return hits;
}

function staticHits(navigate: (to: string) => void, zenOn: boolean): Hit[] {
  const pages = [
    ...NAVBAR_MAIN_LINKS.map((l) => ({ href: l.href, label: l.label })),
    { href: "/dashboard", label: "Dashboard" },
    { href: "/docs", label: "Docs" },
    { href: "/essays", label: "Essay Builder" },
    { href: "/scholarships", label: "Scholarships" },
    { href: "/test-prep/sat", label: "SAT prep" },
    { href: "/application-builder", label: "Application Builder" },
    { href: "/resume", label: "Resume Builder" },
    { href: "/requirements", label: "Requirements" },
    { href: "/admissions-probability", label: "Admissions" },
    ...ROUTINE_DESTINATIONS.map((d) => ({ href: d.href, label: d.label })),
  ];
  const seen = new Set<string>();
  const out: Hit[] = [];
  for (const p of pages) {
    if (seen.has(p.href)) continue;
    seen.add(p.href);
    out.push({
      id: `page:${p.href}`,
      group: "pages",
      title: p.label,
      subtitle: p.href,
      haystack: `${p.label} ${p.href}`.toLowerCase(),
      href: p.href,
      run: () => navigate(p.href),
    });
  }
  out.push({
    id: "action:zen",
    group: "actions",
    title: zenOn ? "Leave Zen mode" : "Zen mode",
    subtitle: "Hide everything but the task in front of you \u00b7 Ctrl + .",
    haystack: "zen mode focus declutter hide distraction",
    run: () => toggleZen(),
  });
  return out;
}

function copyText(hit: Hit): string {
  const lines = [hit.title];
  if (hit.subtitle) lines.push(hit.subtitle);
  for (const [k, v] of hit.facts ?? []) lines.push(`${k[0].toUpperCase()}${k.slice(1)}: ${v}`);
  if (hit.body) lines.push("", hit.body.trim());
  if (hit.url) lines.push("", hit.url);
  return lines.join("\n");
}

function isEditable(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement).isContentEditable;
}

export function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zenOn] = useZenMode();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string>("");
  const loadedFor = useRef<string | null>(null);

  // Shortcuts. Ctrl/Cmd + K opens search from anywhere, even mid-sentence in
  // an editor, because it is meant for exactly that. Ctrl/Cmd + . toggles Zen,
  // but not while typing in a field, where it could be a text shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (isZenShortcut(e) && !isEditable(document.activeElement)) {
        e.preventDefault();
        toggleZen();
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  // Load once per user, on first open; refresh in the background on reopen.
  useEffect(() => {
    if (!open || !user) return;
    const first = loadedFor.current !== user.id;
    if (first) setLoading(true);
    loadedFor.current = user.id;
    let cancelled = false;
    loadHits(user.id)
      .then((h) => !cancelled && setData(h))
      .catch(() => !cancelled && setData((d) => d ?? []))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const all = [...(data ?? []), ...staticHits(navigate, zenOn)];
    const byGroup = new Map<Group, { hit: Hit; s: number }[]>();
    for (const hit of all) {
      // With nothing typed, show only what is yours plus pages and commands;
      // the catalogues are thousands of rows nobody asked for yet.
      if (!words.length && ["olympiads", "opportunities", "scholarships"].includes(hit.group)) continue;
      const s = score(hit, words);
      if (!s) continue;
      const list = byGroup.get(hit.group) ?? [];
      list.push({ hit, s });
      byGroup.set(hit.group, list);
    }
    return GROUP_ORDER.map((g) => ({
      group: g,
      hits: (byGroup.get(g) ?? [])
        .sort((a, b) => b.s - a.s)
        .slice(0, words.length ? PER_GROUP : g === "pages" ? 8 : 4)
        .map((x) => x.hit),
    })).filter((g) => g.hits.length);
  }, [data, query, navigate, zenOn]);

  const flat = useMemo(() => results.flatMap((g) => g.hits), [results]);
  const current = flat.find((h) => h.id === active) ?? flat[0];

  const close = () => setOpen(false);

  const choose = useCallback(
    (hit: Hit, leave: boolean) => {
      if (hit.run) {
        hit.run();
        close();
        return;
      }
      if (leave && hit.href) {
        navigate(hit.href);
        close();
        return;
      }
      void navigator.clipboard
        ?.writeText(copyText(hit))
        .then(() => toast.success("Copied", { description: hit.title }))
        .catch(() => toast.error("Couldn't copy on this browser"));
    },
    [navigate],
  );

  if (!user) return null;

  const q = query.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DialogContent
        className="top-[12vh] max-w-[min(56rem,calc(100vw-1.5rem))] translate-y-0 gap-0 overflow-hidden p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Search Pathforge</DialogTitle>
        <DialogDescription className="sr-only">
          Search your record, notes, badges, olympiads, opportunities and scholarships.
        </DialogDescription>
        <CommandPrimitive
          shouldFilter={false}
          value={current?.id ?? ""}
          onValueChange={setActive}
          loop
          className="flex max-h-[min(34rem,76vh)] w-full min-w-0 flex-col overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && current) {
              e.preventDefault();
              choose(current, true);
            }
          }}
        >
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search olympiads, your notes, badges, scholarships..."
              className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
          </div>

          <div className="flex min-h-0 flex-1">
            <CommandPrimitive.List className="min-h-0 w-full overflow-y-auto overscroll-contain p-2 md:w-[46%] md:border-r md:border-border">
              <CommandPrimitive.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
                {loading ? "Loading..." : "Nothing matches that."}
              </CommandPrimitive.Empty>
              {results.map(({ group, hits }) => {
                const Icon = GROUP_ICON[group];
                return (
                  <CommandPrimitive.Group
                    key={group}
                    heading={GROUP_LABEL[group]}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {hits.map((hit) => (
                      <CommandPrimitive.Item
                        key={hit.id}
                        value={hit.id}
                        onSelect={() => choose(hit, false)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left data-[selected=true]:bg-muted"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{hit.title}</span>
                          {hit.subtitle && (
                            <span className="block truncate text-[12px] text-muted-foreground">{hit.subtitle}</span>
                          )}
                        </span>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                );
              })}
            </CommandPrimitive.List>

            {/* The answer, read in place. */}
            <aside className="hidden min-h-0 flex-1 overflow-y-auto p-5 md:block" aria-live="polite">
              {current ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {GROUP_LABEL[current.group]}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight">{current.title}</h3>
                  {current.subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{current.subtitle}</p>}
                  {!!current.facts?.length && (
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                      {current.facts.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="capitalize text-muted-foreground">{k}</dt>
                          <dd className="min-w-0 break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {current.body && (
                    <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/90">
                      {current.group === "notes" ? snippet(current.body, q, 600) : current.body.slice(0, 900)}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {!current.run && (
                      <button
                        type="button"
                        onClick={() => choose(current, false)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-muted"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy details
                      </button>
                    )}
                    {current.url && (
                      <a
                        href={current.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-muted"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" /> Official page
                      </a>
                    )}
                    {current.href && (
                      <button
                        type="button"
                        onClick={() => choose(current, true)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-muted"
                      >
                        Open in Pathforge
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Type to search. Results open here, so you never leave what you were doing.
                </p>
              )}
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" /> {current?.run ? "Go" : "Copy"}
            </span>
            <span className="hidden sm:inline">Ctrl/Cmd + Enter to open the page</span>
            <span className="ml-auto hidden sm:inline">Ctrl/Cmd + . for Zen mode</span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
