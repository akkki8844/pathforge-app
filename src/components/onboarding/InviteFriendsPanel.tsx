import { useEffect, useState } from "react";
import { Copy, Mail, Share2, Loader2, Gem, Users, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Final-step invite panel: shows the student's referral link and explains
 * the reward (you get +1 credit per accepted invite, they get +5).
 */
export function InviteFriendsPanel() {
  const { isGuest } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ invited: number; accepted: number }>({ invited: 0, accepted: 0 });

  useEffect(() => {
    if (isGuest) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const [{ data: codeData }, { data: stat }] = await Promise.all([
        supabase.rpc("get_or_create_referral_code"),
        supabase.rpc("get_my_referral_stats"),
      ]);
      if (!alive) return;
      if (typeof codeData === "string") setCode(codeData);
      if (stat) setStats(stat as any);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [isGuest]);

  // Guests can lose their session before ever creating an account, so a
  // referral link/reward they can't redeem would just be a dead promise —
  // point them at signup instead of generating a code.
  if (isGuest) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-2">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground">Invite friends, earn credits</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create an account to get your personal invite link — <b>+1 credit</b> for every friend
              who signs up, <b>+5 credits</b> for them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inviteUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${code}`
    : "";

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy — long-press the link instead.");
    }
  };

  const share = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Join me on Pathforge", text: "I'm using Pathforge for college prep — get +5 credits on signup.", url: inviteUrl }); } catch {}
    } else copy();
  };

  const mailto = `mailto:?subject=${encodeURIComponent("Join me on Pathforge")}&body=${encodeURIComponent(
    `I'm using Pathforge to plan my college prep. Sign up with my link and you'll get +5 bonus credits free:\n\n${inviteUrl}`
  )}`;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-foreground">Invite friends, earn credits</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <Gem className="h-3 w-3 inline text-sky-500" /> <b>+1 credit</b> for every friend who signs up with your link &middot;
            they get <b>+5 credits</b> instantly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-10 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="h-9 text-xs font-mono" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" size="sm" onClick={copy} className="h-9 gap-1.5 shrink-0">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={share} className="h-8 text-[11px] gap-1.5">
              <Share2 className="h-3 w-3" /> Share
            </Button>
            <a href={mailto} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border bg-background text-[11px] hover:bg-muted">
              <Mail className="h-3 w-3" /> Email
            </a>
            <span className="ml-auto text-[11px] text-muted-foreground self-center">
              {stats.accepted}/{stats.invited} accepted
            </span>
          </div>
        </>
      )}
    </div>
  );
}
