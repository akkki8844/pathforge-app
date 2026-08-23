import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Target, LogOut, ShieldCheck, AlertCircle, Megaphone, School, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import pathforgeLogo from "@/assets/pathforge-logo.webp";

/**
 * Counselor workspace top header. Strategy-focused, not classroom-style.
 * - Command center: priority overview of all linked students
 * - Cohorts: groups of students
 * - Action plan: per-student strategic action items
 */
const items = [
  { href: "/teacher", label: "Command center", icon: LayoutDashboard, end: true },
  { href: "/teacher/school", label: "School view", icon: School },
  { href: "/teacher/classes", label: "Cohorts", icon: Users },
  { href: "/teacher/assignments", label: "Action plan", icon: Target },
  { href: "/teacher/announcements", label: "Announcements", icon: Megaphone },
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

export function TeacherSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, teacherProfile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const isActive = (href: string, end?: boolean) => {
    const path = location.pathname;
    if (end) {
      // Command center stays active on the dashboard, student detail pages,
      // and the teacher onboarding screen (none of which have their own nav item).
      if (href === "/teacher") {
        return (
          path === "/teacher" ||
          path.startsWith("/teacher/students") ||
          path === "/teacher/onboarding"
        );
      }
      return path === href;
    }
    return path === href || path.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/teacher" className="flex items-center gap-3 flex-shrink-0">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-8 w-auto" />
            <span className="hidden sm:inline-block text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
              COUNSELOR
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex-1 hidden md:flex items-center justify-center gap-1">
            {items.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.href, it.end);
              return (
                <Link
                  key={it.href}
                  to={it.href}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {teacherProfile && (
              <span
                className={`hidden lg:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md ${
                  teacherProfile.verified
                    ? "bg-accent/10 text-accent"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {teacherProfile.verified ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {teacherProfile.verified ? "Verified" : "Pending"}
              </span>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="md:hidden flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 -mt-1">
          {items.map((it) => {
            const Icon = it.icon;
            const active = isActive(it.href, it.end);
            return (
              <Link
                key={it.href}
                to={it.href}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
