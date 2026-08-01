import { Users2, Mail, Briefcase } from "lucide-react";
import { useFellowCounsellors } from "@/hooks/useFellowCounsellors";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard widget listing other verified counsellors in the same school.
 * Helps counsellors collaborate and reach out to colleagues directly.
 */
export function FellowCounsellorsWidget() {
  const { items, loading, error } = useFellowCounsellors();

  return (
    <Card className="p-5">
      <header className="mb-4 flex items-center gap-2">
        <Users2 className="h-4 w-4 text-accent" />
        <h3 className="font-semibold text-sm text-foreground">Fellow Counsellors</h3>
        {!loading && items.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {items.length} at your school
          </Badge>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Unable to load colleagues right now.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You're the only verified counsellor at your school. Invite colleagues to collaborate.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => {
            const name = c.username || c.email?.split("@")[0] || "Counsellor";
            const role = c.school_role || c.title || "Counsellor";
            return (
              <li
                key={c.user_id}
                className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold text-sm">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="h-3 w-3" />
                    <span className="truncate">{role}</span>
                    {c.subject && <span className="truncate">· {c.subject}</span>}
                  </p>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="text-xs text-accent hover:underline flex items-center gap-1.5 mt-1 truncate"
                    >
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
