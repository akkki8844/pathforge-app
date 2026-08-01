import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activityLogger';

interface OnboardingData {
  id: string;
  user_id: string;
  grade: string;
  high_school_name: string;
  country: string;
  curriculum: string;
  gpa: string | null;
  gpa_range: string | null;
  standardized_test_type: string | null;
  standardized_test_score: string | null;
  intended_major: string;
  target_universities: string[];
  application_year: string;
  extracurricular_level: string;
  areas_of_interest: string[];
  career_direction: string | null;
  onboarding_completed: boolean;
  weekly_hours_available: string | null;
  preferred_work_types: string[] | null;
  biggest_constraint: string | null;
  major_confidence: number | null;
  open_to_adjacent_majors: boolean | null;
  major_reason: string | null;
  primary_motivation: string | null;
  biggest_fear: string | null;
}

interface ProfileData {
  id: string;
  user_id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  /**
   * Either a Pathforge avatar token (`pf:face:palette`) or, for accounts that
   * uploaded a photo before the avatar picker shipped, a real image URL.
   * Use `resolveAvatar` from @/lib/avatars rather than reading this directly.
   */
  avatar_url: string | null;
  email_verified_at: string | null;
  email_verification_sent_at: string | null;
}

interface TeacherProfile {
  id: string;
  user_id: string;
  school_id: string | null;
  title: string;
  subject: string | null;
  verified: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isEmailVerified: boolean;
  teacherProfile: TeacherProfile | null;
  profile: ProfileData | null;
  onboardingData: OnboardingData | null;
  onboardingCompleted: boolean;
  signUp: (email: string, password: string, accountType?: 'student' | 'teacher') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string, stayLoggedIn?: boolean) => Promise<{ error: Error | null; isAdmin?: boolean; isTeacher?: boolean }>;
  signInAsGuest: () => Promise<{ error: Error | null }>;
  convertGuestToUser: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshOnboardingData: () => Promise<void>;
  refreshTeacherStatus: () => Promise<void>;
  updateUsername: (username: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_PERSIST_KEY = 'pathforge_stay_logged_in';
const PENDING_TEACHER_KEY = 'pathforge_pending_teacher_signup';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);

  const isGuest = user?.is_anonymous === true;
  const isEmailVerified =
    isGuest ||
    user?.app_metadata?.provider !== 'email' ||
    !!user?.email_confirmed_at ||
    !!profile?.email_verified_at;

  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) return false;
      const adminStatus = data === true;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch {
      return false;
    }
  };

  const fetchTeacherStatus = async (userId: string) => {
    try {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'teacher')
        .maybeSingle();
      const teacherFlag = !!roleRow;
      setIsTeacher(teacherFlag);

      if (teacherFlag) {
        const { data: tp } = await supabase
          .from('teacher_profiles')
          .select('id,user_id,school_id,title,subject,verified')
          .eq('user_id', userId)
          .maybeSingle();
        setTeacherProfile((tp as TeacherProfile | null) ?? null);
      } else {
        setTeacherProfile(null);
      }
    } catch {
      setIsTeacher(false);
      setTeacherProfile(null);
    }
  };

  const refreshTeacherStatus = async () => {
    if (user) await fetchTeacherStatus(user.id);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('user_id', userId).limit(1);
      if (error && error.code !== 'PGRST116') return;
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setProfile(row as ProfileData);
    } catch {}
  };

  const fetchOnboardingData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('onboarding_data').select('*').eq('user_id', userId).limit(1);
      if (error && error.code !== 'PGRST116') return;
      const row = Array.isArray(data) ? data[0] : null;
      if (row) {
        setOnboardingData(row as OnboardingData);
        setOnboardingCompleted(row.onboarding_completed);
      } else {
        setOnboardingData(null);
        setOnboardingCompleted(false);
      }
    } catch {}
  };

  const refreshOnboardingData = async () => {
    if (user) {
      await fetchOnboardingData(user.id);
      await fetchProfile(user.id);
    }
  };

  // After signup, if a pending teacher flag exists, write the user_roles entry.
  const consumePendingTeacherSignup = async (userId: string) => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(PENDING_TEACHER_KEY) !== 'true') return;
    localStorage.removeItem(PENDING_TEACHER_KEY);
    try {
      // Insert teacher role (RLS allows because Non-admin INSERT is restrictive — service required normally,
      // so we route through edge function). Fallback: rely on teacher-verify to set role.
      // We attempt direct insert; if blocked, teacher-verify will upsert it server-side.
      await supabase.from('user_roles').insert({ user_id: userId, role: 'teacher' as const });
    } catch {}
  };

  useEffect(() => {
    let lastUserId: string | null = null;
    let cancelled = false;
    // onAuthStateChange's INITIAL_SESSION event and the explicit getSession()
    // bootstrap below both fire on mount and can both observe the same user —
    // without this guard they'd each kick off a full hydrateRoles (profile +
    // onboarding + teacher + admin queries), doubling every query on cold load.
    let initialHydrationStarted: string | null = null;

    // Safety net: never let the gate spin forever, even if a fetch hangs.
    const SAFETY_MS = 6000;
    const safetyTimer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setRoleLoading(false);
    }, SAFETY_MS);

    const hydrateRoles = async (userId: string, isSignIn: boolean) => {
      // Per-fetch timeout so one slow query can't wedge the UI.
      const withTimeout = <T,>(p: Promise<T>, ms = 5000): Promise<T | void> =>
        Promise.race([
          p,
          new Promise<void>((res) => window.setTimeout(() => res(), ms)),
        ]);
      await Promise.all([
        withTimeout(fetchOnboardingData(userId)),
        withTimeout(fetchProfile(userId)),
        withTimeout(fetchTeacherStatus(userId)),
        withTimeout(checkAdminStatus()),
      ]);
      if (isSignIn) consumePendingTeacherSignup(userId);
      if (cancelled) return;
      setRoleLoading(false);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Supabase re-emits auth events (SIGNED_IN, TOKEN_REFRESHED,
        // USER_UPDATED, INITIAL_SESSION) whenever the tab regains focus or the
        // token silently refreshes. If we've ALREADY hydrated this exact user,
        // none of those are a real new sign-in — so we must not flip roleLoading
        // and re-run role fetches. Doing so makes the route guards unmount the
        // current page (throwing away in-progress work) and can bounce the user
        // to "/". Only a genuinely different user id re-hydrates.
        const sameUser = !!session?.user?.id && session.user.id === lastUserId;
        const skipRefetch = sameUser;

        if (session?.user) {
          if (skipRefetch) {
            setLoading(false);
            return;
          }
          lastUserId = session.user.id;
          setRoleLoading(true);
          if (initialHydrationStarted !== session.user.id) {
            initialHydrationStarted = session.user.id;
            // Defer to avoid deadlocks inside the auth callback.
            setTimeout(() => { void hydrateRoles(session.user.id, event === 'SIGNED_IN'); }, 0);
          }
        } else {
          lastUserId = null;
          setOnboardingData(null);
          setOnboardingCompleted(false);
          setProfile(null);
          setIsAdmin(false);
          setIsTeacher(false);
          setTeacherProfile(null);
          setRoleLoading(false);
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem(SESSION_PERSIST_KEY);
          }
          setLoading(false);
        }
      }
    );

    // Bootstrap from storage immediately so we don't depend solely on the
    // INITIAL_SESSION event firing in time.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        lastUserId = session.user.id;
        if (initialHydrationStarted !== session.user.id) {
          initialHydrationStarted = session.user.id;
          void hydrateRoles(session.user.id, false);
        }
      } else {
        setRoleLoading(false);
        setLoading(false);
      }
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      setRoleLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const resendVerificationEmail = async () => {
    if (!user?.email) return { error: new Error('No email on account') };
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, accountType: 'student' | 'teacher' = 'student') => {
    const redirectUrl = `${window.location.origin}/`;
    if (accountType === 'teacher') {
      localStorage.setItem(PENDING_TEACHER_KEY, 'true');
    }
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: redirectUrl },
    });
    if (!error) {
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      void logActivity('signup', '/auth', { account_type: accountType });
    }
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string, stayLoggedIn: boolean = false) => {
    if (stayLoggedIn) localStorage.setItem(SESSION_PERSIST_KEY, 'true');
    else localStorage.removeItem(SESSION_PERSIST_KEY);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    let adminStatus = false;
    let teacherFlag = false;
    if (!error) {
      adminStatus = await checkAdminStatus();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: roleRow } = await supabase
          .from('user_roles').select('role').eq('user_id', u.id).eq('role', 'teacher').maybeSingle();
        teacherFlag = !!roleRow;
      }
      void logActivity('login', '/auth', { teacher: teacherFlag, admin: adminStatus });
    }
    return { error: error as Error | null, isAdmin: adminStatus, isTeacher: teacherFlag };
  };

  const signInAsGuest = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (!error) {
      const { data: { user: guestUser } } = await supabase.auth.getUser();
      if (guestUser) {
        await supabase.from('guest_sessions').insert({ guest_user_id: guestUser.id });
      }
    }
    return { error: error as Error | null };
  };

  const convertGuestToUser = async (email: string, password: string) => {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (!error && user) {
      await supabase.from('profiles').update({ email }).eq('user_id', user.id);
    }
    return { error: error as Error | null };
  };

  const updateUsername = async (username: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { data: available } = await supabase.rpc('is_username_available', { check_username: username });
    if (!available) return { error: new Error('Username is already taken') };
    const { error } = await supabase.from('profiles').update({ username }).eq('user_id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_PERSIST_KEY);
    // Clear ALL user-scoped persisted data so sensitive academic content
    // (essay drafts, GPA, target colleges, bookmarks, planner, scholarships,
    // monthly focus) is not left behind on shared devices.
    try {
      localStorage.removeItem('pathforge-rq-cache');
      // Fixed keys
      [
        'pathforge_profile',
        'pathforge_bookmarks',
        'pathforge_weekly_planner',
        'pf-scholarship-bookmarks',
        'pf-scholarship-checklist',
      ].forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignore */ }
      });
      // Prefixed keys (drafts, monthly focus)
      Object.keys(localStorage)
        .filter((k) => k.startsWith('pf:draft:') || k.startsWith('pf:monthly'))
        .forEach((k) => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setOnboardingData(null);
    setOnboardingCompleted(false);
    setProfile(null);
    setIsAdmin(false);
    setIsTeacher(false);
    setTeacherProfile(null);
  };

  // Memoize the context value so consumers don't re-render on every parent
  // re-render — this context sits at the app root and is read by dozens of
  // components, so a fresh object each render was cascading through the tree.
  const value = useMemo<AuthContextType>(() => ({
    user, session, loading, roleLoading, isGuest, isAdmin, isTeacher, isEmailVerified, teacherProfile,
    profile, onboardingData, onboardingCompleted,
    signUp, signIn, signInAsGuest, convertGuestToUser, signOut,
    refreshOnboardingData, refreshTeacherStatus, updateUsername, resendVerificationEmail, checkAdminStatus,
  }), [
    user, session, loading, roleLoading, isGuest, isAdmin, isTeacher, isEmailVerified,
    teacherProfile, profile, onboardingData, onboardingCompleted,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
