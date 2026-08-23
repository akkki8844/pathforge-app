import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import SpecularButton from '@/components/ui/specular/SpecularButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import pathforgeLogo from '@/assets/pathforge-logo.webp';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Seo } from '@/components/Seo';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

/**
 * Dedicated counsellor sign-in page.
 *
 * Counsellor accounts are provisioned ONLY by admins (or via email invite).
 * There is no public sign-up here — counsellors who try to sign up are directed
 * to contact their school admin.
 */
export default function TeacherAuth() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/teacher';

  const [view, setView] = useState<'signin' | 'forgot-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signIn, signOut, user, isTeacher, isAdmin, isGuest, roleLoading, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);
  // A real (non-guest) student is signed in and landed on the counsellor portal.
  // Instead of silently bouncing them home (which reads as a broken link), we
  // show them a clear choice.
  const signedInAsNonCounsellor =
    !authLoading && !roleLoading && !!user && !isGuest && !isTeacher && !isAdmin;

  // Route authenticated counsellors/admins straight through. Students are NOT
  // auto-redirected — they get the interstitial below.
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) return;
    if (isAdmin) navigate('/admin', { replace: true });
    else if (isTeacher) navigate(redirectTo, { replace: true });
  }, [user, isAdmin, isTeacher, authLoading, roleLoading, navigate, redirectTo]);

  const handleSignOutToContinue = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }
    try { passwordSchema.parse(password); } catch (e) {
      if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const { error, isAdmin: admin, isTeacher: teacher } = await signIn(email, password, stayLoggedIn);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Sign in failed',
          description: error.message.includes('Invalid login credentials')
            ? 'Invalid email or password. Please try again.'
            : error.message,
        });
        return;
      }
      // Block non-counsellor accounts from this entry point.
      if (!teacher && !admin) {
        await supabase.auth.signOut();
        toast({
          variant: 'destructive',
          title: 'Not a counsellor account',
          description: 'This sign-in is for counsellors only. Students should use the main sign-in page.',
        });
        return;
      }
      toast({
        title: 'Welcome back!',
        description: stayLoggedIn ? "You'll stay signed in for 2 weeks." : 'Signed in successfully.',
      });
      if (admin) navigate('/admin', { replace: true });
      else navigate(redirectTo, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(forgotEmail); } catch {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }
    setForgotLoading(true);
    setErrors({});
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Code sent!', description: 'Check your email for a verification code from Pathforge.' });
        navigate(`/reset-password?email=${encodeURIComponent(forgotEmail)}`);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const isForgot = view === 'forgot-password';

  return (
    <div className="min-h-[100svh] bg-background flex items-center justify-center p-4">
      <Seo
        title="Counsellor Sign In — Pathforge"
        description="Sign in to the Pathforge counsellor portal to support your students with cohort tracking, action plans, and outcomes insights."
        path="/teacher/auth"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="card-elevated p-8">
          <div className="text-center mb-8">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-12 mx-auto mb-4" />
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-medium mb-3">
              <Users className="h-3.5 w-3.5" /> Counsellor Portal
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {signedInAsNonCounsellor
                ? "You're signed in as a student"
                : isForgot ? 'Forgot Password' : 'Counsellor Sign In'}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {signedInAsNonCounsellor
                ? 'The counsellor portal needs a counsellor account. Sign out to sign in as a counsellor, or head back to your student workspace.'
                : isForgot
                ? "Enter your counsellor email and we'll send you a verification code."
                : 'Sign in to your counsellor workspace.'}
            </p>
          </div>

          {signedInAsNonCounsellor ? (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full btn-accent"
                onClick={handleSignOutToContinue}
                disabled={signingOut}
              >
                {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Sign out &amp; continue as counsellor <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/journey')}
                disabled={signingOut}
              >
                Back to my student workspace
              </Button>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Need a counsellor account?</p>
                <p>
                  Counsellor accounts are provisioned by your school administrator. Email{' '}
                  <a href="mailto:support@pathforge.co.in" className="text-accent hover:underline">
                    support@pathforge.co.in
                  </a>{' '}to request access.
                </p>
              </div>
            </div>
          ) : isForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="counsellor@school.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={forgotLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <Button type="submit" className="w-full btn-accent" disabled={forgotLoading}>
                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Send Verification Code <KeyRound className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setView('signin'); setErrors({}); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="counsellor@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setView('forgot-password'); setErrors({}); }}
                      className="text-xs text-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stayLoggedIn"
                    checked={stayLoggedIn}
                    onCheckedChange={(checked) => setStayLoggedIn(checked === true)}
                  />
                  <Label htmlFor="stayLoggedIn" className="text-sm text-muted-foreground cursor-pointer">
                    Stay logged in
                  </Label>
                </div>

                <SpecularButton
                  type="submit"
                  size="md"
                  radius={10}
                  tint="#4465d8"
                  tintOpacity={1}
                  textColor="#ffffff"
                  lineColor="#ffffff"
                  baseColor="#29439c"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </SpecularButton>
              </form>

              {/* Google sign-in for counsellors */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">or continue with</span>
                </div>
              </div>
              <GoogleSignInButton redirectTo={redirectTo || '/teacher'} />


              <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Need a counsellor account?</p>
                <p>
                  Counsellor accounts are provisioned by your school administrator. Please contact your
                  admin or email{' '}
                  <a href="mailto:support@pathforge.co.in" className="text-accent hover:underline">
                    support@pathforge.co.in
                  </a>
                  {' '}to request access.
                </p>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Are you a student?{' '}
                <Link to="/auth" className="text-accent hover:underline font-medium">
                  Student sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to Pathforge's{' '}
          <Link to="/terms" className="underline hover:text-accent">Terms</Link>,{' '}
          <Link to="/privacy" className="underline hover:text-accent">Privacy</Link>, and{' '}
          <Link to="/refund-policy" className="underline hover:text-accent">Refund Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}
