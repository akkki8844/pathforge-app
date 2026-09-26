/**
 * A typed view of the shared Supabase client, restricted to the tables the
 * counsellor workspace reads and writes.
 *
 * WHY THIS EXISTS
 *
 * None of these tables are in `./types.ts`, which is machine-generated and
 * re-emitted whole whenever the schema is re-introspected - hand-adding them
 * there would be erased on the next regeneration. So every counsellor query
 * reached for the same escape hatch instead:
 *
 *     await (supabase as any).from("essay_submissions").update({ ... })
 *
 * Seven of those in the workspace pages, plus more behind
 * `eslint-disable-next-line` in the hooks. The cast does not just silence the
 * linter: it turns off checking for the whole chain after it, so a misspelled
 * column, a status string that is not one of the four the column accepts, or a
 * `.eq()` on a field that does not exist all compile. That is precisely how
 * `EssayReview` ended up updating a row and discarding the error it returned.
 *
 * This is the same arrangement `./routine.ts` and `./communications.ts` use
 * for their own domains: the schema is declared here from the shapes the code
 * already works with, and the one live client is re-typed through it. Same
 * client, same socket, same auth session - only the compile-time view differs.
 *
 * Import `counsellorDb` for these tables and the plain `supabase` export for
 * everything else.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CounsellorInteraction } from "@/hooks/useCounsellorInteractions";
import type { Followup } from "@/hooks/useCounselorFollowups";
import type { CounsellorNote } from "@/hooks/useCounsellorNotes";

/**
 * Rows are declared as object types, not interfaces.
 *
 * `GenericTable.Row` in postgrest-js is `Record<string, unknown>`, and a TS
 * interface does not satisfy that - interfaces get no implicit index
 * signature, so the schema fails the constraint and every table quietly
 * resolves to `never`. The failure is invisible: `.from("x").select()` still
 * compiles, `data` is just `never[]`, and the first sign of it is every field
 * access erroring at once. `Plain<T>` maps an imported interface into a plain
 * object type so it passes.
 */
type Plain<T> = { [K in keyof T]: T[K] };

/** A student's essay, as submitted for a counsellor's read. */
export type EssaySubmissionRow = {
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
};

/** One university on a student's list, and where it has got to. */
/**
 * One university a student is applying to.
 *
 * Lives in `student_applications`, created 2026-09-22. This type previously
 * named `application_entries`, which was wrong in the way that is hardest to
 * catch: that table exists, so nothing failed to compile, but it holds essay
 * section text (`section_id`, `input_text`, `refined_text`) and is written by
 * ApplicationBuilder. The counsellor Applications page was querying it for
 * `student_id`, `deadline` and `status`, none of which are columns on it, so
 * the page errored at runtime while typechecking cleanly.
 *
 * That is the cost of a hand-written schema module: it asserts a shape rather
 * than deriving one, so it is only ever as true as the last person to check it
 * against the database. The seven `status` values below are the CHECK
 * constraint verbatim, and are the same seven `applicationTone` in
 * lib/teacher/status.ts maps.
 */
export type ApplicationEntryRow = {
  id: string;
  student_id: string;
  college_name: string;
  country: string | null;
  /** early_decision | early_action | early_decision_2 | regular | rolling */
  application_round: string | null;
  deadline: string | null;
  /** researching | planning | drafting | submitted | admitted | rejected | waitlisted */
  status: string;
  /** admitted | rejected | waitlisted, once there is one. */
  decision: string | null;
  progress: number | null;
  missing_documents: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** A scholarship in the shared catalogue. Not scoped to a counsellor. */
export type ScholarshipRow = {
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
};

/** Columns the database fills in on every table here. */
type Generated = "id" | "created_at" | "updated_at";

/**
 * Insert shape for a counsellor row.
 *
 * `id`, `created_at` and `updated_at` are database-assigned, so they are
 * always optional on the way in. `Defaulted` names the further columns that
 * carry a `DEFAULT` in the schema - a new `counsellor_followups` row starts
 * `open` with no `completed_at`, and no caller passes either. Everything else
 * stays required, which is the point: an insert that forgets `student_id`
 * should not compile.
 */
type Insertable<Row, Defaulted extends keyof Row = never> = Omit<
  Row,
  Generated | Defaulted
> &
  Partial<Pick<Row, Extract<keyof Row, Generated> | Defaulted>>;

type Table<Row, Defaulted extends keyof Row = never> = {
  Row: Row;
  Insert: Insertable<Row, Defaulted>;
  Update: Partial<Insertable<Row, Defaulted>>;
  Relationships: [];
};

export type CounsellorDatabase = {
  public: {
    Tables: {
      essay_submissions: Table<EssaySubmissionRow>;
      student_applications: Table<ApplicationEntryRow, "status">;
      scholarships: Table<ScholarshipRow>;
      counsellor_interactions: Table<Plain<CounsellorInteraction>>;
      counsellor_followups: Table<Plain<Followup>, "status" | "completed_at">;
      counsellor_student_notes: Table<Plain<CounsellorNote>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CounsellorTableName = keyof CounsellorDatabase["public"]["Tables"];

export const counsellorDb = supabase as unknown as SupabaseClient<CounsellorDatabase>;
