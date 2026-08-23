/**
 * The four Communications destinations, declared once.
 *
 * The navbar dropdown, the Communications sub-nav and every page header read
 * this list, so a route can't exist in one place and be missing from another —
 * the same reason `@/lib/routine/nav` exists for Routine.
 *
 * Order is the product's own narrative rather than alphabetical: what other
 * people told you, then who you're talking to, then who you're building with,
 * then what you actually owe. Chats is the default landing route because it's
 * the surface a user opens the section for.
 */
import { Megaphone, MessageSquare, Users, Target } from "lucide-react";

export interface CommsDestination {
  href: string;
  label: string;
  /** One line, shown under the label in the dropdown. Says what the page is *for*. */
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const COMMUNICATIONS_DESTINATIONS: CommsDestination[] = [
  {
    href: "/communications/chats",
    label: "Chats",
    description: "Direct messages and group conversations",
    icon: MessageSquare,
  },
  {
    href: "/communications/teams",
    label: "Teams",
    description: "Projects, clubs, competitions and research",
    icon: Users,
  },
  {
    href: "/communications/objectives",
    label: "Objectives",
    description: "What you've committed to, and by when",
    icon: Target,
  },
  {
    href: "/communications/announcements",
    label: "Announcements",
    description: "Updates from teachers, teams and Pathforge",
    icon: Megaphone,
  },
];

export const COMMUNICATIONS_ROOT = "/communications";

/** Where `/communications` itself redirects to. */
export const COMMUNICATIONS_DEFAULT = "/communications/chats";

export function isCommsPath(pathname: string): boolean {
  return (
    pathname === COMMUNICATIONS_ROOT || pathname.startsWith(`${COMMUNICATIONS_ROOT}/`)
  );
}

/**
 * The destination a path belongs to.
 *
 * Prefix-matched rather than compared for equality, because Teams owns a child
 * route (`/communications/teams/:teamId`) and the workspace still has to light
 * up "Teams" in the sub-nav.
 */
export function commsDestination(pathname: string): CommsDestination | undefined {
  return COMMUNICATIONS_DESTINATIONS.find(
    (d) => pathname === d.href || pathname.startsWith(`${d.href}/`),
  );
}
