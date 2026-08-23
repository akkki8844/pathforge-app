import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, AlertTriangle, ExternalLink, Loader2, RefreshCw, BookOpen, Target, Award, Calendar, DollarSign, FileText, Sparkles, ShieldAlert, Lightbulb, CheckCircle2, XCircle, TrendingUp, Map, Building2, Compass, Download, History, Trash2, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/Seo";
import { SchoolBuildingIcon } from "@/components/icons/FlatSvgIcons";
import { AiGenerationNotice } from "@/components/AiGenerationNotice";
import { useAiGenerationGuard } from "@/hooks/useAiGenerationGuard";
import { CollegeLogo } from "@/components/CollegeLogo";
import { fadeUp, staggerParent, staggerStep, transition, viewportOnce } from "@/lib/motion";
import { safeExternalUrl } from "@/lib/safeUrl";

// Permissive type — the AI report schema evolves; we render defensively.
type RequirementsReport = any;
type HistoryRow = { id: string; college: string; report: RequirementsReport; updated_at: string };


function selectivityTone(s: string) {
  const v = (s || "").toLowerCase();
  if (v.includes("extremely")) return "bg-destructive/10 text-destructive border-destructive/30";
  if (v.includes("highly")) return "bg-amber-500/10 text-amber-500 border-amber-500/30";
  if (v.includes("moderately")) return "bg-accent/10 text-accent border-accent/30";
  if (v.includes("open")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  return "bg-muted text-foreground border-border";
}

function fitBandTone(b: string) {
  const v = (b || "").toLowerCase();
  if (v.includes("safety")) return "text-emerald-500";
  if (v.includes("match")) return "text-accent";
  if (v.includes("target")) return "text-amber-500";
  if (v.includes("hard")) return "text-orange-500";
  if (v.includes("reach")) return "text-destructive";
  return "text-foreground";
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">{value}</span>
    </div>
  );
}

