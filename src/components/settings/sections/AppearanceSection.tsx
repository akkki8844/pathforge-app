import { useTheme } from "next-themes";
import { Moon, Sun, MonitorCog, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "light" | "dark" | "system";

const THEMES: { id: Mode; label: string; icon: typeof Sun; desc: string }[] = [
  { id: "light", label: "Light", icon: Sun, desc: "Clean, daylight workspace" },
  { id: "dark", label: "Dark", icon: Moon, desc: "Deep navy, low glare" },
  { id: "system", label: "System", icon: MonitorCog, desc: "Match your device" },
];

/** Mini SVG preview of the Pathforge UI in a given theme. */
function ThemePreview({ mode }: { mode: Mode }) {
  if (mode === "system") {
    return (
      <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-border/60">
        <div className="absolute inset-0 grid grid-cols-2">
          <ThemePreview mode="light" />
          <ThemePreview mode="dark" />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-px bg-border/80" />
      </div>
    );
  }

  const light = mode === "light";
  const bg = light ? "#F7F8FA" : "#0B1220";
  const surface = light ? "#FFFFFF" : "#111A2E";
  const sidebar = light ? "#EEF1F6" : "#0F1830";
  const text = light ? "#0F172A" : "#E2E8F0";
  const muted = light ? "#CBD5E1" : "#334155";
  const accent = "#3B82F6";
  const accentSoft = light ? "#DBEAFE" : "#1E3A8A";

  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-border/60">
      <svg viewBox="0 0 160 90" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
        <rect width="160" height="90" fill={bg} />
        {/* Sidebar */}
        <rect x="0" y="0" width="34" height="90" fill={sidebar} />
        <rect x="6" y="8" width="22" height="4" rx="1.2" fill={accent} />
        <rect x="6" y="20" width="18" height="2.4" rx="1" fill={muted} />
        <rect x="6" y="26" width="22" height="2.4" rx="1" fill={muted} />
        <rect x="6" y="32" width="16" height="2.4" rx="1" fill={muted} />
        <rect x="4" y="40" width="26" height="6" rx="1.5" fill={accentSoft} />
        <rect x="6" y="42" width="14" height="2.4" rx="1" fill={accent} />
        <rect x="6" y="52" width="20" height="2.4" rx="1" fill={muted} />
        <rect x="6" y="58" width="22" height="2.4" rx="1" fill={muted} />

        {/* Top bar */}
        <rect x="38" y="6" width="118" height="10" rx="2" fill={surface} />
        <rect x="42" y="10" width="28" height="2.4" rx="1" fill={text} opacity="0.85" />
        <circle cx="148" cy="11" r="2.6" fill={accent} />

        {/* Hero card */}
        <rect x="38" y="20" width="118" height="22" rx="3" fill={surface} />
        <rect x="42" y="24" width="50" height="3" rx="1" fill={text} opacity="0.9" />
        <rect x="42" y="30" width="80" height="2" rx="1" fill={muted} />
        <rect x="42" y="34" width="70" height="2" rx="1" fill={muted} />
        <rect x="128" y="32" width="22" height="6" rx="2" fill={accent} />

        {/* Card grid */}
        <rect x="38" y="46" width="56" height="38" rx="3" fill={surface} />
        <rect x="42" y="50" width="22" height="2.6" rx="1" fill={text} opacity="0.85" />
        <rect x="42" y="56" width="48" height="1.8" rx="1" fill={muted} />
        <rect x="42" y="60" width="40" height="1.8" rx="1" fill={muted} />
        <rect x="42" y="72" width="18" height="6" rx="2" fill={accentSoft} />

        <rect x="100" y="46" width="56" height="38" rx="3" fill={surface} />
        <rect x="104" y="50" width="22" height="2.6" rx="1" fill={text} opacity="0.85" />
        <rect x="104" y="56" width="48" height="1.8" rx="1" fill={muted} />
        <rect x="104" y="60" width="36" height="1.8" rx="1" fill={muted} />
        {/* Mini chart bars */}
        <rect x="104" y="70" width="4" height="8" rx="1" fill={accent} opacity="0.5" />
        <rect x="111" y="66" width="4" height="12" rx="1" fill={accent} opacity="0.7" />
        <rect x="118" y="72" width="4" height="6" rx="1" fill={accent} opacity="0.5" />
        <rect x="125" y="64" width="4" height="14" rx="1" fill={accent} />
        <rect x="132" y="68" width="4" height="10" rx="1" fill={accent} opacity="0.8" />
        <rect x="139" y="72" width="4" height="6" rx="1" fill={accent} opacity="0.6" />
      </svg>
    </div>
  );
}

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSection
      title="Appearance"
      description="Personalize how Pathforge looks across every page."
    >
      <SettingsCard
        title="Theme"
        description="Preview each mode before you pick it. Your choice applies instantly across the workspace."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "group relative text-left rounded-2xl border p-3 transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40 hover:shadow-sm"
                )}
              >
                <ThemePreview mode={t.id} />
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg",
                        active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-none">{t.label}</p>
                      <p className="text-[11.5px] text-muted-foreground mt-1">{t.desc}</p>
                    </div>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Layout density">
        <SettingsRow
          label="Interface density"
          description="Compact for power users, comfortable for everyone else."
        >
          <Select defaultValue="comfortable">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
