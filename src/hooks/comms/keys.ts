/**
 * Query keys for Communications.
 *
 * All keys are namespaced under `["comms", ...]` so a single
 * `invalidateQueries({ queryKey: commsKeys.all })` can flush the whole section
 * after a sign-out, matching how `routineKeys` works.
 *
 * The important shape difference from Routine: keys here are scoped by the thing
 * being read (a conversation, a team) as well as by the viewer, because the same
 * user sees different rows in different conversations and a per-user key alone
 * would collide across them.
 */
import type { QueryKey } from "@tanstack/react-query";

export const commsKeys = {
  all: ["comms"] as const,

  /** The signed-in user's conversation list, with unread counts and previews. */
  conversations: (userId: string | undefined): QueryKey => ["comms", "conversations", userId ?? "anon"],

  /** One page-set of messages for a conversation. */
  messages: (conversationId: string | undefined): QueryKey => ["comms", "messages", conversationId ?? "none"],

  /** Reactions, attachments and pins, keyed by conversation so they invalidate together. */
  reactions: (conversationId: string | undefined): QueryKey => ["comms", "reactions", conversationId ?? "none"],
  pins: (conversationId: string | undefined): QueryKey => ["comms", "pins", conversationId ?? "none"],

  /** Members of a conversation, for the details panel and mention autocomplete. */
  conversationMembers: (conversationId: string | undefined): QueryKey => [
    "comms", "conversation-members", conversationId ?? "none",
  ],

  /** Teams the signed-in user belongs to. */
  teams: (userId: string | undefined): QueryKey => ["comms", "teams", userId ?? "anon"],
  team: (teamId: string | undefined): QueryKey => ["comms", "team", teamId ?? "none"],
  teamMembers: (teamId: string | undefined): QueryKey => ["comms", "team-members", teamId ?? "none"],
  teamSummary: (teamId: string | undefined): QueryKey => ["comms", "team-summary", teamId ?? "none"],
  teamInvites: (userId: string | undefined): QueryKey => ["comms", "team-invites", userId ?? "anon"],

  /** Objectives. `scope` distinguishes the Objectives page tabs from a team's tab. */
  objectives: (userId: string | undefined, scope: string): QueryKey => [
    "comms", "objectives", userId ?? "anon", scope,
  ],
  objectiveActivity: (objectiveId: string | undefined): QueryKey => [
    "comms", "objective-activity", objectiveId ?? "none",
  ],

  /** The merged announcement feed (new `announcements` + legacy `admin_announcements`). */
  announcements: (userId: string | undefined): QueryKey => ["comms", "announcements", userId ?? "anon"],

  /** Profile lookups for avatars and names, shared across every surface. */
  profiles: (ids: string[]): QueryKey => ["comms", "profiles", [...ids].sort().join(",")],
};
