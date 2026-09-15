import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Bug,
  Copy,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bugsDb } from "@/integrations/supabase/bugs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BUG_SOURCE_LABELS,
  BUG_STATUSES,
  BUG_STATUS_LABELS,
  BUG_SEVERITIES,
  type BugReport,
  type BugSeverity,
  type BugSource,
  type BugStatus,
} from "@/lib/bugs/types";

/**
 * Admin -> Bugs.
 *
 * Everything broken in Pathforge, in one list: what a user reported by hand,
 * and what the app caught on its own — render crashes, unhandled rejections,
 * edge functions returning 500, requests that never came back, and our own
 * `console.error` calls.
 *
 * Two decisions shape this screen.
 *
 * It is ordered by **last seen**, not by created. A bug filed three weeks ago
 * that fired again eight minutes ago is the live problem; a fresh row that has
 * not recurred since is not. Sorting by creation date buries exactly the rows
 * worth opening.
 *
 * And it counts **people, not events**. `occurrences` is easy to produce and
 * misleading — one user stuck in a render loop can manufacture ten thousand of
 * them — so the affected-user count sits next to it. A bug hitting 40 people
 * once matters more than one hitting a single person 4,000 times.
 */

const PAGE_SIZE = 200;

/**
 * Severity carries a colour, but only two of them.
 *
 * Four severities in four different hues turns the list into a swatch board
 * where nothing stands out. Critical and high are the rows an admin must not
 * scroll past, so they get the destructive tone; the other two get weight.
 */
const severityTone: Record<BugSeverity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-destructive/15 text-destructive border border-destructive/30",
  medium: "bg-muted text-foreground",
  low: "bg-muted/60 text-muted-foreground",
};

const statusTone: Record<BugStatus, string> = {
  open: "bg-foreground text-background",
  triaged: "bg-muted text-foreground",
  in_progress: "bg-muted text-foreground",
  resolved: "bg-muted/60 text-muted-foreground",
  wont_fix: "bg-muted/60 text-muted-foreground",
  duplicate: "bg-muted/60 text-muted-foreground",
};

type SourceFilter = BugSource | "all";
type StatusFilter = BugStatus | "all" | "unresolved";

