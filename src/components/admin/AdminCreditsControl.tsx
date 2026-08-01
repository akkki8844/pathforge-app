import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Coins, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const PLAN_OPTIONS: { value: string; label: string; daily: number }[] = [
  { value: "free", label: "Free", daily: 5 },
  { value: "pro", label: "Pro", daily: 100 },
];

interface UserRow {
  user_id: string;
  email: string | null;
  username: string | null;
  plan: string;
  credits_used_today: number;
  bonus_credits: number;
  max_daily_credits: number;
}

interface Adjustment {
  id: string;
  target_user_id: string;
  delta: number;
  reason: string | null;
  created_at: string;
  target_email?: string;
}

export function AdminCreditsControl() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [pending, setPending] = useState<Record<string, { delta: string; reason: string }>>({});

  const load = async () => {
    setLoading(true);
    // Pull profiles + credits
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, username")
      .order("created_at", { ascending: false })
      .limit(100);
    const ids = (profiles || []).map((p) => p.user_id);
    const { data: credits } = await supabase
      .from("user_credits")
      .select("user_id, plan, credits_used_today, bonus_credits, max_daily_credits")
      .in("user_id", ids);
    const map = new Map(credits?.map((c) => [c.user_id, c]) || []);
    setUsers(
      (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        username: p.username,
        plan: map.get(p.user_id)?.plan || "free",
        credits_used_today: map.get(p.user_id)?.credits_used_today || 0,
        bonus_credits: map.get(p.user_id)?.bonus_credits || 0,
        max_daily_credits: map.get(p.user_id)?.max_daily_credits || 5,
      })),
    );

    const { data: adj } = await supabase
      .from("credit_adjustments")
      .select("id, target_user_id, delta, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setAdjustments((adj as Adjustment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const adjust = async (userId: string) => {
    const p = pending[userId];
    const delta = parseInt(p?.delta || "0", 10);
    if (!delta) {
      toast.error("Enter a non-zero credit delta");
      return;
    }
    const { error } = await supabase.rpc("admin_adjust_credits", {
      _target_user_id: userId,
      _delta: delta,
      _reason: p?.reason || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${delta > 0 ? "Granted" : "Removed"} ${Math.abs(delta)} credits`);
      setPending({ ...pending, [userId]: { delta: "", reason: "" } });
      load();
    }
  };

  const setPlan = async (userId: string, plan: string) => {
    const opt = PLAN_OPTIONS.find((p) => p.value === plan);
    if (!opt) return;
    // Best-effort: read configured daily limit; fall back to known defaults
    const { data: limit } = await supabase
      .from("ai_plan_limits")
      .select("max_daily_credits")
      .eq("plan", plan)
      .maybeSingle();
    const daily = limit?.max_daily_credits ?? opt.daily;
    const { error } = await supabase
      .from("user_credits")
      .update({ plan, max_daily_credits: daily })
      .eq("user_id", userId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Plan set to ${opt.label} (${daily}/day)`);
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, plan, max_daily_credits: daily } : u)),
    );
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-accent" /> Credits Control
        </h2>
        <p className="text-sm text-muted-foreground">
          Manually grant or revoke bonus credits per user. Every change is logged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users (latest 100)</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search email or username"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Adjust (+/−)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const p = pending[u.user_id] || { delta: "", reason: "" };
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="font-medium">{u.username || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={u.plan} onValueChange={(v) => setPlan(u.user_id, v)}>
                          <SelectTrigger className="h-8 w-[110px] capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label} · {p.daily}/day
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.credits_used_today} / {u.max_daily_credits}
                      </TableCell>
                      <TableCell className="font-mono">{u.bonus_credits}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          placeholder="±N"
                          value={p.delta}
                          onChange={(e) =>
                            setPending({
                              ...pending,
                              [u.user_id]: { ...p, delta: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-48"
                          placeholder="Optional"
                          value={p.reason}
                          onChange={(e) =>
                            setPending({
                              ...pending,
                              [u.user_id]: { ...p, reason: e.target.value },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => adjust(u.user_id)}>
                          Apply
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Adjustments</CardTitle>
        </CardHeader>
        <CardContent>
          {adjustments.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No adjustments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{new Date(a.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{a.target_user_id.slice(0, 8)}…</TableCell>
                    <TableCell
                      className={a.delta > 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}
                    >
                      {a.delta > 0 ? `+${a.delta}` : a.delta}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
