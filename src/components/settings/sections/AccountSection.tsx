import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, KeyRound, Trash2, AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";

export function AccountSection() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [updating, setUpdating] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const updatePassword = async () => {
    if (pwd.length < 8) return toast({ variant: "destructive", title: "Password too short", description: "Use at least 8 characters." });
    if (pwd !== pwd2) return toast({ variant: "destructive", title: "Passwords don't match" });
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setUpdating(false);
    if (error) return toast({ variant: "destructive", title: "Couldn't update password", description: error.message });
    setPwd(""); setPwd2("");
    toast({ title: "Password updated" });
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) return toast({ variant: "destructive", title: "Email failed", description: error.message });
    toast({ title: "Reset link sent", description: "Check your email." });
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expired");
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Failed");
      }
      toast({ title: "Account deleted" });
      try { await supabase.auth.signOut(); } catch {}
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Couldn't delete account", description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SettingsSection title="Account" description="Email, password, and account-level controls.">
      <SettingsCard title="Email">
        <SettingsRow
          label={user?.email || "—"}
          description="Your sign-in email. Contact support to change it."
        >
          <Mail className="h-4 w-4 text-muted-foreground" />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        title="Password"
        description="Use 8+ characters with a mix of letters, numbers, and symbols."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">New password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm</Label>
            <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={updatePassword} disabled={updating || !pwd}>
            {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Update password
          </Button>
          <Button variant="outline" onClick={sendReset} disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send reset link
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Session">
        <SettingsRow label="Sign out" description="Sign out of this device.">
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </SettingsRow>
      </SettingsCard>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Danger zone</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. All your data — onboarding, applications, journey, and integrations — will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsSection>
  );
}
