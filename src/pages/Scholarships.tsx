import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Search, Clock, Filter, X, AlertTriangle, Calendar as CalendarIcon, DollarSign, MapPin, BookOpen, ChevronDown, ChevronUp, Heart, BarChart3, Globe, TrendingUp, Lightbulb, ChevronLeft, ChevronRight, CheckCircle2, Scale, Award, Beaker, Palette, Briefcase, ExternalLink, CalendarPlus, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  scholarships, Scholarship, getScholarshipStatus, getDaysUntilDeadline,
  getFieldCategories, getScholarshipCountries, getScholarshipTypes,
  calculateMatchScore, scholarshipTips, type ScholarshipTipIcon,
} from "@/lib/scholarships";
import {
  // Aliased: lucide's Calendar is already imported above as CalendarIcon, and
  // the collision silently resolved to the lucide one, which does not satisfy
  // the FlatIconProps signature TIP_ICONS declares.
  ClockIcon, PenIcon, CalendarIcon as CalendarFlatIcon, ChatIcon, TargetIcon,
  type FlatIconProps,
} from "@/components/icons/FlatIcons";
import { CertificateIcon } from "@/components/icons/FlatSvgIcons";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LiveWebSearch } from "@/components/LiveWebSearch";
import { Seo } from "@/components/Seo";

const TIP_ICONS: Record<ScholarshipTipIcon, (p: FlatIconProps) => JSX.Element> = {
  clock: ClockIcon,
  pen: PenIcon,
  calendar: CalendarFlatIcon,
  chat: ChatIcon,
  target: TargetIcon,
};

