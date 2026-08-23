import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COMMS_USER_TABLES } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import { commsKeys } from "./keys";

/**
 * The one per-user Communications subscription, mounted once by `CommsShell`.
 *
 * This watches only the tables whose rows the signed-in user owns — their
 * conversation memberships, team memberships and invites. That is enough to keep
 * the conversation list, the unread badges, the Teams grid and the invite count
 * live from any page in the section.
 *
 * It deliberately does *not* watch `messages`. Routine can filter its whole
 * section on `user_id=eq.<me>` because every Routine row is self-owned, but chat
 * messages are authored by other people: a `user_id` filter would subscribe to a
 * channel that never fires for anything worth seeing, and no filter at all would
 * stream every message in the database to every client. Message inserts are
 * watched per-conversation by the open thread instead (`useMessages`), filtered
 * on `conversation_id`.
 *
 * `last_message_at` on `conversations` is updated by a trigger when a message
 * lands, and that update touches the reader's `conversation_members` row's
 * ordering via the list query — so a new message in a conversation the user is
 * *not* currently viewing still surfaces here, without exposing its content.
 */
export function useCommsRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const channel = supabase.channel(`comms:${userId}`);

    for (const table of COMMS_USER_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => {
          // One membership change can reorder the conversation list, change a
          // team's card, or add an invite badge — cheaper to flush the section's
          // list-level queries than to reason about which one moved.
          void qc.invalidateQueries({ queryKey: commsKeys.conversations(userId) });
          void qc.invalidateQueries({ queryKey: commsKeys.teams(userId) });
          void qc.invalidateQueries({ queryKey: commsKeys.teamInvites(userId) });
        },
      );
    }

    // Objectives are not user-owned in the `user_id` sense — an objective can be
    // assigned to you by someone else — so it is filtered on `assignee_id`
    // instead. Without this, an assignment made in a chat you don't have open
    // would not appear until a manual refresh.
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "objectives", filter: `assignee_id=eq.${userId}` },
      () => {
        void qc.invalidateQueries({ queryKey: commsKeys.all });
      },
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
