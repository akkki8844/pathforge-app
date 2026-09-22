/**
 * A typed view of the shared Supabase client, restricted to the `interview_*`
 * tables.
 *
 * Same reasoning as `routine.ts` and `communications.ts`: `./types.ts` is
 * machine-generated and re-emitted in full whenever the schema is
 * re-introspected, so hand-adding these three tables there would be erased on
 * the next regeneration — and the failure mode is invisible, because
 * `from("interview_sessions")` silently resolves to `never` and every field
 * becomes an error at once, far from the cause.
 *
 * It is the same client and the same socket: only the compile-time view differs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  InterviewSession,
  InterviewTurn,
  InterviewReport,
} from "@/lib/interview/types";

type Insertable<Row> = Partial<Pick<Row, Extract<keyof Row, "id" | "user_id">>> &
  Omit<Row, "id" | "user_id" | "created_at" | "updated_at"> &
  Partial<Pick<Row, Extract<keyof Row, "created_at" | "updated_at">>>;

type Table<Row> = {
  Row: Row;
  Insert: Insertable<Row>;
  Update: Partial<Insertable<Row>>;
  Relationships: [];
};

export type InterviewDatabase = {
  public: {
    Tables: {
      interview_sessions: Table<InterviewSession>;
      interview_turns: Table<InterviewTurn>;
      /**
       * Reports are read-only from the browser — there is no client INSERT or
       * UPDATE policy, because the `interview-report` edge function writes them
       * under the service role. The Insert/Update shapes exist only to satisfy
       * the generic; a write through them fails at RLS, which is the intent.
       */
      interview_reports: Table<InterviewReport>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const interviewDb = supabase as unknown as SupabaseClient<InterviewDatabase>;
