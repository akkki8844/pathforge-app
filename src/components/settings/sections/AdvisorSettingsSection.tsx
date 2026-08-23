import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsForm } from "../SettingsFormContext";
import { Trash2, Loader2, Plus } from "lucide-react";
import { ADVISOR_MODELS, modelFromGateway } from "@/lib/advisorModels";

// Same ladder the Advisor composer shows, so the two pickers can never
// disagree. The stored value is the gateway id; the label is the product name.
// `openai/gpt-5` used to be listed here but was never on the edge function's
// allowlist, so choosing it silently fell back to a different model.
const MODELS = ADVISOR_MODELS.map((m) => ({
  value: m.gateway,
  // The burn rate rides along with the label because this picker changes what
  // the advisor costs, and someone setting it here may never see the composer's
  // token meter before the choice takes effect.
  label: `${m.label} (${m.weight}× tokens) — ${m.blurb}`,
}));

const RETENTION = [
  { value: 0, label: "Keep forever" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function AdvisorSettingsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Advisor fields used to persist on every blur and every select change,
  // which meant a stray Tab keypress wrote to the database and there was no
  // way to back out. They're staged in the shared draft now and committed by
  // the page-level Save. Memories stay immediate — they're list items with
  // their own add/remove affordances, not form fields.
  const { draft, set, isDirty, loading } = useSettingsForm();
  const [memories, setMemories] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [memBusy, setMemBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("advisor_memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMemories((data as never) || []));
  }, [user]);

  const addMemory = async () => {
    if (!user || !newMemory.trim()) return;
    setMemBusy(true);
    const { data, error } = await supabase
      .from("advisor_memories")
      .insert({ user_id: user.id, content: newMemory.trim().slice(0, 500) })
      .select()
      .single();
    setMemBusy(false);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't save that memory", description: error.message });
      return;
    }
    if (data) setMemories((p) => [data as never, ...p]);
    setNewMemory("");
  };

  const removeMemory = async (id: string) => {
    const { error } = await supabase.from("advisor_memories").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't forget that", description: error.message });
      return;
    }
    setMemories((p) => p.filter((m) => m.id !== id));
  };

  const clearAllMemories = async () => {
    if (!user) return;
    const { error } = await supabase.from("advisor_memories").delete().eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't clear memories", description: error.message });
      return;
    }
    setMemories([]);
  };

  const exportAllChats = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("voice_advisor_sessions")
      .select("*")
      .eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Export failed", description: error.message });
      return;
    }
    const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathforge-advisor-chats-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: "Your conversations were downloaded as JSON." });
  };

  const deleteAllChats = async () => {
    if (!user) return;
    if (!confirm("Delete every advisor conversation? This cannot be undone.")) return;
    const { error } = await supabase.from("voice_advisor_sessions").delete().eq("user_id", user.id);
    if (error) {
      toast({ variant: "destructive", title: "Couldn't delete conversations", description: error.message });
      return;
    }
    toast({ title: "All conversations deleted" });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SettingsSection
      title="Advisor"
      description="Customize how the Pathforge Advisor talks, thinks, and remembers."
    >
      <SettingsCard title="Customize the advisor" description="The advisor will use these notes in every conversation.">
        <div className="space-y-5">
          <TextField
            label="What should the advisor call you?"
            maxLength={80}
            value={draft.nickname}
            onChange={(v) => set("nickname", v)}
            dirty={isDirty("nickname")}
            placeholder="e.g. Alex"
          />
          <TextField
            label="What do you do?"
            maxLength={500}
            rows={2}
            value={draft.occupation}
            onChange={(v) => set("occupation", v)}
            dirty={isDirty("occupation")}
            placeholder="Grade 11 student aiming for CS at MIT, Stanford…"
          />
          <TextField
            label="What traits should the advisor have?"
            maxLength={500}
            rows={2}
            value={draft.traits}
            onChange={(v) => set("traits", v)}
            dirty={isDirty("traits")}
            placeholder="Direct, witty, challenges my thinking, no fluff…"
          />
          <TextField
            label="Anything else the advisor should know?"
            maxLength={1500}
            rows={3}
            value={draft.extra_notes}
            onChange={(v) => set("extra_notes", v)}
            dirty={isDirty("extra_notes")}
            placeholder="Context, constraints, preferences…"
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Model & reasoning" description="Pick the model and how hard it thinks before replying.">
        <SettingsRow label="Model" description="Used for chat and artifact generation." dirty={isDirty("model")}>
          {/* Resolved through modelFromGateway so an account still holding a
              retired preview id shows the tier it maps to, not an empty box. */}
          <Select
            value={modelFromGateway(draft.model).gateway}
            onValueChange={(v) => set("model", v)}
            disabled={loading}
          >
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Reasoning effort"
          description="More effort = better answers, slower replies."
          dirty={isDirty("reasoning_effort")}
        >
          <Select
            value={draft.reasoning_effort}
            onValueChange={(v) => set("reasoning_effort", v as typeof draft.reasoning_effort)}
            disabled={loading}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Off</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="extra">Extra</SelectItem>
              <SelectItem value="max">Max</SelectItem>
              <SelectItem value="ultracode">Ultracode</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          label={`Creativity · ${draft.temperature.toFixed(2)}`}
          description="0 = focused & deterministic, 1 = exploratory."
          dirty={isDirty("temperature")}
        >
          <div className="w-48">
            <Slider
              value={[draft.temperature]}
              min={0} max={1} step={0.05}
              onValueChange={([v]) => set("temperature", v)}
              disabled={loading}
            />
          </div>
        </SettingsRow>
        <SettingsRow
          label={`Max response length · ${draft.max_response_tokens}`}
          description="Upper bound on each reply."
          dirty={isDirty("max_response_tokens")}
        >
          <div className="w-48">
            <Slider
              value={[draft.max_response_tokens]}
              min={400} max={4000} step={100}
              onValueChange={([v]) => set("max_response_tokens", v)}
              disabled={loading}
            />
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Memory" description="The advisor can remember facts between conversations.">
        <SettingsRow
          label="Enable memory"
          description="When off, the advisor forgets you between sessions."
          dirty={isDirty("memory_enabled")}
        >
          <Switch
            checked={draft.memory_enabled}
            onCheckedChange={(v) => set("memory_enabled", v)}
            disabled={loading}
          />
        </SettingsRow>

        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add something to remember…"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMemory(); } }}
              disabled={!draft.memory_enabled || memBusy}
            />
            <Button onClick={addMemory} disabled={!draft.memory_enabled || memBusy || !newMemory.trim()} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>

          {memories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved memories yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
              {memories.map((m) => (
                <div key={m.id} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 text-sm">
                  <span className="flex-1">{m.content}</span>
                  <button
                    onClick={() => removeMemory(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Forget"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {memories.length > 0 && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={clearAllMemories}>
              Clear all memories
            </Button>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Voice & suggestions">
        <SettingsRow
          label="Autoplay voice replies"
          description="Speak the advisor's answer aloud."
          dirty={isDirty("autoplay_voice")}
        >
          <Switch
            checked={draft.autoplay_voice}
            onCheckedChange={(v) => set("autoplay_voice", v)}
            disabled={loading}
          />
        </SettingsRow>
        <SettingsRow
          label="Show suggested follow-ups"
          description="Quick-pick chips after each reply."
          dirty={isDirty("show_suggestions")}
        >
          <Switch
            checked={draft.show_suggestions}
            onCheckedChange={(v) => set("show_suggestions", v)}
            disabled={loading}
          />
        </SettingsRow>
        <SettingsRow
          label="Show artifact previews"
          description="Auto-open the artifacts panel when something is created."
          dirty={isDirty("show_artifact_previews")}
        >
          <Switch
            checked={draft.show_artifact_previews}
            onCheckedChange={(v) => set("show_artifact_previews", v)}
            disabled={loading}
          />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Data controls">
        <SettingsRow label="Chat retention" dirty={isDirty("history_retention_days")}>
          <Select
            value={String(draft.history_retention_days)}
            onValueChange={(v) => set("history_retention_days", Number(v))}
            disabled={loading}
          >
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RETENTION.map((r) => <SelectItem key={r.value} value={String(r.value)}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Export all chats" description="Download your full advisor history as JSON.">
          <Button variant="outline" size="sm" onClick={exportAllChats}>Export JSON</Button>
        </SettingsRow>
        <SettingsRow label="Delete all chats" description="Permanently delete every conversation.">
          <Button variant="destructive" size="sm" onClick={deleteAllChats}>Delete everything</Button>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}

function TextField({
  label,
  value,
  onChange,
  dirty,
  rows,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dirty?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium">
        {label}
        {dirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Unsaved" aria-label="Unsaved change" />
        )}
      </label>
      {rows ? (
        <Textarea
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