// --- Provider Logo with multi-source fallback chain ---
// Tries each candidate URL in turn (unavatar → Google favicon → DuckDuckGo)
// and only renders the monogram tile after every source fails. This is
// robust against any one source not having a given org, blocked CORS, or 404s.
function ProviderLogo({ scholarship, size = 48 }: { scholarship: Scholarship; size?: number }) {
  const candidates =
    scholarship.logoCandidates && scholarship.logoCandidates.length > 0
      ? scholarship.logoCandidates
      : scholarship.logoUrl
      ? [scholarship.logoUrl]
      : [];
  const [idx, setIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  // Reset when the scholarship changes (e.g., card recycled in carousel)
  useEffect(() => {
    setIdx(0);
    setAllFailed(false);
  }, [scholarship.id]);

  const initials = scholarship.provider
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const dim = { width: size, height: size };

  if (allFailed || candidates.length === 0) {
    return (
      <div
        style={dim}
        className="shrink-0 rounded-lg bg-muted border border-border flex items-center justify-center font-semibold text-foreground/70"
      >
        <span style={{ fontSize: size * 0.36 }}>{initials || "?"}</span>
      </div>
    );
  }

  return (
    <div
      style={dim}
      className="shrink-0 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden p-1.5"
    >
      <img
        key={candidates[idx]}
        src={candidates[idx]}
        alt={`${scholarship.provider} logo`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          if (idx + 1 < candidates.length) setIdx(idx + 1);
          else setAllFailed(true);
        }}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

// --- Animated Counter ---
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// --- Category Icon Component ---
function CategoryIcon({ field }: { field: string }) {
  const iconMap: Record<string, typeof Award> = {
    "STEM": Beaker, "Arts": Palette, "Business": Briefcase,
    "Humanities": BookOpen, "Any": Award,
  };
  const Icon = iconMap[field] || Award;
  return <Icon className="h-4 w-4" />;
}

// --- Region Tile Grid (replaces the hand-drawn world map) ---
function RegionTiles({ scholarshipsByCountry, onRegionClick }: {
  scholarshipsByCountry: Record<string, number>;
  onRegionClick: (country: string) => void;
}) {
  const regions: { id: string; label: string; sub: string }[] = [
    { id: "USA", label: "United States", sub: "North America" },
    { id: "Canada", label: "Canada", sub: "North America" },
    { id: "International", label: "Global", sub: "Worldwide programs" },
    { id: "India", label: "India", sub: "South Asia" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {regions.map((r, i) => {
        const count = scholarshipsByCountry[r.id] || 0;
        const disabled = count === 0;
        return (
          <motion.button
            key={r.id}
            disabled={disabled}
            onClick={() => onRegionClick(r.id)}
            className={`text-left p-5 rounded-xl border bg-card transition-all ${
              disabled
                ? "opacity-50 cursor-not-allowed border-border"
                : "border-border hover:border-accent/50 hover:shadow-md"
            }`}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            whileHover={disabled ? {} : { y: -3, scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <motion.div
                className="p-2 rounded-lg bg-accent/10"
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                <MapPin className="h-4 w-4 text-accent" />
              </motion.div>
              <span className="text-2xl font-semibold tracking-tight text-foreground">{count}</span>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.sub}</p>
          </motion.button>
        );
      })}
    </div>
  );
}

// --- Comparison Modal ---
function ComparisonView({ items, onClose }: { items: Scholarship[]; onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[81rem] max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-accent" /> Compare Scholarships</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {items.map(s => (
            <div key={s.id} className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex justify-center"><ProviderLogo scholarship={s} size={56} /></div>
              <h4 className="font-semibold text-sm text-center text-foreground line-clamp-2">{s.name}</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium text-foreground">{s.amount}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span className="text-foreground">{s.country}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize text-foreground">{s.type.replace("-"," ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deadline</span><span className="text-foreground">{new Date(s.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Grades</span><span className="text-foreground">{s.eligibility.grades.join(", ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fields</span><span className="text-foreground text-right">{s.eligibility.fieldOfStudy.join(", ")}</span></div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// === MAIN PAGE ===
export default function Scholarships() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [activeView, setActiveView] = useState<"grid" | "calendar" | "map">("grid");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<{ country?: string; grade?: string; major?: string } | undefined>();
  const [checklist, setChecklist] = useState<Record<string, string[]>>({});

  // Load user profile for match scoring
  useEffect(() => {
    if (!user) return;
    supabase.from("onboarding_data").select("country, grade, intended_major").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setUserProfile({ country: data.country, grade: data.grade, major: data.intended_major });
      });
  }, [user]);

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pf-scholarship-bookmarks");
    if (saved) setBookmarks(new Set(JSON.parse(saved)));
    const savedChecklist = localStorage.getItem("pf-scholarship-checklist");
    if (savedChecklist) setChecklist(JSON.parse(savedChecklist));
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem("pf-scholarship-bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareList(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  }, []);

  const toggleChecklistItem = useCallback((scholarshipId: string, item: string) => {
    setChecklist(prev => {
      const items = prev[scholarshipId] || [];
      const next = { ...prev, [scholarshipId]: items.includes(item) ? items.filter(i => i !== item) : [...items, item] };
      localStorage.setItem("pf-scholarship-checklist", JSON.stringify(next));
      return next;
    });
  }, []);

  const countries = useMemo(() => getScholarshipCountries(), []);
  const fields = useMemo(() => getFieldCategories(), []);
  const types = useMemo(() => getScholarshipTypes(), []);
  const featuredScholarships = useMemo(() => scholarships.filter(s => s.featured && getScholarshipStatus(s.deadline) !== "closed"), []);

  const closingSoon = useMemo(() =>
    scholarships.filter(s => getScholarshipStatus(s.deadline) === "closing-soon")
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
  []);

  const filtered = useMemo(() =>
    scholarships.filter(s => {
      if (getScholarshipStatus(s.deadline) === "closed") return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.provider.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      if (countryFilter !== "all" && s.country !== countryFilter) return false;
      if (gradeFilter !== "all" && !s.eligibility.grades.includes(gradeFilter)) return false;
      if (fieldFilter !== "all" && !s.eligibility.fieldOfStudy.includes(fieldFilter)) return false;
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (deadlineFilter === "30days" && getDaysUntilDeadline(s.deadline) > 30) return false;
      if (deadlineFilter === "60days" && getDaysUntilDeadline(s.deadline) > 60) return false;
      if (deadlineFilter === "90days" && getDaysUntilDeadline(s.deadline) > 90) return false;
      return true;
    }),
  [search, countryFilter, gradeFilter, fieldFilter, typeFilter, deadlineFilter]);

  const activeFilterCount = [countryFilter, gradeFilter, fieldFilter, typeFilter, deadlineFilter].filter(f => f !== "all").length;
  const clearFilters = () => { setCountryFilter("all"); setGradeFilter("all"); setFieldFilter("all"); setTypeFilter("all"); setDeadlineFilter("all"); setSearch(""); };

  // Stats
  const totalValue = useMemo(() => scholarships.reduce((sum, s) => sum + (s.amountNumeric || 0), 0), []);
  const openCount = useMemo(() => scholarships.filter(s => getScholarshipStatus(s.deadline) !== "closed").length, []);
  const scholarshipsByCountry = useMemo(() => {
    const map: Record<string, number> = {};
    scholarships.forEach(s => { map[s.country] = (map[s.country] || 0) + 1; });
    return map;
  }, []);

  // Calendar data
  const calendarMonths = useMemo(() => {
    const months: Record<string, Scholarship[]> = {};
    scholarships.filter(s => getScholarshipStatus(s.deadline) !== "closed").forEach(s => {
      const key = new Date(s.deadline).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!months[key]) months[key] = [];
      months[key].push(s);
    });
    return Object.entries(months).sort((a, b) => new Date(a[1][0].deadline).getTime() - new Date(b[1][0].deadline).getTime());
  }, []);

  // Carousel auto-advance
  useEffect(() => {
    if (featuredScholarships.length <= 1) return;
    const interval = setInterval(() => setCarouselIndex(i => (i + 1) % featuredScholarships.length), 5000);
    return () => clearInterval(interval);
  }, [featuredScholarships.length]);

  const compareItems = useMemo(() => scholarships.filter(s => compareList.includes(s.id)), [compareList]);

  const checklistItems = ["Essay written", "Transcript requested", "Recommendation letter", "Financial documents", "Application submitted"];

  const typeBadgeColor = (type: Scholarship["type"]) => {
    const map: Record<string, string> = {
      merit: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      "need-based": "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      research: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      competition: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      community: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
      diversity: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
    return map[type] || "";
  };

  return (
    <div className="py-8 sm:py-12">
      <Seo title='Scholarships — Pathforge' description='Browse a curated, regional database of scholarships matched to your major, region, and grade.' path='/scholarships' />
      <div className="section-container max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CertificateIcon className="h-9 w-9" />
            Scholarships
          </h1>
          <p className="mt-2 text-muted-foreground">Discover opportunities tailored to your profile — with match scores, deadlines, and application tracking</p>
        </div>

        {/* ===== STATS DASHBOARD ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Scholarships", value: scholarships.length, icon: GraduationCap, suffix: "" },
            { label: "Currently Open", value: openCount, icon: CheckCircle2, suffix: "" },
            { label: "Combined Value", value: Math.round(totalValue / 1000), icon: DollarSign, suffix: "K+", prefix: "$" },
            { label: "Closing Soon", value: closingSoon.length, icon: AlertTriangle, suffix: "" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-background">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10"><stat.icon className="h-5 w-5 text-accent" /></div>
                  <div>
                    <p className="text-2xl font-bold text-foreground"><AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} /></p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ===== FEATURED CAROUSEL ===== */}
        {featuredScholarships.length > 0 && (
          <div className="mb-8 relative">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" /> Featured Scholarships
            </h2>
            <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-r from-accent/5 via-background to-accent/5">
              <AnimatePresence mode="wait">
                {featuredScholarships[carouselIndex] && (
                  <motion.div
                    key={featuredScholarships[carouselIndex].id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center"
                  >
                    <ProviderLogo scholarship={featuredScholarships[carouselIndex]} size={72} />
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl font-bold text-foreground">{featuredScholarships[carouselIndex].name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{featuredScholarships[carouselIndex].provider}</p>
                      <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                        <Badge variant="outline" className="border-accent/30 text-accent">{featuredScholarships[carouselIndex].amount}</Badge>
                        <Badge variant="outline">{featuredScholarships[carouselIndex].country}</Badge>
                        {userProfile && (
                          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                            {calculateMatchScore(featuredScholarships[carouselIndex], userProfile)}% Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{featuredScholarships[carouselIndex].description}</p>
                    </div>
                    <Button size="sm" className="btn-accent shrink-0" onClick={() => setSelectedScholarship(featuredScholarships[carouselIndex])}>
                      View Details
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Navigation */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {featuredScholarships.map((_, i) => (
                  <button key={i} onClick={() => setCarouselIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === carouselIndex ? "bg-accent w-6" : "bg-muted-foreground/30"}`} />
                ))}
              </div>
              <button onClick={() => setCarouselIndex(i => (i - 1 + featuredScholarships.length) % featuredScholarships.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/80 border border-border hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCarouselIndex(i => (i + 1) % featuredScholarships.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/80 border border-border hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===== DEADLINES APPROACHING ===== */}
        {closingSoon.length > 0 && (
          <motion.div
            className="mb-8 p-5 rounded-xl border border-amber-500/30 bg-amber-500/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </motion.div>
              Deadlines Approaching
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {closingSoon.map((s, i) => {
                const days = getDaysUntilDeadline(s.deadline);
                return (
                  <motion.button
                    key={s.id}
                    onClick={() => setSelectedScholarship(s)}
                    className="text-left p-3 rounded-lg bg-background border border-border hover:border-accent/50 transition-colors"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ x: 3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <p className="font-medium text-foreground text-sm line-clamp-1">{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        <Clock className="h-3 w-3 mr-1" />{days}d left
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.amount}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===== VIEW TOGGLE + SEARCH + FILTERS ===== */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search scholarships..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Tabs value={activeView} onValueChange={v => setActiveView(v as any)} className="hidden sm:block">
                <TabsList className="h-10">
                  <TabsTrigger value="grid" className="px-3"><BarChart3 className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="calendar" className="px-3"><CalendarIcon className="h-4 w-4" /></TabsTrigger>
                  <TabsTrigger value="map" className="px-3"><Globe className="h-4 w-4" /></TabsTrigger>
                </TabsList>
              </Tabs>
              <LiveWebSearch
                size="default"
                label="Live web search"
                title="Live scholarship search"
                description="Pull fresh scholarship listings from across the web — current deadlines, new programs, and updates the curated list may not have yet."
                queryPrefix="scholarships "
                defaultQuery={search}
                recency="qdr:y"
                className="h-10"
              />
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground">{activeFilterCount}</Badge>
                )}
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Compare bar */}
          {compareList.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-accent/30 bg-accent/5">
              <Scale className="h-4 w-4 text-accent shrink-0" />
              <span className="text-sm text-foreground">{compareList.length}/3 selected</span>
              <div className="flex gap-1 flex-1">
                {compareItems.map(s => (
                  <Badge key={s.id} variant="outline" className="text-xs">{s.name.split(" ").slice(0, 2).join(" ")}
                    <button onClick={() => toggleCompare(s.id)} className="ml-1"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowCompare(true)} disabled={compareList.length < 2}>Compare</Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="p-4 rounded-lg border border-border bg-muted/30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Country</label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Grade</label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Grades</SelectItem>{["9","10","11","12"].map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Field</label>
                  <Select value={fieldFilter} onValueChange={setFieldFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Fields</SelectItem>{fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Types</SelectItem>{types.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace("-"," ")}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Deadline</label>
                  <Select value={deadlineFilter} onValueChange={setDeadlineFilter}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Any Time</SelectItem><SelectItem value="30days">Next 30 Days</SelectItem><SelectItem value="60days">Next 60 Days</SelectItem><SelectItem value="90days">Next 90 Days</SelectItem></SelectContent></Select>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2 text-muted-foreground"><X className="h-3 w-3 mr-1" />Clear all filters</Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results info */}
        <p className="text-sm text-muted-foreground mb-4">{filtered.length} scholarship{filtered.length !== 1 ? "s" : ""} found</p>

        {/* ===== GRID VIEW ===== */}
        {activeView === "grid" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => {
              const status = getScholarshipStatus(s.deadline);
              const days = getDaysUntilDeadline(s.deadline);
              const matchScore = userProfile ? calculateMatchScore(s, userProfile) : null;
              const isBookmarked = bookmarks.has(s.id);
              const isComparing = compareList.includes(s.id);
              const isTrending = (s.popularity || 0) >= 80;

              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <Card className={`h-full flex flex-col transition-all ${isComparing ? "border-accent ring-1 ring-accent/30" : "hover:border-accent/40"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <ProviderLogo scholarship={s} size={44} />
                          <div className="min-w-0">
                            <CardTitle className="text-sm leading-tight line-clamp-2">{s.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.provider}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => toggleBookmark(s.id)} className="p-1 rounded hover:bg-muted transition-colors">
                                  <Heart className={`h-4 w-4 ${isBookmarked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{isBookmarked ? "Remove bookmark" : "Bookmark"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => toggleCompare(s.id)} className="p-1 rounded hover:bg-muted transition-colors">
                                  <Scale className={`h-4 w-4 ${isComparing ? "text-accent" : "text-muted-foreground"}`} />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{isComparing ? "Remove from comparison" : "Add to compare"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      {/* Badges row */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="outline" className={`text-[10px] capitalize ${typeBadgeColor(s.type)}`}>{s.type.replace("-"," ")}</Badge>
                        {isTrending && <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"><TrendingUp className="h-3 w-3 mr-0.5" />Trending</Badge>}
                        {matchScore !== null && matchScore >= 80 && <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">{matchScore}% Match</Badge>}
                        {s.eligibility.fieldOfStudy.map(f => (
                          <Badge key={f} variant="outline" className="text-[10px] gap-0.5"><CategoryIcon field={f} />{f}</Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm"><DollarSign className="h-4 w-4 text-accent shrink-0" /><span className="font-medium text-foreground">{s.amount}</span></div>
                        <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">{s.country}{s.region ? ` · ${s.region}` : ""}</span></div>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className={status === "closing-soon" ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                            {new Date(s.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                            {s.deadlineNote && <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">(estimated)</span>}
                            {status === "closing-soon" && ` (${days}d left)`}
                          </span>
                        </div>
                        {/* An estimated or gated deadline must never read as authoritative. */}
                        {s.deadlineNote && (
                          <p className="text-xs text-muted-foreground pl-6 leading-snug">{s.deadlineNote}</p>
                        )}
                      </div>
                      {/* Match progress bar */}
                      {matchScore !== null && (
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Profile Match</span>
                            <span className="font-medium text-foreground">{matchScore}%</span>
                          </div>
                          <Progress value={matchScore} className="h-1.5" />
                        </div>
                      )}
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedScholarship(s)}>View Details</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ===== CALENDAR VIEW ===== */}
        {activeView === "calendar" && (
          <div className="space-y-6">
            {calendarMonths.map(([month, items]) => (
              <div key={month}>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-accent" />{month}
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).map(s => {
                    const days = getDaysUntilDeadline(s.deadline);
                    const status = getScholarshipStatus(s.deadline);
                    return (
                      <button key={s.id} onClick={() => setSelectedScholarship(s)}
                        className="text-left p-4 rounded-lg border border-border bg-card hover:border-accent/40 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <ProviderLogo scholarship={s} size={32} />
                          <span className="font-medium text-sm text-foreground line-clamp-1">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${status === "closing-soon" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : ""}`}>
                            {new Date(s.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric"})} · {days}d left
                          </Badge>
                          <span className="text-xs text-muted-foreground">{s.amount}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== MAP VIEW (region tiles) ===== */}
        {activeView === "map" && (
          <div className="space-y-4">
            <RegionTiles scholarshipsByCountry={scholarshipsByCountry} onRegionClick={country => { setCountryFilter(country); setActiveView("grid"); }} />
            <p className="text-xs text-muted-foreground text-center">Tap a region to filter scholarships by country</p>
          </div>
        )}

        {/* Empty state */}
        {activeView === "grid" && filtered.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No scholarships found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
          </div>
        )}

        {/* ===== SUCCESS TIPS ===== */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-accent" /> Scholarship Success Tips
          </h2>
          <Accordion type="multiple" className="space-y-2">
            {scholarshipTips.map((tip, i) => (
              <AccordionItem key={i} value={`tip-${i}`} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    {(() => {
                      const TipIcon = TIP_ICONS[tip.icon];
                      return <TipIcon className="h-6 w-6 shrink-0" />;
                    })()}
                    {tip.title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">{tip.description}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* ===== DETAIL MODAL — REDESIGNED ===== */}
        <Dialog open={!!selectedScholarship} onOpenChange={() => setSelectedScholarship(null)}>
          {selectedScholarship && (() => {
            const s = selectedScholarship;
            const status = getScholarshipStatus(s.deadline);
            const days = getDaysUntilDeadline(s.deadline);
            const matchScore = userProfile ? calculateMatchScore(s, userProfile) : null;
            const isBookmarked = bookmarks.has(s.id);
            const isComparing = compareList.includes(s.id);
            const processSteps = s.applicationProcess
              .split(/(?<=\.)\s+(?=[A-Z])/)
              .map((t) => t.trim())
              .filter(Boolean);
            const deadlineColor =
              status === "closed"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : status === "closing-soon"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
            const deadlineLabel =
              status === "closed" ? "Closed" : status === "closing-soon" ? `${days} days left` : `${days} days left · Open`;

            return (
              <DialogContent className="max-w-[81rem] max-h-[92dvh] overflow-y-auto p-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4">
                  <div className="flex items-start gap-4">
                    <ProviderLogo scholarship={s} size={64} />
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-semibold tracking-tight leading-tight">{s.name}</DialogTitle>
                      <DialogDescription className="mt-1 text-sm">
                        {s.provider} · {s.country}{s.region ? ` · ${s.region}` : ""}
                      </DialogDescription>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <Badge variant="outline" className={`capitalize text-xs ${typeBadgeColor(s.type)}`}>{s.type.replace("-", " ")}</Badge>
                        <Badge variant="outline" className="text-xs border-accent/30 text-accent">{s.amount}</Badge>
                        {matchScore !== null && (
                          <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">{matchScore}% Match</Badge>
                        )}
                        {(s.popularity || 0) >= 80 && (
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                            <TrendingUp className="h-3 w-3 mr-1" />Popular
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleBookmark(s.id)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    >
                      <Heart className={`h-5 w-5 ${isBookmarked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-5">
                  {/* Deadline strip */}
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${deadlineColor}`}>
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(s.deadline).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap">{deadlineLabel}</span>
                  </div>

                  {/* Profile match progress */}
                  {matchScore !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Profile Match</span>
                        <span className="font-medium text-foreground">{matchScore}%</span>
                      </div>
                      <Progress value={matchScore} className="h-1.5" />
                    </div>
                  )}

                  <Separator />

                  {/* About */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">About</h4>
                    <p className="text-sm text-foreground/90 leading-relaxed">{s.description}</p>
                  </section>

                  <Separator />

                  {/* Eligibility & Benefits two-column grid */}
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />Eligibility
                      </h4>
                      <ul className="space-y-1.5 text-sm text-foreground/90">
                        <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Grades</span><span className="ml-auto text-right">{s.eligibility.grades.join(", ")}</span></li>
                        {s.studyLevel === "postgraduate" && (
                          <li className="flex gap-2 text-amber-700 dark:text-amber-500">
                            <span className="shrink-0">Study level</span>
                            <span className="ml-auto text-right font-medium">Postgraduate — requires a completed bachelor&apos;s degree</span>
                          </li>
                        )}
                        {s.eligibility.nationality && (
                          <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Nationality</span><span className="ml-auto text-right">{s.eligibility.nationality}</span></li>
                        )}
                        <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Field</span><span className="ml-auto text-right">{s.eligibility.fieldOfStudy.join(", ")}</span></li>
                        {s.eligibility.other && (
                          <li className="text-muted-foreground text-xs pt-1 border-t border-border mt-2">{s.eligibility.other}</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />Benefits
                      </h4>
                      <ul className="space-y-1.5 text-sm text-foreground/90">
                        <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Award</span><span className="ml-auto text-right font-medium">{s.amount}</span></li>
                        <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Country</span><span className="ml-auto text-right">{s.country}</span></li>
                        {s.region && (
                          <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Region</span><span className="ml-auto text-right">{s.region}</span></li>
                        )}
                        <li className="flex gap-2"><span className="text-muted-foreground shrink-0">Type</span><span className="ml-auto text-right capitalize">{s.type.replace("-", " ")}</span></li>
                      </ul>
                    </div>
                  </section>

                  <Separator />

                  {/* Application process — numbered steps */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Application Process</h4>
                    <ol className="space-y-2">
                      {processSteps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-foreground/90">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <Separator />

                  {/* Application checklist */}
                  <section>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />Your Checklist
                      <span className="ml-auto text-[11px] normal-case tracking-normal text-muted-foreground font-normal">
                        {(checklist[s.id] || []).length}/{checklistItems.length}
                      </span>
                    </h4>
                    <div className="space-y-1.5">
                      {checklistItems.map(item => {
                        const checked = (checklist[s.id] || []).includes(item);
                        return (
                          <button key={item} onClick={() => toggleChecklistItem(s.id, item)}
                            className={`flex items-center gap-2 w-full text-left text-sm p-2 rounded-lg border transition-all ${checked ? "bg-accent/10 border-accent/30 text-foreground" : "border-border text-muted-foreground hover:border-accent/30"}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-accent border-accent" : "border-muted-foreground/40"}`}>
                              {checked && <CheckCircle2 className="h-3 w-3 text-accent-foreground" />}
                            </div>
                            <span className={checked ? "line-through opacity-60" : ""}>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Footer actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button asChild className="flex-1 btn-accent">
                      <a href={s.applicationLink} target="_blank" rel="noopener noreferrer">
                        Visit Official Site <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                    <Button onClick={() => toggleCompare(s.id)} variant="outline" className="sm:w-auto">
                      <Scale className="h-4 w-4 mr-2" />
                      {isComparing ? "Remove Compare" : "Add to Compare"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            );
          })()}
        </Dialog>

        {/* Comparison Modal */}
        {showCompare && <ComparisonView items={compareItems} onClose={() => setShowCompare(false)} />}
      </div>
    </div>
  );
}
