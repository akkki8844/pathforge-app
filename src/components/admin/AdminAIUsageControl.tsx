import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Search, Gauge } from "lucide-react";
import { toast } from "sonner";

interface PlanLimit {
  plan: string;
  max_daily_credits: number;
}

interface UserUsage {
  user_id: string;
  email: string | null;
  username: string | null;
  plan: string | null;
  max_daily_credits: number | null;
  credits_used_today: number | null;
  bonus_credits: number | null;
  lifetime_requests: number;
  requests_24h: number;
}

// Three plans only: Free, Pro, Enterprise.
const PLAN_ORDER = ["free", "pro", "enterprise"];

export function AdminAIUsageControl() {
  const [planLimits, setPlanLimits] = useState<Record<string, number>>({});
  const [planLoading, setPlanLoading] = useState(true);
  const [users, setUsers] = useState<UserUsage[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [editingLimit, setEditingLimit] = useState<Record<string, string>>({});

  const loadPlans = async () => {
    setPlanLoading(true);
    const { data, error } = await supabase
      .from("ai_plan_limits")
      .select("plan, max_daily_credits");
    if (error) {
      toast.error("Failed to load plan limits");
    } else {
      const map: Record<string, number> = {};
      (data as PlanLimit[]).forEach((p) => (map[p.plan] = p.max_daily_credits));
      PLAN_ORDER.forEach((p) => {
        if (!(p in map)) map[p] = 5;
      });
      setPlanLimits(map);
    }
    setPlanLoading(false);
  };

  const loadUsers = async (query = "") => {
    setUsersLoading(true);
    const { data, error } = await supabase.rpc("admin_list_user_ai_usage", {
      _search: query,
      _limit: 50,
    });
    if (error) toast.error("Failed to load usage");
    else setUsers((data as unknown as UserUsage[]) || []);
    setUsersLoading(false);
  };

  useEffect(() => {
    loadPlans();
    loadUsers();
  }, []);

  const handlePlanSave = async (plan: string, cascade: boolean) => {
    setSavingPlan(plan);
    const { error } = await supabase.rpc("admin_update_plan_limit", {
      _plan: plan,
      _max_daily_credits: planLimits[plan],
      _cascade: cascade,
    });
    setSavingPlan(null);
    if (error) toast.error(error.message);
    else {
      toast.success(cascade ? `Saved & applied to all ${plan} users` : "Plan limit saved");
      if (cascade) loadUsers(search);
    }
  };

  const handleUserLimitSave = async (userId: string) => {
    const value = Number(editingLimit[userId]);
    if (isNaN(value) || value < 0) {
      toast.error("Enter a valid number");
      return;
    }
    const { error } = await supabase.rpc("admin_set_user_daily_limit", {
      _target_user_id: userId,
      _max_daily_credits: value,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("User limit updated");
      setEditingLimit((s) => ({ ...s, [userId]: "" }));
      loadUsers(search);
    }
  };

  const handleResetUsage = async (userId: string) => {
    const { error } = await supabase.rpc("admin_reset_user_usage", {
      _target_user_id: userId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Usage reset");
      loadUsers(search);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" /> AI Usage Control
        </h2>
        <p className="text-muted-foreground">Set daily credit caps per plan and override individual users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Limits</CardTitle>
          <CardDescription>
            Default daily credits granted to users on each plan. "Save & apply to all" overwrites every existing user on this plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {planLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLAN_ORDER.map((plan) => (
                <div key={plan} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="capitalize font-semibold">{plan}</Label>
                    <Badge variant="outline">daily</Badge>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    value={planLimits[plan] ?? 0}
                    onChange={(e) =>
                      setPlanLimits((s) => ({ ...s, [plan]: Number(e.target.value) || 0 }))
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingPlan === plan}
                      onClick={() => handlePlanSave(plan, false)}
                    >
                      {savingPlan === plan ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      disabled={savingPlan === plan}
                      onClick={() => handlePlanSave(plan, true)}
                    >
                      Save & apply to all
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-User Usage & Overrides</CardTitle>
          <CardDescription>Top 50 users by 24h activity. Override limits or reset usage individually.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadUsers(search)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => loadUsers(search)} variant="outline">
              Search
            </Button>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Used Today</TableHead>
                    <TableHead>Daily Limit</TableHead>
                    <TableHead>24h Reqs</TableHead>
                    <TableHead>Lifetime</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="max-w-[220px]">
                        <div className="text-sm font-medium truncate">{u.email || "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.username || u.user_id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{u.plan || "free"}</Badge>
                      </TableCell>
                      <TableCell>{u.credits_used_today ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-8">{u.max_daily_credits ?? 5}</span>
                          <Input
                            type="number"
                            placeholder="new"
                            className="w-20 h-8"
                            value={editingLimit[u.user_id] ?? ""}
                            onChange={(e) =>
                              setEditingLimit((s) => ({ ...s, [u.user_id]: e.target.value }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!editingLimit[u.user_id]}
                            onClick={() => handleUserLimitSave(u.user_id)}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{u.requests_24h}</TableCell>
                      <TableCell>{u.lifetime_requests}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetUsage(u.user_id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
