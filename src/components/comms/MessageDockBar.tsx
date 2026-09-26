import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { MessageDock, type DockPerson, type DockShortcut } from "@/components/ui/message-dock";
import { Megaphone, PenSquare, Target, Users } from "lucide-react";
import { PersonAvatar, GroupAvatar } from "@/components/comms/chat/PersonAvatar";
import { useConversations, type ConversationListItem } from "@/hooks/comms/useConversations";
import { usePeople, displayName } from "@/hooks/comms/usePeople";
import { useMessages } from "@/hooks/comms/useMessages";
import { usePresence } from "@/hooks/comms/usePresence";
import { accentForName } from "@/lib/comms/accents";
import type { TeamAccent } from "@/lib/comms/types";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * The live wiring behind `MessageDock`.
 *
 * `MessageDock` is deliberately ignorant of Supabase and of the router. This
 * is the piece that knows both: it picks which conversations appear, resolves
 * the faces, sends through the same mutation the full chat thread uses, and
 * routes to the Chats page.
 *
 * WHY IT SENDS THROUGH `useMessages` RATHER THAN ITS OWN INSERT
 *
 * A second write path would be a second set of rules about optimistic rows,
 * attachment limits and cache invalidation, and the two would drift. Sending
 * through the same `send` mutation means a line typed into the dock lands in
 * exactly the same place, with the same optimistic echo, as one typed into the
 * thread — and it is already there when you open the conversation.
 *
 * The hook is called with the currently open conversation, which is `undefined`
 * while the dock is collapsed. That is the hook's own disabled state, so a
 * collapsed dock holds no realtime subscription and fetches no messages.
 */

/**
 * The expanded wash, per accent.
 *
 * Two stops per theme rather than one shared pair: the pastel that reads under
 * dark ink in light mode is far too bright to put white text on, and the deep
 * tint that works in dark mode is invisible against a light page. These are
 * literal strings because the value is animated through an inline style, where
 * Tailwind's JIT never sees it.
 */
const WASH: Record<TeamAccent, { light: string; dark: string }> = {
  indigo: { light: "#c7d2fe, #eef2ff", dark: "#3730a3, #1e1b4b" },
  violet: { light: "#ddd6fe, #f5f3ff", dark: "#5b21b6, #2e1065" },
  emerald: { light: "#a7f3d0, #ecfdf5", dark: "#065f46, #022c22" },
  amber: { light: "#fde68a, #fffbeb", dark: "#92400e, #451a03" },
  rose: { light: "#fecdd3, #fff1f2", dark: "#9f1239, #4c0519" },
  cyan: { light: "#a5f3fc, #ecfeff", dark: "#155e75, #083344" },
  orange: { light: "#fed7aa, #fff7ed", dark: "#9a3412, #431407" },
  slate: { light: "#cbd5e1, #f8fafc", dark: "#334155, #0f172a" },
};

function washFor(accentName: string | null | undefined, fallbackSeed: string) {
  const key = (accentName ?? accentForName(fallbackSeed)) as TeamAccent;
  return WASH[key] ?? WASH.indigo;
}

/** How many faces the pill carries before the rest live behind the menu button. */
const MAX_FACES = 4;

