import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Send, Loader2, Megaphone, Rocket, FileText, Users, GraduationCap, Building2, User as UserIcon, Eye, History, CheckCircle2, AlertCircle, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type TargetKind = "all" | "grade" | "school" | "individual";
type Category = "custom" | "announcement" | "feature-release" | "template";

interface PresetTemplate {
  id: string;
  category: Category;
  label: string;
  description: string;
  icon: React.ElementType;
  data: {
    subject: string;
    heading: string;
    preview: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "welcome",
    category: "template",
    label: "Welcome",
    description: "Greet new students after sign-up.",
    icon: Mail,
    data: {
      subject: "Welcome to Pathforge",
      heading: "Welcome to Pathforge",
      preview: "Your college roadmap starts here.",
      body:
        "Hi there,\n\nWelcome to Pathforge — the platform built to help you plan, build, and refine your path to top universities.\n\nLog in to complete your profile and unlock your personalized roadmap.",
      ctaLabel: "Open Pathforge",
      ctaUrl: "https://pathforge.co.in",
    },
  },
  {
    id: "feature-release",
    category: "feature-release",
    label: "Feature release",
    description: "Tell users about a new feature.",
    icon: Rocket,
    data: {
      subject: "New on Pathforge: <feature name>",
      heading: "<Feature> is here",
      preview: "A new way to <benefit> on Pathforge.",
      body:
        "Hi there,\n\nWe just shipped <feature> — <one-line value prop>.\n\nWhy it matters:\n- <bullet 1>\n- <bullet 2>\n- <bullet 3>\n\nLog in to try it now.",
      ctaLabel: "Try it now",
      ctaUrl: "https://pathforge.co.in",
    },
  },
  {
    id: "announcement",
    category: "announcement",
    label: "Announcement",
    description: "Share an important platform update.",
    icon: Megaphone,
    data: {
      subject: "Important update from Pathforge",
      heading: "An update for the community",
      preview: "Quick update from the Pathforge team.",
      body:
        "Hi there,\n\n<your message here>\n\nThanks for being part of Pathforge.",
      ctaLabel: "Open Pathforge",
      ctaUrl: "https://pathforge.co.in",
    },
  },
  {
    id: "reminder",
    category: "template",
    label: "Reminder",
    description: "Nudge users to take an action.",
    icon: FileText,
    data: {
      subject: "Don't forget — <action>",
      heading: "A quick reminder",
      preview: "<short reminder>",
      body:
        "Hi there,\n\nJust a reminder to <action> on Pathforge. It only takes a few minutes and helps us tailor your roadmap.\n\nSee you inside.",
      ctaLabel: "Take me there",
      ctaUrl: "https://pathforge.co.in",
    },
  },
];

interface Facets {
  grades: string[];
  schools: string[];
  totalUsers: number;
}

