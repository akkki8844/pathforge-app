import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { useToast } from "@/hooks/use-toast";

const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español (Spanish)" },
  { value: "fr", label: "Français (French)" },
  { value: "de", label: "Deutsch (German)" },
  { value: "it", label: "Italiano (Italian)" },
  { value: "pt", label: "Português (Portuguese)" },
  { value: "nl", label: "Nederlands (Dutch)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "ur", label: "اردو (Urdu)" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "fa", label: "فارسی (Persian)" },
  { value: "tr", label: "Türkçe (Turkish)" },
  { value: "zh", label: "中文 (Chinese — Simplified)" },
  { value: "zh-tw", label: "繁體中文 (Chinese — Traditional)" },
  { value: "ja", label: "日本語 (Japanese)" },
  { value: "ko", label: "한국어 (Korean)" },
  { value: "vi", label: "Tiếng Việt (Vietnamese)" },
  { value: "th", label: "ไทย (Thai)" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "ru", label: "Русский (Russian)" },
  { value: "uk", label: "Українська (Ukrainian)" },
  { value: "pl", label: "Polski (Polish)" },
  { value: "sv", label: "Svenska (Swedish)" },
  { value: "no", label: "Norsk (Norwegian)" },
  { value: "da", label: "Dansk (Danish)" },
  { value: "fi", label: "Suomi (Finnish)" },
  { value: "he", label: "עברית (Hebrew)" },
  { value: "el", label: "Ελληνικά (Greek)" },
  { value: "sw", label: "Kiswahili (Swahili)" },
];

export function PreferencesSection() {
  const { toast } = useToast();
  const [language, setLanguage] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem("pf_language")) || "en"
  );
  const [aiTone, setAiTone] = useState("balanced");
  const [recRigor, setRecRigor] = useState("ambitious");
  const [autoSync, setAutoSync] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const handleLanguage = (v: string) => {
    setLanguage(v);
    localStorage.setItem("pf_language", v);
    const label = LANGUAGES.find((l) => l.value === v)?.label || v;
    toast({
      title: "Language preference saved",
      description: `${label} will be applied to AI responses and new content.`,
    });
  };

  return (
    <SettingsSection
      title="Preferences"
      description="Tune how Pathforge tailors recommendations, AI output, and on-screen guidance to your style."
    >
      <SettingsCard title="Language & region" description="Sets your preferred language for AI replies, suggestions, and outreach copy.">
        <SettingsRow
          label="Display & AI language"
          description="The advisor, refiners, and email drafts will respond in this language when possible."
        >
          <Select value={language} onValueChange={handleLanguage}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="AI behavior" description="How the AI advisor and refiners respond to you.">
        <SettingsRow
          label="Refinement tone"
          description="Sets the voice the AI uses when rewriting essays, projects, and bullets."
        >
          <Select value={aiTone} onValueChange={setAiTone}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="precise">Precise & academic</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="bold">Bold & narrative</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Recommendation ambition"
          description="Bias the activity and college engine toward safer or more reach-focused picks."
        >
          <Select value={recRigor} onValueChange={setRecRigor}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grounded">Grounded</SelectItem>
              <SelectItem value="ambitious">Ambitious</SelectItem>
              <SelectItem value="reach">Reach-heavy</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Productivity" description="Small behaviors that keep your workflow on rails.">
        <SettingsRow
          label="Auto-sync calendar each visit"
          description="Pull new Google Calendar events into the planner whenever you open it."
        >
          <Switch checked={autoSync} onCheckedChange={setAutoSync} />
        </SettingsRow>
        <SettingsRow
          label="Show contextual tips"
          description="Surface short coaching prompts when you reach a new section."
        >
          <Switch checked={showTips} onCheckedChange={setShowTips} />
        </SettingsRow>
        <SettingsRow
          label="Reduce motion"
          description="Soften animations across the workspace if you prefer a calmer interface."
        >
          <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
