import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, KeyRound, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrength } from '@/components/ui/password-strength';
import { PATHFORGE_PASSWORD_RULES } from '@/lib/passwordRules';
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
import { ReviewsRail } from '@/components/auth/ReviewsRail';
import { Seo } from '@/components/Seo';

const SpecularButton = motion.create(SpecularButtonBase);

// zod's built-in .email() is deliberately permissive (accepts things like
// "a@b" with no TLD). A stricter shape check on top catches the obviously-
// invalid addresses people fat-finger at signup without rejecting real ones.
const EMAIL_SHAPE_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
// Common disposable/throwaway-inbox domains. Not exhaustive — that needs a
// live API — but it stops the casual "sign up with a burner" case, which is
// most of what actually happens here.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'yopmail.com', 'yopmail.net',
  'throwawaymail.com', 'trashmail.com', 'trashmail.net', 'getnada.com', 'fakeinbox.com',
  'sharklasers.com', 'dispostable.com', 'maildrop.cc', 'discard.email', 'mintemail.com',
  'moakt.com', 'mailnesia.com', 'mailcatch.com', 'spamgourmet.com', 'tempinbox.com',
  'emailondeck.com', 'fakemailgenerator.com', 'mohmal.com', 'mytemp.email',
  'burnermail.io', 'tempr.email', 'inboxkitten.com', 'crazymailing.com',
]);

const emailSchema = z.string()
  .email('Please enter a valid email address')
  .refine((v) => EMAIL_SHAPE_RE.test(v), 'Please enter a valid email address')
  .refine(
    (v) => !DISPOSABLE_EMAIL_DOMAINS.has(v.split('@')[1]?.toLowerCase() ?? ''),
    'Temporary/disposable email addresses aren\'t supported — please use a real inbox.'
  );
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const PASSWORD_HINT = 'At least 6 characters. Letters, numbers, or symbols — your choice.';

type AuthView = 'signup' | 'signin' | 'forgot-password';

// One title AND one description per view. All three views used to share a
// single description, so /auth, /auth?view=signup and every gated route that
// bounces a guest here presented identical metadata — which is what a crawler
// reads as duplicate pages. Each string below describes only what that
// particular screen actually does.
const AUTH_SEO: Record<AuthView, { title: string; description: string }> = {
  signin: {
    title: 'Sign in to Pathforge',
    description:
      'Sign in to your Pathforge account to pick up your college journey — your activities, essays, target list and admissions estimates are where you left them.',
  },
  signup: {
    title: 'Sign up — Pathforge',
    description:
      'Create a free Pathforge account in under a minute. Three AI credits a day, forever, with no card required — build your activity plan, refine essays and estimate your admissions odds.',
  },
  'forgot-password': {
    title: 'Reset your Pathforge password',
    description:
      'Forgotten your Pathforge password? Enter the email on your account and we will send you a secure link to choose a new one.',
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
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE },
  },
};

