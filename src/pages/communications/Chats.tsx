import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquare, PenSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CommsEmpty, CommsShell } from "@/components/comms/CommsShell";
import { ChatThread } from "@/components/comms/chat/ChatThread";
import { ConversationDetails } from "@/components/comms/chat/ConversationDetails";
import { ConversationList } from "@/components/comms/chat/ConversationList";
import { NewChatDialog } from "@/components/comms/chat/NewChatDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePeople } from "@/hooks/comms/usePeople";
import { transition } from "@/lib/motion";
import {
  useConversationActions,
  useConversations,
  type ConversationListItem,
} from "@/hooks/comms/useConversations";

/**
 * Chats.
 *
 * Three panes on a desktop — list, thread, details — and on a phone the same
 * three as a stack: the list, then the thread with a back button, then details
 * in a sheet. The panes are not separate implementations; the layout decides
 * which of them is on screen, so a fix to the thread is a fix everywhere.
 *
 * The open conversation lives in the URL (`?c=<id>`) rather than in component
 * state, which is what makes a conversation linkable, survivable across a
 * refresh, and correct when the browser Back button is pressed on a phone.
 *
 * **On the chrome.** This page runs in `bare` shell mode, which drops the page
 * title block every other Communications page carries. That block was costing
 * roughly a sixth of the viewport above a pane that then had to fit a header, a
 * scrolling thread and a composer inside what was left — which is most of why
 * the page read as congested. A messenger says what it is by looking like one;
 * the sub-nav stays because it is how you leave, and "Chats" now titles the
 * list pane where it also does a job.
 */
