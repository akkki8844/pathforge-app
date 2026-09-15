/**
 * A typed view of the shared Supabase client, restricted to `bug_reports`.
 *
 * Same reasoning as `./routine.ts`: `./types.ts` is machine-generated and
 * re-emitted in full on every re-introspection, so a hand-added table there is
 * erased on the next regeneration and `from("bug_reports")` silently resolves
 * to `never`. Declaring the shape here from `@/lib/bugs/types` survives that.
 *
 * Same client, same socket, same session — only the compile-time view differs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { BugReport } from "@/lib/bugs/types";

/**
 * Writes go through the `report_bug()` RPC, never through this client: the
 * table has no insert policy. What an admin can change is the triage state and
 * nothing else, so the Update shape is narrowed to exactly those columns —
 * `occurrences` or `fingerprint` arriving in an UPDATE would be a bug, and the
 * type is where that gets caught.
 */
type BugTriageUpdate = Partial<
  Pick<BugReport, "status" | "severity" | "admin_notes" | "resolved_by" | "resolved_at">
>;

export type BugDatabase = {
  public: {
    Tables: {
      bug_reports: {
        Row: BugReport;
        Insert: never;
        Update: BugTriageUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const bugsDb = supabase as unknown as SupabaseClient<BugDatabase>;
