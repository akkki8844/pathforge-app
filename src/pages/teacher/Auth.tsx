import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import SpecularButtonBase from '@/components/ui/specular/SpecularButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import pathforgeLogo from '@/assets/pathforge-logo.webp';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { GitHubSignInButton } from '@/components/auth/GitHubSignInButton';
import { CounsellorRail } from '@/components/auth/CounsellorRail';
import { Seo } from '@/components/Seo';

const SpecularButton = motion.create(SpecularButtonBase);

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
    title: 'Counsellor sign in — Pathforge',
    description:
      'Sign in to the Pathforge counsellor workspace: your cohort ranked by who needs attention, meetings and follow-ups, essay and application review, and cohort analytics.',
  },
  'forgot-password': {
    title: 'Reset your counsellor password — Pathforge',
    description:
      'Forgotten the password on your Pathforge counsellor account? Enter your school email and we will send a verification code.',
  },
};

const EASE = [0.16, 1, 0.3, 1] as const;

const formFieldVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { delay: 0.08 + i * 0.06, duration: 0.35, ease: EASE },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

/**
 * Dedicated counsellor sign-in page.
 *
 * Deliberately the same page as the student sign-in — same two-column shell,
 * same card, same OAuth-first order, same motion, same footer — because a
 * counsellor arriving from a school email should not land on something that
 * looks like a lesser copy of the product. What differs is only what has to:
 * the left column states what the workspace contains rather than running
 * student reviews, and there is no sign-up.
 *
 * Counsellor accounts are provisioned ONLY by admins (or by email invite).
 * Counsellors who try to sign up are directed to their school admin, and a
 * non-counsellor who signs in here is signed back out rather than let
 * through.
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
      ? 'Forgot password'
      : 'Counsellor sign in';

  const subheading = signedInAsNonCounsellor
    ? 'The counsellor portal needs a counsellor account. Sign out to sign in as a counsellor, or head back to your student workspace.'
    : isForgot
      ? "Enter your counsellor email and we'll send you a verification code."
      : 'Sign in to your counsellor workspace.';

  const provisioningNote = (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Need a counsellor account?</p>
      <p>
        Counsellor accounts are provisioned by your school administrator. Please contact your
        admin or email{' '}
        <a href="mailto:support@pathforge.co.in" className="text-accent hover:underline">
          support@pathforge.co.in
        </a>
        {' '}to request access.
      </p>
    </div>
  );

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-background p-4">
      <Seo
        title={AUTH_SEO[view].title}
        description={AUTH_SEO[view].description}
        path={view === 'signin' ? '/teacher/auth' : `/teacher/auth?view=${view}`}
        // A signed-out counsellor hitting a gated /teacher route is bounced
        // here with ?redirect=, which would otherwise produce a thin
        // near-duplicate page per route.
        noindex={searchParams.has('redirect')}
      />
      {/* Two columns on desktop: what the workspace holds on the left, the
          form pinned right. Below lg the left column drops out entirely — on a
          phone the only thing worth showing above the fold is the form. */}
      <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:flex lg:justify-start">
          <CounsellorRail />
        </div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
        >
          <div className="card-elevated p-8">
            <motion.div
              className="mb-8 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <motion.img
                src={pathforgeLogo}
                alt="Pathforge logo"
                className="mx-auto mb-4 h-12"
                initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              />
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <Users className="h-3.5 w-3.5" /> Counsellor portal
              </div>
              <AnimatePresence mode="wait">
                <motion.h1
                  key={heading}
                  className="text-2xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {heading}
                </motion.h1>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${heading}-sub`}
                  className="mt-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  {subheading}
                </motion.p>
              </AnimatePresence>
            </motion.div>

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
                <div className="mt-4">{provisioningNote}</div>
              </div>
            ) : isForgot ? (
              <motion.form
                onSubmit={handleForgotPassword}
                className="space-y-4"
                initial="hidden"
                animate="visible"
              >
                <motion.div className="space-y-2" variants={formFieldVariants} custom={0}>
                  <Label htmlFor="forgotEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  <AnimatePresence>
                    {errors.email && (
                      <motion.p
                        initial={{ opacity: 0, y: -4, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -4, height: 0 }}
                        className="text-sm text-destructive"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div variants={formFieldVariants} custom={1}>
                  <Button type="submit" className="w-full btn-accent" disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>Send verification code <KeyRound className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </motion.div>

                <motion.div variants={formFieldVariants} custom={2}>
                  <button
                    type="button"
                    onClick={() => { setView('signin'); setErrors({}); }}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back to sign in
                  </button>
                </motion.div>
              </motion.form>
            ) : (
              <>
                {/* OAuth first, in the same order as the student page: most
                    counsellors already have a school Google account, and
                    burying that under five fields is what makes a portal feel
                    like an intranet. */}
                <motion.div
                  className="space-y-2.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
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
                </motion.div>

                <motion.div
                  className="relative my-5"
                  initial={{ opacity: 0, scaleX: 0.3 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
                >
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-3 uppercase tracking-wider text-muted-foreground">
                      or use email
                    </span>
                  </div>
                </motion.div>

                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  autoComplete="on"
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div className="space-y-2" variants={formFieldVariants} custom={0}>
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
                        className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                        disabled={loading}
                      />
                    </div>
                    <AnimatePresence>
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.email}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div className="space-y-2" variants={formFieldVariants} custom={1}>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <motion.button
                        type="button"
                        onClick={() => { setView('forgot-password'); setErrors({}); }}
                        className="text-xs text-accent hover:underline"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Forgot password?
                      </motion.button>
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
                    <AnimatePresence>
                      {errors.password && (
                        <motion.p
                          initial={{ opacity: 0, y: -4, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -4, height: 0 }}
                          className="text-sm text-destructive"
                        >
                          {errors.password}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div className="flex items-center space-x-2" variants={formFieldVariants} custom={2}>
                    <Checkbox
                      id="stayLoggedIn"
                      checked={stayLoggedIn}
                      onCheckedChange={(checked) => setStayLoggedIn(checked === true)}
                    />
                    <Label htmlFor="stayLoggedIn" className="cursor-pointer text-sm text-muted-foreground">
                      Stay logged in
                    </Label>
                  </motion.div>

                  <motion.div variants={formFieldVariants} custom={3}>
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
                      whileTap={{ scale: 0.985 }}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>Sign in <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </SpecularButton>
                  </motion.div>
                </motion.form>

                <div className="mt-6">{provisioningNote}</div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Are you a student?{' '}
                  <Link to="/auth" className="font-medium text-accent hover:underline">
                    Student sign in
                  </Link>
                </p>
              </>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to Pathforge's{' '}
            <Link to="/terms" className="underline hover:text-accent">Terms</Link>,{' '}
            <Link to="/privacy" className="underline hover:text-accent">Privacy</Link>, and{' '}
            <Link to="/refund-policy" className="underline hover:text-accent">Refund Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
