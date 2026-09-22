/**
 * A typed view of the shared Supabase client, restricted to `documents`.
 *
 * `./types.ts` is machine-generated and re-emitted in full whenever the schema
 * is re-introspected, so hand-adding this table there would be erased on the
 * next regeneration — and the failure is invisible, since `from("documents")`
 * would start resolving to `never` and every field would error at once, far
 * from the cause. This declares the table from the domain type instead and
 * re-types the one live client through it, exactly as `./routine.ts` does.
 *
 * Same client, same connection, same auth session; only the compile-time view
 * differs.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DocumentNode } from "@/lib/documents/types";

/**
 * `id`, `created_at` and `updated_at` are database-assigned. `user_id` has a
 * `DEFAULT auth.uid()` and is optional here, but every call passes it, so an
 * insert from a stale session fails as "not signed in" rather than as an
 * opaque RLS policy error.
 */
type Insertable<Row> = Partial<Pick<Row, Extract<keyof Row, "id" | "user_id">>> &
  Omit<Row, "id" | "user_id" | "created_at" | "updated_at"> &
  Partial<Pick<Row, Extract<keyof Row, "created_at" | "updated_at">>>;

type Table<Row> = {
  Row: Row;
  Insert: Insertable<Row>;
  Update: Partial<Insertable<Row>>;
  Relationships: [];
};

export type DocumentsDatabase = {
  public: {
    Tables: { documents: Table<DocumentNode> };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const documentsDb = supabase as unknown as SupabaseClient<DocumentsDatabase>;
