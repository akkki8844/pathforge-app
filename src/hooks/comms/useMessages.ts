/**
 * One open conversation: its messages, reactions, attachments, pins, presence
 * and typing state.
 *
 * Three things here are load-bearing and easy to get wrong:
 *
 * 1. **Realtime is scoped to this conversation, not to the user.** The Routine
 *    section can filter its whole subscription on `user_id=eq.<me>` because
 *    every row it owns is self-owned. Chat messages are written by *other*
 *    people, so a `user_id` filter subscribes to a channel that can never fire
 *    for anything worth seeing, and no filter at all streams every message in
 *    the database to every client. This hook opens one channel per open thread,
 *    filtered `conversation_id=eq.<id>`, and closes it on unmount.
 *
 * 2. **Realtime patches the cache; it does not invalidate it.** An infinite
 *    query refetches *every* loaded page on invalidation, so a busy thread with
 *    four pages loaded would fire four requests per incoming message. Inserts
 *    and updates are applied to the cached pages directly, deduplicated by id —
 *    which also makes the sender's own echo harmless.
 *
 * 3. **Reactions and attachments are embedded, not fetched separately.** They
 *    hang off the same PostgREST request as the message they belong to, so a
 *    message and its reactions can never render out of step with each other,
 *    and a reaction change is one cache patch instead of a second query keyed on
 *    a set of message ids that changes every time a page loads.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Message,
  MessageAttachment,
  MessagePin,
  MessagePoll,
  MessagePollOption,
  MessagePollVote,
  MessageReaction,
} from "@/lib/comms/types";
import { commsKeys } from "./keys";

/** Private bucket holding chat attachments. Never public; always signed URLs. */
export const COMMS_BUCKET = "comms-attachments";

/** Matches the bucket's own limit, so an oversized file fails before upload. */
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

/**
 * Kept in exact step with the bucket's `allowed_mime_types`. A client list that
 * is narrower rejects files the bucket would have taken; one that is wider makes
 * the user wait for an upload that was always going to be refused.
 */
export const ATTACHMENT_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

/** How many messages one page holds. */
const PAGE_SIZE = 50;

export interface PollWithVotes extends MessagePoll {
  message_poll_options: MessagePollOption[];
  message_poll_votes: MessagePollVote[];
}

export interface ChatMessage extends Message {
  message_reactions: MessageReaction[];
  message_attachments: MessageAttachment[];
  /** Null for every message that isn't a poll — most of them. */
  message_polls: PollWithVotes | null;
  /** Set only on an optimistic row that has not been acknowledged yet. */
  pending?: boolean;
  /** Set when the send failed, so the bubble can offer a retry. */
  failed?: boolean;
}

interface MessagePage {
  /** Newest first — the order the query returns, kept as-is for cheap prepends. */
  items: ChatMessage[];
  nextCursor: string | null;
}

type MessageData = InfiniteData<MessagePage, string | null>;

const SELECT_BASE = "*, message_reactions(*), message_attachments(*)";
const SELECT_WITH_POLLS = `${SELECT_BASE}, message_polls(*, message_poll_options(*), message_poll_votes(*))`;

/**
 * Whether `message_polls` exists on the database this client is talking to.
 *
 * The migration that creates it ships in the same commit as this file, but
 * migrations and app code deploy on separate schedules here — the app can go
 * live before the migration is applied. Embedding a relationship PostgREST
 * doesn't know about fails the *entire* query, not just the poll part of it,
 * which would otherwise take down every message fetch in every conversation
 * during that window. `runMessagesQuery` tries the full embed first and
 * remembers, for the rest of the session, to skip straight to the base one
 * if the database doesn't have it yet — one failed request, not a broken
 * chat feature.
 */
let pollsAvailable = true;

/**
 * Run a message query that needs the poll embed, falling back once and
 * remembering the result. `build` is handed the select string to use and
 * returns the same `{ data, error }` shape every PostgREST call does.
 */
