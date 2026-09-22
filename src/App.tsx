import { lazy, Suspense, ComponentType, useEffect, useRef, type ReactNode } from "react";
import { preloadCommonRoutes } from "@/lib/routePreload";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { persister, queryClient } from "@/lib/queryClient";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { UsageProvider } from "@/contexts/UsageContext";
import { Layout } from "@/components/layout/Layout";
import { RouteActivityLogger } from "@/components/RouteActivityLogger";
import ScrollToTop from "@/components/ScrollToTop";
import { KeepAliveProvider } from "@/components/KeepAliveProvider";
import { TourProvider } from "@/components/tour/TourProvider";
import { MotionConfig } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import Index from "./pages/Index";
import Maintenance from "./pages/Maintenance";


// Resilient lazy: retry once, then hard-reload so a stale chunk after a deploy
// (or extension blocking a chunk) never leaves users on an infinite spinner.
/**
 * Holds the Interview Simulator back from students while it is still being
 * tested, without unpublishing the routes — admins pass straight through, so it
 * can keep being exercised against the real origin with a real session.
 *
 * Renders nothing at all until the admin check resolves. Flashing the
 * coming-soon page at an admin for a beat and then swapping it for the feature
 * is worse than a short blank.
 *
 * To ship: delete this component, its three usages below, and
 * `pages/interview/ComingSoon.tsx`.
 */
function InterviewGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminCheck();
  if (loading) return null;
  return isAdmin ? <>{children}</> : <InterviewComingSoon />;
}

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

