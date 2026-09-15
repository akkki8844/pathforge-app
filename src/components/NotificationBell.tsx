import { useEffect, useState, useCallback } from "react";
import { Bell, Check, Shield, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationStack } from "@/components/ui/notification-stack";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/timeAgo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  sender_role: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, is_read, sender_role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    if (!error && data) setItems(data as Notification[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev]);
          toast.message(n.title, { description: n.message });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markOneRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.rpc("mark_all_notifications_read");
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground"
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 rounded-xl border-border/50 bg-popover/95 backdrop-blur-sm shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {loading && items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <NotificationStack
              items={items.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                unread: !n.is_read,
                icon: (
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      n.sender_role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent-foreground",
                    )}
                  >
                    {n.sender_role === "admin" ? (
                      <Shield className="h-3.5 w-3.5" />
                    ) : (
                      <GraduationCap className="h-3.5 w-3.5" />
                    )}
                  </div>
                ),
                meta: (
                  <span className="flex items-center gap-2">
                    <span className="capitalize">{n.sender_role || "system"}</span>
                    <span>·</span>
                    <span>{timeAgo(n.created_at)}</span>
                  </span>
                ),
              }))}
              onActivate={(id) => {
                const n = items.find((i) => i.id === id);
                if (n && !n.is_read) markOneRead(id);
              }}
              /* Swiping a notification away marks it read rather than deleting
                 it. The row leaves the list either way, so the gesture feels the
                 same, but nothing is destroyed by a flick the user may not have
                 meant — and `notifications` is the audit trail for every
                 broadcast, which a client-side delete has no business emptying. */
              onDismiss={(id) => {
                const n = items.find((i) => i.id === id);
                if (n && !n.is_read) markOneRead(id);
                setItems((prev) => prev.filter((i) => i.id !== id));
              }}
              dismissLabel="Mark read and hide"
            >
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            </NotificationStack>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
