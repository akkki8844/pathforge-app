import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GitHubSignInButton } from '@/components/auth/GitHubSignInButton';
import { CounsellorRail } from '@/components/auth/CounsellorRail';
import { AuthShell, AuthHeading, AuthDivider } from '@/components/auth/AuthShell';
import { Seo } from '@/components/Seo';

// Same stricter shape check the student page uses: zod's .email() accepts
// "a@b" with no TLD, which is the address people actually fat-finger.
const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .refine((v) => EMAIL_SHAPE_RE.test(v), 'Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type CounsellorView = 'signin' | 'forgot-password';

// One title and one description per view, so /teacher/auth and the
// ?redirect= copies a gated route produces are not indexed as duplicates of
// each other. Mirrors AUTH_SEO on the student page.
const AUTH_SEO: Record<CounsellorView, { title: string; description: string }> = {
  signin: {
    title: 'Counsellor sign in',
    description:
      'Sign in to the Pathforge counsellor workspace: your cohort ranked by who needs attention, meetings and follow-ups, essay and application review, and cohort analytics.',
  },
  'forgot-password': {
    title: 'Reset your counsellor password',
    description:
      'Forgotten the password on your Pathforge counsellor account? Enter your school email and we will send a verification code.',
  },
};

/**
 * The counsellor sign-in page.
 *
 * A split screen: what the workspace holds on the left, the form on the right,
 * and on a phone only the form. Same shell the student page uses, because a
 * counsellor arriving from a school email should not land on something that
 * looks like a lesser copy of the product.
 *
 * What this page used to be, and no longer is: a card floating in the middle of
 * an empty viewport, with the logo springing in on a rotation, the fields
 * unblurring on a stagger, and the submit button painted with three hardcoded
 * hex values that ignored the theme entirely. All of it decoration in front of
 * eight input events, and on a slow machine the form was unreadable for the
 * first half-second of every visit.
 *
 * The guards are unchanged. Counsellor accounts are provisioned ONLY by admins
 * (or by email invite); counsellors who try to sign up are directed to their
 * school admin, and a non-counsellor who signs in here is signed back out
 * rather than let through.
 */
export default function TeacherAuth() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/teacher';

  const [view, setView] = useState<CounsellorView>('signin');
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
  // A real (non-guest) student is signed in and landed on the counsellor
  // portal. Instead of silently bouncing them home (which reads as a broken
  // link), we show them a clear choice.
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

  const heading = signedInAsNonCounsellor
    ? "You're signed in as a student"
    : isForgot
      ? 'Reset your password'
      : 'Counsellor sign in';

  const subheading = signedInAsNonCounsellor
    ? 'The counsellor portal needs a counsellor account. Sign out to sign in as a counsellor, or head back to your student workspace.'
    : isForgot
      ? "Enter your counsellor email and we'll send you a verification code."
      : 'Use your school account, or the email your administrator set you up with.';

  const provisioningNote = (
    <div className="rounded-xl border border-border bg-card p-4 text-[12.5px] leading-relaxed text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Need a counsellor account?</p>
      <p>
        Counsellor accounts are provisioned by your school administrator. Contact your admin, or
        email{' '}
        <a href="mailto:support@pathforge.co.in" className="text-accent hover:underline">
          support@pathforge.co.in
        </a>
        {' '}to request access.
      </p>
    </div>
  );

  return (
    <>
      <Seo
        title={AUTH_SEO[view].title}
        description={AUTH_SEO[view].description}
        path={view === 'signin' ? '/teacher/auth' : `/teacher/auth?view=${view}`}
        // A signed-out counsellor hitting a gated /teacher route is bounced
        // here with ?redirect=, which would otherwise produce a thin
        // near-duplicate page per route.
        noindex={searchParams.has('redirect')}
      />

      <AuthShell aside={<CounsellorRail />} eyebrow="Counsellor portal">
        <AuthHeading title={heading} sub={subheading} />

        {signedInAsNonCounsellor ? (
          <div className="space-y-3">
            <Button
              type="button"
              className="btn-accent h-11 w-full"
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
              className="h-11 w-full"
              onClick={() => navigate('/journey')}
              disabled={signingOut}
            >
              Back to my student workspace
            </Button>
            <div className="pt-3">{provisioningNote}</div>
          </div>
        ) : isForgot ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="counsellor@school.edu"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`h-11 pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  disabled={forgotLoading}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <Button type="submit" className="btn-accent h-11 w-full" disabled={forgotLoading}>
              {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>Send verification code <KeyRound className="ml-2 h-4 w-4" /></>
              )}
            </Button>

            <button
              type="button"
              onClick={() => { setView('signin'); setErrors({}); }}
              className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
          </form>
        ) : (
          <>
            {/* OAuth first, in the same order as the student page: most
                counsellors already have a school Google account, and burying
                that under five fields is what makes a portal feel like an
                intranet. */}
            <div className="space-y-2.5">
              <GoogleSignInButton
                label="Continue with Google"
                redirectTo={redirectTo}
                className="h-11 text-sm font-medium"
              />
              <GitHubSignInButton
                label="Continue with GitHub"
                redirectTo={redirectTo}
                className="h-11 text-sm font-medium"
              />
            </div>

            <AuthDivider />

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="counsellor@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`h-11 pl-10 ${errors.email ? 'border-destructive' : ''}`}
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
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`h-11 pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
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
                <Label htmlFor="stayLoggedIn" className="cursor-pointer text-sm text-muted-foreground">
                  Stay logged in for two weeks
                </Label>
              </div>

              <Button type="submit" className="btn-accent h-11 w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="mt-6">{provisioningNote}</div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Are you a student?{' '}
              <Link to="/auth" className="font-medium text-accent hover:underline">
                Student sign in
              </Link>
            </p>
          </>
        )}

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to Pathforge's{' '}
          <Link to="/terms" className="underline hover:text-accent">Terms</Link>,{' '}
          <Link to="/privacy" className="underline hover:text-accent">Privacy</Link>, and{' '}
          <Link to="/refund-policy" className="underline hover:text-accent">Refund Policy</Link>.
        </p>
      </AuthShell>
    </>
  );
}
