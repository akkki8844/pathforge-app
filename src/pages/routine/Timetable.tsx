import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  Clock,
  Copy,
  ImageIcon,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RoutineShell, RoutinePanel, RoutineStat } from "@/components/routine/RoutineShell";
import { RoutineAsync, RoutineEmptyState } from "@/components/routine/RoutineStates";
import {
  ColorPicker,
  DeleteAction,
  Field,
  FieldRow,
  RoutineDialog,
  WeekdayPicker,
  WEEKDAYS_MONDAY_FIRST,
  fromTimeInput,
  toTimeInput,
} from "@/components/routine/RoutineForm";
import { useRoutineClasses, useTimetableImage } from "@/hooks/routine/useRoutineData";
import {
  TimetableDropzone,
  TimetableImageCard,
} from "@/components/routine/TimetableImage";
import { swatch } from "@/lib/routine/colors";
import {
  formatDuration,
  formatTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/routine/dates";
import { DURATION, EASE_OUT_EXPO, listItem, staggerParent, staggerStep } from "@/lib/motion";
import {
  WEEKDAY_LABELS,
  WEEKDAY_LONG,
  type NewRoutineClass,
  type RoutineClass,
  type RoutineColor,
  type Weekday,
} from "@/lib/routine/types";

/**
 * Timetable: the recurring weekly skeleton, and only that.
 *
 * The distinction this page has to hold against Calendar is that a row here is a
 * *rule* ("Physics, Mon/Wed/Fri, 09:00 to 10:00"), not an occurrence. Nothing on
 * this page is dated. One-off things (an exam, a trip, a rescheduled lesson)
 * belong in Calendar, which projects these rules into actual days via
 * `buildAgenda`. That is why editing a class here changes every future week at
 * once, and why there is deliberately no "just this Tuesday" affordance: that
 * would silently turn the timetable into an event store and duplicate Calendar's
 * job.
 */

const DEFAULT_CLASS: NewRoutineClass = {
  subject: "",
  teacher: null,
  location: null,
  start_time: "09:00:00",
  end_time: "10:00:00",
  days_of_week: [1],
  color: "blue",
  notes: null,
  is_active: true,
};

/** Grid geometry. One minute of wall clock is this many pixels tall. */
const PX_PER_MINUTE = 0.85;

interface Draft extends NewRoutineClass {
  id?: string;
}

export default function Timetable() {
  const {
    classes,
    loading,
    error,
    refetch,
    createClass,
    updateClass,
    deleteClass,
    duplicateClass,
    saving,
  } = useRoutineClasses();
  const {
    image,
    imageUrl,
    urlLoading,
    uploading,
    removing,
    uploadImage,
    removeImage,
  } = useTimetableImage();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [armed, setArmed] = useState(false);

  const active = useMemo(() => classes.filter((c) => c.is_active), [classes]);

  /** Per-weekday buckets, each sorted by start time. Drives both views. */
  const byDay = useMemo(() => {
    const map = new Map<Weekday, RoutineClass[]>();
    for (const d of WEEKDAYS_MONDAY_FIRST) map.set(d, []);
    for (const c of classes) {
      for (const d of c.days_of_week ?? []) map.get(d)?.push(c);
    }
    for (const list of map.values()) {
      list.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    }
    return map;
  }, [classes]);

  /**
   * The window the grid draws, snapped out to whole hours around the earliest
   * and latest class. Rendering a fixed 00:00 to 24:00 would put a 9am timetable
   * in the middle of two screens of empty rail.
   */
  const bounds = useMemo(() => {
    if (active.length === 0) return { start: 8 * 60, end: 17 * 60 };
    let min = Infinity;
    let max = -Infinity;
    for (const c of active) {
      min = Math.min(min, timeToMinutes(c.start_time));
      max = Math.max(max, timeToMinutes(c.end_time));
    }
    return {
      start: Math.max(0, Math.floor(min / 60) * 60 - 30),
      end: Math.min(24 * 60, Math.ceil(max / 60) * 60 + 30),
    };
  }, [active]);

  const stats = useMemo(() => {
    let meetings = 0;
    let minutes = 0;
    const perDay = new Map<Weekday, number>();
    for (const c of active) {
      const len = timeToMinutes(c.end_time) - timeToMinutes(c.start_time);
      for (const d of c.days_of_week ?? []) {
        meetings += 1;
        minutes += Math.max(0, len);
        perDay.set(d, (perDay.get(d) ?? 0) + Math.max(0, len));
      }
    }
    let busiest: Weekday | null = null;
    let busiestMinutes = 0;
    for (const [d, m] of perDay) {
      if (m > busiestMinutes) {
        busiest = d;
        busiestMinutes = m;
      }
    }
    return {
      subjects: new Set(active.map((c) => c.subject.trim().toLowerCase())).size,
      meetings,
      minutes,
      busiest,
      busiestMinutes,
    };
  }, [active]);

  const openNew = (day?: Weekday) => {
    setArmed(false);
    setDraft({ ...DEFAULT_CLASS, days_of_week: day === undefined ? [1] : [day] });
  };

  const openEdit = (c: RoutineClass) => {
    setArmed(false);
    setDraft({
      id: c.id,
      subject: c.subject,
      teacher: c.teacher,
      location: c.location,
      start_time: c.start_time,
      end_time: c.end_time,
      days_of_week: c.days_of_week ?? [],
      color: c.color,
      notes: c.notes,
      is_active: c.is_active,
    });
  };

  const save = async () => {
    if (!draft) return;
    const { id, ...payload } = draft;
    const clean: NewRoutineClass = {
      ...payload,
      subject: payload.subject.trim(),
      teacher: payload.teacher?.trim() || null,
      location: payload.location?.trim() || null,
      notes: payload.notes?.trim() || null,
    };
    try {
      if (id) {
        await updateClass({ id, patch: clean });
        toast.success("Class updated", { description: clean.subject });
      } else {
        await createClass(clean);
        toast.success("Class added", { description: clean.subject });
      }
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't save that class", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const remove = async () => {
    if (!draft?.id) return;
    try {
      await deleteClass(draft.id);
      toast.success("Class removed", { description: draft.subject });
      setDraft(null);
    } catch (err) {
      toast.error("Couldn't remove that class", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const duplicate = async (c: RoutineClass) => {
    try {
      await duplicateClass(c);
      toast.success("Duplicated", { description: `${c.subject} (copy) - edit the times` });
    } catch (err) {
      toast.error("Couldn't duplicate that class", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await uploadImage(file);
      toast.success(image ? "Timetable image replaced" : "Timetable image uploaded", {
        description: "It's stored privately and shown exactly as you uploaded it.",
      });
    } catch (err) {
      toast.error("Couldn't upload that image", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleRemoveImage = async () => {
    try {
      await removeImage();
      toast.success("Timetable image removed");
    } catch (err) {
      toast.error("Couldn't remove that image", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const draftValid =
    Boolean(draft?.subject.trim()) &&
    (draft?.days_of_week.length ?? 0) > 0 &&
    timeToMinutes(draft?.end_time ?? "0:00") > timeToMinutes(draft?.start_time ?? "0:00");

  // The grid is unreadable at phone width; the list is the real mobile layout,
  // not a squeezed version of the desktop one.
  const effectiveView = isMobile ? "list" : view;

  return (
    <RoutineShell
      title="Timetable"
      purpose="Your recurring weekly classes. One-off events live on the Study Planner's calendar."
      icon={CalendarRange}
      path="/routine/timetable"
      actions={
        <>
          {!isMobile && (
            <div className="flex items-center rounded-full border border-border p-0.5">
              <ViewToggle
                active={view === "grid"}
                onClick={() => setView("grid")}
                icon={LayoutGrid}
                label="Grid"
              />
              <ViewToggle
                active={view === "list"}
                onClick={() => setView("list")}
                icon={List}
                label="List"
              />
            </div>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => openNew()}>
            <Plus className="h-4 w-4" />
            Add class
          </Button>
        </>
      }
    >
      <RoutineAsync
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        loadingVariant="grid"
        loadingRows={6}
      >
        <div className="space-y-6">
          {/*
           * Two ways to have a timetable, and they are not alternatives to each
           * other. The image is the artefact a school hands out; the grid below
           * is the structured version Today, Calendar and the study planner can
           * actually read. A student can keep one, the other, or both, so this
           * panel sits above the grid rather than behind a mode switch that
           * would imply picking one throws the other away.
           */}
          <RoutinePanel
            title="Timetable image"
            icon={ImageIcon}
            description={
              image
                ? "Your official timetable, exactly as you uploaded it."
                : "Have a printed or school-issued timetable? Upload it instead of retyping it."
            }
          >
            {image ? (
              <TimetableImageCard
                image={image}
                url={imageUrl}
                urlLoading={urlLoading}
                uploading={uploading}
                removing={removing}
                onUpload={(f) => void handleUpload(f)}
                onRemove={() => void handleRemoveImage()}
              />
            ) : (
              <TimetableDropzone onFile={(f) => void handleUpload(f)} uploading={uploading} />
            )}
          </RoutinePanel>

          {classes.length === 0 ? (
            <RoutineEmptyState
              icon={CalendarRange}
              title="Build your week once"
              description="Add each class with its days and times and Routine keeps repeating it, so you never re-enter it. Today, Calendar and the study planner all read from it — which an uploaded image can't do on its own."
              actionLabel="Add your first class"
              onAction={() => openNew()}
            />
          ) : (
            <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RoutineStat label="Subjects" value={stats.subjects} />
              <RoutineStat
                label="Weekly meetings"
                value={stats.meetings}
                hint={stats.meetings === 1 ? "class per week" : "classes per week"}
              />
              <RoutineStat
                label="Contact time"
                value={formatDuration(stats.minutes) || "0m"}
                hint="per week"
              />
              <RoutineStat
                label="Busiest day"
                value={stats.busiest === null ? "None" : WEEKDAY_LABELS[stats.busiest]}
                hint={stats.busiest === null ? undefined : formatDuration(stats.busiestMinutes)}
              />
            </div>

            {effectiveView === "grid" ? (
              <WeekGrid byDay={byDay} bounds={bounds} onSelect={openEdit} onAddOn={openNew} />
            ) : (
              <DayList byDay={byDay} onSelect={openEdit} onDuplicate={duplicate} onAddOn={openNew} />
            )}
            </>
          )}
        </div>
      </RoutineAsync>

      {draft && (
        <RoutineDialog
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? "Edit class" : "Add a class"}
          description="This repeats every week on the days you pick. Nothing here is tied to a single date."
          submitLabel={draft.id ? "Save changes" : "Add class"}
          onSubmit={() => void save()}
          saving={saving}
          canSubmit={draftValid}
          destructive={
            draft.id ? (
              <DeleteAction
                armed={armed}
                onArm={() => setArmed(true)}
                onConfirm={() => void remove()}
              />
            ) : undefined
          }
        >
          <Field label="Subject" required>
            {(id) => (
              <Input
                id={id}
                autoFocus
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                placeholder="Physics"
              />
            )}
          </Field>

          <FieldRow>
            <Field label="Teacher">
              {(id) => (
                <Input
                  id={id}
                  value={draft.teacher ?? ""}
                  onChange={(e) => setDraft({ ...draft, teacher: e.target.value })}
                  placeholder="Ms Rao"
                />
              )}
            </Field>
            <Field label="Room or location">
              {(id) => (
                <Input
                  id={id}
                  value={draft.location ?? ""}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="Lab 2"
                />
              )}
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Starts" required>
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={toTimeInput(draft.start_time)}
                  onChange={(e) => {
                    const start = fromTimeInput(e.target.value) ?? draft.start_time;
                    // Keep the length the user already set rather than letting the
                    // end time fall behind the start and become invalid.
                    const length = Math.max(
                      15,
                      timeToMinutes(draft.end_time) - timeToMinutes(draft.start_time),
                    );
                    setDraft({
                      ...draft,
                      start_time: start,
                      end_time: `${minutesToTime(timeToMinutes(start) + length)}:00`,
                    });
                  }}
                />
              )}
            </Field>
            <Field
              label="Ends"
              required
              hint={
                timeToMinutes(draft.end_time) > timeToMinutes(draft.start_time)
                  ? formatDuration(timeToMinutes(draft.end_time) - timeToMinutes(draft.start_time))
                  : "Must be after the start time."
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={toTimeInput(draft.end_time)}
                  onChange={(e) =>
                    setDraft({ ...draft, end_time: fromTimeInput(e.target.value) ?? draft.end_time })
                  }
                />
              )}
            </Field>
          </FieldRow>

          <WeekdayPicker
            value={draft.days_of_week}
            onChange={(days) => setDraft({ ...draft, days_of_week: days })}
            label="Repeats on"
          />

          <ColorPicker
            value={draft.color as RoutineColor}
            onChange={(color) => setDraft({ ...draft, color })}
          />

          <Field label="Notes">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Bring the lab notebook"
              />
            )}
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="class-active" className="text-xs font-semibold">
                Active
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Turn off over a holiday to hide it without deleting it.
              </p>
            </div>
            <Switch
              id="class-active"
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>
        </RoutineDialog>
      )}
    </RoutineShell>
  );
}

function ViewToggle({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
        active
          ? "bg-accent/15 font-semibold text-accent"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/**
 * The week as a proportional grid.
 *
 * Blocks are absolutely positioned from their wall-clock times so a 20-minute
 * tutorial and a 2-hour lab look different at a glance, which is the whole
 * reason to draw a grid rather than another list. Overlapping classes on the
 * same day share the column width rather than covering each other, so a clash is
 * visible instead of hidden.
 */
function WeekGrid({
  byDay,
  bounds,
  onSelect,
  onAddOn,
}: {
  byDay: Map<Weekday, RoutineClass[]>;
  bounds: { start: number; end: number };
  onSelect: (c: RoutineClass) => void;
  onAddOn: (day: Weekday) => void;
}) {
  const height = (bounds.end - bounds.start) * PX_PER_MINUTE;
  const hours: number[] = [];
  for (let m = bounds.start; m <= bounds.end; m += 60) hours.push(m);

  return (
    <RoutinePanel bodyClassName="p-0 sm:p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Day headers. Clicking one starts a new class on that day. */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border/70">
            <div />
            {WEEKDAYS_MONDAY_FIRST.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onAddOn(d)}
                title={`Add a class on ${WEEKDAY_LONG[d]}`}
                className="group border-l border-border/50 px-2 py-2 text-center transition-colors hover:bg-accent/5"
              >
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground group-hover:text-accent">
                  {WEEKDAY_LABELS[d]}
                </span>
                <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground/70">
                  {byDay.get(d)?.length ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]" style={{ height }}>
            <div className="relative">
              {hours.map((m) => (
                <span
                  key={m}
                  className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                  style={{ top: (m - bounds.start) * PX_PER_MINUTE }}
                >
                  {formatTime(minutesToTime(m))}
                </span>
              ))}
            </div>

            {WEEKDAYS_MONDAY_FIRST.map((d) => {
              const items = byDay.get(d) ?? [];
              return (
                <div key={d} className="relative border-l border-border/50">
                  {hours.map((m) => (
                    <div
                      key={m}
                      className="absolute inset-x-0 border-t border-border/30"
                      style={{ top: (m - bounds.start) * PX_PER_MINUTE }}
                    />
                  ))}

                  {items.map((c) => {
                    const top = (timeToMinutes(c.start_time) - bounds.start) * PX_PER_MINUTE;
                    const len = Math.max(
                      18,
                      (timeToMinutes(c.end_time) - timeToMinutes(c.start_time)) * PX_PER_MINUTE,
                    );
                    // Lane assignment: split the column between classes that
                    // actually overlap in time, so a clash stays visible.
                    const overlaps = items.filter(
                      (o) =>
                        o !== c &&
                        timeToMinutes(o.start_time) < timeToMinutes(c.end_time) &&
                        timeToMinutes(o.end_time) > timeToMinutes(c.start_time),
                    );
                    const lanes = overlaps.length + 1;
                    const lane = overlaps.filter(
                      (o) => timeToMinutes(o.start_time) < timeToMinutes(c.start_time),
                    ).length;
                    const s = swatch(c.color);
                    return (
                      <motion.button
                        key={`${c.id}-${d}`}
                        type="button"
                        onClick={() => onSelect(c)}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: DURATION.fast, ease: EASE_OUT_EXPO }}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left",
                          s.block,
                          !c.is_active && "opacity-45 saturate-50",
                        )}
                        style={{
                          top,
                          height: len,
                          left: `${(lane / lanes) * 100}%`,
                          width: `calc(${100 / lanes}% - 4px)`,
                        }}
                      >
                        <span className="block truncate text-[11px] font-semibold leading-tight">
                          {c.subject}
                        </span>
                        {len > 34 && (
                          <span className="block truncate text-[10px] tabular-nums opacity-80">
                            {formatTime(c.start_time)}
                          </span>
                        )}
                        {len > 52 && c.location && (
                          <span className="block truncate text-[10px] opacity-70">{c.location}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </RoutinePanel>
  );
}

/** Day-by-day list. The mobile layout, and a legitimate desktop choice. */
function DayList({
  byDay,
  onSelect,
  onDuplicate,
  onAddOn,
}: {
  byDay: Map<Weekday, RoutineClass[]>;
  onSelect: (c: RoutineClass) => void;
  onDuplicate: (c: RoutineClass) => void;
  onAddOn: (day: Weekday) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {WEEKDAYS_MONDAY_FIRST.map((d) => {
        const items = byDay.get(d) ?? [];
        const minutes = items
          .filter((c) => c.is_active)
          .reduce((s, c) => s + timeToMinutes(c.end_time) - timeToMinutes(c.start_time), 0);
        return (
          <RoutinePanel
            key={d}
            title={WEEKDAY_LONG[d]}
            description={
              items.length
                ? `${items.length} class${items.length === 1 ? "" : "es"}, ${formatDuration(minutes)}`
                : undefined
            }
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={() => onAddOn(d)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            }
            bodyClassName="p-3 sm:p-3"
          >
            {items.length === 0 ? (
              <p className="px-1 py-3 text-sm text-muted-foreground">Nothing on this day.</p>
            ) : (
              <motion.ul
                variants={staggerParent}
                custom={staggerStep(items.length)}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <AnimatePresence initial={false}>
                  {items.map((c) => {
                    const s = swatch(c.color);
                    return (
                      <motion.li key={c.id} variants={listItem} exit="exit" layout>
                        <div
                          className={cn(
                            "group flex items-center gap-3 rounded-xl border border-l-2 border-border bg-card/60 p-2.5 transition-colors hover:border-accent/50",
                            s.rail,
                            !c.is_active && "opacity-60",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(c)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {c.subject}
                              </p>
                              {!c.is_active && (
                                <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  Paused
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock className="h-3 w-3" />
                                {formatTime(c.start_time)} to {formatTime(c.end_time)}
                              </span>
                              {c.location && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {c.location}
                                </span>
                              )}
                              {c.teacher && (
                                <span className="inline-flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {c.teacher}
                                </span>
                              )}
                            </p>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                            title={`Duplicate ${c.subject}`}
                            onClick={() => onDuplicate(c)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="sr-only">Duplicate {c.subject}</span>
                          </Button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            )}
          </RoutinePanel>
        );
      })}
    </div>
  );
}
