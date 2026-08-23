import { useMemo, useState } from "react";
import { Loader2, Mail, Search } from "lucide-react";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChatThread } from "@/components/comms/chat/ChatThread";
import { useCommsRealtime } from "@/hooks/comms/useCommsRealtime";
import { usePeople } from "@/hooks/comms/usePeople";
import {
  useConversationActions,
  useConversations,
} from "@/hooks/comms/useConversations";

/**
 * A counsellor's direct messages with their students.
 *
 * This page used to be a shell: a real roster next to a hardcoded "No messages
 * yet" and a Send button with no handler and no table behind it. It now runs on
 * the same conversation backend as `/communications/chats` — one messaging
 * layer, not a second one bolted onto the counsellor workspace.
 *
 * Worth being precise about what this is and isn't, because it sits next to a
 * hard privacy rule: this is the counsellor's *own* thread with a student, which
 * they are a member of. It is unrelated to student-to-student traffic, where a
 * counsellor sees team metadata and AI summaries and never message content —
 * there is deliberately no RLS policy that would let this page, or any other,
 * read a conversation the signed-in user is not a member of.
 */
export default function TeacherMessages() {
  const { students } = useTeacherRoster();
  const [search, setSearch] = useState("");
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const [openingFor, setOpeningFor] = useState<string | null>(null);

  // This page lives outside `CommsShell`, so it mounts the per-user
  // subscription itself — otherwise unread counts here would never move.
  useCommsRealtime();

  const { conversations, referencedUserIds } = useConversations();
  const { people } = usePeople(referencedUserIds);
  const { startDm, markRead } = useConversationActions();

  /** DM conversations keyed by the student on the other end. */
  const dmByStudent = useMemo(() => {
    const map = new Map<string, (typeof conversations)[number]>();
    for (const c of conversations) {
      if (c.kind === "dm" && c.other_user_id) map.set(c.other_user_id, c);
    }
    return map;
  }, [conversations]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.username ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [students, search]);

  const openConversation = conversations.find((c) => c.id === openConversationId);

  const openStudent = async (studentId: string) => {
    const existing = dmByStudent.get(studentId);
    if (existing) {
      setOpenConversationId(existing.id);
      if (existing.unread_count > 0) markRead.mutate(existing.id);
      return;
    }
    setOpeningFor(studentId);
    try {
      const id = await startDm.mutateAsync(studentId);
      setOpenConversationId(id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not open that conversation.",
      );
    } finally {
      setOpeningFor(null);
    }
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct messages with the students you support.
          </p>
        </div>

        <div className="grid h-[calc(100svh-14rem)] gap-6 lg:grid-cols-3">
          {/* Student list ------------------------------------------------ */}
          <Card className="flex flex-col border-border/60">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  aria-label="Search students"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
              {filteredStudents.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No students found
                </p>
              ) : (
                filteredStudents.map((s) => {
                  const dm = dmByStudent.get(s.user_id);
                  const isOpen = !!dm && dm.id === openConversationId;
                  const label = s.username || s.email || "Student";
                  return (
                    <button
                      key={s.user_id}
                      onClick={() => void openStudent(s.user_id)}
                      disabled={openingFor === s.user_id}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors",
                        isOpen
                          ? "border border-accent/20 bg-accent/10"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                        {label[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.email}
                        </p>
                      </div>
                      {openingFor === s.user_id ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                      ) : (
                        dm &&
                        dm.unread_count > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold tabular-nums text-accent-foreground">
                            {dm.unread_count > 99 ? "99+" : dm.unread_count}
                          </span>
                        )
                      )}
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Thread ------------------------------------------------------ */}
          <Card className="flex flex-col overflow-hidden border-border/60 lg:col-span-2">
            {openConversation ? (
              <ChatThread
                key={openConversation.id}
                conversation={openConversation}
                listPeople={people}
                onBack={() => setOpenConversationId(null)}
                showBackButton={false}
              />
            ) : (
              <CardContent className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <Mail className="mx-auto mb-3 h-12 w-12 text-muted-foreground/20" />
                  <p className="font-medium text-muted-foreground">
                    Select a student
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a student from the list to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
}
