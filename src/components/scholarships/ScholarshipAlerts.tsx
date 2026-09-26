import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, ExternalLink, Loader2, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Prefs = {
  user_id: string;
  enabled: boolean;
  fields: string[];
  courses: string[];
  country: string | null;
  last_run_at: string | null;
};

type Alert = {
  id: string;
  name: string;
  provider: string | null;
  amount: string | null;
  deadline: string | null;
  url: string;
  summary: string | null;
  match_reason: string | null;
  seen_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);

function fmtDeadline(iso: string | null) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return days >= 0 && days <= 30 ? `${label} (${days}d)` : label;
}

/**
 * Live alerts for new and niche scholarships.
 *
 * The catalogue below this panel is hand-checked and therefore slow to grow.
 * This watches the web for awards that match the student's major, courses and
 * country, and puts each new one here and on the notification bell. It is
 * opt-in, and the student sets exactly what it watches for.
 */
export function ScholarshipAlerts({
  defaultMajor,
  defaultCountry,
}: {
  defaultMajor?: string;
  defaultCountry?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState("");
  const [courses, setCourses] = useState("");
  const [country, setCountry] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [p, a] = await Promise.all([
      supabase.from("scholarship_alert_prefs" as never).select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("scholarship_alerts" as never)
        .select("*")
        .eq("user_id", user.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    // The tables arrive with a migration; until then the panel stays out of
    // the way rather than offering a switch that cannot save.
    if (p.error && /relation|does not exist|schema cache/i.test(p.error.message)) {
      setAvailable(false);
      setLoading(false);
      return;
    }
    setPrefs((p.data as unknown as Prefs) ?? null);
    setAlerts(((a.data ?? []) as unknown as Alert[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // A notification links to /scholarships#alerts; land on the panel once it exists.
  useEffect(() => {
    if (loading || window.location.hash !== "#alerts") return;
    document.getElementById("alerts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  // Opening the page counts as seeing what is on it.
  useEffect(() => {
    if (!user) return;
    const unseen = alerts.filter((a) => !a.seen_at).map((a) => a.id);
    if (!unseen.length) return;
    const t = setTimeout(() => {
      void supabase
        .from("scholarship_alerts" as never)
        .update({ seen_at: new Date().toISOString() } as never)
        .in("id", unseen);
    }, 2500);
    return () => clearTimeout(t);
  }, [alerts, user]);

  const startEditing = () => {
    setFields((prefs?.fields.length ? prefs.fields : [defaultMajor].filter(Boolean)).join(", "));
    setCourses((prefs?.courses ?? []).join(", "));
    setCountry(prefs?.country ?? defaultCountry ?? "");
    setEditing(true);
  };

  const save = async (enabled: boolean) => {
    if (!user) return;
    const row = {
      user_id: user.id,
      enabled,
      fields: splitList(fields),
      courses: splitList(courses),
      country: country.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("scholarship_alert_prefs" as never)
      .upsert(row as never, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    if (error) {
      toast({ variant: "destructive", title: "Couldn't save alerts", description: error.message });
      return;
    }
    setPrefs(data as unknown as Prefs);
    setEditing(false);
    if (enabled) void checkNow(true);
  };

  const toggleOff = async () => {
    if (!user || !prefs) return;
    await supabase
      .from("scholarship_alert_prefs" as never)
      .update({ enabled: false } as never)
      .eq("user_id", user.id);
    setPrefs({ ...prefs, enabled: false });
  };

  const checkNow = async (first = false) => {
    setChecking(true);
    const { data, error } = await supabase.functions.invoke("scholarship-alerts", { body: {} });
    setChecking(false);
    const res = (data ?? {}) as { added?: number; cooldown?: boolean; nextAt?: string; error?: string };
    if (error || res.error) {
      toast({
        variant: "destructive",
        title: "Couldn't check right now",
        description: res.error || "Try again in a few minutes.",
      });
      return;
    }
    if (res.cooldown) {
      const at = res.nextAt ? new Date(res.nextAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "later";
      toast({ title: "Already checked recently", description: `The next manual check opens at ${at}. Daily checks keep running.` });
      return;
    }
    toast({
      title: res.added ? `${res.added} new scholarship${res.added === 1 ? "" : "s"}` : first ? "Alerts are on" : "Nothing new yet",
      description: res.added
        ? "They're below and on your notification bell."
        : "You'll get a notification when a new match appears. We check every day.",
    });
    void load();
  };

  const dismiss = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase
      .from("scholarship_alerts" as never)
      .update({ dismissed_at: new Date().toISOString() } as never)
      .eq("id", id);
  };

  if (!user || !available || loading) return null;

  const on = !!prefs?.enabled;
  const watching = prefs ? [...prefs.fields, ...prefs.courses] : [];

  return (
    <section id="alerts" className="mb-8 scroll-mt-24 rounded-[0.875rem] border border-border bg-card p-5" aria-label="Scholarship alerts">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Live scholarship alerts
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {on
              ? `Watching for new awards in ${watching.join(", ") || "your fields"}${prefs?.country ? `, ${prefs.country}` : ""}. New matches land here and on your bell.`
              : "Get notified when a new or niche scholarship opens that fits your major and courses. We search every day and only alert on awards with their own page and a deadline still ahead."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {on ? (
            <>
              <Button size="sm" variant="outline" onClick={() => void checkNow()} disabled={checking} className="gap-1.5">
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Check now
              </Button>
              <Button size="sm" variant="ghost" onClick={startEditing}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void toggleOff()} className="gap-1.5 text-muted-foreground">
                <BellOff className="h-3.5 w-3.5" /> Turn off
              </Button>
            </>
          ) : (
            !editing && (
              <Button size="sm" onClick={startEditing} className="gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Set up alerts
              </Button>
            )
          )}
        </div>
      </div>

      {editing && (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(true);
          }}
        >
          <label className="text-[12px] font-medium text-muted-foreground">
            Majors or fields
            <Input value={fields} onChange={(e) => setFields(e.target.value)} placeholder="Computer Science, Economics" className="mt-1" />
          </label>
          <label className="text-[12px] font-medium text-muted-foreground">
            Courses you take
            <Input value={courses} onChange={(e) => setCourses(e.target.value)} placeholder="AP Physics, IB Chemistry" className="mt-1" />
          </label>
          <label className="text-[12px] font-medium text-muted-foreground">
            Country or region
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" className="mt-1" />
          </label>
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" size="sm" disabled={!fields.trim() && !courses.trim()}>
              {on ? "Save" : "Turn on alerts"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {on && alerts.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <span
                className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", a.seen_at ? "bg-transparent" : "bg-primary")}
                aria-label={a.seen_at ? undefined : "New"}
              />
              <div className="min-w-0 flex-1">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium hover:underline"
                >
                  {a.name} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {[a.provider, a.amount, fmtDeadline(a.deadline) && `Due ${fmtDeadline(a.deadline)}`]
                    .filter(Boolean)
                    .join(" \u00b7 ")}
                </p>
                {(a.match_reason || a.summary) && (
                  <p className="mt-1 text-[12.5px] leading-relaxed">{a.match_reason || a.summary}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => void dismiss(a.id)}
                aria-label={`Dismiss ${a.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {on && alerts.length === 0 && (
        <p className="mt-4 border-t border-border pt-4 text-[13px] text-muted-foreground">
          No new matches yet. Found awards appear here, and each one sends a notification.
        </p>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Found on the open web and not checked by Pathforge. Confirm eligibility and the deadline on the award's own page.
      </p>
    </section>
  );
}
