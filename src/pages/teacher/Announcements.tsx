import { useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { BackToCommand } from "@/components/teacher/BackToCommand";
import { BroadcastComposer } from "@/components/BroadcastComposer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Broadcast {
  id: string;
  title: string;
  message: string;
  audience_type: string;
  audience_grade: string | null;
  recipient_count: number;
  created_at: string;
}

/**
 * Counselor announcements page.
 * Sends to linked-school students by default. Lists past broadcasts the
 * counselor has sent so they can see what was actually delivered.
 */
export default function CounselorAnnouncements() {
  const { user } = useAuth();
  const [items, setItems] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notification_broadcasts")
      .select("id,title,message,audience_type,audience_grade,recipient_count,created_at")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as Broadcast[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  return (
    <TeacherLayout>
      <BackToCommand />
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-accent" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send a notification to your students. They'll see it in their notification bell instantly.
          </p>
        </header>

        <BroadcastComposer senderRole="counsellor" onSent={load} />

        <section>
          <h2 className="text-sm font-semibold text-foreground mb-3">Sent recently</h2>
          {loading ? (
            <div className="card-elevated p-6 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="card-elevated p-6 text-sm text-muted-foreground">
              You haven't sent any announcements yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((b) => (
                <li key={b.id} className="card-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{b.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                        {b.message}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{b.audience_type}{b.audience_grade ? ` · grade ${b.audience_grade}` : ""}</span>
                    <span>•</span>
                    <span>{b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </TeacherLayout>
  );
}