const viewTransition = {
  initial: { opacity: 0, x: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: EASE } },
  exit: { opacity: 0, x: -20, filter: 'blur(4px)', transition: { duration: 0.2 } },
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialView: AuthView = (searchParams.get('view') as AuthView) || 'signin';
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // confirm password removed — single password field for signup
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  // Counsellor accounts are provisioned only by admins. Public signup is always student.
  const accountType: 'student' = 'student';
  const [loading, setLoading] = useState(false);

  // React to URL param changes (e.g. landing CTAs while on /auth)
  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'signup' || v === 'signin' || v === 'forgot-password') setView(v as AuthView);
  }, [searchParams]);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signUp, signIn, signInAsGuest, convertGuestToUser, isGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const { error } = await signInAsGuest();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Could not start guest session',
          description: error.message,
        });
        return;
      }
      toast({
        title: 'Welcome, Guest!',
        description: "You're exploring as a guest — progress won't be saved.",
      });
      navigate('/dashboard');
    } finally {
      setGuestLoading(false);
    }
  };
  const { toast } = useToast();
  const navigate = useNavigate();

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const isSignUp = view === 'signup';
  const isForgot = view === 'forgot-password';

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(forgotEmail);
    } catch {
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
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Check your email',
          description: `We sent a password reset link to ${forgotEmail}. Click the button in the email to set a new password.`,
          duration: 8000,
        });
        setView('signin');
        setForgotEmail('');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  /** Trigger the browser's "Save password?" prompt after successful auth. */
  const promptSavePassword = (emailValue: string, passwordValue: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PC = (window as any).PasswordCredential;
      if (PC) {
        const cred = new PC({
          id: emailValue,
          password: passwordValue,
          name: emailValue,
        });
        navigator.credentials.store(cred);
      }
    } catch {
      // Silently fail — not all browsers support this, and that's fine.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      if (isSignUp) {
        // Guests already have an anonymous session (and possibly in-progress
        // onboarding data) tied to their user id — converting in place keeps
        // that same id instead of signing out and starting a fresh account,
        // which would silently orphan everything they just entered.
        const { error } = isGuest
          ? await convertGuestToUser(email, password)
          : await signUp(email, password, accountType);

        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              variant: 'destructive',
              title: 'Account exists',
              description: 'An account with this email already exists. Please sign in instead.',
            });
            setView('signin');
          } else {
            toast({
              variant: 'destructive',
              title: 'Sign up failed',
              description: error.message,
            });
          }
          return;
        }

        promptSavePassword(email, password);
        // Fire-and-forget welcome email (idempotent server-side per user).
        supabase.functions
          .invoke('send-welcome-email')
          .catch((err) => console.error('welcome email:', err));
        toast({
          title: 'Welcome to Pathforge',
          description: `You're in, with 3 credits a day on the free plan. We sent a verification link to ${email} — click it anytime to secure your account.`,
          duration: 9000,
        });
        setPassword('');
        navigate(redirectTo || '/dashboard');
      } else {
        const { error, isAdmin, isTeacher } = await signIn(email, password, stayLoggedIn);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Sign in failed',
              description: 'Invalid email or password. Please try again.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Sign in failed',
              description: error.message,
            });
          }
          return;
        }

        promptSavePassword(email, password);
        toast({
          title: 'Welcome back!',
          description: stayLoggedIn ? 'You\'ll stay signed in for 2 weeks.' : 'You have successfully signed in.',
        });

        // Redirect admins to admin panel, teachers to /teacher, others to redirect or home
        if (isAdmin) navigate('/admin');
        else if (isTeacher) navigate('/teacher');
        else navigate(redirectTo || '/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] bg-background flex items-center justify-center p-4">
      <Seo
        title={AUTH_SEO[view].title}
        description={AUTH_SEO[view].description}
        path={view === 'signin' ? '/auth' : `/auth?view=${view}`}
        // A guest who hits a gated route is bounced here with ?redirect=, which
        // produces a near-duplicate of /auth for every app route that exists.
        // Those copies are the URLs that got indexed as separate thin pages.
        noindex={searchParams.has('redirect')}
      />
      {/* Two columns on desktop: testimony on the left, the form pinned right.
          Below lg the reviews drop out entirely — on a phone the only thing
          worth showing above the fold is the form itself. */}
      <div className="w-full max-w-5xl grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="hidden lg:flex lg:justify-start">
          <ReviewsRail />
        </div>

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end"
        >
        <div className="card-elevated p-8">
          {/* Logo */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <motion.img
              src={pathforgeLogo}
              alt="Pathforge application logo"
              className="h-12 mx-auto mb-4"
              initial={{ scale: 0.8, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            />
            <AnimatePresence mode="wait">
              <motion.h1
                key={view}
                className="text-2xl font-bold text-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {isForgot ? 'Forgot Password' : isSignUp ? 'Create Your Account' : 'Welcome Back'}
              </motion.h1>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={view + '-sub'}
                className="text-muted-foreground mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                {isForgot
                  ? 'Enter your email and we\'ll send you a password reset link'
                  : isSignUp
                    ? 'Join Pathforge to plan your path to success'
                    : 'Sign in to continue your college journey'
                }
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Forgot Password Form */}
          {isForgot ? (
            <motion.form
              onSubmit={handleForgotPassword}
              className="space-y-4"
              initial="hidden"
              animate="visible"
            >
              <motion.div className="space-y-2" variants={formFieldVariants} custom={0}>
                <Label htmlFor="forgotEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                    disabled={forgotLoading}
                  />
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </motion.div>

              <motion.div variants={formFieldVariants} custom={1}>
                <Button
                  type="submit"
                  className="w-full btn-accent"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Reset Link
                      <KeyRound className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.div variants={formFieldVariants} custom={2}>
                <button
                  type="button"
                  onClick={() => { setView('signin'); setErrors({}); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to Sign In
                </button>
              </motion.div>
            </motion.form>
          ) : (
            <>
              {/* Google first: it's one click versus five fields, and burying it
                  under the email form was costing us the students who already
                  have a Google account through school. */}
              <motion.div
                className="space-y-2.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <GoogleSignInButton
                  label={isSignUp ? "Sign up with Google" : "Continue with Google"}
                  redirectTo={redirectTo || '/dashboard'}
                  className="h-11 text-sm font-medium"
                />
                <GitHubSignInButton
                  label={isSignUp ? "Sign up with GitHub" : "Continue with GitHub"}
                  redirectTo={redirectTo || '/dashboard'}
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
                  <span className="bg-background px-3 text-muted-foreground uppercase tracking-wider">
                    or use email
                  </span>
                </div>
              </motion.div>

              {/* Email Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-4"
                method="post"
                action="#"
                autoComplete="on"
                initial="hidden"
                animate="visible"
              >
                <motion.div className="space-y-2" variants={formFieldVariants} custom={0}>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
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
                    {!isSignUp && (
                      <motion.button
                        type="button"
                        onClick={() => { setView('forgot-password'); setErrors({}); }}
                        className="text-xs text-accent hover:underline"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Forgot password?
                      </motion.button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={showPassword ? 'hide' : 'show'}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </motion.div>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {errors.password ? (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-sm text-destructive"
                      >
                        {errors.password}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  {/*
                   * The meter replaces the static hint on sign-up. A line that
                   * says "at least 6 characters" is read once and then ignored;
                   * four cells that fill as you type are the only feedback
                   * anyone actually acts on. Sign-in gets nothing — grading a
                   * password someone already has is pure noise.
                   */}
                  {isSignUp && (
                    <PasswordStrength
                      value={password}
                      rules={PATHFORGE_PASSWORD_RULES}
                      showRules={password.length > 0}
                      className="pt-1"
                    />
                  )}
                </motion.div>



                {/* Stay Logged In Checkbox - Only for Sign In */}
                {!isSignUp && (
                  <motion.div
                    className="flex items-center space-x-2"
                    variants={formFieldVariants}
                    custom={2}
                  >
                    <Checkbox
                      id="stayLoggedIn"
                      checked={stayLoggedIn}
                      onCheckedChange={(checked) => setStayLoggedIn(checked === true)}
                    />
                    <Label
                      htmlFor="stayLoggedIn"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Stay logged in
                    </Label>
                  </motion.div>
                )}

                <motion.div variants={formFieldVariants} custom={isSignUp ? 2 : 3}>
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
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isSignUp ? 'Create Account' : 'Sign In'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </SpecularButton>
                </motion.div>
              </motion.form>

              {/* Footer - Switch between Sign Up and Sign In */}
              <motion.p
                className="text-center text-sm text-muted-foreground mt-6"
                variants={formFieldVariants}
                custom={isSignUp ? 3 : 4}
                initial="hidden"
                animate="visible"
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <motion.button
                  type="button"
                  onClick={() => {
                    setView(isSignUp ? 'signin' : 'signup');
                    setErrors({});
                  }}
                  className="text-accent hover:underline font-medium"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                {isSignUp ? 'Sign in' : 'Sign up'}
                </motion.button>
              </motion.p>

              <motion.div
                className="my-5 border-t border-border"
                variants={formFieldVariants}
                custom={isSignUp ? 4 : 5}
                initial="hidden"
                animate="visible"
              />

              {/* Guest Login */}
              <motion.div
                variants={formFieldVariants}
                custom={isSignUp ? 5 : 6}
                initial="hidden"
                animate="visible"
              >
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGuestLogin}
                    disabled={guestLoading || loading}
                    className="w-full"
                  >
                    {guestLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserCircle className="mr-2 h-4 w-4" />
                        Continue as Guest
                      </>
                    )}
                  </Button>
                </motion.div>
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  Try Pathforge instantly — no account needed. Progress won't be saved.
                </p>
              </motion.div>
            </>
          )}
        </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to Pathforge's{" "}
            <a href="/terms" className="underline hover:text-accent">Terms of Service</a>,{" "}
            <a href="/privacy" className="underline hover:text-accent">Privacy Notice</a>, and{" "}
            <a href="/refund-policy" className="underline hover:text-accent">Refund Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
