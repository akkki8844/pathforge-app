import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Seo } from "@/components/Seo";
import { useTeacherFeedback } from "@/hooks/useTeacherFeedback";
import { Badge } from "@/components/ui/badge";

export default function TeacherFeedback() {
  const { items, loading } = useTeacherFeedback();

  return (
    <TeacherLayout>
      <Seo
        title="Feedback log"
        description="Everything you have sent a student."
        path="/teacher/feedback"
        noindex
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Feedback log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you have sent a student, newest first. Open a student to write a new note.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">No feedback sent yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((f) => (
            <div key={f.id} className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                <span>{new Date(f.created_at).toLocaleString()}</span>
                <Badge variant="outline" className="capitalize">{f.subject_type}</Badge>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{f.body}</p>
            </div>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}
