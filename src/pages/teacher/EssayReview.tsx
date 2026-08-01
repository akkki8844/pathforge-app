import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Search, CheckCircle2, Clock, AlertTriangle, Flag,
  ChevronRight, MessageSquare, ThumbsUp, ThumbsDown, Eye,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface EssaySubmission {
  id: string;
  student_id: string;
  title: string;
  content: string;
  status: "pending" | "reviewed" | "flagged" | "revision_requested";
  ai_score: number | null;
  grammar_score: number | null;
  readability_score: number | null;
  counselor_comments: string | null;
  created_at: string;
  updated_at: string;
}

const statusConfig = {
  pending: { label: "Pending Review", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", icon: CheckCircle2 },
  flagged: { label: "AI Flagged", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: Flag },
  revision_requested: { label: "Revision Requested", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: MessageSquare },
};

export default function TeacherEssayReview() {
  const { students } = useTeacherRoster();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEssay, setSelectedEssay] = useState<EssaySubmission | null>(null);
  const [comment, setComment] = useState("");

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);

  const { data: essays = [], isLoading } = useQuery({
    queryKey: ["counselor-essays", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("essay_submissions")
        .select("*")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EssaySubmission[];
    },
    enabled: studentIds.length > 0,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return essays.filter((e) => {
      if (activeTab !== "all" && e.status !== activeTab) return false;
      if (q) {
        const studentName = nameMap.get(e.student_id) || "";
        const hay = `${e.title} ${studentName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [essays, search, activeTab, nameMap]);

  const counts = useMemo(() => ({
    pending: essays.filter((e) => e.status === "pending").length,
    reviewed: essays.filter((e) => e.status === "reviewed").length,
    flagged: essays.filter((e) => e.status === "flagged").length,
    revision_requested: essays.filter((e) => e.status === "revision_requested").length,
  }), [essays]);

  const handleApprove = async (essayId: string) => {
    await (supabase as any)
      .from("essay_submissions")
      .update({ status: "reviewed", counselor_comments: comment || null, updated_at: new Date().toISOString() })
      .eq("id", essayId);
    setSelectedEssay(null);
    setComment("");
  };

  const handleRequestRevision = async (essayId: string) => {
    if (!comment.trim()) return;
    await (supabase as any)
      .from("essay_submissions")
      .update({ status: "revision_requested", counselor_comments: comment, updated_at: new Date().toISOString() })
      .eq("id", essayId);
    setSelectedEssay(null);
    setComment("");
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Essay Review Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Review, comment, and approve student essays</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["pending", "reviewed", "flagged", "revision_requested"] as const).map((status) => {
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            return (
              <div key={status} className="card-elevated p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cfg.label}</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{counts[status]}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Essay list */}
          <div className="lg:col-span-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search essays..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="pending" className="flex-1 text-xs">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="reviewed" className="flex-1 text-xs">Reviewed ({counts.reviewed})</TabsTrigger>
                <TabsTrigger value="flagged" className="flex-1 text-xs">Flagged ({counts.flagged})</TabsTrigger>
                <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card-elevated p-3 animate-pulse">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No essays found</p>
                </div>
              ) : (
                filtered.map((essay) => {
                  const cfg = statusConfig[essay.status] || statusConfig.pending;
                  const Icon = cfg.icon;
                  const isSelected = selectedEssay?.id === essay.id;
                  return (
                    <motion.div
                      key={essay.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "card-elevated p-3 cursor-pointer transition-all hover:border-accent/30",
                        isSelected && "border-accent/50 bg-accent/5"
                      )}
                      onClick={() => setSelectedEssay(essay)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{essay.title || "Untitled Essay"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {nameMap.get(essay.student_id) || "Student"}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.color)}>
                          <Icon className="h-2.5 w-2.5 mr-0.5" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {essay.ai_score != null && (
                          <span>AI: {essay.ai_score}/100</span>
                        )}
                        {essay.grammar_score != null && (
                          <span>Grammar: {essay.grammar_score}/100</span>
                        )}
                        <span>{new Date(essay.created_at).toLocaleDateString()}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Essay detail */}
          <div className="lg:col-span-2">
            {selectedEssay ? (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedEssay.title || "Untitled Essay"}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {nameMap.get(selectedEssay.student_id) || "Student"} &middot;{" "}
                        {new Date(selectedEssay.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", statusConfig[selectedEssay.status]?.color)}>
                      {statusConfig[selectedEssay.status]?.label}
                    </Badge>
                  </div>

                  {/* Scores */}
                  <div className="flex gap-4 mt-3">
                    {selectedEssay.ai_score != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">AI Score</p>
                        <p className="text-lg font-bold text-foreground">{selectedEssay.ai_score}</p>
                      </div>
                    )}
                    {selectedEssay.grammar_score != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Grammar</p>
                        <p className="text-lg font-bold text-foreground">{selectedEssay.grammar_score}</p>
                      </div>
                    )}
                    {selectedEssay.readability_score != null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Readability</p>
                        <p className="text-lg font-bold text-foreground">{selectedEssay.readability_score}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Essay content */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border max-h-[400px] overflow-y-auto">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {selectedEssay.content}
                    </p>
                  </div>

                  {/* Previous comments */}
                  {selectedEssay.counselor_comments && (
                    <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                      <p className="text-xs font-medium text-accent mb-1">Previous Comments</p>
                      <p className="text-sm text-foreground">{selectedEssay.counselor_comments}</p>
                    </div>
                  )}

                  {/* Comment input */}
                  <div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add your review comments..."
                      className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleApprove(selectedEssay.id)}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRequestRevision(selectedEssay.id)}
                      disabled={!comment.trim()}
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Eye className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-medium">Select an essay to review</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose from the list on the left</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
