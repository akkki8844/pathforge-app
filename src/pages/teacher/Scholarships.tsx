import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award, Search, Calendar, DollarSign, MapPin, GraduationCap,
  Clock, ExternalLink, Star, ChevronRight,
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

interface Scholarship {
  id: string;
  name: string;
  provider: string;
  amount: string;
  deadline: string | null;
  country: string;
  field: string | null;
  eligibility: string | null;
  url: string | null;
  description: string | null;
}

export default function TeacherScholarships() {
  const { students } = useTeacherRoster();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");

  const { data: scholarships = [], isLoading } = useQuery({
    queryKey: ["counselor-scholarships"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scholarships")
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Scholarship[];
    },
  });

  const countries = useMemo(() => {
    const set = new Set(scholarships.map((s) => s.country).filter(Boolean));
    return Array.from(set).sort();
  }, [scholarships]);

  const fields = useMemo(() => {
    const set = new Set(scholarships.map((s) => s.field).filter(Boolean));
    return Array.from(set).sort();
  }, [scholarships]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scholarships.filter((s) => {
      if (countryFilter !== "all" && s.country !== countryFilter) return false;
      if (fieldFilter !== "all" && s.field !== fieldFilter) return false;
      if (q) {
        const hay = `${s.name} ${s.provider} ${s.country} ${s.field || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [scholarships, search, countryFilter, fieldFilter]);

  const getDaysUntil = (deadline: string | null) => {
    if (!deadline) return null;
    return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scholarships</h1>
          <p className="text-sm text-muted-foreground mt-1">Find and recommend scholarships to students</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-foreground mt-1">{scholarships.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Countries</p>
            <p className="text-2xl font-bold text-foreground mt-1">{countries.length}</p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Upcoming</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {scholarships.filter((s) => { const d = getDaysUntil(s.deadline); return d !== null && d > 0 && d <= 30; }).length}
            </p>
          </div>
          <div className="card-elevated p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fields</p>
            <p className="text-2xl font-bold text-foreground mt-1">{fields.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scholarships..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fieldFilter} onValueChange={setFieldFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  {fields.map((f) => <SelectItem key={f} value={f!}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Scholarship list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-elevated p-4 animate-pulse">
                <div className="h-5 w-1/3 bg-muted rounded mb-2" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No scholarships found</p>
            </div>
          ) : (
            filtered.map((scholarship, i) => {
              const daysLeft = getDaysUntil(scholarship.deadline);
              const isUrgent = daysLeft !== null && daysLeft <= 14 && daysLeft >= 0;
              return (
                <motion.div
                  key={scholarship.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="card-elevated p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{scholarship.name}</h3>
                        {isUrgent && (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20">
                            <Clock className="h-2.5 w-2.5 mr-0.5" />
                            {daysLeft}d left
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{scholarship.provider}</p>
                      {scholarship.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{scholarship.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        {scholarship.amount && (
                          <span className="flex items-center gap-1 text-xs text-foreground font-medium">
                            <DollarSign className="h-3 w-3" />
                            {scholarship.amount}
                          </span>
                        )}
                        {scholarship.country && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {scholarship.country}
                          </span>
                        )}
                        {scholarship.field && (
                          <Badge variant="outline" className="text-[10px]">{scholarship.field}</Badge>
                        )}
                        {scholarship.deadline && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(scholarship.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {scholarship.url && (
                      <a href={scholarship.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="h-8">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
