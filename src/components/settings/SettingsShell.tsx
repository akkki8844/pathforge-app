import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  UserCircle2, ShieldCheck, CreditCard, Activity, Plug, Bell, Palette, Sliders, Languages, SlidersHorizontal } from "lucide-react";

export type SettingsSectionId =
  | "general"
  | "preferences"
  | "advisor"
  | "language"
  | "notifications"
  | "appearance"
  | "account"
  | "privacy"
  | "billing"
  | "usage"
  | "connectors";


type NavItem = {
  id: SettingsSectionId;
  label: string;
  icon: typeof UserCircle2;
  hint: string;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Profile",
    items: [
      { id: "general", label: "Profile", icon: UserCircle2, hint: "Identity & academic basics" },
      { id: "preferences", label: "Preferences", icon: Sliders, hint: "How Pathforge works for you" },
      { id: "advisor", label: "Advisor", icon: SlidersHorizontal, hint: "Customize your AI advisor" },
    ],
  },

  {
    label: "Workspace",
    items: [
      { id: "appearance", label: "Appearance", icon: Palette, hint: "Theme & density" },
      { id: "language", label: "Language", icon: Languages, hint: "Display & AI language" },
      { id: "notifications", label: "Notifications", icon: Bell, hint: "Alerts & AI updates" },
      { id: "connectors", label: "Connectors", icon: Plug, hint: "LinkedIn, Calendar" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "account", label: "Account", icon: UserCircle2, hint: "Email & security" },
      { id: "privacy", label: "Privacy", icon: ShieldCheck, hint: "Data & visibility" },
      { id: "billing", label: "Billing", icon: CreditCard, hint: "Plan & invoices" },
      { id: "usage", label: "Usage", icon: Activity, hint: "Credits & limits" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function SettingsShell({
  sections,
}: {
  sections: Partial<Record<SettingsSectionId, ReactNode>>;
}) {
  const firstAvailable = ALL_ITEMS.find((i) => sections[i.id])?.id ?? "general";
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get("section") as SettingsSectionId | null) && sections[searchParams.get("section") as SettingsSectionId]
    ? (searchParams.get("section") as SettingsSectionId)
    : firstAvailable;
  const [active, setActive] = useState<SettingsSectionId>(initial);

  // React to ?section= changes (e.g. external links jumping to Connectors).
  useEffect(() => {
    const next = searchParams.get("section") as SettingsSectionId | null;
    if (next && sections[next] && next !== active) setActive(next);
  }, [searchParams, sections, active]);

  // Keep the URL in sync so deep links work.
  useEffect(() => {
    if (searchParams.get("section") !== active) {
      const next = new URLSearchParams(searchParams);
      next.set("section", active);
      setSearchParams(next, { replace: true });
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeMeta = ALL_ITEMS.find((i) => i.id === active);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Workspace
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-2xl">
            Configure your Pathforge profile, preferences, and account in one premium control center.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="space-y-7">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.items
                      .filter((item) => sections[item.id])
                      .map((item) => {
                        const Icon = item.icon;
                        const isActive = active === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActive(item.id)}
                            className={cn(
                              "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-left transition-all duration-200",
                              isActive
                                ? "bg-foreground/[0.06] text-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                            )}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="settings-active-bar"
                                className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
                                transition={{ type: "spring", stiffness: 500, damping: 36 }}
                              />
                            )}
                            <span
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                              )}
                            >
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="flex flex-col min-w-0">
                              <span className="text-[15px] font-semibold leading-tight">
                                {item.label}
                              </span>
                              <span className="mt-0.5 text-[12px] text-muted-foreground/80 leading-tight truncate">
                                {item.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeMeta && (
                  <div className="mb-6 hidden lg:block">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                      {activeMeta.label}
                    </p>
                  </div>
                )}
                {sections[active]}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header className="pb-2">
        <h2 className="text-2xl sm:text-[26px] font-semibold text-foreground tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export function SettingsCard({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm shadow-[0_1px_0_0_hsl(var(--border)/0.5)] overflow-hidden">
      {(title || description) && (
        <div className="px-6 sm:px-7 pt-6 pb-4">
          {title && (
            <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
      )}
      <div className={cn("px-6 sm:px-7", title || description ? "pb-6" : "py-6")}>{children}</div>
      {footer && (
        <div className="px-6 sm:px-7 py-3.5 border-t border-border/60 bg-muted/30 flex items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