async function runMessagesQuery<T>(
  build: (select: string) => PromiseLike<{ data: T; error: { message?: string; code?: string } | null }>,
): Promise<{ data: T; error: { message?: string; code?: string } | null }> {
  const result = await build(pollsAvailable ? SELECT_WITH_POLLS : SELECT_BASE);
  if (
    result.error &&
    pollsAvailable &&
    /message_polls|message_poll_options|message_poll_votes/.test(result.error.message ?? "")
  ) {
    pollsAvailable = false;
    return build(SELECT_BASE);
  }
  return result;
}

function emptyExtras(m: Partial<ChatMessage>): ChatMessage {
  return {
    message_reactions: [],
    message_attachments: [],
    message_polls: null,
    ...m,
  } as ChatMessage;
}

// ── Messages ─────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = commsKeys.messages(conversationId);

  /*
   * The conversation this hook is bound to, as a fallback for writes that did
   * not name one.
   *
   * It is deliberately only a fallback. A mutation body runs asynchronously,
   * so by the time it reads anything the caller may have moved on - the
   * message dock closes its composer the moment you press Enter, which unbinds
   * this hook while the insert is still in flight. Anything that can switch
   * conversation mid-write passes `conversationId` explicitly and does not
   * depend on what this ref happens to hold a tick later.
   */
  const convRef = useRef(conversationId);
  convRef.current = conversationId;

  const query = useInfiniteQuery<MessagePage, Error, MessageData, typeof key, string | null>({
    queryKey: key,
    enabled: !!conversationId,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await runMessagesQuery((select) => {
        let q = commsDb
          .from("messages")
          .select(select)
          .eq("conversation_id", conversationId!)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        // Keyset, not offset: a message arriving mid-scroll shifts every
        // offset by one and would make the reader see a line twice or not
        // at all.
        if (pageParam) q = q.lt("created_at", pageParam);
        return q;
      });
      if (error) throw error;

      const items = (data ?? []) as unknown as ChatMessage[];
      return {
        items,
        nextCursor:
          items.length === PAGE_SIZE ? items[items.length - 1].created_at : null,
      };
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  /** Oldest first — reading order. */
  const messages = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const flat: ChatMessage[] = [];
    for (let i = pages.length - 1; i >= 0; i--) {
      for (let j = pages[i].items.length - 1; j >= 0; j--) flat.push(pages[i].items[j]);
    }
    return flat;
  }, [query.data]);

  /** Everyone whose name this thread needs: senders and mentioned users. */
  const referencedUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      ids.add(m.sender_id);
      for (const u of m.mentions ?? []) ids.add(u);
    }
    return [...ids];
  }, [messages]);

  // ── Cache patching helpers, shared by realtime and by the send mutation ──

  const upsertMessage = useCallback(
    (row: ChatMessage) => {
      // The row names its own conversation, which is the one this patch
      // belongs to even if the hook has since been pointed somewhere else.
      qc.setQueryData<MessageData>(commsKeys.messages(row.conversation_id), (old) => {
        if (!old) return old;
        let replaced = false;
        const pages = old.pages.map((page) => {
          const idx = page.items.findIndex((m) => m.id === row.id);
          if (idx === -1) return page;
          replaced = true;
          const items = [...page.items];
          // Preserve embedded children the realtime payload does not carry:
          // a `postgres_changes` row is the bare table row, so blindly applying
          // it would wipe the reactions already on screen.
          items[idx] = {
            ...items[idx],
            ...row,
            message_reactions: row.message_reactions ?? items[idx].message_reactions,
            message_attachments: row.message_attachments ?? items[idx].message_attachments,
            pending: false,
            failed: false,
          };
          return { ...page, items };
        });
        if (replaced) return { ...old, pages };
        // New message: it belongs at the head of the newest page.
        const [first, ...rest] = pages;
        if (!first) return old;
        return {
          ...old,
          pages: [{ ...first, items: [emptyExtras(row), ...first.items] }, ...rest],
        };
      });
    },
    [qc],
  );

  const removeMessage = useCallback(
    (id: string, conversationIdOverride?: string) => {
      qc.setQueryData<MessageData>(
        commsKeys.messages(conversationIdOverride ?? convRef.current),
        (old) =>
          old
            ? {
                ...old,
                pages: old.pages.map((p) => ({
                  ...p,
                  items: p.items.filter((m) => m.id !== id),
                })),
              }
            : old,
      );
    },
    [qc],
  );

  /** Re-read one message with its embedded children. Used after a reaction changes. */
  const refreshMessage = useCallback(
    async (id: string) => {
      const { data, error } = await runMessagesQuery((select) =>
        commsDb.from("messages").select(select).eq("id", id).maybeSingle(),
      );
      if (error || !data) return;
      upsertMessage(data as unknown as ChatMessage);
    },
    [upsertMessage],
  );

  // ── Realtime, scoped to this conversation ────────────────────────────────

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`comms:conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string } | null;
            if (old?.id) removeMessage(old.id);
            return;
          }
          const row = payload.new as unknown as ChatMessage | null;
          if (!row?.id) return;
          upsertMessage(row);
        },
      )
      // Reactions carry no conversation_id, so this channel sees every
      // reaction in the database and filters to the messages actually on
      // screen. Cheap — the payload is four columns — and it avoids a
      // denormalised column that would have to be kept in step forever.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { message_id?: string } | null;
          if (!row?.message_id) return;
          const known = (qc.getQueryData<MessageData>(key)?.pages ?? []).some((p) =>
            p.items.some((m) => m.id === row.message_id),
          );
          if (known) void refreshMessage(row.message_id);
        },
      )
      // Attachments are uploaded *after* the message row exists (their
      // storage path is keyed by message id), so the `messages` INSERT above
      // always lands before they do. Without this, a message received from
      // someone else showed its text immediately but its attachments only
      // after a manual refetch — the bare `postgres_changes` payload for the
      // message itself never carries embedded children.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_attachments" },
        (payload) => {
          const row = payload.new as { message_id?: string } | null;
          if (!row?.message_id) return;
          const known = (qc.getQueryData<MessageData>(key)?.pages ?? []).some((p) =>
            p.items.some((m) => m.id === row.message_id),
          );
          if (known) void refreshMessage(row.message_id);
        },
      )
      // Same reasoning as attachments: a poll's options are inserted after
      // the poll row, which is inserted after the message row, so the first
      // event a receiver sees for a poll message is the bare message insert
      // with no poll on it yet.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_polls" },
        (payload) => {
          const row = payload.new as { message_id?: string } | null;
          if (!row?.message_id) return;
          const known = (qc.getQueryData<MessageData>(key)?.pages ?? []).some((p) =>
            p.items.some((m) => m.id === row.message_id),
          );
          if (known) void refreshMessage(row.message_id);
        },
      )
      // Options land after the poll row, same reason attachments land after
      // the message. Resolved through the loaded pages' own poll ids so this
      // doesn't need a second round trip just to find the message.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_poll_options" },
        (payload) => {
          const row = payload.new as { poll_id?: string } | null;
          if (!row?.poll_id) return;
          const pages = qc.getQueryData<MessageData>(key)?.pages ?? [];
          for (const page of pages) {
            const hit = page.items.find((m) => m.message_polls?.id === row.poll_id);
            if (hit) {
              void refreshMessage(hit.id);
              break;
            }
          }
        },
      )
      // Votes carry no message id directly — resolve through the loaded
      // pages' own poll ids rather than a second round trip to look one up.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_poll_votes" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { poll_id?: string } | null;
          if (!row?.poll_id) return;
          const pages = qc.getQueryData<MessageData>(key)?.pages ?? [];
          for (const page of pages) {
            const hit = page.items.find((m) => m.message_polls?.id === row.poll_id);
            if (hit) {
              void refreshMessage(hit.id);
              break;
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, qc, key, upsertMessage, removeMessage, refreshMessage]);

  // ── Writes ───────────────────────────────────────────────────────────────

  const send = useMutation({
    mutationFn: async (input: {
      body: string;
      replyToId?: string | null;
      mentions?: string[];
      files?: File[];
      poll?: { question: string; allowMultiple: boolean; options: string[] } | null;
      /** Carried through so onMutate's optimistic row can be reconciled. */
      tempId?: string;
      /**
       * Which conversation to write to, when it is not the one this hook is
       * bound to. The dock sends and closes in the same gesture, and closing
       * unbinds the hook before this body runs.
       */
      conversationId?: string;
    }): Promise<ChatMessage> => {
      if (!user?.id) throw new Error("not signed in");
      const cid = input.conversationId ?? convRef.current;
      if (!cid) throw new Error("no conversation");

      const files = input.files ?? [];
      for (const f of files) {
        if (f.size > ATTACHMENT_MAX_BYTES) {
          throw new Error(`${f.name} is larger than 25 MB.`);
        }
        if (f.type && !ATTACHMENT_TYPES.includes(f.type)) {
          throw new Error(`${f.name} is not a file type this chat accepts.`);
        }
      }
      const pollOptions = (input.poll?.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (input.poll && (!input.poll.question.trim() || pollOptions.length < 2)) {
        throw new Error("A poll needs a question and at least two options.");
      }
      if (!input.body.trim() && files.length === 0 && !input.poll) {
        throw new Error("nothing to send");
      }

      const { data: inserted, error } = await commsDb
        .from("messages")
        .insert({
          conversation_id: cid,
          sender_id: user.id,
          body: input.body.trim(),
          reply_to_id: input.replyToId ?? null,
          mentions: input.mentions ?? [],
          edited_at: null,
          deleted_at: null,
        })
        // The poll (if any) is inserted below, after this row exists — there
        // is never one to embed yet, so this doesn't need the fallback logic
        // `runMessagesQuery` exists for.
        .select(SELECT_BASE)
        .single();
      if (error) throw error;

      const message = inserted as unknown as ChatMessage;

      // Attachments are uploaded after the message exists, because the storage
      // path is keyed by message id and the RLS check on message_attachments
      // requires the message row to already be there.
      for (const file of files) {
        const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-120);
        const path = `${cid}/${message.id}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from(COMMS_BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;

        const { error: rowErr } = await commsDb.from("message_attachments").insert({
          message_id: message.id,
          conversation_id: cid,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
        });
        if (rowErr) throw rowErr;
      }

      // A poll is inserted the same way attachments are: after the message,
      // because its RLS check requires the message row (and its sender_id)
      // to already exist.
      if (input.poll && pollOptions.length >= 2) {
        const { data: poll, error: pollErr } = await commsDb
          .from("message_polls")
          .insert({
            message_id: message.id,
            question: input.poll.question.trim(),
            allow_multiple: input.poll.allowMultiple,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (pollErr) throw pollErr;

        const { error: optErr } = await commsDb.from("message_poll_options").insert(
          pollOptions.map((label, position) => ({
            poll_id: (poll as { id: string }).id,
            label,
            position,
          })),
        );
        if (optErr) throw optErr;
      }

      if (files.length === 0 && !input.poll) return message;

      const { data: withExtras } = await runMessagesQuery((select) =>
        commsDb.from("messages").select(select).eq("id", message.id).maybeSingle(),
      );
      return (withExtras as unknown as ChatMessage) ?? message;
    },
    onMutate: (input) => {
      const cid = input.conversationId ?? convRef.current;
      if (!user?.id || !cid) return;
      const tempId = input.tempId ?? `temp-${crypto.randomUUID()}`;
      upsertMessage(
        emptyExtras({
          id: tempId,
          conversation_id: cid,
          sender_id: user.id,
          body: input.body.trim(),
          reply_to_id: input.replyToId ?? null,
          mentions: input.mentions ?? [],
          created_at: new Date().toISOString(),
          edited_at: null,
          deleted_at: null,
          pending: true,
        }),
      );
      return { tempId, cid };
    },
    onSuccess: (row, _input, ctx) => {
      if (ctx?.tempId) removeMessage(ctx.tempId, ctx.cid);
      upsertMessage(row);
      void qc.invalidateQueries({ queryKey: commsKeys.conversations(user?.id) });

      // Fire-and-forget objective detection. The function itself decides
      // whether this conversation is in scope (it bails on DMs) and whether
      // the message is actionable, so the client doesn't need to know the
      // conversation's kind here — it just offers every non-empty send up
      // for a look.
      if (row.body.trim()) {
        void supabase.functions
          .invoke("extract-objectives", { body: { messageId: row.id } })
          // The function writes any suggestion itself, so the thread only has
          // to re-read once it has finished. Nothing is assumed about the
          // outcome — if it detected nothing, the refetch returns nothing.
          .then(() => qc.invalidateQueries({ queryKey: ["comms", "objectives"] }))
          .catch(() => {});
      }
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.tempId) removeMessage(ctx.tempId, ctx.cid);
    },
  });

  const edit = useMutation({
    mutationFn: async (input: { id: string; body: string }) => {
      // Not yet a row. See `isOptimisticId`.
      if (isOptimisticId(input.id)) return null;
      // An UPDATE is safe to retry with a different select — unlike an
      // INSERT, running it twice with the same values writes the same row.
      const { data, error } = await runMessagesQuery((select) =>
        commsDb
          .from("messages")
          .update({ body: input.body.trim(), edited_at: new Date().toISOString() })
          .eq("id", input.id)
          .select(select)
          .single(),
      );
      if (error) throw error;
      return data as unknown as ChatMessage;
    },
    onSuccess: (row) => {
      if (row) upsertMessage(row);
    },
  });

  /**
   * Soft delete.
   *
   * The row stays so every `reply_to_id` pointing at it keeps resolving; the
   * body is blanked as well as timestamped, because leaving the text in the
   * table would mean "deleted" was only a rendering decision.
   */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Not yet a row. See `isOptimisticId`.
      if (isOptimisticId(id)) return null;
      const { data, error } = await runMessagesQuery((select) =>
        commsDb
          .from("messages")
          .update({ deleted_at: new Date().toISOString(), body: "" })
          .eq("id", id)
          .select(select)
          .single(),
      );
      if (error) throw error;
      return data as unknown as ChatMessage;
    },
    onSuccess: (row) => {
      if (!row) return;
      upsertMessage(row);
      void qc.invalidateQueries({ queryKey: commsKeys.conversations(user?.id) });
    },
  });

  /**
   * Add or remove one of my reactions.
   *
   * The UNIQUE(message_id, user_id, emoji) constraint is what makes this a
   * single write in either direction rather than a read-then-write that two
   * fast taps could interleave.
   */
  const toggleReaction = useMutation({
    mutationFn: async (input: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error("not signed in");
      // Not yet a row. See `isOptimisticId`.
      if (isOptimisticId(input.messageId)) return;
      const { data: existing, error: readErr } = await commsDb
        .from("message_reactions")
        .select("id")
        .eq("message_id", input.messageId)
        .eq("user_id", user.id)
        .eq("emoji", input.emoji)
        .maybeSingle();
      if (readErr) throw readErr;

      if (existing) {
        const { error } = await commsDb
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await commsDb.from("message_reactions").insert({
          message_id: input.messageId,
          user_id: user.id,
          emoji: input.emoji,
        });
        // A duplicate here means a double-tap already added it; that is the
        // intended end state, not a failure worth surfacing.
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      }
    },
    onSuccess: (_r, input) => void refreshMessage(input.messageId),
  });

  return {
    messages,
    referencedUserIds,
    isLoading: query.isLoading,
    error: query.error,
    hasOlder: query.hasNextPage,
    isLoadingOlder: query.isFetchingNextPage,
    loadOlder: query.fetchNextPage,
    send,
    edit,
    remove,
    toggleReaction,
  };
}

