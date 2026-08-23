/**
 * The Communications domain model.
 *
 * These types mirror `supabase/migrations/*_communications_system.sql`
 * one-for-one and are the single contract every Communications page codes
 * against. If you change a column, change it here in the same commit — nothing
 * else in the section reaches for the raw table shape.
 *
 * They live here rather than in `integrations/supabase/types.ts` for the same
 * reason the Routine model does: that file carries an "automatically generated,
 * do not edit" banner and is rewritten wholesale whenever the schema is
 * re-introspected, which would silently drop hand-written entries — and the
 * failure is invisible, because `from("messages")` starts resolving to `never`
 * and every field becomes an error at once, far from the cause. `commsDb` in
 * `@/integrations/supabase/communications` re-types the shared client from
 * these definitions instead.
 */

// ── Shared vocabulary ────────────────────────────────────────────────────

/**
 * The palette a team or group conversation may be tinted with.
 *
 * A closed set of names, not free-form hex. Tailwind's JIT only emits CSS for
 * class strings it can find literally in the source, so a colour built by
 * interpolating a stored hex (`bg-[${row.accent}]`) produces no rule at all and
 * renders untinted. Resolve with `accentClasses()` in `@/lib/comms/accents`.
 */
export const TEAM_ACCENTS = [
  "indigo", "violet", "emerald", "amber", "rose", "cyan", "orange", "slate",
] as const;
export type TeamAccent = (typeof TEAM_ACCENTS)[number];

export type Priority = "low" | "medium" | "high";
export const PRIORITIES: Priority[] = ["low", "medium", "high"];

// ── Teams ────────────────────────────────────────────────────────────────

export const TEAM_CATEGORIES = [
  "school_project", "competition", "club", "research", "startup", "sports", "other",
] as const;
export type TeamCategory = (typeof TEAM_CATEGORIES)[number];

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  school_project: "School Project",
  competition: "Competition",
  club: "Club",
  research: "Research",
  startup: "Startup",
  sports: "Sports",
  other: "Other",
};

/** Ordered weakest → strongest; compare with `teamRoleAtLeast()`. */
export type TeamRole = "member" | "admin" | "owner";

export interface Team {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: TeamCategory;
  accent: TeamAccent;
  /** Storage path in the `comms-attachments` bucket, never a public URL. */
  image_path: string | null;
  /** Set when archived; archived teams stay readable but drop out of the list. */
  archived_at: string | null;
  /**
   * Touched by triggers on message/objective/announcement insert. Denormalised
   * so the Teams grid can sort by liveliness without a correlated subquery per
   * card.
   */
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export type InviteStatus = "pending" | "accepted" | "declined";

export interface TeamInvite {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  status: InviteStatus;
  created_at: string;
  responded_at: string | null;
}

// ── Conversations and messages ───────────────────────────────────────────

/**
 * `team` is not a separate messaging backend — it is a conversation with
 * `team_id` set, so every message feature (replies, reactions, pins, mentions,
 * attachments, objective detection) works in a team chat by construction rather
 * than by being reimplemented there.
 */
export type ConversationKind = "dm" | "group" | "team";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  /** Null for DMs — a DM's name is the other participant, resolved at render. */
  title: string | null;
  accent: TeamAccent | null;
  image_path: string | null;
  team_id: string | null;
  created_by: string;
  /** Denormalised for list ordering without touching `messages`. */
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  /**
   * The high-water mark for unread counting. Comparing this against
   * `messages.created_at` is what makes unread a derived value rather than a
   * second table that can drift out of agreement with the messages themselves.
   */
  last_read_at: string | null;
  muted: boolean;
  pinned: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  reply_to_id: string | null;
  /**
   * Resolved user ids, written at send time. Stored rather than re-parsed from
   * `body` so a renamed user doesn't break an existing mention, and so
   * notification fanout doesn't have to understand the text format.
   */
  mentions: string[];
  created_at: string;
  edited_at: string | null;
  /**
   * Soft delete. A hard delete would orphan every `reply_to_id` pointing at
   * this row, so a deleted message keeps its place in the thread and renders as
   * "message deleted".
   */
  deleted_at: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/**
 * The reaction set offered in the UI.
 *
 * A fixed six rather than a full emoji picker: no picker library is installed,
 * and an open set makes reactions unaggregatable in practice. These cover the
 * responses a collaboration thread actually needs.
 */
export const QUICK_REACTIONS = ["👍", "🎉", "❤️", "😂", "👀", "🙏"] as const;

export interface MessageAttachment {
  id: string;
  message_id: string;
  /** Denormalised so bucket policies can authorise without joining `messages`. */
  conversation_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface MessagePin {
  id: string;
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  created_at: string;
}

// ── Objectives ───────────────────────────────────────────────────────────

/**
 * `suggested` is an AI proposal nobody has accepted yet. It shares this table
 * with accepted work so the Detected inbox and My Objectives read one source of
 * truth — but it is a distinct status, never a flag on an otherwise-real
 * objective, so a suggestion cannot be mistaken for a commitment.
 */
export type ObjectiveStatus =
  | "suggested"
  | "todo"
  | "in_progress"
  | "done"
  | "dismissed";

export type ObjectiveSourceType = "message" | "announcement" | "manual";

export interface Objective {
  id: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  priority: Priority;
  /** Null means "not specified" — never guessed. See `extract-objectives`. */
  assignee_id: string | null;
  assigned_by: string | null;
  team_id: string | null;
  due_at: string | null;
  source_type: ObjectiveSourceType;
  /** The originating message or announcement id; null for manual entries. */
  source_id: string | null;
  /** 0–1, only set on AI-detected rows. Null for anything a human typed. */
  confidence: number | null;
  /**
   * The `routine_tasks` row this objective owns.
   *
   * An accepted objective writes a real Routine task, which is how its deadline
   * reaches Today, Calendar and the deadline-reminder cron without a second
   * kind of deadline record existing anywhere.
   */
  routine_task_id: string | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveActivity {
  id: string;
  objective_id: string;
  /** Null for system-generated entries (e.g. the cron marking one overdue). */
  actor_id: string | null;
  kind: string;
  detail: string | null;
  created_at: string;
}

// ── Announcements ────────────────────────────────────────────────────────

export type AnnouncementScope = "team" | "class" | "school";
export type AnnouncementPriority = "normal" | "important" | "urgent";

export interface Announcement {
  id: string;
  author_id: string;
  scope: AnnouncementScope;
  team_id: string | null;
  class_id: string | null;
  school_id: string | null;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  requires_ack: boolean;
  pinned: boolean;
  is_active: boolean;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface AnnouncementAcknowledgement {
  id: string;
  announcement_id: string;
  user_id: string;
  acknowledged_at: string;
}

// ── AI team summaries ────────────────────────────────────────────────────

export interface TeamSummary {
  id: string;
  team_id: string;
  summary: string;
  /**
   * Hash of the inputs the summary was generated from. The edge function skips
   * regeneration when it matches, which is what keeps this from being an AI call
   * on every counsellor page load.
   */
  content_hash: string;
  model: string | null;
  generated_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const ROLE_RANK: Record<TeamRole, number> = { member: 0, admin: 1, owner: 2 };

/** Whether `role` is at least as privileged as `min`. */
export function teamRoleAtLeast(role: TeamRole | null | undefined, min: TeamRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
