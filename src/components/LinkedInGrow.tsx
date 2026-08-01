import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Loader2, Users, Calendar, Target, Award, MessageSquare, Copy, Check, ChevronRight, RefreshCw, Lightbulb, Trophy, ExternalLink, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCreditConsumed } from "@/hooks/useCredits";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedInImport } from "@/hooks/useLinkedInImport";

interface OutreachItem {
  category: string;
  title: string;
  why: string;
  where: string;
  messageTemplate: string;
}
interface PostItem {
  type: string;
  topic: string;
  hook: string;
  outline: string;
  hashtags?: string[];
}
interface WeekPlan { week: number; theme: string; posts: PostItem[]; }
interface Habit { frequency: string; action: string; why: string; }
interface Group { name: string; why: string; }
interface GrowPlan {
  summary: string;
  outreach: OutreachItem[];
  contentPlan: WeekPlan[];
  engagementHabits: Habit[];
  skillsToAdd: string[];
  groupsToJoin: Group[];
  milestones30_60_90: { day30: string[]; day60: string[]; day90: string[]; };
}

export default function LinkedInGrow() {
  const { onboardingData } = useAuth();
  const { linkedinImport, refetch } = useLinkedInImport();
  const [plan, setPlan] = useState<GrowPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (linkedinImport?.grow_plan) setPlan(linkedinImport.grow_plan as GrowPlan);
  }, [linkedinImport]);

  const generate = async () => {
    if (!linkedinImport) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("linkedin-grow", {
        body: {
          major: onboardingData?.intended_major || "",
          targetCollege: onboardingData?.target_universities?.[0] || "",
          country: onboardingData?.country || "",
          grade: onboardingData?.grade || "",
          activities: onboardingData?.areas_of_interest || [],
        },
      });
      if (error) {
        if (error.message?.includes("402")) toast.error("Credits exhausted. Upgrade your plan.");
        else if (error.message?.includes("429")) toast.error("Rate limit. Try again in a moment.");
        else toast.error("Failed to generate growth plan.");
        return;
      }
      if (data?.error) { toast.error(data.error); return; }
      if (data?.plan) {
        setPlan(data.plan);
        notifyCreditConsumed();
        refetch();
        toast.success("Your personalized Grow plan is ready!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error generating plan.");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied!");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (!plan && !loading) {
    return (
      <div className="card-elevated p-8 text-center">
        <Linkedin className="h-12 w-12 text-accent mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Generate your Grow plan</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          A personalized LinkedIn growth strategy — exactly who to reach out to, what to post, and how to grow for{" "}
          <span className="font-medium text-foreground">{onboardingData?.intended_major || "your major"}</span>.
        </p>
        <Button onClick={generate} disabled={loading} size="lg" className="btn-accent">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate my Grow plan
        </Button>
        <p className="text-xs text-muted-foreground mt-3">Powered by an advanced reasoning model · Uses 1 credit</p>
      </div>
    );
  }

  if (loading && !plan) {
    return (
      <div className="card-elevated p-12 text-center">
        <Loader2 className="h-10 w-10 text-accent animate-spin mx-auto mb-4" />
        <p className="text-foreground font-medium">Crafting your personalized growth strategy…</p>
        <p className="text-sm text-muted-foreground mt-1">This can take 20–40 seconds.</p>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="card-elevated p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-accent" />
              Your Grow Plan
            </h2>
            <p className="text-muted-foreground mt-2 leading-relaxed">{plan.summary}</p>
            {linkedinImport?.linkedin_url && (
              <a
                href={linkedinImport.linkedin_url}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-accent hover:underline"
              >
                <Linkedin className="h-4 w-4" />
                {linkedinImport.linkedin_url.replace(/^https?:\/\//, "")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-2" />Regenerate</>}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted p-1">
          <TabsTrigger value="overview" className="flex-1 min-w-[120px]"><Target className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="outreach" className="flex-1 min-w-[120px]"><Users className="h-4 w-4 mr-1.5" />Outreach</TabsTrigger>
          <TabsTrigger value="content" className="flex-1 min-w-[120px]"><Calendar className="h-4 w-4 mr-1.5" />Content</TabsTrigger>
          <TabsTrigger value="habits" className="flex-1 min-w-[120px]"><MessageSquare className="h-4 w-4 mr-1.5" />Habits</TabsTrigger>
          <TabsTrigger value="growth" className="flex-1 min-w-[120px]"><Trophy className="h-4 w-4 mr-1.5" />Milestones</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Award className="h-4 w-4 text-accent" />Skills to add</h3>
              <div className="flex flex-wrap gap-2">
                {plan.skillsToAdd.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
            <div className="card-elevated p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-accent" />Groups to join</h3>
              <ul className="space-y-2">
                {plan.groupsToJoin.map((g) => (
                  <li key={g.name} className="text-sm">
                    <p className="font-medium text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="card-elevated p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Lightbulb className="h-4 w-4 text-accent" />Quick navigation</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { id: "outreach", label: "Whom to reach out to", count: plan.outreach.length },
                { id: "content", label: "What to post", count: plan.contentPlan.length + " weeks" },
                { id: "habits", label: "Daily / weekly habits", count: plan.engagementHabits.length },
                { id: "growth", label: "30 / 60 / 90 day milestones", count: "" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {item.count}<ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* OUTREACH */}
        <TabsContent value="outreach" className="mt-6 space-y-4">
          {plan.outreach.map((o, i) => {
            const key = `out-${i}`;
            return (
              <div key={key} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <span className="text-xs font-medium text-accent uppercase tracking-wide">{o.category}</span>
                    <h4 className="font-semibold text-foreground mt-1">{o.title}</h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3"><span className="font-medium text-foreground">Why: </span>{o.why}</p>
                <p className="text-sm text-muted-foreground mb-3"><span className="font-medium text-foreground">Where to find: </span>{o.where}</p>
                <div className="rounded-lg bg-muted/40 border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">Connect message template</span>
                    <Button size="sm" variant="ghost" onClick={() => copy(o.messageTemplate, key)}>
                      {copiedKey === key ? <><Check className="h-3.5 w-3.5 mr-1" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>}
                    </Button>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{o.messageTemplate}</p>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* CONTENT */}
        <TabsContent value="content" className="mt-6 space-y-4">
          {plan.contentPlan.map((w) => (
            <div key={w.week} className="card-elevated p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h4 className="font-semibold text-foreground">Week {w.week} · {w.theme}</h4>
              </div>
              <div className="space-y-3">
                {w.posts.map((p, i) => {
                  const key = `post-${w.week}-${i}`;
                  const fullPost = `${p.hook}\n\n${p.outline}${p.hashtags?.length ? "\n\n" + p.hashtags.join(" ") : ""}`;
                  return (
                    <div key={key} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{p.type}</span>
                        <Button size="sm" variant="ghost" onClick={() => copy(fullPost, key)}>
                          {copiedKey === key ? <><Check className="h-3.5 w-3.5 mr-1" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>}
                        </Button>
                      </div>
                      <p className="font-medium text-foreground text-sm">{p.topic}</p>
                      <p className="text-sm text-muted-foreground mt-1 italic">"{p.hook}"</p>
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{p.outline}</p>
                      {p.hashtags?.length ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.hashtags.map((h) => <span key={h} className="text-xs text-accent">{h}</span>)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* HABITS */}
        <TabsContent value="habits" className="mt-6 space-y-3">
          {plan.engagementHabits.map((h, i) => (
            <div key={i} className="card-elevated p-4 flex items-start gap-3">
              <div className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium flex-shrink-0">{h.frequency}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{h.action}</p>
                <p className="text-xs text-muted-foreground mt-1">{h.why}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="growth" className="mt-6 grid md:grid-cols-3 gap-4">
          {[
            { label: "30 Days", items: plan.milestones30_60_90.day30, color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
            { label: "60 Days", items: plan.milestones30_60_90.day60, color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
            { label: "90 Days", items: plan.milestones30_60_90.day90, color: "bg-green-500/10 text-green-600 border-green-500/30" },
          ].map((m) => (
            <div key={m.label} className="card-elevated p-5">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${m.color} mb-3`}>{m.label}</div>
              <ul className="space-y-2">
                {m.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
