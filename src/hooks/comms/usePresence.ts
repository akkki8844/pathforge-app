import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Who is currently in the app, across the whole account — not per conversation.
 *
 * `useTypingIndicator` already tracks presence, but it does so on a channel
 * scoped to one open thread, so it can only answer "is this person in this
 * conversation with me right now". The dock needs the wider question: is this
 * person online at all. That is a different channel, and it has to be a single
 * shared one — one channel per face would open five sockets to say one thing.
 *
 * Presence is deliberately not persisted anywhere. It is true only while a tab
 * is open, and a closed tab stops reporting on its own, which is exactly the
 * semantics a green dot should have. Writing it to a table would leave a stale
 * "online" behind every crashed tab.
 */

/** One channel for the whole tab, shared by every caller of this hook. */
let channel: ReturnType<typeof supabase.channel> | null = null;
let refCount = 0;
let onlineIds: string[] = [];
const listeners = new Set<(ids: string[]) => void>();

function publish(ids: string[]) {
  onlineIds = ids;
  for (const fn of listeners) fn(ids);
}

function acquire(userId: string) {
  refCount += 1;
  if (!channel) {
    channel = supabase.channel("comms:presence", {
      config: { presence: { key: userId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        publish(Object.keys(channel?.presenceState() ?? {}));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel?.track({ at: Date.now() });
      });
  }
  return () => {
    refCount -= 1;
    if (refCount > 0) return;
    const c = channel;
    channel = null;
    publish([]);
    if (c) void supabase.removeChannel(c);
  };
}

export function usePresence(): Set<string> {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(onlineIds);

  useEffect(() => {
    if (!user?.id) return;
    listeners.add(setIds);
    const release = acquire(user.id);
    return () => {
      listeners.delete(setIds);
      release();
    };
  }, [user?.id]);

  return new Set(ids);
}
