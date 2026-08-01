import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AnalysisResult {
  academicStrengths: string[];
  riskAreas: string[];
  recommendations: string[];
  alignmentScore: "Strong" | "Moderate" | "Needs Work";
  alignmentExplanation: string;
  extractedData: {
    subjects: string[];
    gpa?: string;
    remarks?: string;
  };
  summary?: string;
  pillars?: {
    academics: number;
    rigor: number;
    majorAlignment: number;
    growth: number;
    ecReadiness: number;
  };
  subjectScores?: Array<{
    subject: string;
    score: number;
    trend: "up" | "flat" | "down";
    note?: string;
  }>;
  actionPlan?: Array<{
    title: string;
    why?: string;
    horizon: "This Month" | "This Quarter" | "This Year";
    priority: "High" | "Medium" | "Low";
  }>;
  collegeFit?: Array<{
    university: string;
    fit: "Reach" | "Match" | "Safety";
    notes?: string;
  }>;
}

export interface ReadinessAnalysis {
  id: string;
  name: string;
  sequence_number: number;
  intended_major: string;
  target_universities: string | null;
  short_term_goals: string | null;
  report_card_text: string | null;
  analysis_result: AnalysisResult | null;
  created_at: string;
}

export function useReadinessHistory() {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<ReadinessAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalyses = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('readiness_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses((data || []).map(d => ({
        ...d,
        analysis_result: d.analysis_result as unknown as AnalysisResult | null,
      })) as ReadinessAnalysis[]);
    } catch (error) {
      console.error('Error loading analyses:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const saveAnalysis = useCallback(async (
    intendedMajor: string,
    targetUniversities: string,
    shortTermGoals: string,
    reportCardText: string,
    analysisResult: AnalysisResult
  ): Promise<ReadinessAnalysis | null> => {
    if (!user) return null;

    try {
      // Get next sequence number
      const { data: countData } = await supabase
        .from('readiness_analyses')
        .select('sequence_number')
        .eq('user_id', user.id)
        .order('sequence_number', { ascending: false })
        .limit(1);

      const nextSequence = (countData?.[0]?.sequence_number || 0) + 1;
      const name = `Analysis ${nextSequence}`;

      const insertData = {
        user_id: user.id,
        name,
        sequence_number: nextSequence,
        intended_major: intendedMajor,
        target_universities: targetUniversities || null,
        short_term_goals: shortTermGoals || null,
        report_card_text: reportCardText || null,
        analysis_result: JSON.parse(JSON.stringify(analysisResult)),
      };

      const { data, error } = await supabase
        .from('readiness_analyses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newAnalysis: ReadinessAnalysis = {
        id: data.id,
        name: data.name,
        sequence_number: data.sequence_number,
        intended_major: data.intended_major,
        target_universities: data.target_universities,
        short_term_goals: data.short_term_goals,
        report_card_text: data.report_card_text,
        analysis_result: data.analysis_result as unknown as AnalysisResult | null,
        created_at: data.created_at,
      };
      setAnalyses(prev => [newAnalysis, ...prev]);
      toast.success(`Saved as "${name}"`);
      return newAnalysis;
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Failed to save analysis');
      return null;
    }
  }, [user]);

  // Rename an analysis
  const renameAnalysis = useCallback(async (id: string, newName: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('readiness_analyses')
        .update({ name: newName })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAnalyses(prev => prev.map(a => 
        a.id === id ? { ...a, name: newName } : a
      ));
      
      toast.success('Analysis renamed');
      return true;
    } catch (error) {
      console.error('Error renaming analysis:', error);
      toast.error('Failed to rename analysis');
      return false;
    }
  }, [user]);

  const deleteAnalysis = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('readiness_analyses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAnalyses(prev => prev.filter(a => a.id !== id));
      toast.success('Analysis deleted');
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast.error('Failed to delete analysis');
    }
  }, [user]);

  return {
    analyses,
    loading,
    saveAnalysis,
    renameAnalysis,
    deleteAnalysis,
    refreshAnalyses: loadAnalyses,
    isAuthenticated: !!user,
  };
}
