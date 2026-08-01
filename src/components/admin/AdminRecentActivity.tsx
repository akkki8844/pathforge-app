import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { Activity, LogIn, UserPlus, Eye, CircleDollarSign, MousePointerClick, Loader2, RefreshCw } from "lucide-react";

type ActivityRow = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  action_type: string;
  page_path: string | null;
  created_at: string;
};

const ICON_MAP: Record<string, typeof Activity> = {
  login: LogIn,
  signup: UserPlus,
  page_view: Eye,
  ai_request: Activity,
  credit_consumed: CircleDollarSign,
  click: MousePointerClick,
};

const TONE: Record<string, string> = {
  login: "text-emerald-500",
  signup: "text-violet-500",
  page_view: "text-muted-foreground",
  ai_request: "text-amber-500",
  credit_consumed: "text-rose-500",
  click: "text-sky-500",
};

export function AdminRecentActivity() {
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_get_recent_activity" as any, {
      _limit: 100,
    });
    if (!error && Array.isArray(data)) setItems(data as ActivityRow[]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            Recent User Activity
          </CardTitle>
          <CardDescription>Live feed of the last 100 platform events</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="gap-2">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No activity recorded yet. Events will start populating as users browse, sign in, and use AI features.
          </p>
        ) : (
          <ScrollArea className="h-[420px] pr-3">
            <ul className="divide-y divide-border/50">
              {items.map((it) => {
                const Icon = ICON_MAP[it.action_type] ?? Activity;
                const tone = TONE[it.action_type] ?? "text-muted-foreground";
                const who = it.username || it.email || it.user_id.slice(0, 8);
                return (
                  <li key={it.id} className="py-2.5 flex items-start gap-3">
                    <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted ${tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{who}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                          {it.action_type.replace(/_/g, " ")}
                        </Badge>
                        {it.page_path && (
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            {it.page_path}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
