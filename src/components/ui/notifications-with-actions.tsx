import * as React from "react";
import { Bell, GripVertical, Trash2, Archive, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Notification popover with per-row reveal actions.
 *
 * The published component keeps its own array in state and its buttons only
 * mutate that array, which is right for a demo and wrong for a product: an
 * archive that forgets on refresh is a lie told politely. The structure,
 * markup and the slide-to-reveal interaction are unchanged; what has been
 * added is a way to hand it real data and real handlers.
 *
 * WHAT WAS ADDED, and why each one:
 *
 *  - `onArchive` / `onDelete` / `onOpen`. Without them the row's buttons are
 *    decoration. `notifications` RLS carries a real "Users delete own
 *    notifications" policy, so the bin genuinely deletes rather than hiding.
 *  - `badgeCount`. Upstream badges `notifications.length`, i.e. how many rows
 *    are loaded. That number is not the one anybody wants — with 30 loaded and
 *    2 unread it reads "30". The caller passes the unread count it already
 *    counts server-side; left unset it falls back to upstream's behaviour.
 *  - `unread` on an item, so a row that has not been read is visually distinct.
 *    A notification list where read and unread look identical is the thing the
 *    bell exists to tell you.
 *  - `emptyLabel`, `loading`, `footer` — states the demo had no need for.
 *  - `aria-label` on every icon button, and a real `<button>` per row. The
 *    published buttons have no accessible name at all, so a screen reader
 *    reads four unlabelled buttons per notification.
 *
 * Everything else — the Card, the divide-y list, the `x: -40` slide, the
 * grip-then-reveal pattern — is as published.
 */

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  /** Not yet read. Adds the accent rail and dot. */
  unread?: boolean;
  /** Small label above the title, e.g. "Announcement". */
  meta?: string;
  /** When set, the row is pressable and this runs on press. */
  href?: string | null;
}

export interface NotificationsWithActionsProps {
  items?: NotificationItem[];
  placement?: "top" | "right" | "bottom" | "left";
  /** Overrides the badge number. Defaults to `items.length`, as published. */
  badgeCount?: number;
  loading?: boolean;
  emptyLabel?: string;
  /** Rendered under the list — "load older", a link to the full feed. */
  footer?: React.ReactNode;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpen?: (id: string) => void;
  /** Lets the caller close the popover after navigating. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}

const defaultNotifications: NotificationItem[] = [];

export default function NotificationsWithActions({
  items = defaultNotifications,
  placement = "bottom",
  badgeCount,
  loading = false,
  emptyLabel = "No notifications",
  footer,
  onArchive,
  onDelete,
  onOpen,
  open,
  onOpenChange,
  triggerClassName,
}: NotificationsWithActionsProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  /*
   * Rows removed by this visit's actions. The list itself is owned by the
   * caller now, so this only covers the gap between pressing the button and
   * the caller's data catching up — without it the row sits there looking like
   * the press did nothing.
   */
  const [removed, setRemoved] = React.useState<Set<string>>(new Set());

  const notifications = React.useMemo(
    () => items.filter((n) => !removed.has(n.id)),
    [items, removed],
  );

  const count = badgeCount ?? notifications.length;

  const handleArchive = (id: string) => {
    onArchive?.(id);
    setRemoved((prev) => new Set(prev).add(id));
    setActiveId(null);
  };

  const handleDelete = (id: string) => {
    onDelete?.(id);
    setRemoved((prev) => new Set(prev).add(id));
    setActiveId(null);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange?.(next);
        if (!next) {
          setActiveId(null);
          setRemoved(new Set());
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative inline-flex items-center justify-center rounded-full p-2 hover:bg-muted",
            triggerClassName,
          )}
          aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge
              variant="default"
              className="absolute -right-1 -top-1 px-1.5 py-0 text-xs tabular-nums"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end" side={placement}>
        <Card className="max-h-80 overflow-y-auto rounded-lg border-none shadow-none">
          {loading && notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">{emptyLabel}</div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-4 transition hover:bg-muted/50",
                      item.unread && "bg-accent/[0.04]",
                    )}
                  >
                    {/* Left text with animation */}
                    <motion.div
                      animate={{ x: isActive ? -40 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="min-w-0 flex-1"
                    >
                      <button
                        type="button"
                        onClick={() => onOpen?.(item.id)}
                        className="block w-full text-left"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                            {item.unread && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                                aria-hidden="true"
                              />
                            )}
                            <span className="truncate">{item.title}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.time}
                          </span>
                        </div>
                        {item.meta && (
                          <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {item.meta}
                          </p>
                        )}
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </button>
                    </motion.div>

                    {/* Right side controls */}
                    <div className="ml-2 flex items-center">
                      {isActive ? (
                        <div className="flex items-center space-x-2">
                          <button
                            className="rounded-md p-1 hover:bg-muted"
                            onClick={() => handleArchive(item.id)}
                            aria-label={`Mark "${item.title}" as read`}
                            title="Mark as read"
                          >
                            <Archive className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button
                            className="rounded-md p-1 hover:bg-muted"
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Delete "${item.title}"`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                          <button
                            className="rounded-md p-1 hover:bg-muted"
                            onClick={() => setActiveId(null)}
                            aria-label="Close actions"
                            title="Close"
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="rounded-md p-1 hover:bg-muted"
                          onClick={() => setActiveId(isActive ? null : item.id)}
                          aria-label={`Actions for "${item.title}"`}
                          title="Actions"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {footer}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
