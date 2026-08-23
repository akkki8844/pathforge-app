import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrength } from '@/components/ui/password-strength';
import { PATHFORGE_PASSWORD_RULES } from '@/lib/passwordRules';
import pathforgeLogo from '@/assets/pathforge-logo.webp';

type ResetView = 'verifying' | 'new-password' | 'invalid' | 'success';

export default function ResetPassword() {
  const [view, setView] = useState<ResetView>('verifying');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Two ways the user can land here:
    // 1) Our Pathforge-branded link:  /reset-password?token_hash=...&type=recovery
    //    → exchange via supabase.auth.verifyOtp to establish a recovery session.
    // 2) Default Supabase recovery URL that drops the user here with tokens in
    //    the URL hash → supabase-js (detectSessionInUrl) handles it.
    let cancelled = false;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const token = params.get('token');
      const email = params.get('email');
      const type = params.get('type');

      if (tokenHash && (type === 'recovery' || !type)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (cancelled) return;
        if (error) { setView('invalid'); return; }
        window.history.replaceState({}, '', '/reset-password');
        setView('new-password');
        return;
      }

      if (token && email && (type === 'recovery' || !type)) {
        const { error } = await supabase.auth.verifyOtp({
          token,
          email,
          type: 'recovery',
        });
        if (cancelled) return;
        if (error) { setView('invalid'); return; }
        window.history.replaceState({}, '', '/reset-password');
        setView('new-password');
        return;
      }

      // Fallback: legacy hash-based recovery session (supabase-js parses hash).
      await new Promise((r) => setTimeout(r, 300));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setView(data.session ? 'new-password' : 'invalid');
    };

    run();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        setView('new-password');
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async () => {
    const newErrors: { password?: string; confirm?: string } = {};

    if (newPassword.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Reset failed',
          description: error.message,
        });
      } else {
        setView('success');
        // Send the user straight into their account after a brief confirmation.
        window.setTimeout(() => navigate('/dashboard'), 1200);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card-elevated p-8">
          <div className="text-center mb-8">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-12 mx-auto mb-4" />

            {view === 'verifying' && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Verifying link…</h1>
                <p className="text-muted-foreground mt-2">Just a moment.</p>
              </>
            )}

            {view === 'invalid' && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Link expired</h1>
                <p className="text-muted-foreground mt-2">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </>
            )}

            {view === 'new-password' && (
              <>
                <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
                <p className="text-muted-foreground mt-2">
                  Choose a new password for your Pathforge account.
                </p>
              </>
            )}

            {view === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground">Password updated</h1>
                <p className="text-muted-foreground mt-2">Signing you in…</p>
              </>
            )}
          </div>

          {view === 'verifying' && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {view === 'invalid' && (
            <Button onClick={() => navigate('/auth?view=forgot-password')} className="w-full btn-accent">
              Request a new link
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {view === 'new-password' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
                {/* Same meter and the same rules as sign-up. Someone resetting
                    a password is choosing a new one under exactly the same
                    conditions, and being graded differently on the two screens
                    is worse than not being graded at all. */}
                <PasswordStrength
                  value={newPassword}
                  rules={PATHFORGE_PASSWORD_RULES}
                  showRules={newPassword.length > 0}
                  className="pt-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmNewPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 ${errors.confirm ? 'border-destructive' : ''}`}
                    disabled={loading}
                  />
                </div>
                {errors.confirm && (
                  <p className="text-sm text-destructive">{errors.confirm}</p>
                )}
              </div>

              <Button
                onClick={handleResetPassword}
                className="w-full btn-accent"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
