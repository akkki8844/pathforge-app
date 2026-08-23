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

// Must stay a subset of the plans admin_set_user_plan() accepts, which raises
// on anything outside free/pro/max/enterprise. `daily` is only a display
// fallback -- the RPC derives the real limit from ai_plan_limits.
const PLAN_OPTIONS: { value: string; label: string; daily: number }[] = [
  { value: "free", label: "Free", daily: 5 },
  { value: "pro", label: "Pro", daily: 25 },
  { value: "max", label: "Max", daily: 100 },
  { value: "enterprise", label: "Enterprise", daily: 100 },
];

// Which bucket actually meters a user depends on their plan. consume_credits()
// branches on `monthly_credit_allowance(plan)`: above zero it spends
// credits_used_month against that allowance and never looks at the daily
// columns; at zero it falls back to credits_used_today against
// effective_daily_credit_limit(). Every paid plan takes the monthly branch, so
// showing "used_today / max_daily_credits" for them reported a bucket the
// system does not charge -- a Pro user at 180/250 for the month displayed as
// "0 / 5", which reads like a locked-out free account.
//
// Allowances are read from the database rather than mirrored here. They live
// in a CASE inside monthly_credit_allowance() with no backing table, and a
// hardcoded copy would silently drift the moment that function is edited --
// which is exactly what stranded enterprise at the ELSE 0 branch.
const ALLOWANCE_PLANS = PLAN_OPTIONS.map((p) => p.value);

interface UserRow {
  user_id: string;
  email: string | null;
  username: string | null;
  plan: string;
  credits_used_today: number;
  credits_used_month: number;
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
  const [allowances, setAllowances] = useState<Record<string, number>>({});

  // Monthly allowance per plan, straight from the function consume_credits()
  // itself calls, so this table can never disagree with what users are charged.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ALLOWANCE_PLANS.map(async (plan) => {
          const { data } = await supabase.rpc("monthly_credit_allowance", { _plan: plan } as any);
          return [plan, Number(data) || 0] as const;
        }),
      );
      // Falling back to an empty map is safe: every row then renders the daily
      // bucket, which is the pre-existing behaviour rather than a blank cell.
      if (!cancelled) setAllowances(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      .select("user_id, plan, credits_used_today, credits_used_month, bonus_credits, max_daily_credits")
      .in("user_id", ids);
    const map = new Map(credits?.map((c) => [c.user_id, c]) || []);
    setUsers(
      (profiles || []).map((p) => ({
        user_id: p.user_id,
        email: p.email,
        username: p.username,
        plan: map.get(p.user_id)?.plan || "free",
        credits_used_today: map.get(p.user_id)?.credits_used_today || 0,
        credits_used_month: map.get(p.user_id)?.credits_used_month || 0,
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

    // Route through admin_set_user_plan() instead of updating user_credits
    // directly. A direct update set `plan` but left plan_expires_at NULL, which
    // the expiry sweep reads as lapsed and reverts to free -- the same bug that
    // made redeemed coupon plans vanish after a day. The RPC re-checks
    // is_admin(), derives the daily limit and monthly allowance, sets a real
    // expiry, and writes the credit_adjustments audit row that a direct table
    // write skipped entirely.
    const { data, error } = await supabase.rpc("admin_set_user_plan", {
      _target_user_id: userId,
      _plan: plan,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }

    const res = (data ?? {}) as {
      max_daily_credits?: number;
      bonus_credits?: number;
      plan_expires_at?: string | null;
    };
    const daily = res.max_daily_credits ?? opt.daily;
    toast.success(`Plan set to ${opt.label} (${daily}/day)`);
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === userId
          ? {
              ...u,
              plan,
              max_daily_credits: daily,
              // The RPC also zeroes the usage counters and replaces the bonus
              // grant, so mirror that rather than leaving stale numbers on
              // screen. Both buckets are reset because the plan change can move
              // the user between them.
              bonus_credits: res.bonus_credits ?? u.bonus_credits,
              credits_used_today: 0,
              credits_used_month: 0,
            }
          : u,
      ),
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
                  <TableHead>Usage</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Adjust (+/−)</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const p = pending[u.user_id] || { delta: "", reason: "" };
                  const allowance = allowances[u.plan] ?? 0;
                  const monthly = allowance > 0;
                  const used = monthly ? u.credits_used_month : u.credits_used_today;
                  const cap = monthly ? allowance : u.max_daily_credits;
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
                            {PLAN_OPTIONS.map((p) => {
                              const a = allowances[p.value] ?? 0;
                              return (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label} · {a > 0 ? `${a}/mo` : `${p.daily}/day`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">
                          {used} / {cap}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {monthly ? "this month" : "today"}
                        </div>
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