// ── Poll votes ───────────────────────────────────────────────────────────

/**
 * Cast or retract a poll vote.
 *
 * No cache patch here — the write lands in `message_poll_votes`, the open
 * thread's own realtime subscription (see the `usePollActions` — actually
 * `useMessages` — channel above) sees it come back and re-reads the message
 * with its embedded tally, and that one path is what every viewer of the
 * poll (including the voter) renders from. Two ways to update the same
 * count would be two ways for it to disagree with itself.
 */
export function usePollActions() {
  const { user } = useAuth();

  const vote = useMutation({
    mutationFn: async (input: {
      pollId: string;
      optionId: string;
      allowMultiple: boolean;
      /** This poll's other options the caller has already voted for. */
      myOtherVotedOptionIds: string[];
    }) => {
      if (!user?.id) throw new Error("not signed in");
      if (!input.allowMultiple && input.myOtherVotedOptionIds.length) {
        const { error } = await commsDb
          .from("message_poll_votes")
          .delete()
          .eq("user_id", user.id)
          .in("option_id", input.myOtherVotedOptionIds);
        if (error) throw error;
      }
      const { error } = await commsDb.from("message_poll_votes").insert({
        poll_id: input.pollId,
        option_id: input.optionId,
        user_id: user.id,
      });
      // A duplicate means this option is already voted for — retracting it
      // is retractVote's job, not a failure of casting it.
      if (error && !`${error.message}`.includes("duplicate")) throw error;
    },
  });

  const retractVote = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb
        .from("message_poll_votes")
        .delete()
        .eq("option_id", optionId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
  });

  return { vote, retractVote };
}

