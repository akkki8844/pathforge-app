import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsSection, SettingsCard, SettingsRow } from "../SettingsShell";
import { useToast } from "@/hooks/use-toast";
import { useAdvisorSettings } from "@/hooks/useAdvisorSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Loader2, Plus } from "lucide-react";

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (reasoning)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (most capable)" },
];

const RETENTION = [
  { value: 0, label: "Keep forever" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function AdvisorSettingsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings, loading, save } = useAdvisorSettings();
  const [local, setLocal] = useState(settings);
  const [memories, setMemories] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [memBusy, setMemBusy] = useState(false);

  useEffect(() => setLocal(settings), [settings]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("advisor_memories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMemories((data as any) || []));
  }, [user]);

  const persist = async (patch: Partial<typeof local>) => {
    setLocal((p) => ({ ...p, ...patch }));
    try {
      await save(patch);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not save", description: e.message });
    }
  };

  const addMemory = async () => {
    if (!user || !newMemory.trim()) return;
    setMemBusy(true);
    const { data } = await supabase
      .from("advisor_memories")
      .insert({ user_id: user.id, content: newMemory.trim().slice(0, 500) })
      .select()
      .single();
    if (data) setMemories((p) => [data as any, ...p]);
    setNewMemory("");
    setMemBusy(false);
  };

  const removeMemory = async (id: string) => {
    await supabase.from("advisor_memories").delete().eq("id", id);
    setMemories((p) => p.filter((m) => m.id !== id));
  };

  const clearAllMemories = async () => {
    if (!user) return;
    await supabase.from("advisor_memories").delete().eq("user_id", user.id);
    setMemories([]);
  };

  const exportAllChats = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voice_advisor_sessions")
      .select("*")
      .eq("user_id", user.id);
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
    await supabase.from("voice_advisor_sessions").delete().eq("user_id", user.id);
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What should the advisor call you?</label>
            <Input
              maxLength={80}
              value={local.nickname}
              onChange={(e) => setLocal({ ...local, nickname: e.target.value })}
              onBlur={() => persist({ nickname: local.nickname })}
              placeholder="e.g. Alex"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What do you do?</label>
            <Textarea
              maxLength={500}
              rows={2}
              value={local.occupation}
              onChange={(e) => setLocal({ ...local, occupation: e.target.value })}
              onBlur={() => persist({ occupation: local.occupation })}
              placeholder="Grade 11 student aiming for CS at MIT, Stanford…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">What traits should the advisor have?</label>
            <Textarea
              maxLength={500}
              rows={2}
              value={local.traits}
              onChange={(e) => setLocal({ ...local, traits: e.target.value })}
              onBlur={() => persist({ traits: local.traits })}
              placeholder="Direct, witty, challenges my thinking, no fluff…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Anything else the advisor should know?</label>
            <Textarea
              maxLength={1500}
              rows={3}
              value={local.extra_notes}
              onChange={(e) => setLocal({ ...local, extra_notes: e.target.value })}
              onBlur={() => persist({ extra_notes: local.extra_notes })}
              placeholder="Context, constraints, preferences…"
            />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Model & reasoning" description="Pick the model and how hard it thinks before replying.">
        <SettingsRow label="Model" description="Used for chat and artifact generation.">
          <Select value={local.model} onValueChange={(v) => persist({ model: v })}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Reasoning effort" description="More effort = better answers, slower replies.">
          <Select value={local.reasoning_effort} onValueChange={(v: any) => persist({ reasoning_effort: v })}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Off</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label={`Creativity · ${local.temperature.toFixed(2)}`} description="0 = focused & deterministic, 1 = exploratory.">
          <div className="w-48">
            <Slider
              value={[local.temperature]}
              min={0} max={1} step={0.05}
              onValueChange={([v]) => setLocal({ ...local, temperature: v })}
              onValueCommit={([v]) => persist({ temperature: v })}
            />
          </div>
        </SettingsRow>
        <SettingsRow label={`Max response length · ${local.max_response_tokens}`} description="Upper bound on each reply.">
          <div className="w-48">
            <Slider
              value={[local.max_response_tokens]}
              min={400} max={4000} step={100}
              onValueChange={([v]) => setLocal({ ...local, max_response_tokens: v })}
              onValueCommit={([v]) => persist({ max_response_tokens: v })}
            />
          </div>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Memory" description="The advisor can remember facts between conversations.">
        <SettingsRow label="Enable memory" description="When off, the advisor forgets you between sessions.">
          <Switch checked={local.memory_enabled} onCheckedChange={(v) => persist({ memory_enabled: v })} />
        </SettingsRow>

        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add something to remember…"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMemory(); } }}
              disabled={!local.memory_enabled || memBusy}
            />
            <Button onClick={addMemory} disabled={!local.memory_enabled || memBusy || !newMemory.trim()} size="sm">
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
        <SettingsRow label="Autoplay voice replies" description="Speak the advisor's answer aloud.">
          <Switch checked={local.autoplay_voice} onCheckedChange={(v) => persist({ autoplay_voice: v })} />
        </SettingsRow>
        <SettingsRow label="Show suggested follow-ups" description="Quick-pick chips after each reply.">
          <Switch checked={local.show_suggestions} onCheckedChange={(v) => persist({ show_suggestions: v })} />
        </SettingsRow>
        <SettingsRow label="Show artifact previews" description="Auto-open the artifacts panel when something is created.">
          <Switch checked={local.show_artifact_previews} onCheckedChange={(v) => persist({ show_artifact_previews: v })} />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title="Data controls">
        <SettingsRow label="Chat retention">
          <Select
            value={String(local.history_retention_days)}
            onValueChange={(v) => persist({ history_retention_days: Number(v) })}
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
