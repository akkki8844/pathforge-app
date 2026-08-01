import { useState } from "react";
import { MailCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function EmailVerificationBanner() {
  const { user, isGuest, isEmailVerified, resendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  if (!user || isGuest || isEmailVerified) return null;

  const handleResend = async () => {
    if (cooldown > 0 || sending) return;
    setSending(true);
    const { error } = await resendVerificationEmail();
    setSending(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't send email", description: error.message });
      return;
    }
    toast({
      title: "Verification email sent",
      description: `Check ${user.email}. Click the link inside to secure your account.`,
    });
    setCooldown(45);
    const id = window.setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { window.clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  return (
    <div className="sticky top-16 z-40 border-b border-accent/30 bg-accent/10 text-foreground backdrop-blur supports-[backdrop-filter]:bg-opacity-90">
      <div className="section-container flex flex-col gap-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <MailCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
          <p className="leading-relaxed">
            Verify your email to secure your account and enable password recovery.
            We sent a verification link to <span className="font-medium">{user.email}</span>.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={handleResend} disabled={sending || cooldown > 0} className="shrink-0">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </Button>
      </div>
    </div>
  );
}
