/**
 * The conversation list, and everything that changes its membership.
 *
 * One read (`comms_conversation_list`) backs the whole left pane: conversation,
 * the viewer's own pinned/muted/read state, unread count, member count, the DM
 * counterpart and the last-message preview. Assembling that client-side would
 * be four round trips plus an N+1 for "last message per conversation", which
 * PostgREST genuinely cannot express — see the migration for the long version.
 *
 * Writes that only affect the caller's own row (pin, mute) go straight to
 * `conversation_members`, whose UPDATE policy is already `user_id = auth.uid()`.
 * Writes that create membership for *other* people (start a DM, create a group)
 * go through SECURITY DEFINER RPCs, because the INSERT policy correctly refuses
 * to let a client add rows on someone else's behalf — and because those RPCs are
 * where the "may I contact this person at all" check lives.
 */
import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import type { ConversationKind, TeamAccent } from "@/lib/comms/types";
import { commsKeys } from "./keys";

/**
 * One inbox realtime channel per signed-in user, shared across every
 * `useConversations()` caller — not one per mounted component.
 *
 * `useConversations()` is called from the Chats page itself, `ForwardDialog`,
 * `TeamWorkspace`, and the teacher messages page, and more than one of these
 * can be mounted at the same time (forwarding a message opens `ForwardDialog`
 * *on top of* the open Chats page). Each caller used to open its own channel
 * named `comms:inbox:<uid>`; two channels racing to subscribe under the same
 * topic is exactly what Supabase Realtime's "cannot add postgres_changes
 * callbacks ... after subscribe()" guards against, and it took the whole page
 * down through the nearest error boundary. A per-user singleton, reference-
 * counted so the channel closes only once every caller has unmounted, means
 * there is only ever one subscription to collide with itself.
 */
const inboxChannels = new Map<string, { channel: ReturnType<typeof supabase.channel>; refCount: number }>();

function acquireInboxChannel(userId: string, qc: QueryClient): () => void {
  let entry = inboxChannels.get(userId);
  if (!entry) {
    let pending = false;
    const scheduleRefetch = () => {
      if (pending) return;
      pending = true;
      setTimeout(() => {
        pending = false;
        void qc.invalidateQueries({ queryKey: commsKeys.conversations(userId) });
        void qc.invalidateQueries({ queryKey: ["comms", "unread-total", userId] });
      }, 300);
    };
    const channel = supabase
      .channel(`comms:inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleRefetch)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${userId}` },
        scheduleRefetch,
      )
      .subscribe();
    entry = { channel, refCount: 0 };
    inboxChannels.set(userId, entry);
  }
  entry.refCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    entry!.refCount -= 1;
    if (entry!.refCount <= 0) {
      inboxChannels.delete(userId);
      void supabase.removeChannel(entry!.channel);
    }
  };
}

/** One row of `comms_conversation_list()`. */
export interface ConversationListItem {
  id: string;
  kind: ConversationKind;
  title: string | null;
  accent: TeamAccent | null;
  image_path: string | null;
  team_id: string | null;
  created_by: string;
  last_message_at: string | null;
  created_at: string;
  pinned: boolean;
  muted: boolean;
  last_read_at: string | null;
  unread_count: number;
  member_count: number;
  /** Null for groups and team chats. */
  other_user_id: string | null;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_sender_id: string | null;
  last_message_deleted: boolean;
}

export function useConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: commsKeys.conversations(user?.id),
    enabled: !!user?.id,
    queryFn: async (): Promise<ConversationListItem[]> => {
      const { data, error } = await supabase.rpc("comms_conversation_list" as never);
      if (error) throw error;
      return Array.isArray(data) ? (data as ConversationListItem[]) : [];
    },
  });

  const conversations = useMemo(() => query.data ?? [], [query.data]);

  /*
   * Everything above answers "what does the list look like right now" — it
   * says nothing about "what does the list look like after someone else
   * sends me a message." `ChatThread`'s realtime channel only exists once a
   * conversation is open and only updates *that* conversation's messages, so
   * a new DM landing while you're looking at the list — or at a different
   * thread — used to sit invisible until something forced a refetch. This is
   * the one subscription that's alive for as long as any caller of this hook
   * is mounted, independent of which conversation (if any) is open — see
   * `acquireInboxChannel` above for why it's a shared singleton rather than
   * one channel per caller.
   */
  useEffect(() => {
    if (!user?.id) return;
    return acquireInboxChannel(user.id, qc);
  }, [user?.id, qc]);

  /**
   * Every user id the list needs a name for: DM counterparts and the authors of
   * the previews. Collected here so the page makes one directory call rather
   * than one per row.
   */
  const referencedUserIds = useMemo(() => {
    const ids: string[] = [];
    for (const c of conversations) {
      if (c.other_user_id) ids.push(c.other_user_id);
      if (c.last_message_sender_id) ids.push(c.last_message_sender_id);
    }
    return ids;
  }, [conversations]);

  return {
    conversations,
    referencedUserIds,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Total unread across unmuted conversations, for the navbar badge. */
export function useUnreadTotal() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["comms", "unread-total", user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("comms_unread_total" as never);
      if (error) throw error;
      return typeof data === "number" ? data : 0;
    },
  });
}

