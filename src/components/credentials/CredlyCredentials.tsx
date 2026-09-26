import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CredlyMark } from "@/components/icons/CredlyMark";
import { cn } from "@/lib/utils";

export type CredentialCategory = "competition" | "test" | "certification" | "course" | "other";

export interface VerifiedCredential {
  id: string;
  external_id: string;
  badge_url: string;
  name: string;
  description: string | null;
  image_url: string | null;
  issuer_name: string | null;
  issuer_url: string | null;
  skills: string[];
  issued_on: string | null;
  expires_on: string | null;
  earner_name: string | null;
  recipient_email_match: boolean;
  recipient_name_match: boolean;
  revoked: boolean;
  category: CredentialCategory;
  verified_at: string;
}

const CATEGORY_LABEL: Record<CredentialCategory, string> = {
  competition: "Olympiad or competition",
  test: "Test score",
  certification: "Certification",
  course: "Course",
  other: "Other",
};

export { CredlyMark };

/** Loads the signed-in student's verified credentials. */
export function useVerifiedCredentials() {
  const { user } = useAuth();
  const [rows, setRows] = useState<VerifiedCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("verified_credentials" as never)
      .select("*")
      .eq("user_id", user.id)
      .order("issued_on", { ascending: false, nullsFirst: false });
    // Before the migration lands the table is missing; that reads as "none yet".
    setRows(error ? [] : ((data ?? []) as unknown as VerifiedCredential[]));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, reload, setRows };
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * Who Credly says holds the badge, relative to this account.
 *
 * "Verified" alone means only that Credly holds the badge and the issuer has
 * not revoked it. Whether it is this student's is a separate claim, made from
 * the hashed recipient email or the earner name, and said separately.
 */
function Ownership({ c }: { c: VerifiedCredential }) {
  if (c.revoked) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> Revoked by the issuer
      </span>
    );
  }
  const expired = c.expires_on && new Date(c.expires_on) < new Date();
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
        <BadgeCheck className="h-3.5 w-3.5" /> Verified on Credly
      </span>
      {c.recipient_email_match || c.recipient_name_match ? (
        <span className="text-muted-foreground">Issued to you</span>
      ) : c.earner_name ? (
        <span className="text-amber-700 dark:text-amber-400">Issued to {c.earner_name}</span>
      ) : (
        <span className="text-muted-foreground">Recipient not confirmed</span>
      )}
      {expired && <span className="text-amber-700 dark:text-amber-400">Expired</span>}
    </span>
  );
}

function CredentialCard({
  c,
  onCategory,
  onRemove,
}: {
  c: VerifiedCredential;
  onCategory: (category: CredentialCategory) => void;
  onRemove: () => void;
}) {
  const issued = formatDate(c.issued_on);
  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {c.image_url ? (
          <img src={c.image_url} alt="" width={64} height={64} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <CredlyMark className="h-6 w-12" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-snug">{c.name}</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {c.issuer_name ?? "Unknown issuer"}
              {issued && <> &middot; {issued}</>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Open on Credly">
              <a href={c.badge_url} target="_blank" rel="noreferrer" aria-label={`Open ${c.name} on Credly`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label={`Remove ${c.name}`}
              title="Remove from your file"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <Ownership c={c} />
          <Select value={c.category} onValueChange={(v) => onCategory(v as CredentialCategory)}>
            <SelectTrigger className="h-8 w-auto gap-2 text-[12px]" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_LABEL) as CredentialCategory[]).map((k) => (
                <SelectItem key={k} value={k} className="text-[13px]">
                  {CATEGORY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </article>
  );
}

export function AddFromCredlyDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProfile = /credly\.com\/users\//i.test(link);

  const submit = async () => {
    const value = link.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("credly-verify", {
      body: isProfile ? { profileUrl: value } : { badgeUrl: value },
    });
    setBusy(false);
    const payload = (data ?? {}) as { saved?: number; error?: string; failed?: unknown[] };
    if (fnError || payload.error) {
      let message = payload.error;
      const ctx = (fnError as { context?: Response } | null)?.context;
      if (!message && ctx && typeof ctx.json === "function") {
        message = await ctx
          .json()
          .then((b: { error?: string }) => b?.error)
          .catch(() => undefined);
      }
      setError(message || "Credly could not be reached. Try again in a minute.");
      return;
    }
    const n = payload.saved ?? 0;
    toast({
      title: n === 1 ? "Badge verified" : `${n} badges verified`,
      description: "Checked against Credly and added to your file.",
    });
    setLink("");
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add verified badges from <CredlyMark className="h-6 w-12" />
          </DialogTitle>
          <DialogDescription>
            Paste a badge link to add one badge, or your Credly profile link to add every public badge on it. Each one
            is checked with Credly before it goes on your file.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.credly.com/badges/... or /users/..."
            inputMode="url"
            aria-label="Credly badge or profile link"
          />
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <details className="rounded-lg bg-muted/60 p-3 text-[13px] text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">Where do I find the link?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Sign in at credly.com and open the badge.</li>
              <li>Press Share, then copy the public link.</li>
              <li>For all badges at once, copy your profile link from Settings &gt; Profile. The profile must be public.</li>
            </ol>
          </details>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !link.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProfile ? "Verify profile" : "Verify badge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A student's Credly badges, filtered to one part of the file.
 *
 * Used on Activities (olympiads and competitions) and Test Prep (test scores).
 * `categories` narrows what is listed; everything a student links is kept, so a
 * badge added from one page shows up on the other once it is re-categorised.
 */
export function CredlyCredentials({
  categories,
  title,
  description,
  emptyText,
  className,
}: {
  categories?: CredentialCategory[];
  title: string;
  description: string;
  emptyText: string;
  className?: string;
}) {
  const { rows, loading, reload, setRows } = useVerifiedCredentials();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const shown = useMemo(
    () => (categories ? rows.filter((r) => categories.includes(r.category)) : rows),
    [rows, categories],
  );

  const setCategory = async (id: string, category: CredentialCategory) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, category } : r)));
    const { error } = await supabase
      .from("verified_credentials" as never)
      .update({ category } as never)
      .eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't save that", description: error.message });
      void reload();
    }
  };

  const remove = async (id: string) => {
    const before = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("verified_credentials" as never).delete().eq("id", id);
    if (error) {
      setRows(before);
      toast({ variant: "destructive", title: "Couldn't remove that", description: error.message });
    }
  };

  return (
    <section className={cn("space-y-4", className)} aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <CredlyMark /> {title}
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setAdding(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add from Credly
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your badges
        </div>
      ) : shown.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((c) => (
            <CredentialCard
              key={c.id}
              c={c}
              onCategory={(cat) => void setCategory(c.id, cat)}
              onRemove={() => void remove(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      )}

      <AddFromCredlyDialog open={adding} onOpenChange={setAdding} onAdded={() => void reload()} />
    </section>
  );
}
