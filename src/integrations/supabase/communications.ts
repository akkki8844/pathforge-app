/**
 * A typed view of the shared Supabase client, restricted to the Communications
 * tables.
 *
 * `./types.ts` is machine-generated and re-emitted in full whenever the schema
 * is re-introspected, so hand-adding these tables there would be quietly erased
 * on the next regeneration — and the failure mode is invisible
 * (`from("messages")` starts resolving to `never`, so every field becomes an
 * error at once, far from the cause). Instead this module declares the schema
 * from the domain types in `@/lib/comms/types` and re-types the one live client
 * through it.
 *
 * It is the same client and the same connection: no second socket, no second
 * auth session. Only the compile-time view differs. Import `commsDb` for
 * Communications reads and writes, and the plain `supabase` export for
 * everything else — including realtime channels, which are schema-agnostic.
 *
 * This is the same arrangement `./routine.ts` uses; see its header for the
 * longer version of the reasoning.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  Announcement,
  AnnouncementAcknowledgement,
  AnnouncementRead,
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  MessagePin,
  MessageReaction,
  Objective,
  ObjectiveActivity,
  Team,
  TeamInvite,
  TeamMember,
  TeamSummary,
} from "@/lib/comms/types";

/**
 * Insert shape for a Communications row.
 *
 * `id`, `created_at` and `updated_at` are database-assigned. Ownership columns
 * (`sender_id`, `created_by`, `user_id`, ...) have `DEFAULT auth.uid()` in the
 * schema but are still declared required here, because relying on the default
 * makes an insert from a stale session fail at the RLS check with an opaque
 * policy error instead of an obvious "not signed in".
 */
type Insertable<Row> = Partial<Pick<Row, Extract<keyof Row, "id">>> &
  Omit<Row, "id" | "created_at" | "updated_at"> &
  Partial<Pick<Row, Extract<keyof Row, "created_at" | "updated_at">>>;

/**
 * Flattens an interface into a plain mapped object type.
 *
 * Not cosmetic. supabase-js constrains a schema's tables to
 * `Record<string, unknown>`, and a TypeScript *interface* is not assignable to
 * that — interfaces get no implicit index signature, so the constraint fails and
 * the client's row types collapse to `never`. The failure is silent and
 * misleading: `from("messages").update({...})` reports "not assignable to
 * parameter of type 'never'" with no hint that the cause is the shape of the
 * schema declaration rather than the object being passed. Mapping each row
 * through `Cols` produces an anonymous object type, which does satisfy the
 * constraint.
 */
type Cols<Row> = { [K in keyof Row]: Row[K] };

type Table<Row> = {
  Row: Cols<Row>;
  Insert: Cols<Insertable<Row>>;
  Update: Partial<Cols<Insertable<Row>>>;
  Relationships: [];
};

export type CommsDatabase = {
  public: {
    Tables: {
      teams: Table<Team>;
      team_members: Table<TeamMember>;
      team_invites: Table<TeamInvite>;
      conversations: Table<Conversation>;
      conversation_members: Table<ConversationMember>;
      messages: Table<Message>;
      message_reactions: Table<MessageReaction>;
      message_attachments: Table<MessageAttachment>;
      message_pins: Table<MessagePin>;
      objectives: Table<Objective>;
      objective_activity: Table<ObjectiveActivity>;
      announcements: Table<Announcement>;
      announcement_reads: Table<AnnouncementRead>;
      announcement_acknowledgements: Table<AnnouncementAcknowledgement>;
      team_summaries: Table<TeamSummary>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type CommsTableName = keyof CommsDatabase["public"]["Tables"];

/**
 * The tables the per-user realtime fan-out watches.
 *
 * Deliberately short. Unlike Routine — where every row is self-owned, so one
 * `user_id=eq.<me>` filter covers the whole section — Communications rows are
 * mostly authored by *other* people, and a `user_id` filter on `messages` would
 * subscribe to a channel that can never fire for anything worth seeing. So:
 *
 *  - these tables are watched per-user, filtered on my own rows, because they
 *    drive the conversation list, unread badges and the Objectives inbox;
 *  - `messages` and its satellites are watched per-*conversation* instead, by
 *    the open thread itself (see `useMessages`), filtered on `conversation_id`.
 */
export const COMMS_USER_TABLES = [
  "conversation_members",
  "team_members",
  "team_invites",
] as const satisfies readonly CommsTableName[];

export const commsDb = supabase as unknown as SupabaseClient<CommsDatabase>;
