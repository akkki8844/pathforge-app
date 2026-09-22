// Renders active platform-wide announcements posted by admins from
// AdminPanel → Announcements. Polls + realtime so new announcements
// appear without a refresh. Users can dismiss per-id (stored locally).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  show_until: string | null;
  target_audience: string | null;
}

const DISMISSED_KEY = "pathforge_dismissed_announcements";

const getDismissed = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const persistDismissed = (ids: string[]) => {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-100)));
  } catch {}
};

/**
 * The strip's severity, as a word and a rule rather than as a coloured panel
 * with an icon in it.
 *
 * It used to render in raw Tailwind palette colours - yellow, orange, emerald -
 * none of which belong to this product's token set, with a different lucide
 * icon per type (Wrench, Megaphone, Info, AlertTriangle). Four icons and three
 * off-system colours is a lot of decoration for one line of text, and it made
 * the banner read as a component borrowed from somewhere else. Severity is now
 * carried by a rule and a kicker word, both drawn from the semantic tokens the
 * rest of the app uses.
 */
const TONES = {
  warning: { label: "Important", rule: "bg-warning", text: "text-warning" },
  maintenance: { label: "Maintenance", rule: "bg-warning", text: "text-warning" },
  update: { label: "Update", rule: "bg-success", text: "text-success" },
  notice: { label: "Notice", rule: "bg-accent", text: "text-accent" },
} as const;

const toneFor = (type: string) =>
  TONES[type as keyof typeof TONES] ?? TONES.notice;

export function AnnouncementBanner() {
  const { user, onboardingCompleted } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const fetchActive = async () => {
    const { data } = await supabase
      .from("admin_announcements")
      .select("id,title,content,type,is_active,show_until,target_audience")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (data) setItems(data as Announcement[]);
  };

  useEffect(() => {
    if (!user) return;
    fetchActive();
    // Realtime: react instantly when admin publishes / toggles / deletes.
    const ch = supabase
      .channel("admin_announcements_feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_announcements" },
        () => fetchActive(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const visible = useMemo(() => {
    const now = Date.now();
    return items.filter((a) => {
      if (dismissed.includes(a.id)) return false;
      if (a.show_until && new Date(a.show_until).getTime() < now) return false;
      if (a.target_audience === "onboarded" && !onboardingCompleted) return false;
      if (a.target_audience === "new" && onboardingCompleted) return false;
      return true;
    });
  }, [items, dismissed, onboardingCompleted]);

  if (!user || visible.length === 0) return null;

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = [...prev, id];
      persistDismissed(next);
      return next;
    });
  };

  return (
    <div className="sticky top-16 z-40 w-full">
      {visible.slice(0, 1).map((a) => {
        const tone = toneFor(a.type);
        return (
          <div
            key={a.id}
            className="border-b border-border bg-card/95 backdrop-blur"
            role="status"
          >
            <div className="container mx-auto flex items-start gap-3 px-4 py-3.5">
              <span
                aria-hidden
                className={cn("mt-0.5 h-10 w-[3px] shrink-0 rounded-full", tone.rule)}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.12em]",
                    tone.text,
                  )}
                >
                  {tone.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                  {a.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {a.content}
                </p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss announcement"
                className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
