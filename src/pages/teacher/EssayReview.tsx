import { useMemo, useState } from "react";
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import {
  FollowupComposer,
  type FollowupDraft,
} from "@/components/teacher/FollowupComposer";
import { Seo } from "@/components/Seo";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TONE_BADGE, TONE_TEXT, essayTone } from "@/lib/teacher/status";
import {
  counsellorDb,
  type EssaySubmissionRow as EssaySubmission,
} from "@/integrations/supabase/counsellor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BellPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


const statusConfig = {
  pending: { label: "Pending Review", color: TONE_BADGE[essayTone("pending")], icon: Clock },
  reviewed: { label: "Reviewed", color: TONE_BADGE[essayTone("reviewed")], icon: CheckCircle2 },
  flagged: { label: "AI Flagged", color: TONE_BADGE[essayTone("flagged")], icon: Flag },
  revision_requested: {
    label: "Revision Requested",
    color: TONE_BADGE[essayTone("revision_requested")],
    icon: MessageSquare,
  },
};

/** Whole days since submission, floored. */
function daysWaiting(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export default function TeacherEssayReview() {
  const { students } = useTeacherRoster();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedEssay, setSelectedEssay] = useState<EssaySubmission | null>(null);
  const [comment, setComment] = useState("");

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.full_name || s.email || "Student"])),
    [students],
  );

  const studentIds = useMemo(() => students.map((s) => s.user_id), [students]);

  const queryClient = useQueryClient();
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupDraft, setFollowupDraft] = useState<FollowupDraft | undefined>();

  /** Opens the follow-up composer against one draft, written for it. */
  const chase = (essay: EssaySubmission) => {
    const name = nameMap.get(essay.student_id) || "this student";
    setFollowupDraft({
      studentId: essay.student_id,
      note: `Essay "${essay.title || "Untitled"}": chase the next draft`,
      context: `From ${name}'s essay, submitted ${new Date(essay.created_at).toLocaleDateString()}.`,
    });
    setFollowupOpen(true);
  };

  const { toast } = useToast();
  const [saving, setSaving] = useState<null | "approve" | "revision">(null);

  const { data: essays = [], isLoading } = useQuery({
    queryKey: ["counselor-essays", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      const { data, error } = await counsellorDb
        .from("essay_submissions")
        .select("*")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

  /*
   * Writing a review used to be fire-and-forget.
   *
   * Both handlers awaited the update, ignored the error it returns, then
   * closed the dialog and cleared the box. A write rejected by RLS or dropped
   * by the network looked exactly like a successful one, and the comment the
   * counsellor had just typed was gone. Neither handler invalidated the query
   * either, so even a write that did land left the essay sitting in Pending on
   * screen until the page was reloaded - which reads as the save having
   * failed, and invites a second one.
   *
   * The student sees the result through the essay itself: `status` and
   * `counselor_comments` are what their own essay page reads. There is no
   * separate notification to keep in step.
   */
  const review = async (
    essayId: string,
    next: "reviewed" | "revision_requested",
  ) => {
    const body = comment.trim();
    if (next === "revision_requested" && !body) {
      toast({
        variant: "destructive",
        title: "Say what needs changing",
        description: "A revision request without a comment gives the student nothing to act on.",
      });
      return;
    }

    setSaving(next === "reviewed" ? "approve" : "revision");
    try {
      const { error } = await counsellorDb
        .from("essay_submissions")
        .update({
          status: next,
          counselor_comments: body || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", essayId);

      if (error) {
        toast({
          variant: "destructive",
          title: "Review not saved",
          description: error.message,
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["counselor-essays"] });
      toast({
        title: next === "reviewed" ? "Marked as reviewed" : "Revision requested",
        description: body ? "Your comments are on the student's essay." : undefined,
      });
      setSelectedEssay(null);
      setComment("");
    } finally {
      setSaving(null);
    }
  };

  const handleApprove = (essayId: string) => review(essayId, "reviewed");
  const handleRequestRevision = (essayId: string) => review(essayId, "revision_requested");

  return (
    <TeacherLayout>
      <Seo
        title="Essays"
        description="Drafts waiting on your read."
        path="/teacher/essays"
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Essay Review Center</h1>
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
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No essays found</p>
                </div>
              ) : (
                filtered.map((essay) => {
                  const cfg = statusConfig[essay.status] || statusConfig.pending;
                  const isSelected = selectedEssay?.id === essay.id;
                  const waiting = daysWaiting(essay.created_at);
                  return (
                    /*
                     * A real control, not a div that happens to have onClick.
                     * This list is how a counsellor moves between drafts, and
                     * it was unreachable by keyboard. It also no longer fades
                     * in on every render - see Applications.
                     */
                    <div
                      key={essay.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedEssay(essay)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedEssay(essay);
                        }
                      }}
                      className={cn(
                        "card-elevated cursor-pointer p-3 outline-none transition-colors hover:border-accent/30 focus-visible:ring-2 focus-visible:ring-ring",
                        isSelected && "border-accent/50 bg-accent/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{essay.title || "Untitled Essay"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {nameMap.get(essay.student_id) || "Student"}
                          </p>
                        </div>
                        {/* No icon. At 10px it is a smudge, and the badge's
                            tone already carries the severity the glyph was
                            repeating. */}
                        <Badge variant="outline" className={cn("shrink-0 text-[10px]", cfg.color)}>
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
                        {/* How long it has been sitting, which is the number
                            that decides whether this is the one to open next. */}
                        {essay.status !== "reviewed" && waiting >= 3 && (
                          <span className={cn("font-medium", TONE_TEXT[waiting >= 7 ? "bad" : "warn"])}>
                            waiting {waiting}d
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            // The card behind this opens the essay; chasing is
                            // a different intent and must not also select it.
                            e.stopPropagation();
                            chase(essay);
                          }}
                          className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={`Add a follow-up about ${nameMap.get(essay.student_id) || "this student"}'s essay`}
                          title="Add a follow-up"
                        >
                          <BellPlus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
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
                      disabled={saving !== null}
                    >
                      {saving === "approve" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRequestRevision(selectedEssay.id)}
                      disabled={saving !== null || !comment.trim()}
                    >
                      {saving === "revision" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-2" />
                      )}
                      Request Revision
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <Eye className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
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
