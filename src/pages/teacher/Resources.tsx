import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, Globe, GraduationCap, Plane, ClipboardList,
  Search, ExternalLink, Download, Bookmark,
} from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  type: "guide" | "template" | "checklist";
  url: string;
}

const RESOURCES: Resource[] = [
  { id: "1", title: "Common App Essay Guide", description: "Step-by-step guide to writing compelling Common App personal statements with examples and prompts.", category: "essays", type: "guide", url: "#" },
  { id: "2", title: "Supplemental Essay Toolkit", description: "Strategies for Why Us, Community, and Activity essays with templates.", category: "essays", type: "guide", url: "#" },
  { id: "3", title: "Resume Template for Students", description: "Clean, professional resume template designed for high school students.", category: "resume", type: "template", url: "#" },
  { id: "4", title: "Activity List Optimizer", description: "How to write impactful activity descriptions that stand out.", category: "activities", type: "guide", url: "#" },
  { id: "5", title: "US Admissions Timeline", description: "Month-by-month checklist from freshman to senior year.", category: "admissions", type: "checklist", url: "#" },
  { id: "6", title: "UK UCAS Guide", description: "Complete guide to the UCAS application process, personal statement, and clearing.", category: "country", type: "guide", url: "#" },
  { id: "7", title: "Canada Application Guide", description: "Provincial differences, OUAC vs direct applications, and scholarship timelines.", category: "country", type: "guide", url: "#" },
  { id: "8", title: "Scholarship Search Strategies", description: "How to find and apply for scholarships effectively.", category: "scholarships", type: "guide", url: "#" },
  { id: "9", title: "Visa Application Checklist", description: "Documents and steps for F-1, Tier 4, and study permit applications.", category: "visa", type: "checklist", url: "#" },
  { id: "10", title: "Recommendation Letter Guide", description: "How to request and what makes a strong recommendation letter.", category: "admissions", type: "guide", url: "#" },
  { id: "11", title: "Interview Prep Guide", description: "Common questions, STAR method, and mock interview tips.", category: "admissions", type: "guide", url: "#" },
  { id: "12", title: "Financial Aid Overview", description: "FAFSA, CSS Profile, and international student financial aid options.", category: "scholarships", type: "guide", url: "#" },
];

const categoryConfig: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  essays: { label: "Essays", icon: FileText, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  resume: { label: "Resume", icon: FileText, color: "bg-green-500/10 text-green-600 border-green-500/20" },
  activities: { label: "Activities", icon: GraduationCap, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  admissions: { label: "Admissions", icon: ClipboardList, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  country: { label: "Country Guides", icon: Globe, color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  scholarships: { label: "Scholarships", icon: GraduationCap, color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  visa: { label: "Visa", icon: Plane, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
};

export default function TeacherResources() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = RESOURCES.filter((r) => {
    if (activeCategory !== "all" && r.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    }
    return true;
  });

  const categories = Array.from(new Set(RESOURCES.map((r) => r.category)));

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">Guides, templates, and checklists for your students</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {categories.map((cat) => {
              const cfg = categoryConfig[cat];
              return (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cfg?.label || cat}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Resource grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource, i) => {
            const cfg = categoryConfig[resource.category];
            const Icon = cfg?.icon || BookOpen;
            return (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="border-border/60 h-full hover:border-accent/30 transition-colors cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", cfg?.color || "bg-muted")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                          {resource.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {resource.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {resource.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{cfg?.label}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </TeacherLayout>
  );
}