export default function Chats() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("c") ?? undefined;
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [jumpTo, setJumpTo] = useState<string | null>(null);

  const { conversations, referencedUserIds, isLoading } = useConversations();
  const { people } = usePeople(referencedUserIds);
  const { markRead, markUnread, setFlag, leaveConversation } = useConversationActions();

  // On a desktop the details pane is a third column the Info button toggles; on
  // a phone the same state drives a sheet instead.
  const showDetailsColumn = !isMobile && detailsOpen && !!selectedId;

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId],
  );

  const select = useCallback(
    (id: string | undefined) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("c", id);
          else next.delete("c");
          return next;
        },
        { replace: false },
      );
      setDetailsOpen(false);
    },
    [setParams],
  );

  /**
   * Clear the unread marker for whatever is open.
   *
   * Keyed on the unread count as well as the id, so a message arriving while the
   * thread is already on screen is marked read too — otherwise the badge would
   * reappear for a conversation the user is actively looking at.
   */
  const unreadHere = selected?.unread_count ?? 0;
  useEffect(() => {
    if (selectedId && unreadHere > 0) markRead.mutate(selectedId);
    // `markRead` is a stable mutation object; including it would re-fire on
    // every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, unreadHere]);

  // A conversation the user just left (or was removed from) must not stay open
  // as a dead pane pointing at rows they can no longer read.
  useEffect(() => {
    if (!selectedId || isLoading) return;
    if (!conversations.some((c) => c.id === selectedId)) select(undefined);
  }, [selectedId, conversations, isLoading, select]);

  const togglePin = (c: ConversationListItem) =>
    setFlag.mutate({ conversationId: c.id, pinned: !c.pinned });
  const toggleMute = (c: ConversationListItem) =>
    setFlag.mutate({ conversationId: c.id, muted: !c.muted });

  /**
   * Marking the open conversation unread and leaving it open would be undone
   * immediately by the mark-read effect above, so this closes the thread — which
   * is also what the gesture means: put this back on the pile for later.
   */
  const handleMarkUnread = (c: ConversationListItem) => {
    if (c.id === selectedId) select(undefined);
    markUnread.mutate(
      { id: c.id, last_message_at: c.last_message_at },
      { onError: () => toast.error("Could not mark that as unread.") },
    );
  };

  const handleLeave = (c: ConversationListItem) => {
    leaveConversation.mutate(c.id, {
      onSuccess: () => select(undefined),
      onError: () => toast.error("Could not leave that group."),
    });
  };

  /** The compose control, as an icon in the list header and a button elsewhere. */
  const newChatIcon = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setNewChatOpen(true)}
          aria-label="New chat"
          className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-accent/10 hover:text-accent"
        >
          <PenSquare className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">New chat</TooltipContent>
    </Tooltip>
  );

  const newChatButton = (
    <Button onClick={() => setNewChatOpen(true)} className="rounded-xl">
      <PenSquare className="mr-2 h-4 w-4" />
      New chat
    </Button>
  );

  const listPane = (
    <ConversationList
      conversations={conversations}
      people={people}
      selectedId={selectedId}
      onSelect={select}
      onTogglePin={togglePin}
      onToggleMute={toggleMute}
      onMarkUnread={handleMarkUnread}
      isLoading={isLoading}
      emptyAction={newChatButton}
      header={
        <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-4">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Chats
          </h1>
          {newChatIcon}
        </div>
      }
    />
  );

  const threadPane = selected ? (
    <ChatThread
      key={selected.id}
      conversation={selected}
      listPeople={people}
      onBack={() => select(undefined)}
      onOpenDetails={() => setDetailsOpen((v) => !v)}
      showBackButton={isMobile}
      jumpToMessageId={jumpTo}
      onJumpHandled={() => setJumpTo(null)}
      onTogglePin={() => togglePin(selected)}
      onToggleMute={() => toggleMute(selected)}
      onLeave={() => handleLeave(selected)}
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-chat-canvas">
      <CommsEmpty
        icon={MessageSquare}
        title="Pick a conversation"
        description="Choose someone from the list, or start a new chat with a classmate, a teammate or your counsellor."
        action={newChatButton}
      />
    </div>
  );

  const detailsPane = selected ? (
    <ConversationDetails
      key={selected.id}
      conversation={selected}
      listPeople={people}
      onJumpToMessage={(id) => {
        setJumpTo(id);
        setDetailsOpen(false);
      }}
      onTogglePin={() => togglePin(selected)}
      onToggleMute={() => toggleMute(selected)}
      onLeave={() => handleLeave(selected)}
    />
  ) : null;

  return (
    <CommsShell
      title="Chats"
      purpose="Direct messages, group chats and team conversations."
      icon={MessageSquare}
      path="/communications/chats"
      fill
      bare
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isMobile ? (
          /*
           * One pane at a time, sliding. The direction carries the hierarchy —
           * the thread comes in from the right and leaves to the right — which
           * is the same gesture language as the phone's own back swipe, so the
           * layout never contradicts what the user just did.
           */
          <div className="relative h-full overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={selected ? selected.id : "list"}
                initial={reduced ? false : { x: selected ? "100%" : "-35%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduced ? undefined : { x: selected ? "-35%" : "100%", opacity: 0.6 }}
                transition={transition.base}
                className="absolute inset-0"
              >
                {selected ? threadPane : listPane}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <ResizablePanelGroup
            // react-resizable-panels keys its saved layout to the set of panels
            // present, so the group is remounted when the details column
            // appears or disappears rather than resizing into a stale layout.
            key={showDetailsColumn ? "with-details" : "no-details"}
            direction="horizontal"
            className="h-full"
          >
            <ResizablePanel defaultSize={27} minSize={20} maxSize={40}>
              {listPane}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={showDetailsColumn ? 49 : 73} minSize={35}>
              {threadPane}
            </ResizablePanel>
            {showDetailsColumn && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={24} minSize={18} maxSize={34}>
                  {detailsPane}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* On a phone the details pane is a sheet rather than a third column. */}
      <Sheet open={isMobile && detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full max-w-[35rem] p-0">
          <SheetTitle className="sr-only">Conversation details</SheetTitle>
          {detailsPane}
        </SheetContent>
      </Sheet>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={(id) => select(id)}
      />
    </CommsShell>
  );
}
