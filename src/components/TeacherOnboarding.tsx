import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SchoolPicker, type SchoolRow } from "@/components/SchoolPicker";
import pathforgeLogo from "@/assets/pathforge-logo.png";
import { AuroraBackdrop } from "@/components/visual/AuroraBackdrop";

const TITLES = ["Counselor", "Teacher", "Dean", "Head of School", "Other"];

export function TeacherOnboarding() {
  const { toast } = useToast();
  const { refreshTeacherStatus } = useAuth();
  const navigate = useNavigate();
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [title, setTitle] = useState("Counselor");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!school) {
      toast({ variant: "destructive", title: "Select your school" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("teacher-verify", {
        body: { school_id: school.id, title, subject: subject.trim() || null },
      });
      if (error) throw error;
      const verified = !!(data as { verified?: boolean })?.verified;
      toast({
        title: verified ? "Verified instantly" : "Submitted for review",
        description: verified
          ? `Email domain matched ${school.name}. You're in.`
          : "Our team will verify your account within 24 hours.",
      });
      await refreshTeacherStatus();
      navigate("/teacher");
    } catch (e) {
      toast({ variant: "destructive", title: "Could not submit", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <AuroraBackdrop />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-lg my-8">
        <div className="card-elevated p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-10 mx-auto mb-3" />
            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
              <GraduationCap className="h-6 w-6 text-accent" /> Educator setup
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Tell us where you work. We'll auto-link you to students at the same school.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Your school *</Label>
            <SchoolPicker value={school} onChange={setSchool} />
          </div>

          <div className="space-y-2">
            <Label>Your role *</Label>
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject or department (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics, College Counseling" maxLength={80} />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
            <ShieldCheck className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            <p>If your work email matches your school's verified domain, you're verified instantly. Otherwise our admin team reviews within 24h. You can sign in immediately, but student data only unlocks after verification.</p>
          </div>

          <Button className="w-full btn-accent" onClick={submit} disabled={loading || !school}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to dashboard"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
