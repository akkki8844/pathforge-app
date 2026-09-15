import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Mail,
  Building2,
  UserRound,
  BookOpen,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SmoothTabs } from "@/components/ui/smooth-tabs";
import { cn } from "@/lib/utils";
import {
  RecommenderStatus,
  STATUS_LABELS,
  STATUS_ORDER,
  useRecommenders,
  type Recommender,
  type RecommenderInput,
} from "@/hooks/useRecommenders";
import { useBragSheets } from "@/hooks/useBragSheets";
import { BragSheetPanel } from "@/components/lor/BragSheetPanel";
import { PacketSection } from "@/components/lor/PacketSection";
import { StrategyCard } from "@/components/lor/StrategyCard";
import { StrengthSection } from "@/components/lor/StrengthSection";
import { RequestEmailSection } from "@/components/lor/RequestEmailSection";
import { PortalLinkSection } from "@/components/lor/PortalLinkSection";
import { LetterStanding } from "@/components/lor/LetterStanding";
import { ProfessorsPanel } from "@/components/lor/ProfessorsPanel";
import { personInitials, withoutHonorific } from "@/lib/personName";

import { CollegeLogo } from "@/components/CollegeLogo";

/**
 * Professors.
 *
 * Two jobs on one route: tracking the people writing your letters, and finding
 * faculty worth emailing in the first place.
 *
 * What changed, and why:
 *
 * The status of a letter is a pipeline, not a filter dimension, and the page
 * treated it as one. Six filter pills sat above the list, each with its own
 * count badge, so a student with five recommenders could press a pill and see
 * exactly one of them. Every row then repeated its status as a coloured chip,
 * in a different hue per status: emerald, amber, blue, indigo, grey, plus four
 * more hues on the deadline chip beside it. That is nine colours carrying no
 * information the list did not already have. The list is grouped by stage now,
 * strongest signal first, so the stage is the heading a row sits under and the
 * whole rainbow is gone.
 *
 * Search is rendered only once there is enough on file to need it. Under seven
 * recommenders every one of them is already on screen, and a search box over
 * five rows is a control that can only ever hide four of them.
 *
 * The primary action follows the tab. It used to be "Add recommender" on all
 * three, so two thirds of the time the most prominent button on the page did
 * something unrelated to what the reader was looking at.
 *
 * The readiness model in `@/lib/lorReadiness` is unchanged; `LetterStanding` is what
 * renders it now, in place of the header ring that has been retired.
 */

const emptyInput: RecommenderInput = {
  name: "",
  email: "",
  position: "",
  subject: "",
  school: "",
  relationship_duration: "",
  status: "not_requested",
  notes: "",
  due_date: null,
  submitted_at: null,
};

/** Below this the whole list fits on screen and a search box only hides rows. */
const SEARCH_THRESHOLD = 7;

type TabId = "recommenders" | "professors" | "brag";

