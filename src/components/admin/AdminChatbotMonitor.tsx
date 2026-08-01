import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface Session {
  id: string;
  user_id: string;
  name: string | null;
  transcript: string;
  advisor_response: string;
  topics_discussed: string[] | null;
  created_at: string;
}

export function AdminChatbotMonitor() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("voice_advisor_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setSessions((data as any) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.transcript?.toLowerCase().includes(q) ||
      s.advisor_response?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6" /> Chatbot / AI Monitoring
        </h2>
        <p className="text-muted-foreground">
          Review user queries and AI responses across {sessions.length} recent sessions.
        </p>
      </div>

      <Input
        placeholder="Search transcripts, responses, or sessions…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="space-y-3">
        {filtered.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-medium">
                  {s.name || "Untitled session"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(s.topics_discussed || []).slice(0, 4).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(s.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">User</div>
                <div className="bg-muted/50 rounded p-2 whitespace-pre-wrap">{s.transcript}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">AI</div>
                <div className="bg-accent/5 rounded p-2 whitespace-pre-wrap">{s.advisor_response}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No sessions match your search.</p>
        )}
      </div>
    </div>
  );
}
