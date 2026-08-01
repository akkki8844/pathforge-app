import { ShieldAlert, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCounsellorOverrides } from "@/hooks/useCounsellorOverrides";

const TYPE_LABEL = {
  priority: "Priority shift",
  roadmap_note: "Counsellor note",
  task: "Counsellor task",
  warning: "Counsellor warning",
} as const;

const PRIORITY_TONE = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/10 text-accent",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
} as const;

/**
 * Read-only banner shown to STUDENTS on their Journey page when their
 * counsellor has pushed an override. Always wins over AI suggestions.
 */
export function CounsellorOverrideBanner() {
  const { items, loading } = useCounsellorOverrides(undefined, "student");
  if (loading || items.length === 0) return null;

  return (
    <section className="card-elevated overflow-hidden border-accent/30">
      <div className="p-4 border-b border-border bg-accent/5 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold text-foreground">From your counsellor</h2>
        <Badge variant="secondary" className="ml-auto text-[10px]">{items.length} active</Badge>
      </div>
      <ul className="divide-y divide-border">
        {items.map((o) => (
          <li key={o.id} className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                o.priority === "urgent" || o.priority === "high"
                  ? "text-destructive"
                  : "text-accent"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{o.title}</h3>
                  <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[o.override_type]}</Badge>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_TONE[o.priority]}`}>
                    {o.priority}
                  </span>
                </div>
                {o.body && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{o.body}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Posted {new Date(o.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
