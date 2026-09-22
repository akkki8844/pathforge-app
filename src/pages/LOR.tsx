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
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Liftable, SectionRule, Surface } from "@/components/lor/lorSurface";
import { useStagger } from "@/lib/lorMotion";
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
        path="/professors"
      />

      {/* 1400px, not 1024. The page was using 64% of a 1600px viewport with
          288px of dead gutter on each side, so a two-pane workspace had
          nowhere to go and every panel was a full-width band of mostly air. */}
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            <h1 className="max-w-[22ch] text-balance font-cluely text-[clamp(1.9rem,4vw,2.75rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
              Professors
            </h1>
            <p className="mt-2.5 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">
              Track who is writing your letters, and find faculty worth emailing.
            </p>
          </div>
          {action && (
            <Button size="lg" className="shrink-0" onClick={action.onClick}>
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

        {/*
          * Two panes, not one column.
          *
          * The roster is the work and takes the wide side. Standing and the AI
          * ranking are reference: you consult them, act in the list, and glance
          * back. Stacking them above the list meant you scrolled past your own
          * summary to reach the thing it summarised, and on a 1600px screen the
          * summary was a 1024px-wide band holding three short facts.
          *
          * One column below xl, rail first there, because on a narrow screen
          * "what is my situation" genuinely does come before "here is the list".
          */}
        {tab === "recommenders" && (
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            {/*
              * min-w-0 is load-bearing, not tidiness. A grid item defaults to
              * min-width:auto, so it refuses to shrink below the min-content
              * width of what is inside it. A recommender's meta line ("Research
              * supervisor - Molecular Biology - Northlake University") is wider
              * than a phone, so the track grew to 484px inside a 390px viewport
              * and the cards were clipped by the overflow-x:hidden on <html>.
              * Silent, because the clip hides its own evidence.
              */}
            <div className="order-last min-w-0 space-y-5 lg:order-1 lg:col-span-8">
              {showSearch && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, subject, or school"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-11 rounded-xl pl-10"
                    aria-label="Search recommenders"
                  />
                </div>
              )}

              {list.isLoading ? (
                <LoadingRows />
              ) : filtered.length === 0 ? (
                <EmptyState onAdd={openCreate} hasAny={items.length > 0} />
              ) : (
                <div className="space-y-6">
                  {stages.map(({ status, rows }, groupIndex) => (
                    <StageGroup
                      key={status}
                      label={STATUS_LABELS[status]}
                      count={rows.length}
                      rows={rows}
                      groupIndex={groupIndex}
                      onOpen={openEdit}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Order 1 on a phone: "where do I stand" genuinely does come
                before the roster when you can only see one of them at a time. */}
            <aside className="order-first min-w-0 space-y-4 lg:sticky lg:top-6 lg:order-2 lg:col-span-4">
              <LetterStanding items={items} />
              <StrategyCard disabled={items.length === 0} />
            </aside>
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
 * One stage of the pipeline, and the people currently in it.
 *
 * The heading is a labelled rule rather than the uppercase micro-label it was.
 * Five stacked uppercase tracking labels down one column is the templated
 * rhythm that makes a page look generated. A name, a count and a hairline
 * running to the edge does the same job and gives the column structure.
 */
function StageGroup({
  label,
  count,
  rows,
  groupIndex,
  onOpen,
}: {
  label: string;
  count: number;
  rows: Recommender[];
  groupIndex: number;
  onOpen: (r: Recommender) => void;
}) {
  const stagger = useStagger();

  return (
    <section>
      <SectionRule as="h2" count={count}>
        {label}
      </SectionRule>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <motion.div key={r.id} {...stagger(groupIndex * 2 + i)}>
            <RecommenderRow r={r} onOpen={() => onOpen(r)} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/**
 * One recommender.
 *
 * A card per person rather than a row in a hairline-divided block. Each of
 * these opens an editor, and a flat list of divided rows gives no sign of
 * that. A card that lifts under the pointer does. It also lets the school
 * logo, the person and the deadline sit at three different weights instead of
 * competing on one line.
 *
 * Still no status chip: the stage heading above the group says it, and
 * repeating it per row is what produced a column of five different colours.
 * Still no "updated 3 minutes ago", which was the row's most prominent
 * right-hand figure and told a student nothing about what to do next.
 */
function RecommenderRow({ r, onOpen }: { r: Recommender; onOpen: () => void }) {
  const display = withoutHonorific(r.name) || r.name;
  const detail = [r.position, r.subject].filter(Boolean).join(" · ");

  return (
    <Liftable>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-4 rounded-2xl border border-border/70 bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-cluely text-[13px] font-semibold text-primary">
          {personInitials(r.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-cluely text-[15px] font-medium tracking-[-0.01em]">
            {r.name}
          </span>
          {(detail || r.school) && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
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

        {/* The affordance the flat rows were missing. Muted until hover so it
            never competes with the deadline beside it. */}
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-muted-foreground"
        />
      </button>
    </Liftable>
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

/** Skeletons in the shape of the real cards, not a centred spinner. */
function LoadingRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card px-5 py-3.5"
        >
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
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
    <Surface className="px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserRound className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3 className="font-cluely text-[17px] font-semibold tracking-[-0.015em]">
        {hasAny ? "No matches" : "Add your first recommender"}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        {hasAny
          ? "Try a different search."
          : "Start with the teacher, mentor, or supervisor most likely to write you a strong letter."}
      </p>
      {!hasAny && (
        <Button onClick={onAdd} className="mt-5">
          <Plus className="mr-2 h-4 w-4" /> Add recommender
        </Button>
      )}
    </Surface>
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
