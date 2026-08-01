import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, AlertTriangle, Ban, CheckCircle, MessageSquareWarning, Flame } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface UserFlag {
  id: string;
  user_id: string;
  flag_type: string;
  reason: string;
  notes: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  flagged_by: string;
}

interface FlaggedPrompt {
  id: string;
  user_id: string | null;
  email: string | null;
  username: string | null;
  feature: string;
  prompt: string;
  severity: "low" | "medium" | "high";
  ai_verdict: string | null;
  categories: string[];
  reviewed: boolean;
  reviewed_at: string | null;
  action_taken: string | null;
  created_at: string;
}

const severityBadge = (s: string) => {
  if (s === "high") return <Badge variant="destructive">High</Badge>;
  if (s === "medium") return <Badge className="bg-orange-500/15 text-orange-500 border border-orange-500/30">Medium</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Low</Badge>;
};

export function AdminModeration() {
  const [flags, setFlags] = useState<UserFlag[]>([]);
  const [prompts, setPrompts] = useState<FlaggedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("prompts");
  const { toast } = useToast();

  async function load() {
    setLoading(true);
    const [flagsRes, promptsRes] = await Promise.all([
      supabase.from("user_flags").select("*").order("created_at", { ascending: false }),
      supabase.rpc("admin_list_flagged_prompts" as any, { _limit: 200, _only_unreviewed: false }),
    ]);
    if (flagsRes.error) console.error(flagsRes.error);
    else setFlags(flagsRes.data || []);
    if (promptsRes.error) console.error(promptsRes.error);
    else setPrompts((promptsRes.data as unknown as FlaggedPrompt[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolveFlag(id: string) {
    const { error } = await supabase.from("user_flags").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: false } : f)));
    toast({ title: "Resolved" });
  }

  async function reviewPrompt(id: string, action: string) {
    const { error } = await supabase.rpc("admin_review_flagged_prompt" as any, { _id: id, _action: action });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: action === "dismiss" ? "Dismissed" : "Action recorded" });
    load();
  }

  async function suspendUser(userId: string | null, reason: string) {
    if (!userId) return;
    const { error } = await supabase.rpc("admin_flag_user" as any, {
      _target_user_id: userId,
      _flag_type: "suspension",
      _reason: `Auto-flag escalation: ${reason}`.slice(0, 500),
      _notes: null,
      _expires_at: null,
    });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "User suspended" });
    load();
  }

  const activeFlags = flags.filter((f) => f.is_active);
  const resolvedFlags = flags.filter((f) => !f.is_active);
  const unreviewedPrompts = prompts.filter((p) => !p.reviewed);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Moderation</h2>
        <p className="text-muted-foreground text-sm">Auto-flagged prompts, user warnings, suspensions, and bans.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Flame, label: "Auto-flagged (open)", value: unreviewedPrompts.length, color: "text-red-500" },
          { icon: AlertTriangle, label: "Warnings", value: activeFlags.filter(f => f.flag_type === "warning").length, color: "text-yellow-500" },
          { icon: Shield, label: "Suspensions", value: activeFlags.filter(f => f.flag_type === "suspension").length, color: "text-orange-500" },
          { icon: Ban, label: "Bans", value: activeFlags.filter(f => f.flag_type === "ban").length, color: "text-red-500" },
          { icon: CheckCircle, label: "Resolved flags", value: resolvedFlags.length, color: "text-green-500" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/60">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="prompts">
            <MessageSquareWarning className="h-4 w-4 mr-1.5" /> Auto-flagged ({unreviewedPrompts.length})
          </TabsTrigger>
          <TabsTrigger value="active">Active Flags ({activeFlags.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedFlags.length})</TabsTrigger>
        </TabsList>

        {/* Auto-flagged prompts */}
        <TabsContent value="prompts" className="mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Auto-flagged prompts</CardTitle>
              <CardDescription>
                Every prompt sent to the AI is screened. Anything classified as harassment, hate, sexual, self-harm, or injection is logged here with the full text.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prompts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500/70" />
                  <p className="font-medium">No flagged prompts</p>
                  <p className="text-sm">Auto-moderation is wired up and listening across Voice Advisor, Support Chat, and Refiners.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prompts.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-4 ${p.reviewed ? "border-border/40 opacity-70" : "border-border bg-card"}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {severityBadge(p.severity)}
                          <Badge variant="outline" className="font-mono text-xs">{p.feature}</Badge>
                          {p.categories?.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                          {p.reviewed && <Badge variant="outline" className="text-green-500 border-green-500/40">Reviewed</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>

                      <div className="text-sm mb-2">
                        <span className="text-muted-foreground">User: </span>
                        <span className="font-medium">{p.username || p.email || "Unknown"}</span>
                        {p.email && p.username && <span className="text-muted-foreground"> · {p.email}</span>}
                        {p.user_id && <span className="text-muted-foreground font-mono text-xs ml-2">{p.user_id.slice(0, 8)}…</span>}
                      </div>

                      <div className="bg-muted/40 border border-border/50 rounded p-3 text-sm whitespace-pre-wrap break-words mb-2">
                        {p.prompt}
                      </div>

                      {p.ai_verdict && (
                        <p className="text-xs text-muted-foreground mb-3">
                          <span className="font-medium text-foreground">Classifier:</span> {p.ai_verdict}
                        </p>
                      )}

                      {!p.reviewed && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => reviewPrompt(p.id, "dismiss")}>
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-500/40 text-orange-500 hover:bg-orange-500/10"
                            onClick={() => p.user_id && suspendUser(p.user_id, p.ai_verdict || "abusive content")}
                            disabled={!p.user_id}
                          >
                            <Shield className="h-3.5 w-3.5 mr-1.5" /> Suspend user
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => reviewPrompt(p.id, "noted")}>
                            Mark reviewed
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active flags */}
        <TabsContent value="active" className="mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Active flags</CardTitle>
              <CardDescription>Users currently flagged or restricted.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeFlags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeFlags.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell><Badge variant={f.flag_type === "ban" ? "destructive" : "outline"} className="capitalize">{f.flag_type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{f.user_id.slice(0, 8)}…</TableCell>
                        <TableCell className="max-w-md text-sm">{f.reason}</TableCell>
                        <TableCell className="text-sm">{f.expires_at ? format(new Date(f.expires_at), "MMM d, yyyy") : "Never"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(f.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => resolveFlag(f.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500/70" />
                  <p>No active flags. All users in good standing.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolved */}
        <TabsContent value="resolved" className="mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Resolved flags</CardTitle>
              <CardDescription>Previously resolved moderation actions.</CardDescription>
            </CardHeader>
            <CardContent>
              {resolvedFlags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedFlags.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell><Badge variant="outline" className="capitalize">{f.flag_type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{f.user_id.slice(0, 8)}…</TableCell>
                        <TableCell className="max-w-md text-sm">{f.reason}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{format(new Date(f.created_at), "MMM d, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground text-sm">No resolved flags yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