// ── Forwarding ───────────────────────────────────────────────────────────

/**
 * Send an existing message's text on to another conversation.
 *
 * A forward is a new message, not a pointer at the old one — which is what
 * every messenger does and what the RLS model requires anyway: the recipient
 * of the forward is very often not a member of the conversation it came from,
 * so a reference would render as a hole they cannot read. Attachments are not
 * carried across for the same reason (the storage policy is per-conversation),
 * so a message that is only a file forwards as its filename rather than
 * silently arriving empty.
 */
export function useForwardMessage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { message: ChatMessage; toConversationIds: string[] }) => {
      if (!user?.id) throw new Error("not signed in");
      const attachmentNames = input.message.message_attachments
        .map((a) => a.file_name)
        .join(", ");
      const body =
        input.message.body.trim() ||
        (attachmentNames ? `Forwarded attachment: ${attachmentNames}` : "");
      if (!body) throw new Error("nothing to forward");

      const { error } = await commsDb.from("messages").insert(
        input.toConversationIds.map((conversation_id) => ({
          conversation_id,
          sender_id: user.id,
          body,
          reply_to_id: null,
          mentions: [],
          edited_at: null,
          deleted_at: null,
        })),
      );
      if (error) throw error;
      return input.toConversationIds;
    },
    onSuccess: (ids) => {
      for (const id of ids) {
        void qc.invalidateQueries({ queryKey: commsKeys.messages(id) });
      }
      void qc.invalidateQueries({ queryKey: commsKeys.conversations(user?.id) });
    },
  });
}