export function AdminBugs() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("unresolved");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BugReport | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    const { data, error } = await bugsDb
      .from("bug_reports")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) {
      toast.error(`Could not load bugs: ${error.message}`);
    } else {
      setRows((data as BugReport[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Live updates.
   *
   * A bug console that needs a manual refresh is a bug console nobody trusts:
   * you cannot tell "nothing is broken" from "nothing has been fetched since
   * you opened the tab". The reload is debounced because an error in a render
   * loop produces an UPDATE per occurrence, and refetching 200 rows for each
   * would make the admin page the heaviest thing on the platform.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("admin-bug-reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "bug_reports" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => void load(true), 1500);
      })
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const stats = useMemo(() => {
    const unresolved = rows.filter((r) => r.status !== "resolved" && r.status !== "wont_fix");
    const dayAgo = Date.now() - 86_400_000;
    const people = new Set<string>();
    unresolved.forEach((r) => (r.affected_users ?? []).forEach((u) => people.add(u)));
    return {
      open: unresolved.length,
      urgent: unresolved.filter((r) => r.severity === "critical" || r.severity === "high").length,
      today: rows.filter((r) => new Date(r.last_seen_at).getTime() > dayAgo).length,
      people: people.size,
      humans: unresolved.filter((r) => r.source === "user_report").length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "unresolved") {
        if (r.status === "resolved" || r.status === "wont_fix") return false;
      } else if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }
      if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
      if (!q) return true;
      return [r.title, r.error_message, r.route, r.function_name, r.description, r.reporter_email]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [rows, query, statusFilter, sourceFilter]);

  /** Counts per source, so the filter tells you what is there before you pick. */
  const sourceCounts = useMemo(() => {
    const counts = new Map<BugSource, number>();
    rows.forEach((r) => counts.set(r.source, (counts.get(r.source) ?? 0) + 1));
    return counts;
  }, [rows]);

  const patch = async (id: string, values: Partial<BugReport>) => {
    // Optimistic: an admin triaging twenty rows should not wait for a round
    // trip each time. A failure reloads from the server rather than trying to
    // reverse the edit by hand.
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...values } : prev));
    const { error } = await bugsDb
      .from("bug_reports")
      .update(values as never)
      .eq("id", id);
    if (error) {
      toast.error(`Could not save: ${error.message}`);
      void load(true);
    }
  };

  const setStatus = (row: BugReport, status: BugStatus) => {
    const closing = status === "resolved" || status === "wont_fix";
    void patch(row.id, {
      status,
      resolved_at: closing ? new Date().toISOString() : null,
      resolved_by: closing ? (user?.id ?? null) : null,
    });
  };

  const remove = async (row: BugReport) => {
    const { error } = await bugsDb.from("bug_reports").delete().eq("id", row.id);
    if (error) {
      toast.error(`Could not delete: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setSelected((prev) => (prev?.id === row.id ? null : prev));
    setConfirmDelete(null);
    toast.success("Report deleted");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Bug className="h-6 w-6" /> Bugs
          </h2>
          <p className="text-muted-foreground">
            Everything broken, reported by users or caught automatically.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Unresolved" value={stats.open} />
        <Stat label="Critical or blocking" value={stats.urgent} emphasise={stats.urgent > 0} />
        <Stat label="Users affected" value={stats.people} />
        <Stat label="Reported by people" value={stats.humans} />
        <Stat label="Seen in last 24h" value={stats.today} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search message, route, edge function, reporter"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Unresolved</SelectItem>
            <SelectItem value="all">Any status</SelectItem>
            {BUG_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {BUG_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Every source</SelectItem>
            {(Object.keys(BUG_SOURCE_LABELS) as BugSource[]).map((s) => (
              <SelectItem key={s} value={s}>
                {BUG_SOURCE_LABELS[s]} ({sourceCounts.get(s) ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-14 text-center">
            <p className="text-base font-medium text-foreground">
              {rows.length === 0 ? "Nothing has broken yet" : "No bugs match these filters"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {rows.length === 0
                ? "Reports land here the moment a user presses Report a bug, or the app catches a crash, a failed edge function or a request that did not come back."
                : "Widen the status or source filter, or clear the search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Not a <table>: each row is a button that opens the detail sheet,
              and a clickable table row is worse for keyboard and screen
              readers than a list of real buttons. */}
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5"
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    severityTone[r.severity],
                  )}
                >
                  {r.severity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {r.title}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{BUG_SOURCE_LABELS[r.source]}</span>
                    {r.route && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-mono">{r.route}</span>
                      </>
                    )}
                    {r.function_name && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-mono">{r.function_name}</span>
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span>{formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true })}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 pt-0.5">
                  {(r.affected_users?.length ?? 0) > 1 && (
                    <span
                      className="flex items-center gap-1 text-[11px] text-muted-foreground"
                      title={`${r.affected_users.length} users affected`}
                    >
                      <Users className="h-3 w-3" />
                      {r.affected_users.length}
                    </span>
                  )}
                  {r.occurrences > 1 && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      ×{r.occurrences}
                    </span>
                  )}
                  <Badge className={cn("text-[10px]", statusTone[r.status])} variant="secondary">
                    {BUG_STATUS_LABELS[r.status]}
                  </Badge>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} loaded
        {rows.length === PAGE_SIZE ? ` (newest ${PAGE_SIZE})` : ""}.
      </p>

      <BugDetail
        bug={selected}
        onClose={() => setSelected(null)}
        onStatus={setStatus}
        onPatch={patch}
        onDelete={setConfirmDelete}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              The report and its stack trace are removed permanently. If the underlying bug fires
              again it will be filed as a new report, with its history and occurrence count starting
              from zero. Resolving it instead keeps that history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && void remove(confirmDelete)}
            >
              Delete report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasise,
}: {
  label: string;
  value: number;
  emphasise?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div
        className={cn(
          "font-display text-2xl font-semibold tabular-nums",
          emphasise ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function BugDetail({
  bug,
  onClose,
  onStatus,
  onPatch,
  onDelete,
}: {
  bug: BugReport | null;
  onClose: () => void;
  onStatus: (row: BugReport, status: BugStatus) => void;
  onPatch: (id: string, values: Partial<BugReport>) => Promise<void>;
  onDelete: (row: BugReport) => void;
}) {
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(bug?.admin_notes ?? "");
  }, [bug?.id, bug?.admin_notes]);

  if (!bug) return null;

  /** The whole report as text, for pasting into an issue or a chat. */
  const copyAll = async () => {
    const text = [
      `# ${bug.title}`,
      ``,
      `Source: ${BUG_SOURCE_LABELS[bug.source]}`,
      `Severity: ${bug.severity} · Status: ${BUG_STATUS_LABELS[bug.status]}`,
      `Route: ${bug.route ?? "unknown"}`,
      bug.function_name ? `Edge function: ${bug.function_name}` : null,
      bug.http_status ? `HTTP status: ${bug.http_status}` : null,
      `Seen ${bug.occurrences}× · ${bug.affected_users?.length ?? 0} users · first ${format(
        new Date(bug.first_seen_at),
        "PPp",
      )} · last ${format(new Date(bug.last_seen_at), "PPp")}`,
      `Build: ${bug.app_version ?? "unknown"}`,
      `Browser: ${bug.user_agent ?? "unknown"} (${bug.viewport ?? "?"})`,
      bug.reporter_email ? `Reporter: ${bug.reporter_email}` : null,
      ``,
      bug.description ? `## Description\n${bug.description}\n` : null,
      bug.error_message ? `## Error\n${bug.error_message}\n` : null,
      bug.error_stack ? `## Stack\n${bug.error_stack}\n` : null,
      bug.component_stack ? `## Component stack\n${bug.component_stack}\n` : null,
      bug.breadcrumbs?.length
        ? `## Leading up to it\n${bug.breadcrumbs
            .map((b) => `${(b.t / 1000).toFixed(1)}s  ${b.kind.padEnd(8)} ${b.label}`)
            .join("\n")}`
        : null,
    ]
      .filter((l) => l !== null)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Report copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await onPatch(bug.id, { admin_notes: notes.trim() || null });
    setSavingNotes(false);
    toast.success("Notes saved");
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <div className="space-y-5 pt-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  severityTone[bug.severity],
                )}
              >
                {bug.severity}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {BUG_SOURCE_LABELS[bug.source]}
              </Badge>
              {bug.http_status && (
                <Badge variant="secondary" className="text-[10px]">
                  HTTP {bug.http_status}
                </Badge>
              )}
            </div>
            {/* SheetTitle, not a plain h3: Radix wires the dialog's accessible
                name to it, and without one a screen reader announces an
                unlabelled dialog. (The console error Radix raises about this
                was itself the first thing the new capture engine filed.) */}
            <SheetTitle className="mt-2 text-base font-semibold leading-snug text-foreground">
              {bug.title}
            </SheetTitle>
            <SheetDescription className="mt-1 text-xs text-muted-foreground">
              Seen {bug.occurrences}
              {bug.occurrences === 1 ? " time" : " times"}
              {(bug.affected_users?.length ?? 0) > 0 &&
                ` across ${bug.affected_users.length} ${
                  bug.affected_users.length === 1 ? "user" : "users"
                }`}
              {" · first "}
              {formatDistanceToNow(new Date(bug.first_seen_at), { addSuffix: true })}
              {" · last "}
              {formatDistanceToNow(new Date(bug.last_seen_at), { addSuffix: true })}
            </SheetDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={bug.status} onValueChange={(v) => onStatus(bug, v as BugStatus)}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUG_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BUG_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={bug.severity}
              onValueChange={(v) => void onPatch(bug.id, { severity: v as BugSeverity })}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUG_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => void copyAll()}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-destructive hover:text-destructive"
              onClick={() => onDelete(bug)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Facts
            rows={[
              ["Route", bug.route],
              ["Edge function", bug.function_name],
              ["Reporter", bug.reporter_email],
              ["Build", bug.app_version],
              ["Screen", bug.viewport],
              ["Browser", bug.user_agent],
            ]}
          />

          {bug.description && (
            <Section title="What the user said">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                {bug.description}
              </p>
            </Section>
          )}

          {bug.error_message && (
            <Section title="Error">
              <Pre>{bug.error_message}</Pre>
            </Section>
          )}

          {bug.error_stack && (
            <Section title="Stack trace">
              <Pre>{bug.error_stack}</Pre>
            </Section>
          )}

          {bug.component_stack && (
            <Section title="Component stack">
              <Pre>{bug.component_stack}</Pre>
            </Section>
          )}

          {bug.breadcrumbs?.length > 0 && (
            <Section title={`Leading up to it (${bug.breadcrumbs.length})`}>
              <ol className="space-y-1">
                {bug.breadcrumbs.map((b, i) => (
                  <li key={i} className="flex gap-2 text-[12px] leading-relaxed">
                    <span className="w-12 shrink-0 text-right font-mono text-muted-foreground tabular-nums">
                      {(b.t / 1000).toFixed(1)}s
                    </span>
                    <span className="w-16 shrink-0 text-muted-foreground">{b.kind}</span>
                    <span className="min-w-0 flex-1 break-words text-foreground">{b.label}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {bug.context && Object.keys(bug.context).length > 0 && (
            <Section title="Context">
              <Pre>{JSON.stringify(bug.context, null, 2)}</Pre>
            </Section>
          )}

          <Section title="Internal notes">
            <Label htmlFor="bug-notes" className="sr-only">
              Internal notes
            </Label>
            <Textarea
              id="bug-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What you found, what you tried, who is on it."
              className="resize-none text-[13px]"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => void saveNotes()}
              disabled={savingNotes || notes === (bug.admin_notes ?? "")}
            >
              {savingNotes && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save notes
            </Button>
          </Section>

          <p className="pb-6 font-mono text-[10px] text-muted-foreground">
            {bug.fingerprint}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground">
      {children}
    </pre>
  );
}

/** Label/value pairs, skipping anything the capture did not have. */
function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  const present = rows.filter(([, v]) => Boolean(v));
  if (present.length === 0) return null;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 sm:grid-cols-[auto,1fr]">
      {present.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
          <dd className="mb-1 break-all font-mono text-[11px] text-foreground sm:mb-0">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
