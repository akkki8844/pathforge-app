import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Activity, CircleDollarSign, Crown, Loader2, Pencil, Plus, TicketPercent,
  Trash2, Users,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

/**
 * Coupon administration.
 *
 * Previously this page could create a coupon, flip it on or off, and delete it
 * — nothing else. Three consequences, all of which had bitten:
 *
 *   * The plan dropdown offered "Pro" only, so the Max tier could not be given
 *     away from the UI at all. MAXYMAX had to be inserted by migration.
 *   * There was no edit path. A typo in a duration meant deleting the code and
 *     re-issuing it, orphaning it from its own redemption history.
 *   * Writes went straight to the table through RLS, so nothing enforced the
 *     one invariant `redeem_coupon` actually depends on: a plan grant is only
 *     honoured when BOTH plan_grant and plan_grant_duration_days are set. Half
 *     a plan grant silently degrades to a credits-only coupon.
 *
 * All writes now go through admin_* RPCs which validate server-side; see
 * 20260808120300_admin_coupon_management.sql.
 */

const PLAN_GRANTS = [
  { value: "none", label: "None — credits only" },
  { value: "pro", label: "Pro" },
  { value: "max", label: "Max" },
  { value: "enterprise", label: "Enterprise" },
] as const;

interface CouponRow {
  id: string;
  code: string;
  credits: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  plan_grant: string | null;
  plan_grant_duration_days: number | null;
  redemptions: number;
  credits_distributed: number;
  last_redeemed_at: string | null;
}

interface Redemption {
  code: string;
  credits_granted: number;
  redeemed_at: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  plan_grant: string | null;
  plan_grant_duration_days: number | null;
  current_plan: string | null;
  current_plan_expires_at: string | null;
  pending_plan_grant?: string | null;
}

interface CouponStats {
  totals: {
    coupons_total: number;
    coupons_active: number;
    coupons_expired: number;
    redemptions_total: number;
    credits_distributed: number;
    plans_granted: number;
  };
  per_coupon: CouponRow[];
  recent_redemptions: Redemption[];
}

const BLANK_FORM = {
  id: null as string | null,
  code: "",
  credits: "0",
  expires_at: "",
  usage_limit: "",
  notes: "",
  plan_grant: "none",
  plan_grant_duration_days: "30",
  is_active: true,
};

type CouponForm = typeof BLANK_FORM;

const isExpired = (c: { expires_at: string | null }) =>
  !!c.expires_at && new Date(c.expires_at).getTime() <= Date.now();

/** ISO -> the `YYYY-MM-DDTHH:mm` shape `datetime-local` requires, in local time. */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function personLabel(r: Redemption): string {
  return r.full_name || r.username || r.email || "Unknown user";
}

