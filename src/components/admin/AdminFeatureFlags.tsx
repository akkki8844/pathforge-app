import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Flag, Percent } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number | null;
  target_users: string[] | null;
  created_at: string;
  updated_at: string;
}

export function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlags();
  }, []);

  async function fetchFlags() {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching flags:", error);
      } else {
        setFlags(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFlag(id: string, currentValue: boolean) {
    const newValue = !currentValue;
    // Optimistic flip
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_enabled: newValue } : f))
    );
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        // Roll back
        setFlags((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_enabled: currentValue } : f))
        );
        toast({
          title: "Error",
          description: "Failed to update feature flag",
          variant: "destructive",
        });
      } else {
        toast({
          title: newValue ? "Flag enabled" : "Flag disabled",
          description: `Change is live for users matching the rollout rules.`,
        });
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Feature Flags</h2>
          <p className="text-muted-foreground">Control feature rollouts and A/B testing</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Flag
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            All Feature Flags
          </CardTitle>
          <CardDescription>{flags.length} flags configured</CardDescription>
        </CardHeader>
        <CardContent>
          {flags.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Rollout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Toggle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell className="font-mono text-sm">{flag.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {flag.description || "-"}
                    </TableCell>
                    <TableCell>
                      {flag.rollout_percentage !== null ? (
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {flag.rollout_percentage}%
                        </div>
                      ) : (
                        <span className="text-muted-foreground">100%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={flag.is_enabled ? "default" : "secondary"}>
                        {flag.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(flag.updated_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={() => toggleFlag(flag.id, flag.is_enabled)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No feature flags configured</p>
              <p className="text-sm">Create a flag to control feature rollouts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
