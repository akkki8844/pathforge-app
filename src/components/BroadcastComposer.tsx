import { useEffect, useState } from "react";
import { Send, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AudienceType = "all" | "school" | "grade" | "users";

interface School {
  id: string;
  name: string;
}
interface UserOption {
  user_id: string;
  email: string;
  username: string | null;
  grade?: string | null;
  high_school_name?: string | null;
  school_name?: string | null;
}

interface BroadcastComposerProps {
  /** "admin" allows all targeting; "counsellor" restricts to their school */
  senderRole: "admin" | "counsellor";
  onSent?: () => void;
}

const GRADES = ["9", "10", "11", "12"];

export function BroadcastComposer({ senderRole, onSent }: BroadcastComposerProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<AudienceType>(
    senderRole === "counsellor" ? "grade" : "all",
  );
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (senderRole !== "admin") return;
    supabase
      .from("schools")
      .select("id, name")
      .order("name")
      .then(({ data }) => setSchools(data || []));
  }, [senderRole]);

  // Debounced user search
  useEffect(() => {
    if (audience !== "users") return;
    if (userQuery.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      // Counselor-callable RPC; admins also use this and get global results.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("search_users_for_broadcast", {
        _query: userQuery.trim(),
        _limit: 20,
      });
      setSearching(false);
      if (error) {
        console.error("[BroadcastComposer] search failed:", error);
        setUserResults([]);
        return;
      }
      setUserResults((data as UserOption[] | null) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [userQuery, audience]);

  const toggleUser = (u: UserOption) => {
    setSelectedUsers((prev) =>
      prev.find((x) => x.user_id === u.user_id)
        ? prev.filter((x) => x.user_id !== u.user_id)
        : [...prev, u],
    );
  };

  const reset = () => {
    setTitle("");
    setMessage("");
    setSchoolId("");
    setGrade("");
    setSelectedUsers([]);
    setUserQuery("");
    setUserResults([]);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (audience === "school" && senderRole === "admin" && !schoolId) {
      toast.error("Pick a school");
      return;
    }
    if (audience === "grade" && !grade) {
      toast.error("Pick a grade");
      return;
    }
    if (audience === "users" && selectedUsers.length === 0) {
      toast.error("Pick at least one user");
      return;
    }

    setSending(true);
    const { data, error } = await supabase.rpc("send_notification_broadcast", {
      _title: title.trim(),
      _message: message.trim(),
      _audience_type: audience,
      _audience_school_id: audience === "school" || (audience === "grade" && schoolId)
        ? schoolId || null
        : null,
      _audience_grade: audience === "grade" ? grade : null,
      _audience_user_ids:
        audience === "users" ? selectedUsers.map((u) => u.user_id) : null,
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { recipient_count?: number };
    toast.success(`Sent to ${result?.recipient_count ?? 0} recipient(s)`);
    reset();
    onSent?.();
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold">Send Announcement</h3>
        <p className="text-sm text-muted-foreground">
          {senderRole === "counsellor"
            ? "Send to a grade or specific students at your linked school."
            : "Reach all users, a school, a grade, or specific people."}
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="b-title">Title</Label>
          <Input
            id="b-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Application deadline reminder"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-msg">Message</Label>
          <Textarea
            id="b-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement…"
            rows={4}
            maxLength={2000}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Audience</Label>
            <Select
              value={audience}
              onValueChange={(v) => setAudience(v as AudienceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {senderRole === "admin" ? "All users" : "All my students"}
                </SelectItem>
                {senderRole === "admin" && (
                  <SelectItem value="school">By school</SelectItem>
                )}
                <SelectItem value="grade">By grade</SelectItem>
                <SelectItem value="users">Specific users</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {audience === "school" && senderRole === "admin" && (
            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audience === "grade" && (
            <div className="space-y-1.5">
              <Label>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {audience === "users" && (
          <div className="space-y-2">
            <Label>Find users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search by name, email, or school (min 2 chars)…"
                className="pl-9"
              />
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUsers.map((u) => (
                  <Badge
                    key={u.user_id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {u.username || u.email}
                    <button
                      type="button"
                      onClick={() => toggleUser(u)}
                      className="ml-1 rounded-sm hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {userQuery.trim().length >= 2 && (
              <ScrollArea className="max-h-48 rounded-md border border-border">
                {searching ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    Searching…
                  </div>
                ) : userResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">
                    No users found
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {userResults.map((u) => {
                      const selected = selectedUsers.find(
                        (x) => x.user_id === u.user_id,
                      );
                      return (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            onClick={() => toggleUser(u)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex justify-between ${
                              selected ? "bg-primary/5" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="font-medium block truncate">
                                {u.username || u.email}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {u.username ? `${u.email} · ` : ""}
                                {u.school_name || u.high_school_name || "No school"}
                                {u.grade ? ` · Gr ${u.grade}` : ""}
                              </span>
                            </span>
                            {selected && (
                              <span className="text-xs text-primary">Added</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={reset} disabled={sending}>
          Clear
        </Button>
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send announcement
        </Button>
      </div>
    </Card>
  );
}
