import { useMemo, useState } from "react";
import { BellPlus, GraduationCap, Search, ChevronRight } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import {
  FollowupComposer,
  type FollowupDraft,
} from "@/components/teacher/FollowupComposer";
import { suggestedDueDate } from "@/lib/teacher/followups";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TONE_BADGE,
  TONE_TEXT,
  applicationTone,
  deadlineTone,
  decisionTone,
} from "@/lib/teacher/status";
import { counsellorDb } from "@/integrations/supabase/counsellor";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { CollegeLogo } from "@/components/CollegeLogo";

/**
 * The statuses an application moves through, in lifecycle order.
 *
 * This used to be a map of status to a literal colour, one hue each - blue,
 * indigo, amber, green, emerald, red, orange, gray - which is eight things to
 * learn, ignores the theme's dark-mode values, and makes "submitted" and
 * "admitted" look like different kinds of thing rather than two points on the
 * same scale. The colours now come from `applicationTone`; this list only says
 * which statuses exist and in what order the filter offers them.
 */
const APPLICATION_STATUSES = [
  "researching",
  "planning",
  "drafting",
  "submitted",
  "admitted",
  "waitlisted",
  "rejected",
  "withdrawn",
] as const;

export default function TeacherApplications() {
  const { students } = useTeacherRoster();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.full_name || s.email || "Student"])),
    [students],
  );

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);

  /*
   * A counsellor reading this table is looking for the thing they have to
   * chase. Until now the page could only show it to them; the chasing had to
   * be remembered and retyped on the home screen. The composer opens seeded
   * with the student, the university and anything the application is missing.
   */
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupDraft, setFollowupDraft] = useState<FollowupDraft | undefined>();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["counselor-applications", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await counsellorDb
        .from("application_entries")
        .select("*")
        .in("student_id", studentIds)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: studentIds.length > 0,
  });

  const countries = useMemo(() => {
    const set = new Set(applications.map((a) => a.country).filter(Boolean));
    return Array.from(set).sort();
  }, [applications]);

  const rounds = useMemo(() => {
    const set = new Set(applications.map((a) => a.application_round).filter(Boolean));
    return Array.from(set).sort();
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (countryFilter !== "all" && a.country !== countryFilter) return false;
      if (roundFilter !== "all" && a.application_round !== roundFilter) return false;
      if (q) {
        const studentName = nameMap.get(a.student_id) || "";
        const hay = `${a.college_name} ${studentName} ${a.country || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, search, statusFilter, countryFilter, roundFilter, nameMap]);

  const stats = useMemo(() => ({
    total: applications.length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    admitted: applications.filter((a) => a.status === "admitted").length,
    pending: applications.filter((a) => !["submitted", "admitted", "rejected", "waitlisted", "withdrawn"].includes(a.status)).length,
  }), [applications]);

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  /** Opens the composer against one application, with the note written for it. */
  const chase = (app: (typeof applications)[number]) => {
    const name = nameMap.get(app.student_id) || "this student";
    const missing = (app.missing_documents ?? []).filter(Boolean);
    setFollowupDraft({
      studentId: app.student_id,
      dueDate: suggestedDueDate(app.deadline),
      note: missing.length
        ? `${app.college_name}: chase ${missing.join(", ")}`
        : `${app.college_name}: check where the application has got to`,
      context: `From ${name}'s ${app.college_name} application.`,
    });
    setFollowupOpen(true);
  };

  return (
    <TeacherLayout>
      <Seo
        title="Applications"
        description="Where each application stands."
        path="/teacher/applications"
        noindex
      />

      <FollowupComposer
        open={followupOpen}
        onOpenChange={setFollowupOpen}
        students={students}
        draft={followupDraft}
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all student applications in one place</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Submitted</p>
            <p className="mt-1 text-2xl font-bold text-success">{stats.submitted}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Admitted</p>
            <p className="mt-1 text-2xl font-bold text-success">{stats.admitted}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-warning">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by university, student, or country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roundFilter} onValueChange={setRoundFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {rounds.map((r) => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">University</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Country</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Round</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Deadline</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Decision</th>
                  <th className="p-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-3"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden md:table-cell"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden lg:table-cell"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"><div className="h-5 w-20 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden lg:table-cell"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      {/*
                        * Three different situations used to share one line,
                        * "No applications found", which told a counsellor
                        * nothing about which of them they were in: nobody
                        * linked to them, nobody who has started an
                        * application, or a filter that happens to match
                        * nothing. Only the last one is something they can fix
                        * from this screen.
                        */}
                      {students.length === 0 ? (
                        <>
                          <p className="font-medium text-foreground">No students linked to you</p>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                            Applications appear here once students join one of your cohorts.
                          </p>
                        </>
                      ) : applications.length === 0 ? (
                        <>
                          <p className="font-medium text-foreground">
                            No applications started yet
                          </p>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                            Your {students.length} student{students.length === 1 ? " has" : "s have"}{" "}
                            not added a university to their list. Nothing here is estimated, so the
                            table stays empty until they do.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">Nothing matches those filters</p>
                          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                            {applications.length} application
                            {applications.length === 1 ? "" : "s"} in total. Clear the search and
                            filters to see them.
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((app) => {
                    const daysLeft = getDaysUntilDeadline(app.deadline);
                    const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                    // Not a motion row. A staggered fade down a table of
                    // applications is a thing a counsellor watches once and
                    // then waits through every time after; it delays the only
                    // thing the page is for, which is reading the list.
                    return (
                      <tr
                        key={app.id}
                        className="border-b border-border transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <Link to={`/teacher/students/${app.student_id}`} className="hover:text-accent transition-colors font-medium">
                            {nameMap.get(app.student_id) || "Student"}
                          </Link>
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          <span className="flex items-center gap-2.5">
                            <CollegeLogo name={app.college_name} size={22} className="rounded" />
                            <span className="truncate">{app.college_name}</span>
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{app.country || "—"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{app.application_round || "—"}</td>
                        <td className="p-3">
                          {app.deadline ? (
                            <span className={cn("text-xs", isUrgent && "font-medium", TONE_TEXT[deadlineTone(daysLeft)])}>
                              {new Date(app.deadline).toLocaleDateString()}
                              {isUrgent && <span className="ml-1">({daysLeft}d)</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={cn("text-xs", TONE_BADGE[applicationTone(app.status)])}>
                            {app.status}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {app.decision ? (
                            <Badge
                              variant="outline"
                              className={cn("text-xs", TONE_BADGE[decisionTone(app.decision)])}
                            >
                              {app.decision}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => chase(app)}
                              aria-label={`Add a follow-up for ${nameMap.get(app.student_id) || "this student"}'s ${app.college_name} application`}
                              title="Add a follow-up"
                            >
                              <BellPlus className="h-4 w-4" />
                            </Button>
                            <Link
                              to={`/teacher/students/${app.student_id}`}
                              className="text-muted-foreground transition-colors hover:text-accent"
                              aria-label="Open this student"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
