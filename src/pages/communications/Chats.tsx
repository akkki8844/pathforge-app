import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommsEmpty, CommsShell } from "@/components/comms/CommsShell";
import { ChatThread } from "@/components/comms/chat/ChatThread";
import { ConversationDetails } from "@/components/comms/chat/ConversationDetails";
import { ConversationList } from "@/components/comms/chat/ConversationList";
import { NewChatDialog } from "@/components/comms/chat/NewChatDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePeople } from "@/hooks/comms/usePeople";
import {
  useConversationActions,
  useConversations,
  type ConversationListItem,
} from "@/hooks/comms/useConversations";

/**
 * Chats.
 *
 * Three panes on a desktop — list, thread, details — and on a phone the same
 * three as a stack: the list, then the thread with a labelled `← Chats` back
 * button, then details in a sheet. The panes are not separate implementations;
 * the layout decides which of them is on screen, so a fix to the thread is a fix
 * everywhere.
 *
 * The open conversation lives in the URL (`?c=<id>`) rather than in component
 * state, which is what makes a conversation linkable, survivable across a
 * refresh, and correct when the browser Back button is pressed on a phone.
 */
export default function Chats() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("c") ?? undefined;
  const isMobile = useIsMobile();

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

  const newChatButton = (
    <MotionButton onClick={() => setNewChatOpen(true)} ripple className="rounded-xl">
      <Plus className="mr-2 h-4 w-4" />
      New chat
    </MotionButton>
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
    />
  ) : (
    <CommsEmpty
      icon={MessageSquare}
      title="Pick a conversation"
      description="Choose someone from the list, or start a new chat with a classmate, a teammate or your counsellor."
      action={newChatButton}
    />
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
      actions={newChatButton}
    >
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isMobile ? (
          <div className="h-[calc(100vh-15rem)] min-h-[420px]">
            {selected ? threadPane : listPane}
          </div>
        ) : (
          <ResizablePanelGroup
            // react-resizable-panels keys its saved layout to the set of panels
            // present, so the group is remounted when the details column
            // appears or disappears rather than resizing into a stale layout.
            key={showDetailsColumn ? "with-details" : "no-details"}
            direction="horizontal"
            className="h-[calc(100vh-16rem)] min-h-[480px]"
          >
            <ResizablePanel defaultSize={28} minSize={20} maxSize={40}>
              {listPane}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={showDetailsColumn ? 48 : 72} minSize={35}>
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