export function MessageDockBar() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { conversations } = useConversations();
  const online = usePresence();

  // Tells the page the dock is on screen. index.css uses it to reserve room
  // under the page for the dock and, on phones, to lift the support-chat and
  // feedback buttons above it rather than letting the three overlap.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-message-dock", "");
    return () => root.removeAttribute("data-message-dock");
  }, []);

  /*
   * Which conversation the dock currently has open. `MessageDock` owns the
   * expand/collapse animation; this mirror exists only so the `useMessages`
   * call below knows what to send to.
   */
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { send } = useMessages(activeId);

  /*
   * Most recently active first, so the dock is always the people you are
   * actually talking to. Unread conversations are lifted above the rest —
   * a face you owe a reply to is the one worth a slot.
   */
  const shortlist = useMemo<ConversationListItem[]>(() => {
    return [...conversations]
      .sort((a, b) => {
        if (!!a.unread_count !== !!b.unread_count) return a.unread_count ? -1 : 1;
        const at = a.last_message_at ?? a.created_at;
        const bt = b.last_message_at ?? b.created_at;
        return bt.localeCompare(at);
      })
      .slice(0, MAX_FACES);
  }, [conversations]);

  const { people: directory } = usePeople(shortlist.map((c) => c.other_user_id));

  const dockPeople = useMemo<DockPerson[]>(() => {
    return shortlist.map((c) => {
      if (c.kind === "dm" && c.other_user_id) {
        const person = directory[c.other_user_id];
        const name = displayName(person);
        return {
          id: c.id,
          name,
          avatar: <PersonAvatar person={person} size="md" />,
          online: online.has(c.other_user_id),
          unread: c.unread_count,
          gradient: washFor(null, c.other_user_id),
        };
      }
      const name = c.title?.trim() || "Group";
      return {
        id: c.id,
        name,
        // Presence is a property of a person, not of a room, so a group gets no
        // dot at all rather than a dot that would have to mean something else.
        avatar: (
          <GroupAvatar title={name} accentName={c.accent} imagePath={c.image_path} size="md" />
        ),
        unread: c.unread_count,
        gradient: washFor(c.accent, name),
      };
    });
  }, [shortlist, directory, online]);

  /*
   * The rest of Communications, one press away.
   *
   * None of these carry a count. The dock is mounted on nearly every page, so
   * a badge on "Objectives" or "Announcements" would mean running those
   * queries app-wide to decorate a button - real network and cache cost on
   * every page load for a number nobody asked to see. Unread messages are the
   * exception, and those are already loaded because the faces need them.
   */
  const shortcuts: DockShortcut[] = [
    {
      id: "new-chat",
      label: "Start a new chat",
      icon: <PenSquare className="h-4 w-4" />,
      onClick: () => navigate("/communications/chats?new=1"),
    },
    {
      id: "teams",
      label: "Your teams",
      icon: <Users className="h-4 w-4" />,
      onClick: () => navigate("/communications/teams"),
    },
    {
      id: "objectives",
      label: "Objectives",
      icon: <Target className="h-4 w-4" />,
      onClick: () => navigate("/communications/objectives"),
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: <Megaphone className="h-4 w-4" />,
      onClick: () => navigate("/communications/announcements"),
    },
  ];

  /*
   * The dock no longer hides itself when there is nobody to show.
   *
   * It used to return null on an empty conversation list, from a time when the
   * pill carried faces and nothing else - "a pill holding only its own two
   * buttons is furniture" was the note. That stopped being true when the
   * shortcuts arrived: new chat, teams, objectives and announcements are worth
   * reaching from any page whether or not you have talked to anyone yet.
   *
   * It also made the dock look broken. A new student, or anyone whose list had
   * not finished loading, saw it on one page and not on the next, with no way
   * to tell that the difference was their data rather than the page.
   */

  return (
    <MessageDock
      people={dockPeople}
      shortcuts={shortcuts}
      isDark={resolvedTheme === "dark"}
      brand={
        <img
          src={pathforgeLogo}
          alt=""
          className="h-7 w-7 rounded-lg object-contain"
          draggable={false}
        />
      }
      brandLabel="Pathforge messages"
      onBrandClick={() => navigate("/communications/chats")}
      menuLabel="All conversations"
      onMenuClick={() => navigate("/communications/chats")}
      onSelect={(person) => setActiveId(person.id)}
      onToggle={(expanded) => {
        if (!expanded) setActiveId(undefined);
      }}
      onSend={(body, person) => {
        // Both toasts hang off the mutation rather than the click: reporting
        // "Sent" the moment the composer closes would claim delivery for a
        // send that is still in flight, and a failure would then show two
        // contradictory toasts at once.
        // The conversation travels with the message. The composer closes on
        // send, which unbinds `useMessages` before the insert runs, so the
        // hook's own binding cannot be what decides where this lands.
        send.mutate(
          { body, conversationId: person.id },
          {
            onSuccess: () =>
              toast.success(`Sent to ${person.name}`, {
                action: {
                  label: "Open chat",
                  onClick: () => navigate(`/communications/chats?c=${person.id}`),
                },
              }),
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "That message did not send."),
          },
        );
      }}
      placeholder={(name) => `Message ${name}...`}
    />
  );
}

export default MessageDockBar;
