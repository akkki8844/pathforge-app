import { useEffect, useState } from "react";
import { Compass, Calendar, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Roadmap {
  monthly_focus: string | null;
  long_term_plan: string | null;
  focus_areas: string[] | null;
  notes: string | null;
  updated_at: string;
}

/**
 * Read-only banner shown to STUDENTS on their Journey page. Surfaces whatever
 * roadmap their counsellor has published (monthly focus, long-term plan,
 * focus areas, notes). Counsellor edits in the StudentDetail view show up
 * here for the student immediately on next load.
 */
export function CounsellorRoadmapBanner() {
  const { user } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("counsellor_roadmaps")
        .select("monthly_focus,long_term_plan,focus_areas,notes,updated_at")
        .eq("student_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setRoadmap((data as Roadmap | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!roadmap) return null;
  const hasContent =
    roadmap.monthly_focus ||
    roadmap.long_term_plan ||
    (roadmap.focus_areas && roadmap.focus_areas.length > 0) ||
    roadmap.notes;
  if (!hasContent) return null;

  return (
    <section className="card-elevated overflow-hidden border-primary/30">
      <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-2">
        <Compass className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Your counsellor's plan for you</h2>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Updated {new Date(roadmap.updated_at).toLocaleDateString()}
        </Badge>
      </div>
      <div className="p-4 space-y-3">
        {roadmap.monthly_focus && (
          <Row icon={Calendar} label="This month">
            {roadmap.monthly_focus}
          </Row>
        )}
        {roadmap.long_term_plan && (
          <Row icon={Compass} label="Long-term plan">
            {roadmap.long_term_plan}
          </Row>
        )}
        {roadmap.focus_areas && roadmap.focus_areas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
              Focus areas
            </span>
            {roadmap.focus_areas.map((a) => (
              <Badge key={a} variant="outline" className="text-[10px]">
                {a}
              </Badge>
            ))}
          </div>
        )}
        {roadmap.notes && (
          <Row icon={StickyNote} label="Notes">
            {roadmap.notes}
          </Row>
        )}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Compass;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{children}</p>
      </div>
    </div>
  );
}
