import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  GraduationCap,
  AlertTriangle,
  Shield,
  ChevronRight,
  Users,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TONE_BADGE, standingTone } from "@/lib/teacher/status";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { downloadRosterCsv } from "@/lib/teacher/exportRoster";

import { CollegeLogo } from "@/components/CollegeLogo";
type SortField = "name" | "score" | "grade" | "status";
type SortDir = "asc" | "desc";

const statusConfig = {
  behind: { label: "At Risk", color: TONE_BADGE[standingTone("behind")], icon: AlertTriangle },
  steady: { label: "On Track", color: TONE_BADGE[standingTone("steady")], icon: Shield },
  top: { label: "Strong", color: TONE_BADGE[standingTone("top")], icon: GraduationCap },
};

export default function TeacherStudents() {
  const { students, loading } = useTeacherRoster();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [majorFilter, setMajorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const grades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const majors = useMemo(() => {
    const set = new Set(students.map((s) => s.intended_major).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = students.filter((s) => {
      if (q) {
        const hay = `${s.full_name ?? ""} ${s.email ?? ""} ${s.intended_major ?? ""} ${s.high_school_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (gradeFilter !== "all" && s.grade !== gradeFilter) return false;
      if (majorFilter !== "all" && s.intended_major !== majorFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });

    const priorityRank = (status: string) => (status === "behind" ? 0 : status === "steady" ? 1 : 2);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
      else if (sortField === "score") cmp = a.overall_score - b.overall_score;
      else if (sortField === "grade") cmp = (a.grade || "").localeCompare(b.grade || "");
      else if (sortField === "status") cmp = priorityRank(a.status) - priorityRank(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [students, search, gradeFilter, majorFilter, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const riskCounts = useMemo(() => ({
    behind: students.filter((s) => s.status === "behind").length,
    steady: students.filter((s) => s.status === "steady").length,
    top: students.filter((s) => s.status === "top").length,
  }), [students]);

  /*
   * Exports what is on screen, not the whole roster. A counsellor who has
   * filtered to grade 12 and exported expects grade 12; handing them all
   * eighty rows instead is the kind of quiet mismatch that gets noticed after
   * the file has already been sent on.
   */
  const exportCsv = () => {
    if (!filtered.length) {
      toast({ variant: "destructive", title: "Nothing to export" });
      return;
    }
    downloadRosterCsv(filtered);
    toast({
      title: "Roster exported",
      description:
        filtered.length === students.length
          ? `${filtered.length} students.`
          : `${filtered.length} of ${students.length} students, matching your current filters.`,
    });
  };

  return (
    <TeacherLayout>
      <Seo
        title="Students"
        description="Every student linked to you."
        path="/teacher/students"
        noindex
      />

      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every student linked to you, ordered by who needs you first.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
            className="shrink-0"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{students.length}</p>
          </div>
          {(["behind", "steady", "top"] as const).map((status) => {
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            return (
              <div key={status} className="card-elevated p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cfg.label}</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{riskCounts[status]}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name, email, major, or school..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map((g) => <SelectItem key={g} value={g!}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={majorFilter} onValueChange={setMajorFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Major" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Majors</SelectItem>
                  {majors.map((m) => <SelectItem key={m} value={m!}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="behind">At Risk</SelectItem>
                  <SelectItem value="steady">On Track</SelectItem>
                  <SelectItem value="top">Strong</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {students.length} students
            </p>
            {(gradeFilter !== "all" || majorFilter !== "all" || statusFilter !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => { setSearch(""); setGradeFilter("all"); setMajorFilter("all"); setStatusFilter("all"); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <div className="flex items-center gap-1">Student <SortIcon field="name" /></div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none hidden md:table-cell" onClick={() => toggleSort("grade")}>
                    <div className="flex items-center gap-1">Grade <SortIcon field="grade" /></div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">School</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Major</th>
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("score")}>
                    <div className="flex items-center gap-1">Score <SortIcon field="score" /></div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="p-3"><div className="h-4 w-32 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden md:table-cell"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden lg:table-cell"><div className="h-4 w-24 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3 hidden lg:table-cell"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                      <td className="p-3"></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground font-medium">No students found</p>
                      <p className="text-muted-foreground text-xs mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => {
                    const cfg = statusConfig[s.status] || statusConfig.steady;
                    const StatusIcon = cfg.icon;
                    // See Applications: a roster is read, not watched.
                    return (
                      <tr
                        key={s.user_id}
                        className="border-b border-border transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <Link to={`/teacher/students/${s.user_id}`} className="flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                              {(s.full_name || s.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground group-hover:text-accent transition-colors">
                                {s.full_name || s.email || "Student"}
                              </p>
                              {s.email && s.full_name && (
                                <p className="text-xs text-muted-foreground">{s.email}</p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{s.grade || "—"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">
                          <span className="flex items-center gap-2">
                            {s.high_school_name && (
                              <CollegeLogo name={s.high_school_name} size={18} className="rounded-[3px]" hideWhenUnknown />
                            )}
                            <span className="line-clamp-1">{s.high_school_name || "—"}</span>
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">
                          <span className="line-clamp-1">{s.intended_major || "—"}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Progress value={s.overall_score} className="h-1.5 w-16" />
                            <span className="text-xs font-medium text-muted-foreground">{s.overall_score}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Link to={`/teacher/students/${s.user_id}`} className="text-muted-foreground hover:text-accent transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
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
