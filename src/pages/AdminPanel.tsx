import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Menu, LogOut, Home, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminSidebar, AdminSection } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminAIUsage } from '@/components/admin/AdminAIUsage';
import { AdminContent } from '@/components/admin/AdminContent';
import { AdminFeatureFlags } from '@/components/admin/AdminFeatureFlags';
import { AdminModeration } from '@/components/admin/AdminModeration';
import { AdminFeedback } from '@/components/admin/AdminFeedback';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { AdminProofReview } from '@/components/admin/AdminProofReview';
import { AdminCoupons } from '@/components/admin/AdminCoupons';
import { AdminCreditsControl } from '@/components/admin/AdminCreditsControl';
import { AdminSchools } from '@/components/admin/AdminSchools';
import { AdminAIControl } from '@/components/admin/AdminAIControl';
import { AdminAIUsageControl } from '@/components/admin/AdminAIUsageControl';
import { AdminChatbotMonitor } from '@/components/admin/AdminChatbotMonitor';
import { AdminSystemLogs } from '@/components/admin/AdminSystemLogs';
import { AdminPlatformAnalytics } from '@/components/admin/AdminPlatformAnalytics';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminEmails } from '@/components/admin/AdminEmails';
import { AuroraBackdrop } from '@/components/visual/AuroraBackdrop';

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Show loading while checking auth/admin status
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-[100svh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'analytics':
        return <AdminPlatformAnalytics />;
      case 'users':
        return <AdminUserManagement />;
      case 'ai-usage':
        return <AdminAIUsage />;
      case 'content':
        return <AdminContent />;
      case 'feature-flags':
        return <AdminFeatureFlags />;
      case 'moderation':
        return <AdminModeration />;
      case 'feedback':
        return <AdminFeedback />;
      case 'announcements':
        return <AdminAnnouncements />;
      case 'proof-review':
        return <AdminProofReview />;
      case 'coupons':
        return <AdminCoupons />;
      case 'credits':
        return <AdminCreditsControl />;
      case 'schools':
        return <AdminSchools />;
      case 'ai-control':
        return <AdminAIControl />;
      case 'ai-usage-control':
        return <AdminAIUsageControl />;
      case 'chatbot-monitor':
        return <AdminChatbotMonitor />;
      case 'system-logs':
        return <AdminSystemLogs />;
      case 'emails':
        return <AdminEmails />;
      case 'settings':
        return <AdminSettings onNavigate={setActiveSection} />;
      default:
        return <AdminDashboard />;
    }
  };

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const sectionLabels: Record<AdminSection, string> = {
    dashboard: "Dashboard", analytics: "Platform Analytics", users: "User Management",
    "ai-usage": "AI Usage", content: "Content", "feature-flags": "Feature Flags",
    moderation: "Moderation", feedback: "Feedback", announcements: "Announcements",
    "proof-review": "Proof Review", coupons: "Coupons", credits: "Credits Control",
    schools: "Schools", "ai-control": "AI Control", "ai-usage-control": "Usage Control",
    "chatbot-monitor": "Chatbot Monitor", "system-logs": "System Logs", emails: "Emails", settings: "Settings",
  };

  return (
    <div className="relative min-h-[100svh] flex">
      <AuroraBackdrop />
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex relative z-10">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-border/60 bg-card/60 backdrop-blur px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" aria-label="Open admin menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <AdminSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
              </SheetContent>
            </Sheet>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground ml-2 pl-3 border-l border-border/60">
              <span>Admin</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-medium">{sectionLabels[activeSection]}</span>
            </div>
          </div>
          <AdminProfileMenu />
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden max-w-[1600px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function AdminProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initial = (user?.email?.[0] ?? 'A').toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors"
          aria-label="Open profile menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-semibold">
            {initial}
          </span>
          <span className="hidden sm:inline text-xs font-medium text-foreground truncate max-w-[160px]">{user?.email}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user?.email ?? 'Admin'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/')}><Home className="mr-2 h-4 w-4" />Go to app</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/profile')}><UserIcon className="mr-2 h-4 w-4" />My profile</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={async () => { await signOut(); navigate('/'); }} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
