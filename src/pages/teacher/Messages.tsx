import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Mail, Search, Send, Inbox, Clock, CheckCheck, ChevronRight,
  MessageSquare, Users, Megaphone,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { useTeacherRoster } from "@/hooks/useTeacherRoster";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Tab = "inbox" | "sent" | "broadcasts";

export default function TeacherMessages() {
  const { students } = useTeacherRoster();
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const nameMap = useMemo(
    () => new Map(students.map((s) => [s.user_id, s.username || s.email || "Student"])),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = `${s.username ?? ""} ${s.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, search]);

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">Communicate with students and parents</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
          {/* Student list */}
          <Card className="border-border/60 flex flex-col">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-1 p-2">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No students found</p>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.user_id}
                    onClick={() => setSelectedStudent(s.user_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
                      selectedStudent === s.user_id
                        ? "bg-accent/10 border border-accent/20"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                      {(s.username || s.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.username || s.email || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Message area */}
          <Card className="border-border/60 lg:col-span-2 flex flex-col">
            {selectedStudent ? (
              <>
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">
                      {(nameMap.get(selectedStudent) || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{nameMap.get(selectedStudent)}</p>
                      <p className="text-xs text-muted-foreground">Student</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button disabled={!messageText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground font-medium">Select a student</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose a student from the list to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
}
