import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The notification bell's data.
 *
 * WHY THIS IS A HOOK AND NOT LOCAL STATE IN THE BELL
 *
 * The bell used to hold its rows in `useState`, fetch them itself, and count
 * unread by filtering the fifty rows it happened to have loaded — so a user
 * with sixty unread notifications was told they had fifty, and nothing else in
 * the app could see the same data. The count now comes from an exact
 * server-side count, independent of how many rows have been fetched for
 * display, and the rows live in the query cache where the dashboard's own
 * unread badge is invalidated alongside them.
 *
 * Realtime inserts patch the cache rather than a component's state, so a
 * notification arriving while the popover is shut is still there, already
 * counted, when it is opened.
 */

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  sender_role: string | null;
  broadcast_id: string | null;
  created_at: string;
}

/** How many rows to fetch at a time. */
export const NOTIFICATIONS_PAGE = 30;

export const notificationKeys = {
  list: (userId: string | undefined, limit: number) =>
    ["notifications", "list", userId ?? "anon", limit] as const,
  unread: (userId: string | undefined) => ["notifications", "unread", userId ?? "anon"] as const,
};

export function useNotifications(limit: number = NOTIFICATIONS_PAGE) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const list = useQuery({
    queryKey: notificationKeys.list(userId, limit),
    enabled: !!userId,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, sender_role, broadcast_id, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
  });

  /*
   * Counted by the database, not by the page.
   *
   * `head: true` fetches no rows at all, so this stays correct however many
   * notifications exist and however few are on screen.
   */
  const unread = useQuery({
    queryKey: notificationKeys.unread(userId),
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    // The dashboard keeps its own unread badge on a different key.
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }, [qc]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          qc.setQueryData<NotificationRow[]>(
            notificationKeys.list(userId, limit),
            (old) => (old ? [row, ...old.filter((n) => n.id !== row.id)] : [row]),
          );
          qc.setQueryData<number>(notificationKeys.unread(userId), (n) => (n ?? 0) + 1);
          toast.message(row.title, { description: row.message });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc, limit]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => {
      qc.setQueryData<NotificationRow[]>(notificationKeys.list(userId, limit), (old) =>
        old?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      qc.setQueryData<number>(notificationKeys.unread(userId), (n) => Math.max(0, (n ?? 1) - 1));
    },
    onSettled: invalidate,
  });

  /*
   * A real delete, not a hide.
   *
   * `notifications` carries a "Users delete own notifications" RLS policy, so
   * a person can remove their own rows. Offering a bin that only hid the row
   * locally would be the dishonest version of this button: it would come back
   * on the next device, or the next reload, having told the user it was gone.
   *
   * Only ever the user's own rows — the policy sees to that server-side, and
   * the filter here makes the intent explicit.
   */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", userId!);
      if (error) throw error;
    },
    onMutate: (id) => {
      const row = (qc.getQueryData<NotificationRow[]>(notificationKeys.list(userId, limit)) ?? [])
        .find((n) => n.id === id);
      qc.setQueryData<NotificationRow[]>(notificationKeys.list(userId, limit), (old) =>
        old?.filter((n) => n.id !== id),
      );
      // Deleting something unread also removes it from the count.
      if (row && !row.is_read) {
        qc.setQueryData<number>(notificationKeys.unread(userId), (n) => Math.max(0, (n ?? 1) - 1));
      }
    },
    onSettled: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onMutate: () => {
      qc.setQueryData<NotificationRow[]>(notificationKeys.list(userId, limit), (old) =>
        old?.map((n) => ({ ...n, is_read: true })),
      );
      qc.setQueryData<number>(notificationKeys.unread(userId), 0);
    },
    onSettled: invalidate,
  });

  const items = useMemo(() => list.data ?? [], [list.data]);

  return {
    items,
    unreadCount: unread.data ?? 0,
    isLoading: list.isLoading,
    /** True when there may be older notifications than the ones fetched. */
    hasMore: items.length >= limit,
    markRead,
    markAllRead,
    remove,
  };
}

/**
 * Where a notification should take you, or nothing.
 *
 * Deliberately conservative. `notifications` carries no destination column, so
 * the only thing that can be known rather than guessed is that a row with a
 * `broadcast_id` came from an announcement fan-out. Reminders and AI job
 * notices are written by several different senders with no shared marker, and
 * sending someone to a plausible-looking page that has nothing to do with the
 * notification they tapped is worse than leaving it inert.
 */
export function notificationHref(n: NotificationRow): string | null {
  if (n.broadcast_id) return "/communications/announcements";
  if (n.sender_role === "admin" || n.sender_role === "teacher") {
    return "/communications/announcements";
  }
  return null;
}