/** What a coupon actually hands over, in one line. */
function GrantSummary({ c }: { c: Pick<CouponRow, "credits" | "plan_grant" | "plan_grant_duration_days"> }) {
  const parts: string[] = [];
  if (c.credits > 0) parts.push(`${c.credits.toLocaleString()} credits`);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {c.plan_grant && (
        <Badge className="gap-1 capitalize">
          <Crown className="h-3 w-3" />
          {c.plan_grant}
          {c.plan_grant_duration_days ? ` · ${c.plan_grant_duration_days}d` : ""}
        </Badge>
      )}
      {parts.length > 0 && (
        <span className="text-sm text-muted-foreground tabular-nums">{parts.join(" · ")}</span>
      )}
      {!c.plan_grant && parts.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
}

export function AdminCoupons() {
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CouponForm>(BLANK_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CouponRow | null>(null);

  const [redeemersFor, setRedeemersFor] = useState<CouponRow | null>(null);
  const [redeemers, setRedeemers] = useState<Redemption[] | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_coupon_stats" as any);
    if (error) toast.error(error.message);
    else setStats(data as unknown as CouponStats);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setForm(BLANK_FORM);
    setFormOpen(true);
  };

  const openEdit = (c: CouponRow) => {
    setForm({
      id: c.id,
      code: c.code,
      credits: String(c.credits ?? 0),
      expires_at: toDateTimeLocal(c.expires_at),
      usage_limit: c.usage_limit == null ? "" : String(c.usage_limit),
      notes: c.notes ?? "",
      plan_grant: c.plan_grant ?? "none",
      plan_grant_duration_days: c.plan_grant_duration_days == null ? "30" : String(c.plan_grant_duration_days),
      is_active: c.is_active,
    });
    setFormOpen(true);
  };

  const save = async () => {
    const planGrant = form.plan_grant === "none" ? null : form.plan_grant;
    const duration = planGrant ? parseInt(form.plan_grant_duration_days, 10) : null;

    setSaving(true);
    const { data, error } = await supabase.rpc("admin_upsert_coupon" as any, {
      _id: form.id,
      _code: form.code,
      _credits: parseInt(form.credits, 10) || 0,
      _plan_grant: planGrant,
      _plan_grant_duration_days: Number.isNaN(duration as number) ? null : duration,
      _usage_limit: form.usage_limit.trim() === "" ? null : parseInt(form.usage_limit, 10),
      _expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      _notes: form.notes,
      _is_active: form.is_active,
    } as any);
    setSaving(false);

    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Couldn't save the coupon");
      return;
    }
    toast.success(form.id ? "Coupon updated" : "Coupon created");
    setFormOpen(false);
    void load();
  };

  const toggleActive = async (c: CouponRow) => {
    const next = !c.is_active;
    // Optimistic: flip the switch immediately, reload on failure.
    setStats((prev) =>
      prev
        ? {
            ...prev,
            per_coupon: prev.per_coupon.map((row) => (row.id === c.id ? { ...row, is_active: next } : row)),
            totals: { ...prev.totals, coupons_active: prev.totals.coupons_active + (next ? 1 : -1) },
          }
        : prev,
    );
    const { data, error } = await supabase.rpc("admin_set_coupon_active" as any, {
      _id: c.id, _is_active: next,
    } as any);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Couldn't change the coupon");
      void load();
      return;
    }
    toast.success(next ? "Coupon enabled" : "Coupon disabled");
  };

  const remove = async (c: CouponRow) => {
    const { data, error } = await supabase.rpc("admin_delete_coupon" as any, { _id: c.id } as any);
    const res = data as { success?: boolean; error?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Couldn't delete the coupon");
      return;
    }
    toast.success(`${c.code} deleted`);
    setDeleteTarget(null);
    void load();
  };

  const openRedeemers = async (c: CouponRow) => {
    setRedeemersFor(c);
    setRedeemers(null);
    const { data, error } = await supabase.rpc("admin_list_coupon_redemptions" as any, {
      _code: c.code, _limit: 500,
    } as any);
    if (error) {
      toast.error(error.message);
      setRedeemers([]);
      return;
    }
    setRedeemers((data as unknown as Redemption[]) || []);
  };

  const totalCards = useMemo(
    () =>
      stats
        ? [
            { label: "Total coupons", value: stats.totals.coupons_total, icon: TicketPercent },
            { label: "Active", value: stats.totals.coupons_active, icon: Activity },
            { label: "Redemptions", value: stats.totals.redemptions_total, icon: Users },
            { label: "Credits given", value: stats.totals.credits_distributed, icon: CircleDollarSign },
            { label: "Plans granted", value: stats.totals.plans_granted ?? 0, icon: Crown },
          ]
        : [],
    [stats],
  );

  const planGrantSelected = form.plan_grant !== "none";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <TicketPercent className="h-6 w-6 text-primary" /> Coupon management
          </h2>
          <p className="text-sm text-muted-foreground">
            Issue credits or a plan tier, edit a live code in place, and see exactly who redeemed what.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New coupon
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {totalCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <div className="mb-1 flex items-center gap-2">
                <c.icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-foreground">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All coupons</CardTitle>
          <CardDescription>
            A plan grant needs both a tier and a duration — the server rejects half of one, because
            `redeem_coupon` would otherwise ignore it and hand over credits only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !stats || stats.per_coupon.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No coupons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Grants</TableHead>
                    <TableHead>Used / limit</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.per_coupon.map((c) => {
                    const expired = isExpired(c);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono font-medium">
                          {c.code}
                          {c.notes && (
                            <span className="mt-0.5 block max-w-[22ch] truncate font-sans text-[11px] font-normal text-muted-foreground">
                              {c.notes}
                            </span>
                          )}
                        </TableCell>
                        <TableCell><GrantSummary c={c} /></TableCell>
                        <TableCell className="tabular-nums">
                          <button
                            type="button"
                            onClick={() => void openRedeemers(c)}
                            className="underline-offset-2 hover:underline"
                            title="See who redeemed this code"
                          >
                            {c.redemptions} / {c.usage_limit ?? "∞"}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
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
                          <div className="flex items-center justify-end gap-1">
                            <Switch
                              checked={c.is_active}
                              onCheckedChange={() => void toggleActive(c)}
                              disabled={expired}
                              aria-label={`${c.is_active ? "Disable" : "Enable"} ${c.code}`}
                            />
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label={`Edit ${c.code}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} aria-label={`Delete ${c.code}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent redemptions</CardTitle>
          <CardDescription>
            The 50 most recent, with the plan each redeemer is on now — the quickest way to confirm a
            code actually landed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !stats || stats.recent_redemptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No redemptions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead>Plan now</TableHead>
                    <TableHead>Redeemed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_redemptions.map((r, i) => (
                    <TableRow key={`${r.code}-${r.redeemed_at}-${i}`}>
                      <TableCell className="text-sm">
                        {personLabel(r)}
                        {r.email && r.email !== personLabel(r) && (
                          <span className="block text-[11px] text-muted-foreground">{r.email}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{r.code}</TableCell>
                      <TableCell className="text-sm">
                        <GrantSummary
                          c={{
                            credits: r.credits_granted,
                            plan_grant: r.plan_grant,
                            plan_grant_duration_days: r.plan_grant_duration_days,
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {r.current_plan ?? "free"}
                        {r.current_plan_expires_at && (
                          <span className="block text-[11px] text-muted-foreground">
                            to {format(new Date(r.current_plan_expires_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.redeemed_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / edit ----------------------------------------------------- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? `Edit ${form.code}` : "Create coupon"}</DialogTitle>
            <DialogDescription>
              {form.id
                ? "Changes apply to future redemptions. Credits and plans already handed out are untouched."
                : "Codes are normalised to upper case. A coupon must grant credits, a plan, or both."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="LAUNCH50"
                className="font-mono uppercase tracking-wider"
              />
            </div>

            <div>
              <Label htmlFor="coupon-credits">Bonus credits</Label>
              <Input
                id="coupon-credits"
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                One-off credits added on top of the plan allowance. Leave at 0 for a plan-only code.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Crown className="h-4 w-4" /> Plan grant (optional)
              </div>
              <div>
                <Label>Tier</Label>
                <Select value={form.plan_grant} onValueChange={(v) => setForm({ ...form, plan_grant: v })}>
                  <SelectTrigger aria-label="Plan to grant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_GRANTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {planGrantSelected && (
                <div>
                  <Label htmlFor="coupon-duration">Duration (days)</Label>
                  <Input
                    id="coupon-duration"
                    type="number"
                    min={1}
                    value={form.plan_grant_duration_days}
                    onChange={(e) => setForm({ ...form, plan_grant_duration_days: e.target.value })}
                    placeholder="30"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    The plan activates the moment the code is redeemed and runs for this many days.
                    A code that would lower someone's tier is ignored rather than applied.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="coupon-expiry">Expiry (optional)</Label>
                <Input
                  id="coupon-expiry"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="coupon-limit">Usage limit</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={1}
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  placeholder="Blank = unlimited"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="coupon-notes">Notes</Label>
              <Input
                id="coupon-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="What this code is for, internal only"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-[11px] text-muted-foreground">Inactive codes are rejected at redemption.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                aria-label="Coupon active"
              />
            </div>

            <Button className="w-full" onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create coupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeemers --------------------------------------------------------- */}
      <Dialog open={!!redeemersFor} onOpenChange={(o) => { if (!o) { setRedeemersFor(null); setRedeemers(null); } }}>
        <DialogContent className="max-h-[85svh] max-w-[61rem] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{redeemersFor?.code}</DialogTitle>
            <DialogDescription>
              Everyone who has redeemed this code, and the plan they are on now.
            </DialogDescription>
          </DialogHeader>

          {redeemers === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : redeemers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nobody has used this code yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {redeemers.map((r, i) => (
                <div key={`${r.redeemed_at}-${i}`} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{personLabel(r)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.email} · {format(new Date(r.redeemed_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm capitalize text-foreground">{r.current_plan ?? "free"}</p>
                    {r.pending_plan_grant && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        unclaimed {r.pending_plan_grant}
                      </p>
                    )}
                    {r.credits_granted > 0 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">+{r.credits_granted} credits</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              The code stops working immediately. Past redemptions, granted credits and active plans are
              kept — if you only want to stop new redemptions, disable it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && void remove(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
