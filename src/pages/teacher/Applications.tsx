import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Search, Filter, MapPin, Calendar, Clock,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, ExternalLink,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface AppEntry {
  id: string;
  student_id: string;
  college_name: string;
  country: string | null;
  application_round: string | null;
  deadline: string | null;
  status: string;
  missing_documents: string[] | null;
  progress: number | null;
  decision: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  researching: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  planning: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  drafting: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  submitted: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  admitted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  waitlisted: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  withdrawn: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

export default function TeacherApplications() {
  const { students } = useTeacherRoster();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["counselor-applications", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("application_entries")
        .select("*")
        .in("student_id", studentIds)
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as AppEntry[];
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

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Applications</h1>
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
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.submitted}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Admitted</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.admitted}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
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
                  {Object.keys(statusColors).map((s) => (
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
                  <th className="p-3 w-10"></th>
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
                      <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground font-medium">No applications found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((app, i) => {
                    const daysLeft = getDaysUntilDeadline(app.deadline);
                    const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
                    return (
                      <motion.tr
                        key={app.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <Link to={`/teacher/students/${app.student_id}`} className="hover:text-accent transition-colors font-medium">
                            {nameMap.get(app.student_id) || "Student"}
                          </Link>
                        </td>
                        <td className="p-3 font-medium text-foreground">{app.college_name}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{app.country || "—"}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{app.application_round || "—"}</td>
                        <td className="p-3">
                          {app.deadline ? (
                            <span className={cn("text-xs", isUrgent && "text-red-600 font-medium")}>
                              {new Date(app.deadline).toLocaleDateString()}
                              {isUrgent && <span className="ml-1">({daysLeft}d)</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={cn("text-xs", statusColors[app.status] || statusColors.researching)}>
                            {app.status}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          {app.decision ? (
                            <Badge variant="outline" className={cn("text-xs",
                              app.decision === "admitted" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                              app.decision === "rejected" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                              "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              {app.decision}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="p-3">
                          <Link to={`/teacher/students/${app.student_id}`} className="text-muted-foreground hover:text-accent transition-colors">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </motion.tr>
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