export default function LOR() {
  const { list, create, update, remove } = useRecommenders();
  /*
   * Read here as well as in the panel purely to know whether the brag tab has
   * anything on it yet. React Query serves both callers the same cached list,
   * so this costs one extra subscription and no extra request.
   */
  const bragSheets = useBragSheets().list.data ?? [];
  const [tab, setTab] = useState<TabId>("recommenders");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Recommender | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<RecommenderInput>(emptyInput);
  const [bragNonce, setBragNonce] = useState(0);

  // Memoised so the empty-array fallback is not a new array identity on every
  // render, which would re-run every derivation below it.
  const items = useMemo(() => list.data ?? [], [list.data]);
  const showSearch = items.length >= SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = showSearch ? query.trim().toLowerCase() : "";
    if (!q) return items;
    return items.filter((r) =>
      [r.name, r.subject, r.school, r.position, r.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [items, query, showSearch]);

  /**
   * The list, in pipeline order.
   *
   * Empty stages are dropped rather than printed as "Submitted (0)": a stage
   * nobody has reached is not a fact worth a heading, and keeping them made
   * five headings out of two real ones.
   */
  const stages = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        rows: filtered.filter((r) => r.status === status),
      })).filter((s) => s.rows.length > 0),
    [filtered]
  );

  const openCreate = () => {
    setDraft(emptyInput);
    setCreating(true);
  };

  const openEdit = (r: Recommender) => {
    setEditing(r);
    setDraft({
      name: r.name,
      email: r.email ?? "",
      position: r.position ?? "",
      subject: r.subject ?? "",
      school: r.school ?? "",
      relationship_duration: r.relationship_duration ?? "",
      status: r.status,
      notes: r.notes ?? "",
      due_date: r.due_date,
      submitted_at: r.submitted_at,
    });
  };

  const closeSheet = () => {
    setCreating(false);
    setEditing(null);
  };

  const submit = async () => {
    if (!draft.name.trim()) return;
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: draft });
    } else {
      await create.mutateAsync(draft);
    }
    closeSheet();
  };

  /*
   * One primary action, and it is whatever the open tab is for. Find
   * Professors has none here on purpose: its search form carries its own
   * submit button, and a second primary button in the header would compete
   * with it for the same intent.
   */
  const action =
    tab === "recommenders"
      ? { label: "Add recommender", onClick: openCreate }
      : // An empty brag tab states its own call to action beside the sentence
        // explaining what a brag sheet is, which is a better place for it than
        // the far corner of the header. Two buttons reading "New brag sheet"
        // on one screen is one button too many, so the header yields until
        // there is a list for it to add to.
        tab === "brag" && bragSheets.length > 0
        ? { label: "New brag sheet", onClick: () => setBragNonce((n) => n + 1) }
        : null;

  return (
    <div data-cluely className="min-h-svh bg-background font-cluely">
      <Seo
        title="Professors"
        description="Find professors, track recommenders, statuses, and deadlines for your college recommendation letters in one place."
        path="/lor"
      />

      <div className="section-container max-w-5xl py-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="max-w-[22ch] text-balance font-cluely text-[clamp(1.7rem,5vw,2.4rem)] font-semibold leading-[1.08] tracking-[-0.035em]">
              Professors
            </h1>
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
              Track who is writing your letters, and find faculty worth emailing.
            </p>
          </div>
          {action && (
            <Button className="shrink-0" onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" /> {action.label}
            </Button>
          )}
        </header>

        {/* The counts sit on the tabs rather than inside each panel: which tab
            is worth opening is a question you have before you open one, and
            answering it after the click is answering it too late. */}
        <SmoothTabs<TabId>
          aria-label="Letters of recommendation"
          className="mb-6"
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: "recommenders", label: "Recommenders", badge: items.length || undefined },
            { value: "professors", label: "Find professors" },
            { value: "brag", label: "Brag sheets", badge: bragSheets.length || undefined },
          ]}
        />

        {tab === "recommenders" && (
          <div className="mt-0 space-y-3">
            <LetterStanding items={items} />

            {showSearch && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subject, or school"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                  aria-label="Search recommenders"
                />
              </div>
            )}

            <StrategyCard disabled={items.length === 0} />

            {list.isLoading ? (
              <LoadingRows />
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={openCreate} hasAny={items.length > 0} />
            ) : (
              <div className="space-y-5">
                {stages.map(({ status, rows }) => (
                  <section key={status}>
                    <h2 className="px-1 pb-2 font-cluely text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                      {STATUS_LABELS[status]} ({rows.length})
                    </h2>
                    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                      {rows.map((r) => (
                        <RecommenderRow key={r.id} r={r} onOpen={() => openEdit(r)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "professors" && <ProfessorsPanel />}

        {tab === "brag" && <BragSheetPanel newSheetSignal={bragNonce} />}
      </div>

      {/* Add / Edit sheet */}
      <Sheet open={creating || !!editing} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-[41rem]">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit recommender" : "Add recommender"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update their details or status." : "Who is writing a letter for you?"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <Field label="Name" icon={UserRound}>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Dr Amara Osei"
                autoFocus
              />
            </Field>
            <Field label="Email" icon={Mail}>
              <Input
                type="email"
                value={draft.email ?? ""}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="a.osei@fenwickcc.edu"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <Input
                  value={draft.position ?? ""}
                  onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                  placeholder="Teacher"
                />
              </Field>
              <Field label="Subject" icon={BookOpen}>
                <Input
                  value={draft.subject ?? ""}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder="AP Calculus"
                />
              </Field>
            </div>
            <Field label="School or organization" icon={Building2}>
              <Input
                value={draft.school ?? ""}
                onChange={(e) => setDraft({ ...draft, school: e.target.value })}
                placeholder="Meridian High School"
              />
            </Field>
            <Field label="Relationship duration">
              <Input
                value={draft.relationship_duration ?? ""}
                onChange={(e) => setDraft({ ...draft, relationship_duration: e.target.value })}
                placeholder="2 years"
              />
            </Field>
            <Field label="Status">
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as RecommenderStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cly-scope font-cluely">
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deadline" icon={CalendarClock}>
                <Input
                  type="date"
                  value={draft.due_date ?? ""}
                  onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })}
                />
              </Field>
              <Field label="Submitted on" icon={CheckCircle2}>
                <Input
                  type="date"
                  value={draft.submitted_at ? draft.submitted_at.slice(0, 10) : ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      submitted_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                      status: e.target.value ? "submitted" : draft.status,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Anything to remember about this recommender"
                rows={3}
              />
            </Field>

            {editing && (
              <>
                <StrengthSection recommender={items.find((r) => r.id === editing.id) ?? editing} />
                <RequestEmailSection
                  recommender={items.find((r) => r.id === editing.id) ?? editing}
                />
                <PacketSection recommender={items.find((r) => r.id === editing.id) ?? editing} />
                <PortalLinkSection recommender={items.find((r) => r.id === editing.id) ?? editing} />
              </>
            )}
          </div>

          <SheetFooter className="flex-row justify-between gap-2 sm:justify-between">
            {editing ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this recommender?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {editing.name} and any notes you have kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await remove.mutateAsync(editing.id);
                        closeSheet();
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={closeSheet}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={!draft.name.trim() || create.isPending || update.isPending}
              >
                {editing ? "Save" : "Add"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/**
 * One recommender.
 *
 * No status chip: the stage heading above the group already says it, and
 * repeating it per row is what produced a column of five different colours.
 * No "updated 3 minutes ago" either, which was the row's most prominent
 * right-hand figure and told a student nothing about what to do next.
 */
function RecommenderRow({ r, onOpen }: { r: Recommender; onOpen: () => void }) {
  const display = withoutHonorific(r.name) || r.name;
  const detail = [r.position, r.subject].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-cluely text-sm font-medium">
        {personInitials(r.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{r.name}</span>
        {(detail || r.school) && (
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            {detail && <span className="truncate">{detail}</span>}
            {detail && r.school && <span aria-hidden>·</span>}
            {r.school && (
              <>
                <CollegeLogo name={r.school} size={14} className="rounded-[3px]" hideWhenUnknown />
                <span className="truncate">{r.school}</span>
              </>
            )}
          </span>
        )}
        <span className="sr-only">{display}</span>
      </span>

      {r.due_date && r.status !== "submitted" && (
        <span className="hidden shrink-0 sm:block">
          <DeadlineChip dueDate={r.due_date} />
        </span>
      )}
    </button>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Skeleton rows in the shape of the real ones, not a centred spinner. */
function LoadingRows() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <h3 className="mb-1 text-base font-medium">
        {hasAny ? "No matches" : "Add your first recommender"}
      </h3>
      <p className="mx-auto mb-5 max-w-sm text-sm text-muted-foreground">
        {hasAny
          ? "Try a different search."
          : "Start with the teacher, mentor, or supervisor most likely to write you a strong letter."}
      </p>
      {!hasAny && (
        <Button onClick={onAdd} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add recommender
        </Button>
      )}
    </div>
  );
}

/**
 * How long is left, in two tones rather than four.
 *
 * Overdue and due-within-three-days are the only two states a student does
 * anything differently about, so they are the only two the colour separates.
 * The blue "due within a fortnight" and grey "due later" tiers were two more
 * hues spent on the same instruction: nothing yet.
 */
function DeadlineChip({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  const urgent = days <= 3;
  const label =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? "Due today"
        : `Due in ${days}d`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        urgent
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border text-muted-foreground"
      )}
    >
      <CalendarClock className="h-3 w-3" />
      {label}
    </span>
  );
}
