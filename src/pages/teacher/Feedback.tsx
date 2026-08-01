import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherFeedback } from "@/hooks/useTeacherFeedback";
import { Badge } from "@/components/ui/badge";

export default function TeacherFeedback() {
  const { items, loading } = useTeacherFeedback();

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Feedback log</h1>
        <p className="text-sm text-muted-foreground mt-1">All feedback you've sent. Open a student to compose new notes.</p>
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
