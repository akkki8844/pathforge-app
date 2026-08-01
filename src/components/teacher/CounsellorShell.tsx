import { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Target, LogOut, ShieldCheck, AlertCircle, Megaphone, School, Settings, Compass,
  GraduationCap, Calendar, FileText, BarChart3, Bot, BookOpen, Mail, Award, ClipboardList,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import pathforgeLogo from "@/assets/pathforge-logo.png";
import { AuroraBackdrop } from "@/components/visual/AuroraBackdrop";
import { cn } from "@/lib/utils";
import { PathforgeAvatar } from "@/components/avatar/PathforgeAvatar";

const workspaceItems = [
  { href: "/teacher", label: "Command center", icon: LayoutDashboard, end: true },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/applications", label: "Applications", icon: ClipboardList },
  { href: "/teacher/essays", label: "Essay reviews", icon: FileText },
  { href: "/teacher/meetings", label: "Meetings", icon: Calendar },
  { href: "/teacher/scholarships", label: "Scholarships", icon: Award },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/teacher/copilot", label: "AI Copilot", icon: Bot },
];

const managementItems = [
  { href: "/teacher/school", label: "School view", icon: School },
  { href: "/teacher/classes", label: "Cohorts", icon: Users },
  { href: "/teacher/assignments", label: "Action plan", icon: Target },
  { href: "/teacher/announcements", label: "Announcements", icon: Megaphone },
  { href: "/teacher/messages", label: "Messages", icon: Mail },
  { href: "/teacher/resources", label: "Resources", icon: BookOpen },
];

const accountItems = [
  { href: "/teacher/settings", label: "Settings", icon: Settings },
];

function CounsellorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { teacherProfile } = useAuth();

  const isActive = (href: string, end?: boolean) => {
    if (end) {
      if (href === "/teacher") {
        return pathname === "/teacher" || pathname === "/teacher/onboarding";
      }
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/40">
        <Link
          to="/teacher"
          className={cn(
            "flex items-center gap-2.5 px-2 py-1.5 group/brand",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-lg bg-accent/20 blur-md opacity-0 group-hover/brand:opacity-100 transition-opacity" />
            <img src={pathforgeLogo} alt="Pathforge logo" className="relative h-7 w-auto" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">Pathforge</span>
              <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
                COUNSELLOR
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.end);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.label : undefined}
                      className={cn(
                        "relative transition-all",
                        active && "bg-accent/10 text-accent font-medium hover:bg-accent/15"
                      )}
                    >
                      <NavLink to={item.href} end={item.end}>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
                        )}
                        <Icon className={cn("h-4 w-4", active && "drop-shadow-[0_0_6px_hsl(var(--accent)/0.6)]")} />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Management</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.label : undefined}
                      className={cn(
                        "relative transition-all",
                        active && "bg-accent/10 text-accent font-medium hover:bg-accent/15"
                      )}
                    >
                      <NavLink to={item.href}>
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
                        )}
                        <Icon className={cn("h-4 w-4", active && "drop-shadow-[0_0_6px_hsl(var(--accent)/0.6)]")} />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.label : undefined}
                      className={cn(active && "bg-accent/10 text-accent font-medium")}
                    >
                      <NavLink to={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40">
        {!collapsed && teacherProfile && (
          <div className="px-2 py-1.5">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium",
                teacherProfile.verified
                  ? "bg-accent/10 text-accent"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {teacherProfile.verified ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              <span className="truncate">
                {teacherProfile.verified ? "Verified counsellor" : "Awaiting verification"}
              </span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

const PAGE_TITLE_MAP: Record<string, string> = {
  "/teacher": "Command center",
  "/teacher/school": "School view",
  "/teacher/classes": "Cohorts",
  "/teacher/assignments": "Action plan",
  "/teacher/announcements": "Announcements",
  "/teacher/settings": "Settings",
  "/teacher/students": "Students",
  "/teacher/meetings": "Meetings",
  "/teacher/essays": "Essay reviews",
  "/teacher/applications": "Applications",
  "/teacher/scholarships": "Scholarships",
  "/teacher/analytics": "Analytics",
  "/teacher/copilot": "AI Copilot",
  "/teacher/resources": "Resources",
  "/teacher/messages": "Messages",
};

function CounsellorTopbar() {
  const navigate = useNavigate();
  const { signOut, profile, teacherProfile, user } = useAuth();
  const { pathname } = useLocation();

  const title = Object.entries(PAGE_TITLE_MAP).find(([path]) =>
    path === "/teacher" ? pathname === "/teacher" : pathname.startsWith(path)
  )?.[1] ?? "Counsellor";

  const initials =
    (profile?.full_name || profile?.username || profile?.email || "C")
      .trim()
      .slice(0, 1)
      .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 lg:px-6 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      <div className="h-5 w-px bg-border/60" />
      <div className="flex items-center gap-2 min-w-0">
        <Compass className="h-3.5 w-3.5 text-accent flex-shrink-0" />
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {teacherProfile && !teacherProfile.verified && (
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" /> Pending verification
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="Settings">
          <Link to="/teacher/settings">
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open profile menu"
              className="ml-1 pl-2 border-l border-border/50 flex items-center gap-2 rounded-full pr-1 py-1 hover:bg-muted transition-colors"
            >
              <PathforgeAvatar
                stored={profile?.avatar_url}
                seed={user?.id || ""}
                size={28}
                className="rounded-full"
                cutout="hsl(var(--background))"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {profile?.full_name || profile?.email || 'Counsellor'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/teacher/settings')}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function CounsellorShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AuroraBackdrop />
      <div className="relative z-10 min-h-screen flex w-full">
        <CounsellorSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-60 -z-0"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 0%, hsl(var(--accent) / 0.08), transparent 70%)",
            }}
          />
          <CounsellorTopbar />
          <main className="flex-1 relative z-10">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
