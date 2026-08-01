import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerParent } from "@/lib/motion";
import { Plus, Search, Trash2, Mail, Building2, UserRound, BookOpen, Clock, CalendarClock, CheckCircle2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  RecommenderStatus,
  STATUS_LABELS,
  STATUS_ORDER,
  useRecommenders,
  type Recommender,
  type RecommenderInput,
} from "@/hooks/useRecommenders";
import { formatDistanceToNow } from "date-fns";
import { BragSheetPanel } from "@/components/lor/BragSheetPanel";
import { PacketSection } from "@/components/lor/PacketSection";
import { StrategyCard } from "@/components/lor/StrategyCard";
import { StrengthSection } from "@/components/lor/StrengthSection";
import { RequestEmailSection } from "@/components/lor/RequestEmailSection";
import { PortalLinkSection } from "@/components/lor/PortalLinkSection";
import { ReadinessRing } from "@/components/lor/ReadinessRing";
import { ProfessorsPanel } from "@/components/lor/ProfessorsPanel";

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

function StatusPill({ status }: { status: RecommenderStatus }) {
  const tone: Record<RecommenderStatus, string> = {
    not_requested: "bg-muted text-muted-foreground",
    requested: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    drafting: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    submitted: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function LOR() {
  const { list, create, update, remove } = useRecommenders();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | RecommenderStatus>("all");
  const [editing, setEditing] = useState<Recommender | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<RecommenderInput>(emptyInput);

  const items = list.data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.name, r.subject, r.school, r.position, r.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [items, query, filter]);

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const r of items) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <>
      <Seo
        title="Letters of Recommendation — Pathforge"
        description="Track recommenders, statuses, and deadlines for your college recommendation letters in one place."
        path="/lor"
      />

      <div className="section-container py-10 max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-10"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              [ Recommendations ]
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Letters of Recommendation
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Keep every recommender, status, and deadline in one quiet place. Add the people writing for you, and we'll handle the rest as we ship more.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ReadinessRing items={items} />
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add recommender
            </Button>
          </div>
        </motion.header>

        <Tabs defaultValue="recommenders" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="recommenders">Recommenders</TabsTrigger>
            <TabsTrigger value="professors">Find Professors</TabsTrigger>
            <TabsTrigger value="brag">Brag sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="recommenders" className="mt-0">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, subject, or school"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  All <Badge variant="secondary" className="ml-1.5">{counts.all}</Badge>
                </FilterChip>
                {STATUS_ORDER.map((s) => (
                  <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                    {STATUS_LABELS[s]}{" "}
                    <Badge variant="secondary" className="ml-1.5">{counts[s] ?? 0}</Badge>
                  </FilterChip>
                ))}
              </div>
            </div>

            <StrategyCard disabled={items.length === 0} />

            {/* List */}
            {list.isLoading ? (
              <div className="text-sm text-muted-foreground py-12 text-center">Loading…</div>
            ) : filtered.length === 0 ? (
              <EmptyState onAdd={openCreate} hasAny={items.length > 0} />
            ) : (
              <motion.div
                variants={staggerParent}
                custom={0.05}
                initial="hidden"
                animate="visible"
                className="rounded-xl border bg-card divide-y"
              >
                {filtered.map((r) => (
                  <motion.button
                    key={r.id}
                    variants={fadeUp}
                    onClick={() => openEdit(r)}
                    className="w-full text-left px-5 py-4 hover:bg-muted/40 transition flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                      {r.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{r.name}</span>
                        <StatusPill status={r.status} />
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {[r.position, r.subject].filter(Boolean).join(" · ") || "—"}
                        {r.school ? <> · {r.school}</> : null}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                      {r.due_date && r.status !== "submitted" ? (
                        <DeadlineChip dueDate={r.due_date} />
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="professors" className="mt-0">
            <ProfessorsPanel />
          </TabsContent>

          <TabsContent value="brag" className="mt-0">
            <BragSheetPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit sheet */}
      <Sheet open={creating || !!editing} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit recommender" : "Add recommender"}</SheetTitle>
            <SheetDescription>
              {editing ? "Update their details or status." : "Who's writing a letter for you?"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <Field label="Name" icon={UserRound}>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ms. Sarah Chen"
                autoFocus
              />
            </Field>
            <Field label="Email" icon={Mail}>
              <Input
                type="email"
                value={draft.email ?? ""}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="schen@school.edu"
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
            <Field label="School / Organization" icon={Building2}>
              <Input
                value={draft.school ?? ""}
                onChange={(e) => setDraft({ ...draft, school: e.target.value })}
                placeholder="Lincoln High School"
              />
            </Field>
            <Field label="Relationship duration">
              <Input
                value={draft.relationship_duration ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, relationship_duration: e.target.value })
                }
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
                <SelectContent>
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
                  onChange={(e) =>
                    setDraft({ ...draft, due_date: e.target.value || null })
                  }
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
                placeholder="Anything to remember about this recommender…"
                rows={3}
              />
            </Field>

            {editing && (
              <>
                <StrengthSection
                  recommender={items.find((r) => r.id === editing.id) ?? editing}
                />
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
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this recommender?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {editing.name} and any notes you've kept.
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
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background hover:bg-muted text-muted-foreground"
      )}
    >
      {children}
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
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </Label>
      {children}
    </div>
  );
}

function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <UserRound className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium mb-1">
        {hasAny ? "No matches" : "Add your first recommender"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        {hasAny
          ? "Try a different search or status filter."
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

function DeadlineChip({ dueDate }: { dueDate: string }) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  const tone =
    days < 0
      ? "bg-destructive/10 text-destructive"
      : days <= 3
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : days <= 14
      ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
      : "bg-muted text-muted-foreground";
  const label =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
      ? "Due today"
      : `Due in ${days}d`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", tone)}>
      <CalendarClock className="h-3 w-3" />
      {label}
    </span>
  );
}
