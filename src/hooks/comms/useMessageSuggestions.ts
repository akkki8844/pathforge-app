/**
 * The objectives `extract-objectives` detected in a conversation, keyed by the
 * message they came from.
 *
 * This is the same `objectives` table the Detected inbox reads — the chat
 * thread is a second view of those rows, not a second store. A suggestion only
 * appears under a message because the edge function wrote a row with
 * `source_type = 'message'` and that message's id; the client never decides on
 * its own that a sentence looked like a task.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { commsDb } from "@/integrations/supabase/communications";
import type { Objective } from "@/lib/comms/types";

export function useMessageSuggestions(conversationId: string | undefined, messageIds: string[]) {
  // Sorted and joined so the key is stable across re-renders of the same page
  // of messages, and changes only when the page itself does.
  const idKey = useMemo(() => [...messageIds].sort().join(","), [messageIds]);

  const query = useQuery({
    // Namespaced under "objectives" on purpose: accepting or dismissing goes
    // through `useObjectiveActions`, which invalidates the whole
    // `["comms", "objectives"]` prefix. Keying this anywhere else would leave
    // an accepted suggestion still sitting under its message.
    queryKey: ["comms", "objectives", "by-message", conversationId ?? "none", idKey],
    enabled: !!conversationId && messageIds.length > 0,
    queryFn: async (): Promise<Objective[]> => {
      const { data, error } = await commsDb
        .from("objectives")
        .select("*")
        .eq("status", "suggested")
        .eq("source_type", "message")
        .in("source_id", messageIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const byMessageId = useMemo(() => {
    const map = new Map<string, Objective[]>();
    for (const o of query.data ?? []) {
      if (!o.source_id) continue;
      const list = map.get(o.source_id);
      if (list) list.push(o);
      else map.set(o.source_id, [o]);
    }
    return map;
  }, [query.data]);

  return { byMessageId, isLoading: query.isLoading };
}