/** Members of one conversation — the details pane and mention autocomplete. */
export function useConversationMembers(conversationId: string | undefined) {
  const query = useQuery({
    queryKey: commsKeys.conversationMembers(conversationId),
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await commsDb
        .from("conversation_members")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    members: query.data ?? [],
    memberIds: useMemo(() => (query.data ?? []).map((m) => m.user_id), [query.data]),
    isLoading: query.isLoading,
  };
}

export function useConversationActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidateList = useCallback(() => {
    void qc.invalidateQueries({ queryKey: commsKeys.conversations(user?.id) });
    void qc.invalidateQueries({ queryKey: ["comms", "unread-total", user?.id ?? "anon"] });
  }, [qc, user?.id]);

  /** Find-or-create the one DM with another user. Returns its conversation id. */
  const startDm = useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "start_dm" as never,
        { _other_user_id: otherUserId } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: invalidateList,
  });

  const createGroup = useMutation({
    mutationFn: async (input: {
      title: string;
      memberIds: string[];
      accent?: TeamAccent;
    }): Promise<string> => {
      const { data, error } = await supabase.rpc(
        "create_group_conversation" as never,
        {
          _title: input.title,
          _member_ids: input.memberIds,
          _accent: input.accent ?? "indigo",
        } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: invalidateList,
  });

  /**
   * Advance the read marker.
   *
   * Uses the RPC rather than a direct UPDATE so the timestamp comes from the
   * database's clock — the same clock `messages.created_at` was stamped from.
   * A client running a few seconds fast would otherwise mark messages read
   * before they arrived, and they would never show as unread again.
   */
  const markRead = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc(
        "comms_mark_read" as never,
        { _conversation_id: conversationId } as never,
      );
      if (error) throw error;
    },
    onSuccess: invalidateList,
  });

  /**
   * Push the read marker back behind the newest message, so the conversation
   * reads as unread again.
   *
   * This is the "I'll deal with this later" gesture every mail and chat client
   * has, and without it the only way to keep a conversation on your list is to
   * not open it — which means not reading it either. It rewinds to one second
   * before the last message rather than to zero, so the badge says 1 rather
   * than resurrecting a year of history as unread.
   *
   * Written directly rather than through an RPC because, unlike `markRead`, the
   * timestamp is derived from a message's own `created_at` — a value that
   * already came from the database's clock — so client skew cannot affect it.
   */
  const markUnread = useMutation({
    mutationFn: async (conversation: {
      id: string;
      last_message_at: string | null;
    }) => {
      if (!user?.id) throw new Error("not signed in");
      if (!conversation.last_message_at) return;
      const at = new Date(conversation.last_message_at).getTime();
      if (Number.isNaN(at)) return;
      const { error } = await commsDb
        .from("conversation_members")
        .update({ last_read_at: new Date(at - 1000).toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidateList,
  });

  /** Pin and mute are per-viewer state, so they write only the caller's row. */
  const setFlag = useMutation({
    mutationFn: async (input: {
      conversationId: string;
      pinned?: boolean;
      muted?: boolean;
    }) => {
      if (!user?.id) throw new Error("not signed in");
      const patch: { pinned?: boolean; muted?: boolean } = {};
      if (input.pinned !== undefined) patch.pinned = input.pinned;
      if (input.muted !== undefined) patch.muted = input.muted;
      const { error } = await commsDb
        .from("conversation_members")
        .update(patch)
        .eq("conversation_id", input.conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    // Optimistic: pinning is a direct-manipulation gesture and a round trip of
    // latency before the row moves reads as a dropped tap.
    onMutate: async (input) => {
      const key = commsKeys.conversations(user?.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ConversationListItem[]>(key);
      qc.setQueryData<ConversationListItem[]>(key, (old) =>
        (old ?? []).map((c) =>
          c.id === input.conversationId
            ? {
                ...c,
                pinned: input.pinned ?? c.pinned,
                muted: input.muted ?? c.muted,
              }
            : c,
        ),
      );
      return { previous, key };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: invalidateList,
  });

  /**
   * Set (or replace) a group's photo.
   *
   * Reuses the `comms-attachments` bucket rather than a dedicated one — its
   * storage policy only checks that the path's first folder segment is a
   * conversation the caller belongs to, so `{conversationId}/avatar/...`
   * satisfies it exactly like a message attachment's
   * `{conversationId}/{messageId}/...` does. The `conversations` row itself
   * can only be updated by its creator (or a team owner/admin, for a team
   * conversation) per `conversations_update` — the same people the group
   * dialog already lets choose an accent colour at creation.
   */
  const setGroupImage = useMutation({
    mutationFn: async (input: { conversationId: string; file: File }): Promise<string> => {
      const safe = input.file.name.replace(/[^\w.-]+/g, "_").slice(-120);
      const path = `${input.conversationId}/avatar/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("comms-attachments")
        .upload(path, input.file, { contentType: input.file.type || "application/octet-stream" });
      if (upErr) throw upErr;

      const { error } = await commsDb
        .from("conversations")
        .update({ image_path: path })
        .eq("id", input.conversationId);
      if (error) throw error;
      return path;
    },
    onSuccess: invalidateList,
  });

  /** Leave a group. Removes only the caller's own membership row. */
  const leaveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb
        .from("conversation_members")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidateList,
  });

  return { startDm, createGroup, setGroupImage, markRead, markUnread, setFlag, leaveConversation };
}
