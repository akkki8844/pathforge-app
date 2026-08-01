import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, Sliders } from "lucide-react";
import { toast } from "sonner";

interface Weights {
  academics: number;
  competitions: number;
  activities: number;
  leadership: number;
  test_prep: number;
}

const DEFAULT_WEIGHTS: Weights = {
  academics: 30,
  competitions: 20,
  activities: 20,
  leadership: 15,
  test_prep: 15,
};

const RECORD_NAME = "scoring_weights_v1";

export function AdminAIControl() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("managed_content")
        .select("id, data")
        .eq("content_type", "ai_weights")
        .eq("name", RECORD_NAME)
        .maybeSingle();
      if (!error && data) {
        setRecordId(data.id);
        setWeights({ ...DEFAULT_WEIGHTS, ...(data.data as any) });
      }
      setLoading(false);
    }
    load();
  }, []);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleSave = async () => {
    if (total !== 100) {
      toast.error(`Weights must sum to 100. Currently ${total}.`);
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      content_type: "ai_weights",
      name: RECORD_NAME,
      data: weights as any,
      is_active: true,
      created_by: userData.user?.id,
    };
    const { error } = recordId
      ? await supabase.from("managed_content").update(payload).eq("id", recordId)
      : await supabase.from("managed_content").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("AI scoring weights updated");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sliders className="h-6 w-6" /> AI Control Panel
        </h2>
        <p className="text-muted-foreground">Tune scoring weights used across recommendations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journey Score Weights</CardTitle>
          <CardDescription>Total must equal 100. Current total: <strong>{total}</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(Object.keys(weights) as Array<keyof Weights>).map((key) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="capitalize">{key.replace("_", " ")}</Label>
                <Input
                  type="number"
                  className="w-20"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
                  }
                />
              </div>
              <Slider
                value={[weights[key]]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setWeights((w) => ({ ...w, [key]: v }))}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving || total !== 100}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Weights
            </Button>
            <Button variant="outline" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
