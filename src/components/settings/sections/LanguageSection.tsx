import { useState, useMemo } from "react";
import { Check, Globe2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

const LANGUAGES: { value: string; label: string; native: string }[] = [
  { value: "en", label: "English", native: "English" },
  { value: "es", label: "Spanish", native: "Español" },
  { value: "fr", label: "French", native: "Français" },
  { value: "de", label: "German", native: "Deutsch" },
  { value: "it", label: "Italian", native: "Italiano" },
  { value: "pt", label: "Portuguese", native: "Português" },
  { value: "nl", label: "Dutch", native: "Nederlands" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
  { value: "bn", label: "Bengali", native: "বাংলা" },
  { value: "ta", label: "Tamil", native: "தமிழ்" },
  { value: "te", label: "Telugu", native: "తెలుగు" },
  { value: "mr", label: "Marathi", native: "मराठी" },
  { value: "ur", label: "Urdu", native: "اردو" },
  { value: "ar", label: "Arabic", native: "العربية" },
  { value: "fa", label: "Persian", native: "فارسی" },
  { value: "tr", label: "Turkish", native: "Türkçe" },
  { value: "zh", label: "Chinese (Simplified)", native: "中文" },
  { value: "zh-tw", label: "Chinese (Traditional)", native: "繁體中文" },
  { value: "ja", label: "Japanese", native: "日本語" },
  { value: "ko", label: "Korean", native: "한국어" },
  { value: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { value: "th", label: "Thai", native: "ไทย" },
  { value: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { value: "ms", label: "Malay", native: "Bahasa Melayu" },
  { value: "ru", label: "Russian", native: "Русский" },
  { value: "uk", label: "Ukrainian", native: "Українська" },
  { value: "pl", label: "Polish", native: "Polski" },
  { value: "sv", label: "Swedish", native: "Svenska" },
  { value: "no", label: "Norwegian", native: "Norsk" },
  { value: "da", label: "Danish", native: "Dansk" },
  { value: "fi", label: "Finnish", native: "Suomi" },
  { value: "he", label: "Hebrew", native: "עברית" },
  { value: "el", label: "Greek", native: "Ελληνικά" },
  { value: "sw", label: "Swahili", native: "Kiswahili" },
];

export function LanguageSection() {
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const [autoTranslate, setAutoTranslate] = useState<boolean>(
    () => (typeof window !== "undefined" && localStorage.getItem("pf_autotranslate") === "1")
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q)
    );
  }, [query]);

  const select = (v: string) => {
    setLanguage(v);
    const label = LANGUAGES.find((l) => l.value === v)?.native ?? v;
    toast({ title: "Language updated", description: `AI replies and drafts will now be written in ${label}.` });
  };

  const toggleAuto = (v: boolean) => {
    setAutoTranslate(v);
    localStorage.setItem("pf_autotranslate", v ? "1" : "0");
  };

  return (
    <SettingsSection
      title="Language"
      description="Choose how Pathforge speaks to you — across AI responses, drafts, and outreach copy."
    >
      <SettingsCard
        title="Display & AI language"
        description="Pick your preferred language. The advisor, refiners, and email drafts will respond in this language when possible."
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languages…"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((l) => {
            const active = language === l.value;
            return (
              <button
                key={l.value}
                onClick={() => select(l.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40"
                )}
              >
                {/* Language code tile — replaces the old flag emoji, which
                    rendered differently on every OS and mapped a language onto
                    a single country. */}
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold uppercase tracking-wide",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/60 text-muted-foreground"
                  )}
                >
                  {l.value}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground truncate">{l.native}</span>
                  <span className="block text-[12px] text-muted-foreground truncate">{l.label}</span>
                </span>
                {active && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Translation" description="Smart defaults for multi-language users.">
        <SettingsRow
          label="Auto-translate AI replies"
          description="If the AI replies in another language, translate it to your selection automatically."
        >
          <Switch checked={autoTranslate} onCheckedChange={toggleAuto} />
        </SettingsRow>
        <SettingsRow
          label="Region & date format"
          description="Detected from your device. Change in your OS to update Pathforge."
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe2 className="h-4 w-4" />
            {typeof navigator !== "undefined" ? navigator.language : "en-US"}
          </div>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
