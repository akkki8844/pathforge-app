import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, TicketPercent, Trash2, CircleDollarSign, Activity, Users, Crown } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


interface Coupon {
  id: string;
  code: string;
  credits: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

interface CouponWithStats extends Coupon {
  redemptions: number;
  credits_distributed: number;
}

interface CouponStats {
  totals: {
    coupons_total: number;
    coupons_active: number;
    coupons_expired: number;
    redemptions_total: number;
    credits_distributed: number;
  };
  per_coupon: CouponWithStats[];
  recent_redemptions: { code: string; credits_granted: number; redeemed_at: string; email: string | null }[];
}

const isExpired = (c: { expires_at: string | null }) =>
  !!c.expires_at && new Date(c.expires_at).getTime() <= Date.now();

export function AdminCoupons() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    credits: "100",
    expires_at: "",
    usage_limit: "",
    notes: "",
    plan_grant: "none",
    plan_grant_duration_days: "30",
  });


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_coupon_stats" as any);
    if (error) toast.error(error.message);
    else setStats(data as unknown as CouponStats);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!user) return;
    const code = form.code.trim().toUpperCase();
    const credits = parseInt(form.credits, 10) || 0;
    const planGrant = form.plan_grant === "none" ? null : form.plan_grant;
    const planDuration =
      planGrant && form.plan_grant_duration_days
        ? parseInt(form.plan_grant_duration_days, 10)
        : null;

    if (!code) {
      toast.error("Code is required");
      return;
    }
    if (!planGrant && credits <= 0) {
      toast.error("Add credits or a plan grant");
      return;
    }
    if (planGrant && (!planDuration || planDuration <= 0)) {
      toast.error("Plan grant duration must be at least 1 day");
      return;
    }

    const { error } = await supabase.from("coupons").insert({
      code,
      credits,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
      notes: form.notes || null,
      created_by: user.id,
      is_active: true,
      plan_grant: planGrant,
      plan_grant_duration_days: planDuration,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Coupon created");
    setOpen(false);
    setForm({ code: "", credits: "100", expires_at: "", usage_limit: "", notes: "", plan_grant: "none", plan_grant_duration_days: "30" });
    load();
  };


  const toggleActive = async (c: CouponWithStats) => {
    const newValue = !c.is_active;
    // Optimistic UI: flip the switch immediately, roll back on failure.
    setStats((prev) =>
      prev
        ? {
            ...prev,
            per_coupon: prev.per_coupon.map((row) =>
              row.id === c.id ? { ...row, is_active: newValue } : row,
            ),
            totals: {
              ...prev.totals,
              coupons_active: prev.totals.coupons_active + (newValue ? 1 : -1),
            },
          }
        : prev,
    );
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: newValue })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      load();
      return;
    }
    toast.success(newValue ? "Coupon enabled" : "Coupon disabled");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setDeleteId(null);
      load();
    }
  };

  const totalCards = stats
    ? [
        { label: "Total Coupons", value: stats.totals.coupons_total, icon: TicketPercent },
        { label: "Active", value: stats.totals.coupons_active, icon: Activity },
        { label: "Redemptions", value: stats.totals.redemptions_total, icon: Users },
        { label: "Credits Distributed", value: stats.totals.credits_distributed, icon: CircleDollarSign },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <TicketPercent className="h-6 w-6 text-primary" /> Coupon Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Create coupons, monitor usage, and see who redeemed what.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="LAUNCH50"
                />
              </div>
              <div>
                <Label>Credits granted</Label>
                <Input
                  type="number"
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Crown className="h-4 w-4" /> Plan upgrade (optional)
                </div>
                <div>
                  <Label>Grant plan</Label>
                  <Select
                    value={form.plan_grant}
                    onValueChange={(v) => setForm({ ...form, plan_grant: v })}
                  >
                    <SelectTrigger aria-label="Plan to grant">
                      <SelectValue placeholder="None — credits only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — credits only</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.plan_grant !== "none" && (
                  <div>
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.plan_grant_duration_days}
                      onChange={(e) => setForm({ ...form, plan_grant_duration_days: e.target.value })}
                      placeholder="30"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Redeemer gets {form.plan_grant} plan access for this many days.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label>Expiry (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>

              <div>
                <Label>Usage limit (blank = unlimited)</Label>
                <Input
                  type="number"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={create}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {totalCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>Toggle active state, monitor usage, or delete unused codes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !stats || stats.per_coupon.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No coupons yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Used / Limit</TableHead>
                  <TableHead>Distributed</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.per_coupon.map((c) => {
                  const expired = isExpired(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.credits}</TableCell>
                      <TableCell className="tabular-nums">
                        {c.redemptions} / {c.usage_limit ?? "∞"}
                      </TableCell>
                      <TableCell className="tabular-nums">{c.credits_distributed}</TableCell>
                      <TableCell>
                        {c.expires_at ? format(new Date(c.expires_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="outline" className="text-muted-foreground">Expired</Badge>
                        ) : c.is_active ? (
                          <Badge>Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => toggleActive(c)}
                          disabled={expired}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Recent redemptions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Redemptions</CardTitle>
          <CardDescription>The 25 most recent coupon redemptions across the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !stats || stats.recent_redemptions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No redemptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Redeemed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_redemptions.map((r, i) => (
                  <TableRow key={`${r.code}-${r.redeemed_at}-${i}`}>
                    <TableCell className="text-sm">{r.email || "Unknown user"}</TableCell>
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell>{r.credits_granted}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.redeemed_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the code so no one can redeem it again. Past redemptions and granted credits are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && remove(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
