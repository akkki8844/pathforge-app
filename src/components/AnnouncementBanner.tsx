// Renders active platform-wide announcements posted by admins from
// AdminPanel → Announcements. Polls + realtime so new announcements
// appear without a refresh. Users can dismiss per-id (stored locally).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Info, Megaphone, Wrench, X } from "lucide-react";
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

const styleFor = (type: string) => {
  switch (type) {
    case "warning":
      return { Icon: AlertTriangle, bar: "bg-yellow-500/10 text-yellow-900 dark:text-yellow-200 border-yellow-500/30" };
    case "maintenance":
      return { Icon: Wrench, bar: "bg-orange-500/10 text-orange-900 dark:text-orange-200 border-orange-500/30" };
    case "update":
      return { Icon: Megaphone, bar: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30" };
    default:
      return { Icon: Info, bar: "bg-primary/10 text-foreground border-primary/30" };
  }
};

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
        const { Icon, bar } = styleFor(a.type);
        return (
          <div
            key={a.id}
            className={cn(
              "border-b backdrop-blur supports-[backdrop-filter]:bg-opacity-90",
              bar,
            )}
            role="status"
          >
            <div className="container mx-auto flex items-start gap-4 px-4 py-4 sm:py-5 text-base sm:text-[15px]">
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base sm:text-lg leading-snug">{a.title}</p>
                <p className="mt-1 text-sm sm:text-[15px] text-current/90 leading-relaxed">{a.content}</p>
              </div>
              <button
                onClick={() => dismiss(a.id)}
                aria-label="Dismiss announcement"
                className="rounded p-1 hover:bg-foreground/10 transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { Megaphone };
