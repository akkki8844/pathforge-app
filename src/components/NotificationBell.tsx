import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationsWithActions, {
  type NotificationItem,
} from "@/components/ui/notifications-with-actions";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/timeAgo";
import {
  notificationHref,
  useNotifications,
  type NotificationRow,
  NOTIFICATIONS_PAGE,
} from "@/hooks/useNotifications";

/**
 * The notification bell.
 *
 * The popover itself is `NotificationsWithActions` — the presentation and the
 * grip-then-reveal interaction live there. This file is the other half: it
 * supplies real rows, a real unread count and real handlers, and decides what
 * a press means.
 *
 * WHAT IS KEPT FROM THE PREVIOUS BELL, deliberately:
 *
 *  - The badge is the database's exact unread count, not the number of rows
 *    fetched. With sixty unread and thirty loaded, "30" was simply wrong.
 *  - Paging. The list stops at a page boundary and offers to fetch more rather
 *    than silently truncating.
 *  - "Mark all read", and the link through to the full announcements feed.
 *  - `notificationHref`, which only navigates when the destination is actually
 *    known. Rows whose origin cannot be determined stay inert on purpose.
 */

/** What each row's small uppercase label says. */
function metaFor(n: NotificationRow): string {
  if (n.broadcast_id) return "Announcement";
  if (n.sender_role === "admin") return "Pathforge";
  if (n.sender_role === "scholarships") return "Scholarship alert";
  if (n.sender_role === "teacher") return "Counsellor";
  return "Pathforge";
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(NOTIFICATIONS_PAGE);

  const { items, unreadCount, isLoading, hasMore, markRead, markAllRead, remove } =
    useNotifications(limit);

  const rows = useMemo<NotificationItem[]>(
    () =>
      items.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.message,
        time: timeAgo(n.created_at),
        unread: !n.is_read,
        meta: metaFor(n),
        href: notificationHref(n),
      })),
    [items],
  );

  if (!user) return null;

  const open_ = (id: string) => {
    const n = items.find((i) => i.id === id);
    if (!n) return;
    if (!n.is_read) markRead.mutate(id);
    const href = notificationHref(n);
    if (href) {
      setOpen(false);
      navigate(href);
    }
  };

  return (
    <NotificationsWithActions
      items={rows}
      // The count the database reports, not the number of rows on screen.
      badgeCount={unreadCount}
      loading={isLoading}
      open={open}
      onOpenChange={setOpen}
      placement="bottom"
      emptyLabel="No notifications yet"
      onOpen={open_}
      // Archive means "I have seen this": it marks read rather than destroying
      // a row that is also the audit trail for a broadcast.
      onArchive={(id) => {
        const n = items.find((i) => i.id === id);
        if (n && !n.is_read) markRead.mutate(id);
      }}
      onDelete={(id) => remove.mutate(id)}
      footer={
        <div className="border-t border-border p-2">
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setLimit((l) => l + NOTIFICATIONS_PAGE)}
            >
              Load older notifications
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs">
            <Link to="/communications/announcements" onClick={() => setOpen(false)}>
              Open announcements
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      }
    />
  );
}