interface CampaignRow {
  id: string;
  category: string;
  subject: string;
  target_kind: string;
  total_recipients: number;
  total_queued: number;
  total_skipped: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface UserSearchRow {
  user_id: string;
  email: string;
  full_name?: string | null;
  username?: string | null;
}

export function AdminEmails() {
  const { toast } = useToast();

  // Composer state
  const [category, setCategory] = useState<Category>("custom");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [preview, setPreview] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // Targeting
  const [targetKind, setTargetKind] = useState<TargetKind>("all");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<UserSearchRow[]>([]);
  const [searching, setSearching] = useState(false);

  // Facets + history
  const [facets, setFacets] = useState<Facets>({ grades: [], schools: [], totalUsers: 0 });
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [tab, setTab] = useState("compose");

  // Send + preview
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    void loadFacets();
    void loadCampaigns();
  }, []);

  // Debounced user search
  useEffect(() => {
    if (targetKind !== "individual" || !userSearch.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const term = `%${userSearch.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, username")
        .or(`email.ilike.${term},full_name.ilike.${term},username.ilike.${term}`)
        .limit(20);
      setUserSearchResults((data as any) || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [userSearch, targetKind]);

  async function loadFacets() {
    const { data, error } = await supabase.rpc("admin_list_targeting_facets");
    if (!error && data) setFacets(data as any);
  }

  async function loadCampaigns() {
    setHistoryLoading(true);
    const { data } = await supabase
      .from("email_campaigns")
      .select("id, category, subject, target_kind, total_recipients, total_queued, total_skipped, status, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setCampaigns((data as any) || []);
    setHistoryLoading(false);
  }

  function applyTemplate(t: PresetTemplate) {
    setTemplateKey(t.id);
    setCategory(t.category);
    setSubject(t.data.subject);
    setHeading(t.data.heading);
    setPreview(t.data.preview);
    setBody(t.data.body);
    setCtaLabel(t.data.ctaLabel || "");
    setCtaUrl(t.data.ctaUrl || "");
    setTab("compose");
  }

  function resetComposer() {
    setSubject(""); setHeading(""); setPreview(""); setBody("");
    setCtaLabel(""); setCtaUrl(""); setTemplateKey(null); setCategory("custom");
  }

  function buildPayload(testTo?: string) {
    const targetFilter: Record<string, unknown> = {};
    if (targetKind === "grade") targetFilter.grades = selectedGrades;
    if (targetKind === "school") targetFilter.schools = selectedSchools;
    if (targetKind === "individual") targetFilter.userIds = selectedUsers.map((u) => u.user_id);
    return {
      category,
      templateKey,
      subject: subject.trim(),
      heading: heading.trim() || subject.trim(),
      preview: preview.trim() || undefined,
      body,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      targetKind,
      targetFilter,
      testEmail: testTo || undefined,
    };
  }

  function validate(): string | null {
    if (!subject.trim()) return "Subject is required.";
    if (!body.trim()) return "Body is required.";
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) return "CTA URL must start with http:// or https://";
    if (targetKind === "grade" && selectedGrades.length === 0) return "Select at least one grade.";
    if (targetKind === "school" && selectedSchools.length === 0) return "Select at least one school.";
    if (targetKind === "individual" && selectedUsers.length === 0) return "Select at least one user.";
    return null;
  }

  async function send(testTo?: string) {
    const err = validate();
    if (err) { toast({ variant: "destructive", title: "Cannot send", description: err }); return; }
    if (!testTo && !confirm(`Send this email to the selected recipients?`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-bulk-email", {
        body: buildPayload(testTo),
      });
      if (error) throw error;
      const d = data as any;
      toast({
        title: testTo ? "Test email queued" : "Campaign sent",
        description: testTo
          ? `Sent test to ${testTo}.`
          : `Queued ${d?.queued ?? 0} of ${d?.totalRecipients ?? 0} recipients.${d?.skipped ? ` Skipped ${d.skipped}.` : ""}`,
      });
      if (!testTo) {
        resetComposer();
        await loadCampaigns();
        setTab("history");
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Send failed",
        description: e?.message || "Unknown error.",
      });
    } finally {
      setSending(false);
    }
  }

  const targetSummary = useMemo(() => {
    if (targetKind === "all") return `All users (${facets.totalUsers})`;
    if (targetKind === "grade") return `${selectedGrades.length} grade${selectedGrades.length === 1 ? "" : "s"} selected`;
    if (targetKind === "school") return `${selectedSchools.length} school${selectedSchools.length === 1 ? "" : "s"} selected`;
    return `${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"} selected`;
  }, [targetKind, selectedGrades, selectedSchools, selectedUsers, facets.totalUsers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" /> Emails
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Send branded campaign emails to your users from <span className="font-medium text-foreground">notify.pathforge.co.in</span>.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Domain verified
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="compose"><Mail className="h-3.5 w-3.5 mr-1.5" /> Compose</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-3.5 w-3.5 mr-1.5" /> Templates</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" /> History</TabsTrigger>
        </TabsList>

        {/* Compose */}
        <TabsContent value="compose" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Composer */}
            <Card className="lg:col-span-2 border-border/60">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="feature-release">Feature release</SelectItem>
                        <SelectItem value="template">Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input value="Pathforge <noreply@pathforge.co.in>" readOnly className="mt-1.5 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Subject *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A short, clear subject line" className="mt-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Heading (in email)</Label>
                    <Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Defaults to subject" className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs">Inbox preview text</Label>
                    <Input value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Optional one-liner shown in the inbox" className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Body *</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your message. Separate paragraphs with a blank line."
                    rows={10}
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Plain text. Blank lines start new paragraphs. Branding, CTA, footer & unsubscribe link are added automatically.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">CTA label (optional)</Label>
                    <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Open Pathforge" className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-xs">CTA URL (optional)</Label>
                    <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://pathforge.co.in/dashboard" className="mt-1.5" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!subject || !body}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                  </Button>
                  <div className="flex items-center gap-2 ml-auto">
                    <Input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@you.com"
                      className="h-9 w-48"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sending || !testEmail}
                      onClick={() => send(testEmail)}
                    >
                      Send test
                    </Button>
                    <Button size="sm" disabled={sending} onClick={() => send()}>
                      {sending
                        ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
                        : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send campaign</>}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targeting */}
            <Card className="border-border/60">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label className="text-xs">Send to</Label>
                  <Select value={targetKind} onValueChange={(v) => setTargetKind(v as TargetKind)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all"><span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5" /> All users</span></SelectItem>
                      <SelectItem value="grade"><span className="inline-flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> By grade</span></SelectItem>
                      <SelectItem value="school"><span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> By school</span></SelectItem>
                      <SelectItem value="individual"><span className="inline-flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" /> Individual users</span></SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1.5">{targetSummary}</p>
                </div>

                {targetKind === "grade" && (
                  <MultiPicker
                    label="Grades"
                    options={facets.grades}
                    selected={selectedGrades}
                    onToggle={(g) => setSelectedGrades((s) => s.includes(g) ? s.filter((x) => x !== g) : [...s, g])}
                  />
                )}

                {targetKind === "school" && (
                  <MultiPicker
                    label="Schools"
                    options={facets.schools}
                    selected={selectedSchools}
                    onToggle={(s) => setSelectedSchools((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])}
                    searchable
                  />
                )}

                {targetKind === "individual" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Search users</Label>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Email, name, or username"
                        className="pl-8"
                      />
                    </div>
                    {searching && <p className="text-[11px] text-muted-foreground">Searching…</p>}
                    {userSearchResults.length > 0 && (
                      <ScrollArea className="h-40 rounded-md border border-border/60 p-1">
                        {userSearchResults.map((u) => {
                          const checked = !!selectedUsers.find((s) => s.user_id === u.user_id);
                          return (
                            <button
                              key={u.user_id}
                              onClick={() => setSelectedUsers((s) =>
                                checked ? s.filter((x) => x.user_id !== u.user_id) : [...s, u]
                              )}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-accent/10 ${checked ? "bg-accent/10 text-accent" : ""}`}
                            >
                              <span className="truncate">{u.email} <span className="text-muted-foreground">{u.full_name || u.username || ""}</span></span>
                              {checked && <CheckCircle2 className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </ScrollArea>
                    )}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedUsers.map((u) => (
                          <Badge key={u.user_id} variant="secondary" className="gap-1 text-[11px]">
                            {u.email}
                            <button onClick={() => setSelectedUsers((s) => s.filter((x) => x.user_id !== u.user_id))}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="text-left rounded-xl border border-border/60 bg-card/60 hover:bg-accent/5 hover:border-accent/40 p-4 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">{t.label}</div>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{t.description}</p>
                  <p className="text-[11px] text-accent mt-3">Use template →</p>
                </button>
              );
            })}
          </div>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              {historyLoading ? (
                <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
              ) : campaigns.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="py-2 pr-3">Subject</th>
                        <th className="py-2 px-2">Category</th>
                        <th className="py-2 px-2">Audience</th>
                        <th className="py-2 px-2">Recipients</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 pl-2">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 pr-3 max-w-[320px]">
                            <div className="font-medium text-foreground truncate">{c.subject}</div>
                          </td>
                          <td className="py-2.5 px-2"><Badge variant="outline" className="text-[10px] capitalize">{c.category}</Badge></td>
                          <td className="py-2.5 px-2 capitalize text-muted-foreground">{c.target_kind}</td>
                          <td className="py-2.5 px-2 text-muted-foreground">
                            {c.total_queued}/{c.total_recipients}
                            {c.total_skipped > 0 && <span className="text-amber-600 dark:text-amber-400 ml-1">· {c.total_skipped} skipped</span>}
                          </td>
                          <td className="py-2.5 px-2">
                            {c.status === "sent" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Sent</Badge>
                            ) : c.status === "failed" ? (
                              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-1" /> Failed</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                            )}
                          </td>
                          <td className="py-2.5 pl-2 text-muted-foreground whitespace-nowrap">
                            {c.sent_at ? new Date(c.sent_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[61rem]">
          <DialogHeader><DialogTitle>Email preview</DialogTitle></DialogHeader>
          <PreviewBox
            subject={subject} heading={heading || subject} preview={preview}
            body={body} ctaLabel={ctaLabel} ctaUrl={ctaUrl}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function MultiPicker({
  label, options, selected, onToggle, searchable,
}: {
  label: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => searchable && q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options,
    [options, q, searchable],
  );
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {searchable && (
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label.toLowerCase()}…`} className="h-8" />
      )}
      <ScrollArea className="h-48 rounded-md border border-border/60 p-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">No options yet — users haven't filled this in onboarding.</p>
        ) : (
          filtered.map((o) => {
            const checked = selected.includes(o);
            return (
              <button
                key={o}
                onClick={() => onToggle(o)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-accent/10 ${checked ? "bg-accent/10 text-accent" : ""}`}
              >
                <span className="truncate">{o}</span>
                {checked && <CheckCircle2 className="h-3 w-3" />}
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}

function PreviewBox({
  subject, heading, preview, body, ctaLabel, ctaUrl,
}: {
  subject: string; heading: string; preview: string;
  body: string; ctaLabel?: string; ctaUrl?: string;
}) {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="border border-border/60 rounded-lg overflow-hidden bg-white text-black">
      <div className="bg-gray-100 px-4 py-2 text-[11px] text-gray-600 border-b border-gray-200">
        <div><span className="font-semibold">From:</span> Pathforge &lt;noreply@pathforge.co.in&gt;</div>
        <div><span className="font-semibold">Subject:</span> {subject}</div>
        {preview && <div className="text-gray-500 italic">Preview: {preview}</div>}
      </div>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-3">{heading}</h2>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed mb-3 text-gray-700 whitespace-pre-wrap">{p}</p>
        ))}
        {ctaLabel && ctaUrl && (
          <a href={ctaUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 px-5 py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium no-underline">
            {ctaLabel}
          </a>
        )}
        <hr className="my-5 border-gray-200" />
        <p className="text-[11px] text-gray-400">
          You received this because you have a Pathforge account. Unsubscribe link is appended automatically.
        </p>
      </div>
    </div>
  );
}
