/**
 * Announcements for one team.
 *
 * A team announcement is *one* record. The team workspace and the global feed
 * (Stage 5) render the same row rather than each owning a copy, so editing it in
 * one place cannot leave the other showing stale text.
 *
 * Read state is a separate table rather than a column, because "read" is
 * per-viewer: a boolean on the announcement itself would mean the first person
 * to open it marked it read for everybody.
 */
import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { commsDb } from "@/integrations/supabase/communications";
import { useAuth } from "@/contexts/AuthContext";
import type { Announcement, AnnouncementPriority } from "@/lib/comms/types";
import { commsKeys } from "./keys";

/** A platform-wide announcement, read-only here — it is authored from AdminPanel. */
export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export function useTeamAnnouncements(teamId: string | undefined) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["comms", "team-announcements", teamId ?? "none"],
    enabled: !!teamId,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await commsDb
        .from("announcements")
        .select("*")
        .eq("team_id", teamId!)
        .eq("is_active", true)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const announcements = useMemo(() => query.data ?? [], [query.data]);

  const readsQuery = useQuery({
    queryKey: ["comms", "team-announcement-reads", teamId ?? "none", user?.id ?? "anon"],
    enabled: !!teamId && !!user?.id && announcements.length > 0,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await commsDb
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user!.id)
        .in("announcement_id", announcements.map((a) => a.id));
      if (error) throw error;
      return (data ?? []).map((r) => r.announcement_id);
    },
  });

  return {
    announcements,
    readIds: useMemo(() => new Set(readsQuery.data ?? []), [readsQuery.data]),
    authorIds: useMemo(() => announcements.map((a) => a.author_id), [announcements]),
    isLoading: query.isLoading,
  };
}

/**
 * The global feed: every team announcement across the teams the user belongs
 * to, plus platform announcements (`admin_announcements`) read alongside them.
 * Two different tables, rendered as one sorted list — the platform side is
 * read-only here and never merged into `announcements`, so the admin panel and
 * `AnnouncementBanner` keep working untouched.
 */
export function useAnnouncementsFeed(teamIds: string[]) {
  const { user } = useAuth();
  const sortedTeamIds = useMemo(() => [...teamIds].sort(), [teamIds]);

  const teamQuery = useQuery({
    queryKey: [...commsKeys.announcements(user?.id), sortedTeamIds.join(",")],
    enabled: sortedTeamIds.length > 0,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await commsDb
        .from("announcements")
        .select("*")
        .in("team_id", sortedTeamIds)
        .eq("is_active", true)
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const teamAnnouncements = useMemo(() => teamQuery.data ?? [], [teamQuery.data]);

  const platformQuery = useQuery({
    queryKey: ["comms", "platform-announcements"],
    queryFn: async (): Promise<PlatformAnnouncement[]> => {
      const { data, error } = await supabase
        .from("admin_announcements")
        .select("id,title,content,type,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const readsQuery = useQuery({
    queryKey: ["comms", "feed-announcement-reads", user?.id ?? "anon", sortedTeamIds.join(",")],
    enabled: !!user?.id && teamAnnouncements.length > 0,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await commsDb
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user!.id)
        .in("announcement_id", teamAnnouncements.map((a) => a.id));
      if (error) throw error;
      return (data ?? []).map((r) => r.announcement_id);
    },
  });

  return {
    teamAnnouncements,
    platformAnnouncements: platformQuery.data ?? [],
    readIds: useMemo(() => new Set(readsQuery.data ?? []), [readsQuery.data]),
    authorIds: useMemo(() => teamAnnouncements.map((a) => a.author_id), [teamAnnouncements]),
    isLoading: teamQuery.isLoading || platformQuery.isLoading,
  };
}

export function useAnnouncementActions(teamId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["comms", "team-announcements", teamId ?? "none"] });
    void qc.invalidateQueries({ queryKey: commsKeys.announcements(user?.id) });
    // The global feed's read-state query is keyed by team-id set, not by
    // `teamId` alone, so a prefix match on its own name is what actually
    // reaches it from a team-scoped action.
    void qc.invalidateQueries({ queryKey: ["comms", "feed-announcement-reads"] });
  }, [qc, teamId, user?.id]);

  const publish = useMutation({
    mutationFn: async (input: {
      teamId: string;
      title: string;
      body: string;
      priority: AnnouncementPriority;
      requiresAck: boolean;
    }) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb.from("announcements").insert({
        author_id: user.id,
        scope: "team",
        team_id: input.teamId,
        class_id: null,
        school_id: null,
        title: input.title.trim(),
        body: input.body.trim(),
        priority: input.priority,
        requires_ack: input.requiresAck,
        pinned: false,
        is_active: true,
        published_at: new Date().toISOString(),
        expires_at: null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setPinned = useMutation({
    mutationFn: async (input: { id: string; pinned: boolean }) => {
      const { error } = await commsDb
        .from("announcements")
        .update({ pinned: input.pinned })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Unpublish rather than delete, so acknowledgements keep pointing at a row. */
  const unpublish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await commsDb
        .from("announcements")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb.from("announcement_reads").insert({
        announcement_id: announcementId,
        user_id: user.id,
        read_at: new Date().toISOString(),
      });
      // UNIQUE(announcement_id, user_id): already read is the desired state.
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
    },
    onSuccess: invalidate,
  });

  const acknowledge = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) throw new Error("not signed in");
      const { error } = await commsDb.from("announcement_acknowledgements").insert({
        announcement_id: announcementId,
        user_id: user.id,
        acknowledged_at: new Date().toISOString(),
      });
      if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
    },
    onSuccess: invalidate,
  });

  return { publish, setPinned, unpublish, markRead, acknowledge };
}