function BulletList({ items, icon: Icon, tone = "text-accent" }: { items?: string[]; icon?: any; tone?: string }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground italic">No data available.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="text-sm text-foreground flex gap-2.5 leading-relaxed">
          {Icon ? <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${tone}`} /> : <span className={`${tone} mt-1`}>•</span>}
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function FitGauge({ score, band }: { score: number; band: string }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  return (
    <div className="relative">
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">{safeScore}</span>
        <span className="text-sm text-muted-foreground">/ 100 fit</span>
      </div>
      <div className={`mt-1 text-sm font-semibold ${fitBandTone(band)}`}>{band}</div>
      <Progress value={safeScore} className="mt-3 h-2" />
    </div>
  );
}

function ReportView({ report }: { report: RequirementsReport }) {
  const fa = report.fitAssessment || ({} as RequirementsReport["fitAssessment"]);
  const officialUrl = safeExternalUrl(report.officialUrl);
  return (
    <div className="space-y-6">
      {/* Hero: personalized verdict */}
      <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card">
        <CardContent className="p-6 grid md:grid-cols-[260px_1fr] gap-6">
          <div className="border-r border-border/50 pr-6 md:block">
            <FitGauge score={fa.fitScore} band={fa.fitBand} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge className={`border ${selectivityTone(report.selectivity)}`}>{report.selectivity}</Badge>
              <Badge variant="outline">Acceptance: {report.acceptanceRate}</Badge>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Honest verdict for you</div>
            <p className="text-base text-foreground leading-relaxed">{fa.verdict || report.overview}</p>
            {officialUrl && (
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline mt-3"
              >
                Official admissions page <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="fit" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="fit" className="text-xs">Your fit</TabsTrigger>
          <TabsTrigger value="academics" className="text-xs">Academics</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="application" className="text-xs">Application</TabsTrigger>
          <TabsTrigger value="money" className="text-xs">Cost & aid</TabsTrigger>
          <TabsTrigger value="plan" className="text-xs">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="fit" className="mt-5 space-y-5" asChild>
          <motion.div
            variants={staggerParent}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            custom={staggerStep(3)}
            className="space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Your strengths vs this school
                    </CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={fa.strengths} icon={CheckCircle2} tone="text-emerald-500" /></CardContent>
                </Card>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" /> Gaps to close
                    </CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={fa.gaps} icon={XCircle} tone="text-destructive" /></CardContent>
                </Card>
              </motion.div>
            </div>
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Compass className="h-4 w-4 text-accent" /> Your action plan
                  </CardTitle>
                </CardHeader>
                <CardContent><BulletList items={fa.actionPlan} icon={TrendingUp} /></CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        <TabsContent value="academics" className="mt-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent" /> Academic bar</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="GPA" value={report.academics.gpa} />
                <Row label="IB Diploma" value={report.academics.ibScore} />
                <Row label="A-Levels" value={report.academics.aLevels} />
                <Row label="AP / Course rigor" value={report.academics.apCourses} />
                <Row label="Class rank" value={report.academics.classRank} />
                {report.academics.rigorNote && (
                  <p className="mt-3 text-xs text-muted-foreground italic">{report.academics.rigorNote}</p>
                )}
                {report.academics.studentStanding && (
                  <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Where you stand</div>
                    <p className="text-sm text-foreground">{report.academics.studentStanding}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Testing</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Policy" value={report.testing.policy} />
                <Row label="SAT range" value={report.testing.satRange} />
                <Row label="ACT range" value={report.testing.actRange} />
                <Row label="English proficiency" value={report.testing.englishProficiency} />
                {report.testing.studentStanding && (
                  <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Where you stand</div>
                    <p className="text-sm text-foreground">{report.testing.studentStanding}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-5 space-y-5">
          {(() => {
            const ms = report.majorSpecific;
            const items: string[] = Array.isArray(ms)
              ? ms
              : ms && typeof ms === "object"
                ? [
                    ms.programName && `Program: ${ms.programName}`,
                    ms.schoolOrDepartment && `School / Department: ${ms.schoolOrDepartment}`,
                    ms.directVsGeneralAdmit && `Admit type: ${ms.directVsGeneralAdmit}`,
                    ms.switchingMajorPolicy && `Switching majors: ${ms.switchingMajorPolicy}`,
                    ...(ms.distinctiveProgramFeatures || []),
                    ...(ms.requiredOrRecommendedCoursework || []).map((c: string) => `Coursework: ${c}`),
                    ...(ms.facultyOrLabsToNameDrop || []).map((f: string) => `Worth referencing: ${f}`),
                  ].filter(Boolean)
                : [];
            return items.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Major-specific requirements</CardTitle>
                </CardHeader>
                <CardContent><BulletList items={items} /></CardContent>
              </Card>
            ) : null;
          })()}
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4 text-accent" /> Qualities they seek</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const qs = report.qualitiesSought;
                  if (!Array.isArray(qs)) return null;
                  const stringItems = qs.filter((x: any) => typeof x === "string") as string[];
                  if (stringItems.length === qs.length && stringItems.length > 0) {
                    return <BulletList items={stringItems} />;
                  }
                  return (
                    <ul className="space-y-3">
                      {qs.map((q: any, i: number) => (
                        <li key={i} className="flex gap-2 text-sm">
                          {q.present ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-foreground">{q.quality || String(q)}</div>
                            {q.whyThisSchool && <div className="text-xs text-muted-foreground mt-0.5">{q.whyThisSchool}</div>}
                            {q.studentEvidence && <div className="text-xs text-accent mt-0.5">You: {q.studentEvidence}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-accent" /> Extracurricular profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <BulletList items={report.extracurriculars?.patterns} />
                {report.extracurriculars?.spikeExpectation && (
                  <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Spike: </span>{report.extracurriculars.spikeExpectation}</p>
                )}
                {report.extracurriculars?.studentECReview && (
                  <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Your EC review</div>
                    <p className="text-sm text-foreground">{report.extracurriculars.studentECReview}</p>
                  </div>
                )}
                {report.extracurriculars?.missingArchetypes?.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Missing archetypes</div>
                    <BulletList items={report.extracurriculars.missingArchetypes} icon={XCircle} tone="text-amber-500" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="application" className="mt-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Essays & application</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Portal" value={report.applicationPortal} />
                <Row label="Essays" value={report.essays?.count} />
                <Row label="Prompt style" value={report.essays?.promptStyle || report.essays?.focus} />
                <Row
                  label="Recommendations"
                  value={
                    typeof report.recommendations === "string"
                      ? report.recommendations
                      : report.recommendations?.counts
                  }
                />
                {report.recommendations?.whoFromWhom && (
                  <Row label="Ideal recommenders" value={report.recommendations.whoFromWhom} />
                )}
                {report.recommendations?.studentAdvice && (
                  <div className="mt-2 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Who you should ask</div>
                    <p className="text-sm text-foreground">{report.recommendations.studentAdvice}</p>
                  </div>
                )}
                <Row
                  label="Interviews"
                  value={
                    typeof report.interviews === "string"
                      ? report.interviews
                      : [report.interviews?.availability, report.interviews?.weight].filter(Boolean).join(" · ")
                  }
                />
                {report.interviews?.studentPrepNotes && (
                  <div className="mt-2 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Interview prep for you</div>
                    <p className="text-sm text-foreground">{report.interviews.studentPrepNotes}</p>
                  </div>
                )}
                {report.demonstratedInterest && (
                  <div className="mt-3">
                    <Row label="Demonstrated interest" value={report.demonstratedInterest.weighting} />
                    {report.demonstratedInterest.specificSignals?.length > 0 && (
                      <BulletList items={report.demonstratedInterest.specificSignals} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" /> Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Early Action" value={report.deadlines?.earlyAction} />
                <Row label="Early Decision" value={report.deadlines?.earlyDecision} />
                <Row label="Early Decision II" value={report.deadlines?.earlyDecisionII} />
                <Row label="Regular" value={report.deadlines?.regular} />
                <Row label="Rolling" value={report.deadlines?.rolling} />
                <Row label="Scholarship deadlines" value={report.deadlines?.scholarshipDeadlines} />
                {report.deadlines?.recommendedRound && (
                  <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Recommended for you</div>
                    <p className="text-sm font-medium text-foreground">{report.deadlines.recommendedRound}</p>
                    {report.deadlines?.recommendedRoundRationale && (
                      <p className="text-xs text-muted-foreground mt-1">{report.deadlines.recommendedRoundRationale}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {report.essays?.anglesForStudent?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Essay angles for you</CardTitle>
              </CardHeader>
              <CardContent><BulletList items={report.essays.anglesForStudent} /></CardContent>
            </Card>
          )}
          {(report.essays?.whatTheyReward?.length > 0 || report.essays?.whatGetsRejected?.length > 0) && (
            <div className="grid md:grid-cols-2 gap-5">
              {report.essays?.whatTheyReward?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> What essays reward</CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={report.essays.whatTheyReward} icon={CheckCircle2} tone="text-emerald-500" /></CardContent>
                </Card>
              )}
              {report.essays?.whatGetsRejected?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Essay anti-patterns</CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={report.essays.whatGetsRejected} icon={XCircle} tone="text-destructive" /></CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="money" className="mt-5 space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-accent" /> Cost & financial aid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Tuition / yr</div>
                  <div className="text-base font-semibold text-foreground">{report.financials?.tuitionUSD}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total cost / yr</div>
                  <div className="text-base font-semibold text-foreground">{report.financials?.totalCostUSD}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Aid for internationals</div>
                  <div className="text-base font-semibold text-foreground">{report.financials?.aidForInternationals}</div>
                </div>
              </div>
              {report.financials?.averageAidPackageUSD && (
                <Row label="Average aid package" value={report.financials.averageAidPackageUSD} />
              )}
              {(report.financials?.meritScholarships?.length > 0 || report.financials?.scholarships?.length > 0) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Notable merit scholarships</div>
                  <BulletList items={report.financials.meritScholarships || report.financials.scholarships} />
                </div>
              )}
              {report.financials?.externalScholarshipsForCountry?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">External scholarships for your country</div>
                  <BulletList items={report.financials.externalScholarshipsForCountry} />
                </div>
              )}
              {report.financials?.notesForStudent && (
                <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Notes for you</div>
                  <p className="text-sm text-foreground">{report.financials.notesForStudent}</p>
                </div>
              )}
            </CardContent>
          </Card>
          {report.outcomes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Outcomes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Row label="Graduation rate" value={report.outcomes.graduationRate} />
                <Row label="Post-grad placement" value={report.outcomes.postGradPlacement} />
                {report.outcomes.topEmployers?.length > 0 && (
                  <Row label="Top employers" value={report.outcomes.topEmployers.join(", ")} />
                )}
                {report.outcomes.topGradSchools?.length > 0 && (
                  <Row label="Top grad schools" value={report.outcomes.topGradSchools.join(", ")} />
                )}
                {report.outcomes.relevanceForStudent && (
                  <div className="mt-2 rounded-md border border-accent/30 bg-accent/5 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-accent mb-1">Why this matters for you</div>
                    <p className="text-sm text-foreground">{report.outcomes.relevanceForStudent}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plan" className="mt-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Red flags to avoid</CardTitle>
              </CardHeader>
              <CardContent><BulletList items={report.redFlags} icon={XCircle} tone="text-destructive" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Edge strategies</CardTitle>
              </CardHeader>
              <CardContent><BulletList items={report.edgeStrategies} /></CardContent>
            </Card>
          </div>
          {(fa.blindSpots?.length > 0 || report.compareToSimilarSchools?.length > 0) && (
            <div className="grid md:grid-cols-2 gap-5">
              {fa.blindSpots?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Compass className="h-4 w-4 text-accent" /> Blind spots</CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={fa.blindSpots} /></CardContent>
                </Card>
              )}
              {report.compareToSimilarSchools?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4 text-accent" /> Also evaluate</CardTitle>
                  </CardHeader>
                  <CardContent><BulletList items={report.compareToSimilarSchools} /></CardContent>
                </Card>
              )}
            </div>
          )}
          {report.twelveMonthRoadmap?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Map className="h-4 w-4 text-accent" /> 12-month roadmap</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l-2 border-border space-y-5 pl-5">
                  {report.twelveMonthRoadmap.map((q: any, i: number) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 h-4 w-4 rounded-full bg-accent border-4 border-card" />
                      <div className="text-xs uppercase tracking-wide text-accent font-semibold">{q.window}</div>
                      <div className="text-sm font-semibold text-foreground mt-0.5">{q.focus}</div>
                      <ul className="mt-2 space-y-1.5">
                        {q.outputs?.map((o: string, j: number) => (
                          <li key={j} className="text-sm text-muted-foreground flex gap-2">
                            <span className="text-accent">·</span> {o}
                          </li>
                        ))}
                      </ul>
                      {q.metricsToHit?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {q.metricsToHit.map((m: string, k: number) => (
                            <Badge key={k} variant="outline" className="text-[10px] font-normal">{m}</Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton({ college }: { college: string }) {
  return (
    <div className="space-y-4 py-10 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
      <div className="text-sm text-foreground">Building a personalized report for {college}…</div>
      <div className="text-xs text-muted-foreground max-w-md mx-auto">
        Pulling your profile, journey scores, test data, and ECs to tailor every section to you.
      </div>
      <AiGenerationNotice active className="mx-auto max-w-md text-left" />
    </div>
  );
}

export default function Requirements() {
  const { user, onboardingData } = useAuth();
  const { toast } = useToast();
  const targets: string[] = useMemo(
    () => onboardingData?.target_universities || [],
    [onboardingData],
  );

  const [selected, setSelected] = useState<string | null>(() => targets[0] || null);
  const [reports, setReports] = useState<Record<string, RequirementsReport>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [tab, setTab] = useState<"current" | "history">("current");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load all persisted reports + subscribe to realtime changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("requirements_reports")
        .select("id, college, report, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (cancelled || !data) return;
      setHistory(data as HistoryRow[]);
      const map: Record<string, RequirementsReport> = {};
      for (const row of data as HistoryRow[]) map[row.college] = row.report;
      setReports(map);
    };
    load();

    const channel = supabase
      .channel(`req-reports-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requirements_reports", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const activeCollege = selected || targets[0] || null;
  const activeReport = activeCollege ? reports[activeCollege] : null;
  const isLoading = activeCollege ? !!loading[activeCollege] : false;
  const anyLoading = Object.values(loading).some(Boolean);
  useAiGenerationGuard(anyLoading, "Requirements report generation");

  const fetchReport = async (college: string, force = false) => {
    if (!user || !college) return;
    if (loading[college]) return;
    if (!force && reports[college]) return;
    setLoading((l) => ({ ...l, [college]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("college-requirements", {
        body: { college, force },
      });
      if (error) throw error;
      if (data?.report) {
        setReports((r) => ({ ...r, [college]: data.report }));
      } else {
        throw new Error(data?.error || "No report returned");
      }
    } catch (e: any) {
      const msg = e?.message || "Could not generate requirements report.";
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setLoading((l) => ({ ...l, [college]: false }));
    }
  };

  const selectCollege = (c: string) => {
    setSelected(c);
    setTab("current");
    if (user && !reports[c]) fetchReport(c);
  };

  const handleExportPdf = async () => {
    if (!reportRef.current || !activeCollege) return;
    setExporting(true);
    try {
      const safe = activeCollege.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const { exportElementToPdf } = await import("@/lib/exportPdf");
      await exportElementToPdf(reportRef.current, `pathforge-requirements-${safe}.pdf`);
      toast({ title: "PDF exported", description: "Your requirements report has been downloaded." });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message || "Could not export PDF.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const deleteHistoryItem = async (row: HistoryRow) => {
    if (!user) return;
    const { error } = await supabase.from("requirements_reports").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setReports((r) => { const n = { ...r }; delete n[row.college]; return n; });
    setHistory((h) => h.filter((x) => x.id !== row.id));
  };

  return (
    <div className="py-8 sm:py-12">
      <Seo
        title="Requirements — Pathforge"
        description="Personalized admissions requirements brief for every university on your target list — tailored to your profile."
        path="/requirements"
      />
      <div className="section-container max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-start gap-3"
        >
          <div className="rounded-xl bg-accent/10 p-2.5">
            <SchoolBuildingIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Requirements</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              A personalized requirements brief for every university on your shortlist — built from your full profile, journey scores, test data and ECs. Saved to your account and exportable as PDF.
            </p>
          </div>
        </motion.div>

        {!onboardingData || targets.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Add your target universities first
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Requirements reports are tailored to the schools on your shortlist.
                Complete your profile and pick your target colleges to unlock this page.
              </p>
              <Button asChild>
                <Link to="/profile">Complete your profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar college selector */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-2">
                Your shortlist · {targets.length}
              </div>
              <ScrollArea className="lg:h-[calc(100svh-320px)] pr-2">
                <motion.div
                  variants={staggerParent}
                  custom={0.04}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1.5"
                >
                  {targets.map((c) => {
                    const active = activeCollege === c && tab === "current";
                    const hasReport = !!reports[c];
                    const isLoad = !!loading[c];
                    return (
                      <motion.button
                        key={c}
                        variants={fadeUp}
                        whileHover={{ x: 2 }}
                        transition={transition.fast}
                        onClick={() => selectCollege(c)}
                        className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors flex items-center gap-2.5 ${
                          active
                            ? "border-accent bg-accent/10 shadow-sm"
                            : "border-border hover:border-accent/40 hover:bg-accent/5"
                        }`}
                      >
                        <CollegeLogo name={c} size={18} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{c}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {isLoad ? "Generating…" : hasReport ? "Report ready" : "Tap to generate"}
                          </div>
                        </div>
                        {isLoad && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </ScrollArea>
              <button
                onClick={() => setTab("history")}
                className={`mt-3 w-full rounded-lg border px-3 py-2.5 flex items-center gap-2.5 transition-all ${
                  tab === "history"
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/40 hover:bg-accent/5"
                }`}
              >
                <History className="h-4 w-4 text-accent" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-foreground">History</div>
                  <div className="text-[10px] text-muted-foreground">{history.length} saved report{history.length === 1 ? "" : "s"}</div>
                </div>
              </button>
              <p className="text-[10px] text-muted-foreground px-2 mt-3">
                Each report uses 1 daily credit and is saved to your account.
              </p>
              <AiGenerationNotice active={anyLoading} className="mt-3" />
            </aside>

            {/* Main panel */}
            <div className="min-w-0">
              {tab === "history" ? (
                <Card>
                  <CardHeader className="border-b border-border/60">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <History className="h-5 w-5 text-accent" /> Saved reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    {history.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        No saved reports yet. Generate a report from your shortlist to start your history.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {history.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-accent/40 transition"
                          >
                            <Building2 className="h-4 w-4 text-accent shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{h.college}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Updated {new Date(h.updated_at).toLocaleString()}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setSelected(h.college); setTab("current"); }}>
                              Open
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteHistoryItem(h)} aria-label="Delete report">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ) : activeCollege ? (
                <Card className="border-border">
                  <CardHeader className="border-b border-border/60">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CollegeLogo name={activeCollege} size={22} />
                        {activeCollege}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {activeReport && !isLoading && (
                          <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={exporting}>
                            {exporting ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Export PDF
                          </Button>
                        )}
                        {activeReport && !isLoading && (
                          <Button size="sm" variant="ghost" onClick={() => fetchReport(activeCollege, true)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 sm:p-6">
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <LoadingSkeleton college={activeCollege} />
                        </motion.div>
                      ) : activeReport ? (
                        <motion.div key="report" ref={reportRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <ReportView report={activeReport} />
                        </motion.div>
                      ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                          <ListChecks className="h-10 w-10 mx-auto text-accent mb-3" />
                          <h3 className="text-base font-semibold text-foreground mb-1">Generate your personalized report</h3>
                          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                            Built from your full profile, test scores, and journey data — tailored specifically to {activeCollege}.
                          </p>
                          <AiGenerationNotice className="mx-auto mb-5 max-w-md text-left" />
                          <Button onClick={() => fetchReport(activeCollege)}>
                            <Sparkles className="h-4 w-4 mr-2" /> Generate report
                          </Button>
                          <p className="mt-3 text-[10px] text-muted-foreground">Uses 1 daily credit.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