const Auth = lazyWithRetry(() => import("./pages/Auth"));
const AppLogin = lazyWithRetry(() => import("./pages/AppLogin"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Activities = lazyWithRetry(() => import("./pages/Activities"));
const Journey = lazyWithRetry(() => import("./pages/Journey"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const ProfileBuilder = lazyWithRetry(() => import("./pages/ProfileBuilder"));
const Docs = lazyWithRetry(() => import("./pages/Docs"));
const DocEditor = lazyWithRetry(() => import("./pages/DocEditor"));
const Essays = lazyWithRetry(() => import("./pages/Essays"));
const Scholarships = lazyWithRetry(() => import("./pages/Scholarships"));
const CollegeReadiness = lazyWithRetry(() => import("./pages/CollegeReadiness"));
const Outcomes = lazyWithRetry(() => import("./pages/Outcomes"));
// Routine — one product area, six views over one shared data model.
const RoutineToday = lazyWithRetry(() => import("./pages/routine/Today"));
const RoutineTimetable = lazyWithRetry(() => import("./pages/routine/Timetable"));
const RoutineStudyPlanner = lazyWithRetry(() => import("./pages/routine/StudyPlanner"));
const RoutineCalendar = lazyWithRetry(() => import("./pages/routine/Calendar"));
const RoutineReminders = lazyWithRetry(() => import("./pages/routine/Reminders"));
const RoutineFocus = lazyWithRetry(() => import("./pages/routine/Focus"));
const RoutineGoals = lazyWithRetry(() => import("./pages/routine/Goals"));
const CommsChats = lazyWithRetry(() => import("./pages/communications/Chats"));
const CommsTeams = lazyWithRetry(() => import("./pages/communications/Teams"));
const CommsTeamWorkspace = lazyWithRetry(() => import("./pages/communications/TeamWorkspace"));
const CommsObjectives = lazyWithRetry(() => import("./pages/communications/Objectives"));
const CommsAnnouncements = lazyWithRetry(() => import("./pages/communications/Announcements"));
const InterviewLobby = lazyWithRetry(() => import("./pages/interview/Lobby"));
const InterviewComingSoon = lazyWithRetry(() => import("./pages/interview/ComingSoon"));
const InterviewRoom = lazyWithRetry(() => import("./pages/interview/Room"));
const InterviewReport = lazyWithRetry(() => import("./pages/interview/Report"));
const TestPrepOverview = lazyWithRetry(() => import("./pages/testprep/Overview"));
const TestPrepPractice = lazyWithRetry(() => import("./pages/testprep/Practice"));
const TestPrepQuestionBank = lazyWithRetry(() => import("./pages/testprep/QuestionBank"));
const TestPrepExams = lazyWithRetry(() => import("./pages/testprep/PracticeExams"));
const TestPrepProgress = lazyWithRetry(() => import("./pages/testprep/Progress"));
const TestPrepSession = lazyWithRetry(() => import("./pages/testprep/Session"));
const TestPrepExam = lazyWithRetry(() => import("./pages/testprep/Exam"));
const TestPrepResults = lazyWithRetry(() => import("./pages/testprep/Results"));
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
const CookiePolicy = lazyWithRetry(() => import("./pages/CookiePolicy"));

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
const TeacherOnboarding = lazyWithRetry(() => import("./pages/teacher/Onboarding"));
const TeacherFeedback = lazyWithRetry(() => import("./pages/teacher/Feedback"));
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

import {
  consumePendingOAuth,
  forgetPendingOAuth,
  peekPendingOAuthPortal,
} from "@/lib/auth/pendingOAuth";

import { useUsage } from "@/contexts/UsageContext";
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
const DesktopWelcome = lazyWithRetry(() => import("./pages/desktop/Welcome"));
const MessageDockBar = lazyWithRetry(() => import("@/components/comms/MessageDockBar"));
// Not lazy: this is what appears when the app is already failing to load
// things, which is the worst possible moment to depend on fetching one more
// chunk.
import { BugAlertBanner } from "@/components/BugAlertBanner";
// Desktop-only. This file is otherwise kept in sync with pathforge-tech; the
// isDesktop/UpdateNotifier/DesktopWelcome references are the whole of the
// desktop delta and are re-applied after every sync.
import { isDesktop } from "@/lib/desktop";
import { UpdateNotifier } from "@/components/desktop/UpdateNotifier";
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

/**
 * The counsellor portal's missing half of "sign in only".
 *
 * That page offers no sign-up. But "Continue with Google" is not a sign-in —
 * it is an authentication that creates an account when none exists — and the
 * identity that comes back carries no memory of which page sent it. So anyone
 * whose email an admin had not added was getting a working account, as a
 * student, from a page that never offered to enrol them. The password form has
 * always checked this and signed the wrong person back out; OAuth simply had
 * no equivalent.
 *
 * The check cannot happen before the round trip, because the email is not
 * known until the provider returns it. So it happens here, on the way back,
 * and `counsellor-oauth-reject` cleans up the account behind them — but only
 * when that account is seconds old and empty. Anyone with a real account is
 * signed out and turned away, never deleted. See that function for the full
 * list of conditions.
 */
function CounsellorOAuthGuard() {
  const { user, loading, roleLoading, isAdmin, isTeacher, signOut } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || loading || roleLoading || !user) return;
    if (peekPendingOAuthPortal() !== "counsellor") return;
    // Entitled to be here: let the ordinary bridge route them.
    if (isTeacher || isAdmin) return;

    handledRef.current = true;
    forgetPendingOAuth();

    void (async () => {
      try {
        // Best effort. If this fails the sign-out below still happens, which
        // is the part the person actually experiences.
        await supabase.functions.invoke("counsellor-oauth-reject");
      } catch (e) {
        console.warn("counsellor-oauth-reject failed", e);
      }
      try {
        await signOut();
      } finally {
        navigate("/teacher/auth?error=not-registered", { replace: true });
      }
    })();
  }, [user, loading, roleLoading, isAdmin, isTeacher, signOut, navigate]);

  return null;
}

function OAuthRedirectBridge() {
  const { user, loading, roleLoading, isAdmin, isTeacher, onboardingCompleted } = useAuth();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current || loading || (user && roleLoading) || !user) return;
    // Leave it for `CounsellorOAuthGuard`: this one would otherwise consume the
    // marker and send an unprovisioned account to the student dashboard, which
    // is the exact outcome the guard exists to prevent.
    if (peekPendingOAuthPortal() === "counsellor" && !isTeacher && !isAdmin) return;

    const { redirect: pendingRedirect } = consumePendingOAuth();
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
  const { showUpgradeModal, setShowUpgradeModal } = useUsage();
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
  /*
   * Where the dock is suppressed.
   *
   * The list used to include `/test-prep`, which is most of a section, so the
   * dock vanished across a large part of the app for no reason a user could
   * see - it reads as the feature being broken rather than deliberate. A
   * test-prep page does not own the bottom edge the way the advisor composer
   * does, so it is off the list.
   *
   * What remains is only the places where the dock would sit on top of the one
   * control the page exists for, or belongs to a different persona entirely:
   *
   *   /communications  - this section IS the chat UI
   *   /advisor         - the composer is pinned to the bottom of its shell
   *   /routine/focus   - a full-screen timer
   *   /interview       - the whole section; see below
   *   /teacher         - the counsellor workspace, not the student's inbox
   *   /auth, landing   - signed out
   */
  const showMessageDock =
    !isLandingPage &&
    !location.pathname.startsWith("/communications") &&
    !location.pathname.startsWith("/advisor") &&
    !location.pathname.startsWith("/teacher") &&
    !location.pathname.startsWith("/routine/focus") &&
    // The exam runner, and only it, inside Test Prep.
    //
    // Everything else in /test-prep is an ordinary page, which is why the
    // section as a whole is not on this list. The exam is not: it is a timed
    // sitting whose own control bar — the question navigator, Back and Next —
    // is sticky at the bottom edge, exactly where the dock floats, and the
    // dock sits on top of it.
    !/^\/test-prep\/[^/]+\/exam$/.test(location.pathname) &&
    // The whole interview section, not just the room.
    //
    // The room is a full-screen call whose own controls sit exactly where the
    // dock floats — same reasoning as focus mode. But the lobby and the report
    // are no better: the lobby is the last thing you look at before a call
    // starts, and the report is a page you read top to bottom. A chat bar
    // floating over either is the app talking over itself, and it was covering
    // the lobby's own footer besides.
    !location.pathname.startsWith("/interview") &&
    // A document open for editing, but not the drive listing. The editor is a
    // full-height shell with its own status bar along the bottom edge —
    // page count, word count, zoom — which is exactly where the dock floats.
    !location.pathname.startsWith("/docs/d/") &&
    !location.pathname.startsWith("/auth");
  return (
    <>
      <TopLoadingBar />
      <CounsellorOAuthGuard />
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
        {/*
          * School link and verification.
          *
          * This page existed and had no route, so it could not be reached from
          * anywhere in the product. A counsellor who signed up unverified was
          * shown a banner pointing at /teacher/settings, where the school field
          * is disabled and reads "Linked by admin" — there was no surface
          * anywhere that let them submit the link themselves, which is what
          * this page does.
          */}
        <Route path="/teacher/onboarding" element={
          <TeacherRoute><TeacherOnboarding /></TeacherRoute>
        } />
        <Route path="/teacher/classes" element={
          <TeacherRoute><TeacherClasses /></TeacherRoute>
        } />
        <Route path="/teacher/assignments" element={
          <TeacherRoute><TeacherAssignments /></TeacherRoute>
        } />
        {/*
          * The feedback log.
          *
          * This page exists, reads a real table through `useTeacherFeedback`,
          * and was routed to a redirect — so a counsellor had no way to see
          * what they had already sent a student, only to send more.
          */}
        <Route path="/teacher/feedback" element={
          <TeacherRoute><TeacherFeedback /></TeacherRoute>
        } />
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
        {/*
          * Renamed from /lor and /weekly-planner, which were the internal names
          * ("letters of recommendation", "weekly planner") for pages the nav has
          * called Professors and Calendar for a long time.
          *
          * The old paths stay as redirects rather than being deleted. They are
          * in sent email (activity-reminder.tsx links pathforge.co.in/weekly-planner
          * directly), in the advisor's own navigate tool, and in whatever
          * students have bookmarked. A rename that 404s those is a rename that
          * breaks the product to tidy a URL.
          *
          * /lor/portal/:token is deliberately NOT renamed: those links are
          * handed to recommenders outside the product and some are already live.
          */}
        <Route path="/lor" element={<Navigate to="/professors" replace />} />
        <Route path="/weekly-planner" element={<Navigate to="/routine/calendar" replace />} />
        <Route
          path="/professors"
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
        {/* There was a second calendar here — the ReUI weekly planner, over
            `routine_events` and `routine_tasks` only. It is the one the navbar
            pointed at, so "Calendar" opened a week grid showing a fraction of
            the data while the real calendar sat unlinked at /routine/calendar.
            One calendar, one route: this redirects rather than 404ing the
            links and bookmarks that already exist. */}
        <Route path="/calendar" element={<Navigate to="/routine/calendar" replace />} />

        {/* Documents: Pathforge's own drive. Folders, documents written here
            and files uploaded here — nothing to do with the Google Docs
            connector, which reaches into a Google account and keeps no copy. */}
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <Layout>
                <Docs />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs/d/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <DocEditor />
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
        {/* The calendar is its own page again: a full-width grid over every
            source, not a tab inside the study plan. */}
        <Route
          path="/routine/calendar"
          element={
            <ProtectedRoute>
              <Layout>
                <RoutineCalendar />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Tasks page removed — every task already surfaces on Today's agenda,
            and Quick Add (press Q anywhere in Routine) creates one without a
            dedicated page. Old links redirect there instead of 404ing. */}
        <Route path="/routine/tasks" element={<Navigate to="/routine/today" replace />} />
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
        {/* Habits page removed — habit completion still shows on Today's day
            progress, and Quick Add still creates a habit inline. */}
        <Route path="/routine/habits" element={<Navigate to="/routine/today" replace />} />
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

        {/* Test Prep. `:testId` is real routing, not decoration — the section
            is built for five tests and each page resolves its own blueprint,
            so adding the PSAT is a data change rather than five new routes.
            Only the SAT has content today; the others render an in-app "not
            built yet" state instead of a marketing page.

            The exam runner is deliberately outside `Layout`: a timed sitting
            with the global navbar above it is not a testing environment. The
            practice runner keeps the navbar, because leaving a practice set is
            not something to make hard. */}
        <Route path="/test-prep" element={<Navigate to="/test-prep/sat" replace />} />
        <Route
          path="/test-prep/:testId"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepOverview />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/practice"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepPractice />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/question-bank"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepQuestionBank />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/exams"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepExams />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/progress"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepProgress />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/session"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepSession />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/results/:attemptId"
          element={
            <ProtectedRoute>
              <Layout>
                <TestPrepResults />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-prep/:testId/exam"
          element={
            <ProtectedRoute>
              <TestPrepExam />
            </ProtectedRoute>
          }
        />
        <Route path="/test-prep/*" element={<Navigate to="/test-prep/sat" replace />} />

        {/* Interview Simulator. The room is deliberately outside `Layout`, for
            the same reason the exam runner is: a mock interview with the site's
            navbar above it is a page about an interview rather than one. The
            lobby and the report keep the navbar — walking away from either is
            supposed to be easy. */}
        <Route
          path="/interview"
          element={
            <ProtectedRoute>
              <Layout>
                <InterviewGate>
                  <InterviewLobby />
                </InterviewGate>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/room"
          element={
            <ProtectedRoute>
              <InterviewGate>
                <InterviewRoom />
              </InterviewGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/report/:sessionId"
          element={
            <ProtectedRoute>
              <Layout>
                <InterviewGate>
                  <InterviewReport />
                </InterviewGate>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/mock-interview" element={<Navigate to="/interview" replace />} />
        <Route path="/interview/*" element={<Navigate to="/interview" replace />} />
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
        {/* Wrapped in Layout like the other public pages. Without it these
            three rendered with no nav and no footer, and neither Privacy nor
            RefundPolicy contains an outbound link of its own — three indexed
            pages that link nowhere, so crawlers walked in and stopped. */}
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/refund-policy" element={<Layout><RefundPolicy /></Layout>} />
        <Route path="/cookies" element={<Layout><CookiePolicy /></Layout>} />
        {/* Both spellings people actually type, so neither 404s. */}
        <Route path="/cookie-policy" element={<Navigate to="/cookies" replace />} />
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
      {/* Mounted here rather than in Layout, and outside the !isLandingPage
          guard, because a failure can happen on any route. Layout wraps most of
          the app but not the whole /teacher counsellor workspace,
          /communications, /application or the landing page. Renders nothing at
          all until the capture engine reports something broke. */}
      <BugAlertBanner />
      {/*
       * The message dock: a floating pill of the people you are actually
       * talking to, so a one-line reply never costs a page change.
       *
       * Signed-in only, and deliberately not on every route. It is suppressed
       * wherever it would sit on top of the primary input of the page it is
       * floating over: the Communications section already is the chat UI, the
       * advisor owns the bottom of its own fixed-height shell, and focus mode
       * is a full-screen timer that should not have a chat pill in it.
       */}
      {user && showMessageDock && (
        <Suspense fallback={null}>
          <MessageDockBar />
        </Suspense>
      )}
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
    // Notification bodies quote whatever they are about: a counsellor's
    // message, a deadline, an announcement. Same reasoning as "comms".
    "notification",
    // Connector state names the third-party account someone linked.
    "github", "composio", "connector", "google",
  ];
  const shouldDehydrateQuery = (query: Parameters<typeof defaultShouldDehydrateQuery>[0]) => {
    // Only settled, successful queries may be persisted. react-query dehydrates
    // a *pending* query together with its in-flight `promise`; JSON.stringify
    // turns that promise into `{}`, and on the next load `hydrate()` sees a
    // truthy `promise` and calls `.then()` on it. That throws
    // "promise.then is not a function", which aborts persistQueryClientRestore
    // entirely — so nothing at all was being restored and every page refetched
    // from scratch. Deferring to the library default reinstates the
    // status === "success" check; the key filter below only narrows it further.
    if (!defaultShouldDehydrateQuery(query)) return false;
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
          // Retires the caches already sitting in browsers from before pending
          // queries were excluded. One of those still holds a serialized
          // `promise` and would throw on restore exactly once per user;
          // a changed buster makes the client discard them instead of reading.
          buster: "settled-only-v1",
          dehydrateOptions: { shouldDehydrateQuery },
        },
      }
    : { client: queryClient };
  return (
    <Provider {...(providerProps as any)}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <UsageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {isDesktop() && <UpdateNotifier />}
            <BrowserRouter>
              <ScrollToTop />
              <MobileMotionGate>
                {/* Inside BrowserRouter and AuthProvider: the tour drives the
                    router between the seven nav-bar pages, and it only runs for
                    a signed-in student who has just finished onboarding. */}
                <TourProvider>
                  <AppRoutes />
                </TourProvider>
              </MobileMotionGate>
            </BrowserRouter>
          </TooltipProvider>
          </UsageProvider>
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
