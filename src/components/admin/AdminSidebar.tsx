import { cn } from "@/lib/utils";
import { LayoutDashboard, Users2, FileText, ToggleLeft, ShieldAlert, MessagesSquare, Megaphone, ChevronLeft, ChevronRight, BadgeCheck, TicketPercent, CircleDollarSign, Building2, SlidersHorizontal, Bot, ScrollText, BarChart3, LogOut, Gauge, Settings, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type AdminSection =
  | "dashboard" | "analytics" | "users" | "ai-usage" | "content" | "feature-flags"
  | "moderation" | "feedback" | "announcements" | "proof-review"
  | "coupons" | "credits" | "schools"
  | "ai-control" | "ai-usage-control" | "chatbot-monitor" | "system-logs"
  | "emails" | "settings";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
}

const menuGroups: { label: string; items: { id: AdminSection; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Insights",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "analytics", label: "Platform Analytics", icon: BarChart3 },
      { id: "system-logs", label: "System Logs", icon: ScrollText },
    ],
  },
  {
    label: "People",
    items: [
      { id: "users", label: "User Management", icon: Users2 },
      { id: "schools", label: "Schools", icon: Building2 },
      { id: "moderation", label: "Moderation", icon: ShieldAlert },
      { id: "proof-review", label: "Proof Review", icon: BadgeCheck },
    ],
  },
  {
    label: "Monetization",
    items: [
      { id: "credits", label: "Credits Control", icon: CircleDollarSign },
      { id: "coupons", label: "Coupons", icon: TicketPercent },
    ],
  },
  {
    label: "AI",
    items: [
      { id: "ai-usage", label: "AI Usage", icon: LayoutDashboard },
      { id: "ai-usage-control", label: "Usage Control", icon: Gauge },
      { id: "ai-control", label: "AI Control", icon: SlidersHorizontal },
      { id: "chatbot-monitor", label: "Chatbot Monitor", icon: Bot },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "content", label: "Content", icon: FileText },
      { id: "feature-flags", label: "Feature Flags", icon: ToggleLeft },
      { id: "announcements", label: "Announcements", icon: Megaphone },
      { id: "emails", label: "Emails", icon: Mail },
      { id: "feedback", label: "Feedback", icon: MessagesSquare },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/", { replace: true });
    } catch {
      toast.error("Could not sign out. Try again.");
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-card border-r border-border h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">Admin</div>
              <div className="text-[10px] text-muted-foreground">Pathforge Console</div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all border-l-2",
                      isActive
                        ? "bg-accent/10 text-accent border-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-0.5">
        {!collapsed && user?.email && (
          <div className="px-3 pb-1.5 pt-1 text-[10px] text-muted-foreground/80 truncate" title={user.email}>
            {user.email}
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}