// ── Pins ─────────────────────────────────────────────────────────────────

export function usePins(conversationId: string | undefined) {
  const qc = useQueryClient();
  const key = commsKeys.pins(conversationId);

  const query = useQuery({
    queryKey: key,
    enabled: !!conversationId,
    queryFn: async (): Promise<MessagePin[]> => {
      const { data, error } = await commsDb
        .from("message_pins")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async (messageId: string) => {
      if (!conversationId) throw new Error("no conversation");
      // Not yet a row. See `isOptimisticId`.
      if (isOptimisticId(messageId)) return;
      const existing = (query.data ?? []).find((p) => p.message_id === messageId);
      if (existing) {
        const { error } = await commsDb.from("message_pins").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await commsDb.from("message_pins").insert({
          conversation_id: conversationId,
          message_id: messageId,
          pinned_by: (await supabase.auth.getUser()).data.user?.id ?? "",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const pinnedIds = useMemo(
    () => new Set((query.data ?? []).map((p) => p.message_id)),
    [query.data],
  );

  return { pins: query.data ?? [], pinnedIds, toggle, isLoading: query.isLoading };
}

// ── Search ───────────────────────────────────────────────────────────────

/**
 * Search within one conversation.
 *
 * Deliberately scoped to the open thread rather than global: a cross-thread
 * search would need its own ranking and its own privacy review, and this is the
 * thing people actually reach for ("where did they send that link?").
 */
export function useMessageSearch(conversationId: string | undefined, term: string) {
  const trimmed = term.trim();
  const enabled = !!conversationId && trimmed.length >= 2;

  const query = useQuery({
    queryKey: ["comms", "message-search", conversationId ?? "none", trimmed.toLowerCase()],
    enabled,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await commsDb
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .is("deleted_at", null)
        // Escape the LIKE wildcards so a literal % typed by the user searches
        // for a percent sign instead of matching everything.
        .ilike("body", `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    results: query.data ?? [],
    isSearching: enabled && query.isFetching,
    isEmpty: enabled && !query.isFetching && (query.data?.length ?? 0) === 0,
    tooShort: !enabled && trimmed.length > 0,
  };
}

/**
 * An optimistic message exists only in this tab until its INSERT comes back.
 *
 * `onMutate` paints it immediately with a `temp-…` id so the thread feels
 * instant, and that id is not a uuid. Anything that then sends it to the
 * database — a reaction, a pin, an edit, a delete on a message that has been
 * on screen for a few hundred milliseconds but has not landed yet — comes back
 * `22P02 invalid input syntax for type uuid: "temp-…"`, which the bug reporter
 * raised as a red banner. Seen in production.
 *
 * Guarded here, at the data boundary, rather than only by disabling the
 * buttons: the race is short but real, and a guard on the mutation cannot be
 * bypassed by a keyboard shortcut, a context menu, or a future call site that
 * forgets the rule.
 */
export const isOptimisticId = (id: string): boolean => id.startsWith("temp-");

// ── Attachments ──────────────────────────────────────────────────────────

/**
 * A short-lived signed URL for one attachment.
 *
 * The bucket is private, so there is no public URL to fall back on. Signed URLs
 * are minted on demand and expire in an hour, which means a link copied out of
 * the page stops working — that is the intended behaviour for a private bucket,
 * not a limitation to work around.
 */
export function useAttachmentUrl(path: string | undefined) {
  return useQuery({
    queryKey: ["comms", "attachment-url", path ?? "none"],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    gcTime: 55 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from(COMMS_BUCKET)
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}

// ── Typing and presence ──────────────────────────────────────────────────

/**
 * Who is typing, and who is here.
 *
 * Both ride a Realtime broadcast/presence channel rather than a table: they are
 * true for a couple of seconds and worthless afterwards, so persisting them
 * would mean writing rows at keystroke frequency for data nobody ever reads
 * back.
 *
 * `notifyTyping` is throttled to one broadcast every two seconds, and a
 * receiver forgets a typist after four — so a sender who closes the tab
 * mid-word stops showing as typing without needing a "stopped" event to arrive.
 */
export function useTypingIndicator(conversationId: string | undefined) {
  const { user } = useAuth();
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);
  const seenRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    const me = user.id;

    // Captured locally so the cleanup below closes over the same Map this
    // effect populated, not whatever `seenRef` points at by then.
    const seen = seenRef.current;

    const channel = supabase.channel(`comms:typing:${conversationId}`, {
      config: { presence: { key: me } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const who = (payload.payload as { userId?: string })?.userId;
        if (!who || who === me) return;
        seen.set(who, Date.now());
        setTypingIds([...seen.keys()]);
      })
      .on("presence", { event: "sync" }, () => {
        setOnlineIds(Object.keys(channel.presenceState()));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ at: Date.now() });
      });

    // Expire typists locally rather than relying on a "stopped typing" event
    // that a closed tab will never send.
    const sweep = window.setInterval(() => {
      const cutoff = Date.now() - 4000;
      let changed = false;
      for (const [id, at] of seen) {
        if (at < cutoff) {
          seen.delete(id);
          changed = true;
        }
      }
      if (changed) setTypingIds([...seen.keys()]);
    }, 1000);

    return () => {
      window.clearInterval(sweep);
      seen.clear();
      setTypingIds([]);
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user?.id },
    });
  }, [user?.id]);

  return { typingIds, onlineIds, notifyTyping };
}
