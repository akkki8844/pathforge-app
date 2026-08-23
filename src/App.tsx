import { lazy, Suspense, ComponentType, useEffect, useRef, type ReactNode } from "react";
import { preloadCommonRoutes } from "@/lib/routePreload";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CreditsProvider } from "@/contexts/CreditsContext";
import { Layout } from "@/components/layout/Layout";
import { RouteActivityLogger } from "@/components/RouteActivityLogger";
import ScrollToTop from "@/components/ScrollToTop";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import { IMessageCursor } from "@/components/animations/iMessageCursor";
import { MotionConfig } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import Index from "./pages/Index";
import Maintenance from "./pages/Maintenance";
import { isDesktop } from "@/lib/desktop";
import { UpdateNotifier } from "@/components/desktop/UpdateNotifier";


// Resilient lazy: retry once, then hard-reload so a stale chunk after a deploy
// (or extension blocking a chunk) never leaves users on an infinite spinner.
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      try {
        return await factory();
      } catch (err2) {
        if (typeof window !== "undefined") {
          const key = "pf_chunk_reload_at";
          const last = Number(sessionStorage.getItem(key) || 0);
          if (Date.now() - last > 10_000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
          }
        }
        throw err2;
      }
    }
  });
}

const DesktopWelcome = lazyWithRetry(() => import("./pages/desktop/Welcome"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const AppLogin = lazyWithRetry(() => import("./pages/AppLogin"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const DashboardPreview = lazyWithRetry(() => import("./pages/__DashboardPreview"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Activities = lazyWithRetry(() => import("./pages/Activities"));
const Journey = lazyWithRetry(() => import("./pages/Journey"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const ProfileBuilder = lazyWithRetry(() => import("./pages/ProfileBuilder"));
const Essays = lazyWithRetry(() => import("./pages/Essays"));
const Scholarships = lazyWithRetry(() => import("./pages/Scholarships"));
const CollegeReadiness = lazyWithRetry(() => import("./pages/CollegeReadiness"));
const Outcomes = lazyWithRetry(() => import("./pages/Outcomes"));
const WeeklyPlanner = lazyWithRetry(() => import("./pages/WeeklyPlanner"));
// Routine — one product area, nine views over one shared data model.
const RoutineToday = lazyWithRetry(() => import("./pages/routine/Today"));
const RoutineTimetable = lazyWithRetry(() => import("./pages/routine/Timetable"));
const RoutineStudyPlanner = lazyWithRetry(() => import("./pages/routine/StudyPlanner"));
const RoutineTasks = lazyWithRetry(() => import("./pages/routine/Tasks"));
const RoutineReminders = lazyWithRetry(() => import("./pages/routine/Reminders"));
const RoutineFocus = lazyWithRetry(() => import("./pages/routine/Focus"));
const RoutineHabits = lazyWithRetry(() => import("./pages/routine/Habits"));
const RoutineGoals = lazyWithRetry(() => import("./pages/routine/Goals"));
const CommsChats = lazyWithRetry(() => import("./pages/communications/Chats"));
const CommsTeams = lazyWithRetry(() => import("./pages/communications/Teams"));
const CommsTeamWorkspace = lazyWithRetry(() => import("./pages/communications/TeamWorkspace"));
const CommsObjectives = lazyWithRetry(() => import("./pages/communications/Objectives"));
const CommsAnnouncements = lazyWithRetry(() => import("./pages/communications/Announcements"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Faq = lazyWithRetry(() => import("./pages/Faq"));
const IvyLeagueAdmissions = lazyWithRetry(() => import("./pages/guides/IvyLeagueAdmissions"));
const IvyLeagueStudyTools = lazyWithRetry(() => import("./pages/guides/IvyLeagueStudyTools"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const AuthConfirm = lazyWithRetry(() => import("./pages/AuthConfirm"));

const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe"));
const AdmissionsProbability = lazyWithRetry(() => import("./pages/AdmissionsProbability"));
const Requirements = lazyWithRetry(() => import("./pages/Requirements"));
const ExemplarEssays = lazyWithRetry(() => import("./pages/ExemplarEssays"));
const PastAdmits = lazyWithRetry(() => import("./pages/PastAdmits"));
const Recommendations = lazyWithRetry(() => import("./pages/Recommendations"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"));

const Resume = lazyWithRetry(() => import("./pages/Resume"));
const ApplicationBuilder = lazyWithRetry(() => import("./pages/ApplicationBuilder"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Advisor = lazyWithRetry(() => import("./pages/Advisor"));
const AdminPanel = lazyWithRetry(() => import("./pages/AdminPanel"));
const TeacherDashboard = lazyWithRetry(() => import("./pages/teacher/Dashboard"));
const TeacherClasses = lazyWithRetry(() => import("./pages/teacher/Classes"));
const TeacherAssignments = lazyWithRetry(() => import("./pages/teacher/Assignments"));
const TeacherStudentDetail = lazyWithRetry(() => import("./pages/teacher/StudentDetail"));
const CounselorAnnouncements = lazyWithRetry(() => import("./pages/teacher/Announcements"));
const CounselorSchoolView = lazyWithRetry(() => import("./pages/teacher/SchoolView"));
const TeacherSettings = lazyWithRetry(() => import("./pages/teacher/Settings"));
const TeacherAuth = lazyWithRetry(() => import("./pages/teacher/Auth"));
const TeacherStudents = lazyWithRetry(() => import("./pages/teacher/Students"));
const TeacherMeetings = lazyWithRetry(() => import("./pages/teacher/Meetings"));
const TeacherEssayReview = lazyWithRetry(() => import("./pages/teacher/EssayReview"));
const TeacherApplications = lazyWithRetry(() => import("./pages/teacher/Applications"));
const TeacherAnalytics = lazyWithRetry(() => import("./pages/teacher/Analytics"));
const TeacherCopilot = lazyWithRetry(() => import("./pages/teacher/Copilot"));
const TeacherResources = lazyWithRetry(() => import("./pages/teacher/Resources"));
const TeacherMessages = lazyWithRetry(() => import("./pages/teacher/Messages"));
const TeacherScholarships = lazyWithRetry(() => import("./pages/teacher/Scholarships"));
const LOR = lazyWithRetry(() => import("./pages/LOR"));
const LorPortal = lazyWithRetry(() => import("./pages/LorPortal"));
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));

const PENDING_OAUTH_REDIRECT_KEY = "pathforge_pending_oauth_redirect";

function consumeSafePendingOAuthRedirect() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_OAUTH_REDIRECT_KEY);
  if (!value) return null;
  window.localStorage.removeItem(PENDING_OAUTH_REDIRECT_KEY);
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

import { useCredits } from "@/hooks/useCredits";
import { LogoSpinner } from "@/components/LogoSpinner";

const RouteFallback = () => <LogoSpinner />;

// These are never needed for the very first paint (onboarding only appears
// once auth resolves; the rest are non-landing chrome), so keeping them out
// of the eager entry chunk shrinks the JS that must parse/execute before the
// landing page — or any route — can render.
const OnboardingSurvey = lazyWithRetry(() =>
  import("@/components/OnboardingSurvey").then((m) => ({ default: m.OnboardingSurvey }))
);
const SupportChatbot = lazyWithRetry(() => import("@/components/SupportChatbot"));
// (default export — no .then() mapping needed, unlike the named exports above/below)
const NameBackfillGate = lazyWithRetry(() =>
  import("@/components/NameBackfillGate").then((m) => ({ default: m.NameBackfillGate }))
);
const CreditGiftNotification = lazyWithRetry(() =>
  import("@/components/CreditGiftNotification").then((m) => ({ default: m.CreditGiftNotification }))
);
const PaymentTestModeBanner = lazyWithRetry(() =>
  import("@/components/PaymentTestModeBanner").then((m) => ({ default: m.PaymentTestModeBanner }))
);
const UpgradeModal = lazyWithRetry(() =>
  import("@/components/UpgradeModal").then((m) => ({ default: m.UpgradeModal }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min: less refetch churn
      gcTime: 24 * 60 * 60 * 1000, // 24h cache retention
      refetchOnWindowFocus: false, // don't blow away state on tab return
      refetchOnReconnect: "always",
      retry: 1,
    },
  },
});

const persister = typeof window !== "undefined"
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: "pathforge-rq-cache",
      throttleTime: 1000,
    })
  : undefined;

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, onboardingCompleted, isTeacher, isAdmin, roleLoading } = useAuth();
  const location = useLocation();

  // Wait for both auth and role checks to resolve before rendering anything.
  // This prevents the onboarding survey from flashing for admins/teachers.
  if (loading || (user && roleLoading)) {
    return (
<LogoSpinner />
    );
  }

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Admins are isolated to /admin only — never see student/teacher flows.
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Teachers don't see student onboarding — route them to their workspace
  if (isTeacher && location.pathname !== '/recommendations') {
    return <Navigate to="/teacher" replace />;
  }

  // Show onboarding survey if not completed (except on recommendations page)
  if (!onboardingCompleted && location.pathname !== '/recommendations') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <OnboardingSurvey />
      </Suspense>
    );
  }

  return <>{children}</>;
}

function TeacherRoute({ children }: { children: ReactNode }) {
  const { user, loading, isTeacher, isAdmin, roleLoading, teacherProfile } = useAuth();
  const location = useLocation();

  if (loading || (user && roleLoading)) {
    return (
<LogoSpinner />
    );
  }
  if (!user) return <Navigate to={`/teacher/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!isTeacher) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Landing route: render the public landing immediately so auth/backend boot can never blank `/`. */
function LandingRoute({ children }: { children: ReactNode }) {
  const { user, onboardingCompleted, isTeacher, isAdmin, roleLoading } = useAuth();

  // The desktop build has no landing page. Someone who installed a native app
  // has already been sold; the sales copy at `/` is for search traffic. They
  // get the welcome screen and its one Continue button instead.
  if (!user && isDesktop()) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <DesktopWelcome />
      </Suspense>
    );
  }

  if (!user || roleLoading) return <>{children}</>;
  // Admins go straight to admin panel
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  // Authenticated teachers go straight to their workspace
  if (user && isTeacher) return <Navigate to="/teacher" replace />;
  // Authenticated students who haven't onboarded see the survey. This branch
  // also catches Google sign-up, which returns the browser to the origin (`/`)
  // — without it a brand-new OAuth account would land on marketing copy with
  // no prompt to finish onboarding.
  if (user && !onboardingCompleted) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <OnboardingSurvey />
      </Suspense>
    );
  }
  // Onboarded students stay here: `/` is the landing page for everyone, signed
  // in or not. The workspace is entered deliberately via "Open workspace",
  // which points at `/dashboard` — not by a silent bounce off the home URL.
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, loading, onboardingCompleted, isAdmin, isTeacher, roleLoading } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectParam = params.get("redirect");
  // Only honor same-origin paths to avoid open-redirect issues.
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;

  if (loading || (user && roleLoading)) {
    return (
<LogoSpinner />
    );
  }

  // Admins go to admin panel; teachers to workspace
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user && isTeacher) return <Navigate to="/teacher" replace />;

  // If user is logged in and onboarding is complete, honor ?redirect= deep link.
  // Otherwise land on `/dashboard`. Not `/` — that is the public landing page
  // even when signed in, and finishing a sign-in should put you in the app.
  if (user && onboardingCompleted) {
    return <Navigate to={safeRedirect || "/dashboard"} replace />;
  }

  // If user is logged in but onboarding is not complete, show onboarding
  if (user && !onboardingCompleted) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <OnboardingSurvey />
      </Suspense>
    );
  }

  return <>{children}</>;
}

function OAuthRedirectBridge() {
  const { user, loading, roleLoading, isAdmin, isTeacher, onboardingCompleted } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || loading || (user && roleLoading) || !user) return;
    const pendingRedirect = consumeSafePendingOAuthRedirect();
    if (!pendingRedirect) return;
    handledRef.current = true;

    if (isAdmin) navigate("/admin", { replace: true });
    else if (isTeacher) navigate("/teacher", { replace: true });
    else if (onboardingCompleted) navigate(pendingRedirect, { replace: true });
  }, [user, loading, roleLoading, isAdmin, isTeacher, onboardingCompleted, navigate]);

  return null;
}

/**
 * Public routes (pricing, about, contact) — block admins from accessing
 * user-facing pages.
 *
 * Deliberately renders `children` straight away instead of holding them behind
 * a spinner until auth resolves. These are the marketing pages in the sitemap;
 * gating them on a Supabase auth round-trip meant a crawler (which has no
 * session to resolve) had to wait on that boot before any content painted, and
 * would index a spinner if it were slow or blocked in the rendering sandbox.
 * Nothing here is sensitive — the guard exists only to bounce admins — so the
 * redirect can happen once roles settle. `LandingRoute` already works this way.
 */
function PublicGuestRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, roleLoading, loading } = useAuth();
  if (!loading && user && !roleLoading && isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { showUpgradeModal, setShowUpgradeModal } = useCredits();
  const { user } = useAuth();
  const location = useLocation();

  // Warm common route chunks once after the initial paint so the first
  // navigation feels instant. Gated on `user` — every warmed route is behind
  // ProtectedRoute, so doing this for guests (as it did when it ran at App
  // level, outside AuthProvider) just made the landing page compete with four
  // chunks no signed-out visitor can open.
  useEffect(() => {
    if (user) preloadCommonRoutes();
  }, [user]);
  // `/` is always the public landing page — for guests and signed-in students
  // alike. Only strip app chrome on the landing.
  const isLandingPage = location.pathname === "/";
  return (
    <>
      <TopLoadingBar />
      <OAuthRedirectBridge />
      <RouteActivityLogger />
      <KeepAliveProvider />
      {!isLandingPage && (
        <Suspense fallback={null}>
          <PaymentTestModeBanner />
          <NameBackfillGate />
        </Suspense>
      )}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Auth route - accessible only when not logged in */}
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          }
        />
        
        {/* Landing — public preview, no forced auth */}
        <Route
          path="/"
          element={
            <LandingRoute>
              <Index />
            </LandingRoute>
          }
        />

        {/* Counsellor sign-in (dedicated, sign-in only) */}
        <Route path="/teacher/auth" element={<TeacherAuth />} />

        {/* Teacher workspace */}
        <Route path="/teacher" element={
          <TeacherRoute><TeacherDashboard /></TeacherRoute>
        } />
        <Route path="/teacher/classes" element={
          <TeacherRoute><TeacherClasses /></TeacherRoute>
        } />
        <Route path="/teacher/assignments" element={
          <TeacherRoute><TeacherAssignments /></TeacherRoute>
        } />
        <Route path="/teacher/feedback" element={<Navigate to="/teacher" replace />} />
        <Route path="/teacher/announcements" element={
          <TeacherRoute><CounselorAnnouncements /></TeacherRoute>
        } />
        <Route path="/teacher/school" element={
          <TeacherRoute><CounselorSchoolView /></TeacherRoute>
        } />
        <Route path="/teacher/students/:studentId" element={
          <TeacherRoute><TeacherStudentDetail /></TeacherRoute>
        } />
        <Route path="/teacher/settings" element={
          <TeacherRoute><TeacherSettings /></TeacherRoute>
        } />
        <Route path="/teacher/students" element={
          <TeacherRoute><TeacherStudents /></TeacherRoute>
        } />
        <Route path="/teacher/meetings" element={
          <TeacherRoute><TeacherMeetings /></TeacherRoute>
        } />
        <Route path="/teacher/essays" element={
          <TeacherRoute><TeacherEssayReview /></TeacherRoute>
        } />
        <Route path="/teacher/applications" element={
          <TeacherRoute><TeacherApplications /></TeacherRoute>
        } />
        <Route path="/teacher/analytics" element={
          <TeacherRoute><TeacherAnalytics /></TeacherRoute>
        } />
        <Route path="/teacher/copilot" element={
          <TeacherRoute><TeacherCopilot /></TeacherRoute>
        } />
        <Route path="/teacher/resources" element={
          <TeacherRoute><TeacherResources /></TeacherRoute>
        } />
        <Route path="/teacher/messages" element={
          <TeacherRoute><TeacherMessages /></TeacherRoute>
        } />
        <Route path="/teacher/scholarships" element={
          <TeacherRoute><TeacherScholarships /></TeacherRoute>
        } />
        {/* Catch-all under /teacher → bounce back to Command center instead of 404 */}
        <Route path="/teacher/*" element={<Navigate to="/teacher" replace />} />
        {/* Common alternate spellings */}
        <Route path="/counsellor" element={<Navigate to="/teacher" replace />} />
        <Route path="/counsellor/*" element={<Navigate to="/teacher" replace />} />
        <Route path="/counselor" element={<Navigate to="/teacher" replace />} />
        <Route path="/counselor/*" element={<Navigate to="/teacher" replace />} />
        {/* Dashboard — primary route for authenticated students */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/outcomes"
          element={
            <ProtectedRoute>
              <Layout>
                <Outcomes />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <Layout>
                <Activities />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/journey"
          element={
            <ProtectedRoute>
              <Layout>
                <Journey />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Leaderboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile-builder"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfileBuilder />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <Layout>
                <Resume />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/essays"
          element={
            <ProtectedRoute>
              <Layout>
                <Essays />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/application-builder"
          element={
            <ProtectedRoute>
              <Layout>
                <ApplicationBuilder />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Redirect old application route to new application builder */}
        <Route path="/application" element={<Navigate to="/application-builder" replace />} />
        {/* Redirect old linkedin route */}
        <Route path="/linkedin" element={<Navigate to="/profile-builder" replace />} />
        <Route
          path="/lor"
          element={
            <ProtectedRoute>
              <Layout>
                <LOR />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scholarships"
          element={
            <ProtectedRoute>
              <Layout>
                <Scholarships />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/college-readiness"
          element={
            <ProtectedRoute>
              <Layout>
                <CollegeReadiness />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/weekly-planner"
          element={
            <ProtectedRoute>
              <Layout>
                <WeeklyPlanner />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Routine. Nine views over one data model; /routine itself is not a
            page, so it lands on Today, and an unknown child does the same
            rather than dropping the student out of the section entirely. */}
        <Route path="/routine" element={<Navigate to="/routine/today" replace />} />
        <Route
          path="/routine/today"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineToday />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/timetable"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineTimetable />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/study-planner"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineStudyPlanner />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Calendar merged into Study Planner as a second tab; old links redirect. */}
        <Route path="/routine/calendar" element={<Navigate to="/routine/study-planner" replace />} />
        <Route
          path="/routine/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineTasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/reminders"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineReminders />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/focus"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineFocus />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/habits"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineHabits />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/routine/goals"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineGoals />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/routine/*" element={<Navigate to="/routine/today" replace />} />

        {/* Communications. Chats is the default landing route because it is the
            surface the section gets opened for; an unknown child still lands
            there rather than dropping the student out of the section. */}
        <Route
          path="/communications"
          element={<Navigate to="/communications/chats" replace />}
        />
        <Route
          path="/communications/chats"
          element={
            <ProtectedRoute>
              <Layout>
                <CommsChats />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications/teams"
          element={
            <ProtectedRoute>
              <Layout>
                <CommsTeams />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications/teams/:teamId"
          element={
            <ProtectedRoute>
              <Layout>
                <CommsTeamWorkspace />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications/objectives"
          element={
            <ProtectedRoute>
              <Layout>
                <CommsObjectives />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications/announcements"
          element={
            <ProtectedRoute>
              <Layout>
                <CommsAnnouncements />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications/*"
          element={<Navigate to="/communications/chats" replace />}
        />
        <Route
          path="/requirements"
          element={
            <ProtectedRoute>
              <Layout>
                <Requirements />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admissions-probability"
          element={
            <ProtectedRoute>
              <Layout>
                <AdmissionsProbability />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exemplar-essays"
          element={
            <ProtectedRoute>
              <Layout>
                <ExemplarEssays />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/past-admits"
          element={
            <ProtectedRoute>
              <Layout>
                <PastAdmits />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <PublicGuestRoute>
              <Layout>
                <About />
              </Layout>
            </PublicGuestRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicGuestRoute>
              <Layout>
                <Contact />
              </Layout>
            </PublicGuestRoute>
          }
        />
        <Route
          path="/faq"
          element={
            <PublicGuestRoute>
              <Layout>
                <Faq />
              </Layout>
            </PublicGuestRoute>
          }
        />
        <Route
          path="/guides/ivy-league-admissions"
          element={
            <PublicGuestRoute>
              <Layout>
                <IvyLeagueAdmissions />
              </Layout>
            </PublicGuestRoute>
          }
        />
        <Route
          path="/guides/ivy-league-study-tools"
          element={
            <PublicGuestRoute>
              <Layout>
                <IvyLeagueStudyTools />
              </Layout>
            </PublicGuestRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <Recommendations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/advisor"
          element={
            <ProtectedRoute>
              <Layout>
                <Advisor />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Public pricing — accessible without login (Paddle requirement). Admins blocked. */}
        <Route
          path="/pricing"
          element={
            <PublicGuestRoute>
              <Layout>
                <Pricing />
              </Layout>
            </PublicGuestRoute>
          }
        />
        {/* Public legal pages */}
        {/* Dev-only fixture for eyeballing the dashboard with a populated
            profile, without needing a seeded account. Stripped from prod builds. */}
        {import.meta.env.DEV && (
          <Route path="/__dashboard-preview" element={<Layout><DashboardPreview /></Layout>} />
        )}
        {/* Wrapped in Layout like the other public pages. Without it these
            three rendered with no nav and no footer, and neither Privacy nor
            RefundPolicy contains an outbound link of its own — three indexed
            pages that link nowhere, so crawlers walked in and stopped. */}
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/refund-policy" element={<Layout><RefundPolicy /></Layout>} />
        {/* Admin Panel - Hidden route, role-protected */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin-panel" element={<Navigate to="/admin" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        {/* Desktop sign-in hand-off — the browser half of the pathforge:// flow */}
        <Route path="/app-login" element={<AppLogin />} />
        {/* Public recommender portal — token-based, no auth */}
        <Route path="/lor/portal/:token" element={<LorPortal />} />
        {/* OAuth 2.1 consent screen for MCP clients (ChatGPT, Claude, etc.) */}
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      {!isLandingPage && (
        <Suspense fallback={null}>
          <CreditGiftNotification />
          <SupportChatbot />
          <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </Suspense>
      )}
    </>
  );
}

const MAINTENANCE_MODE = false;

const App = () => {
  if (MAINTENANCE_MODE) return <Maintenance />;

  const Provider = persister ? PersistQueryClientProvider : QueryClientProvider;
  // Exclude sensitive query keys (profiles, onboarding data, GPA, target universities,
  // journey scores, credits) from being written to localStorage so they don't
  // linger on shared devices. Everything else (e.g. static lookup data) can persist.
  const SENSITIVE_KEY_PREFIXES = [
    "profile", "profiles", "onboarding", "onboarding_data", "journey", "journey_scores",
    "credits", "subscription", "admissions", "readiness", "advisor", "linkedin",
    "application", "outcomes", "recommendations", "user", "me",
    // Every Communications key starts with "comms". Private message content
    // must not be written to localStorage on what may be a shared or school
    // device — it is the single most sensitive thing this app now holds.
    "comms",
  ];
  const shouldDehydrateQuery = (query: { queryKey: readonly unknown[] }) => {
    const first = query.queryKey?.[0];
    if (typeof first !== "string") return true;
    const k = first.toLowerCase();
    return !SENSITIVE_KEY_PREFIXES.some((p) => k.includes(p));
  };
  const providerProps = persister
    ? {
        client: queryClient,
        persistOptions: {
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          dehydrateOptions: { shouldDehydrateQuery },
        },
      }
    : { client: queryClient };
  return (
    <Provider {...(providerProps as any)}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <CreditsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {isDesktop() && <UpdateNotifier />}
            <BrowserRouter>
              <ScrollToTop />
              <IMessageCursor />
              <MobileMotionGate>
                <AppRoutes />
              </MobileMotionGate>
            </BrowserRouter>
          </TooltipProvider>
          </CreditsProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
};

// Disables Framer Motion animations on mobile to reduce CPU/GPU load
// (overheating, battery drain). Desktop/tablet keep full motion.
const MobileMotionGate = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  return (
    <MotionConfig reducedMotion={isMobile ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
};

export default App;
