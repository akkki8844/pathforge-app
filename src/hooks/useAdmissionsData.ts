import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SubjectEntry } from '@/components/admissions/SubjectGradeList';
import type { TestScore } from '@/components/admissions/TestScoreInput';

export interface AdmissionsFormData {
  // GPA — structured
  gpaSystem: 'gpa-4' | 'gpa-10' | 'percentage';
  gpaValue: string;
  // Curriculum (auto-filled from onboarding)
  curriculum: string;
  // Subjects + grades (board-aware)
  subjects: SubjectEntry[];
  // Test scores
  sat: TestScore;
  act: TestScore;
  psat: TestScore;
  // Course rigor (numeric only)
  apCourseCount: string;
  honorsCourseCount: string;
  // Class rank
  classRank: string;
  classSize: string;
  // Extracurricular level (controlled select)
  extracurricularLevel: string;
}

export interface AdmissionsHistoryEntry {
  id: string;
  name: string;
  sequence_number: number;
  form_data: AdmissionsFormData;
  analysis_results: any[];
  created_at: string;
}

export const defaultFormData: AdmissionsFormData = {
  gpaSystem: 'gpa-4',
  gpaValue: '',
  curriculum: '',
  subjects: [],
  sat: { taken: false, score: '', outOf: 1600 },
  act: { taken: false, score: '', outOf: 36 },
  psat: { taken: false, score: '', outOf: 1520 },
  apCourseCount: '',
  honorsCourseCount: '',
  classRank: '',
  classSize: '',
  extracurricularLevel: '',
};

function safeParseStored(d: any): AdmissionsFormData {
  // Backwards-compat: older rows stored a flat free-text shape.
  // We coerce them best-effort — missing fields default.
  const stored = d.form_data_v2;
  if (stored && typeof stored === 'object') {
    return { ...defaultFormData, ...stored } as AdmissionsFormData;
  }
  return {
    ...defaultFormData,
    curriculum: d.curriculum || '',
    gpaValue: d.gpa || '',
    apCourseCount: d.ap_course_count || '',
    honorsCourseCount: d.honors_course_count || '',
    classRank: d.class_rank || '',
    classSize: d.class_size || '',
    extracurricularLevel: d.extracurricular_level || '',
    sat: { taken: !!d.sat_taken, score: d.sat_score || '', outOf: 1600 },
    act: { taken: !!d.act_taken, score: d.act_score || '', outOf: 36 },
  };
}

export function useAdmissionsData() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AdmissionsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('admissions_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const entries: AdmissionsHistoryEntry[] = (data || []).map((d: any) => {
        const meta = (d.analysis_results as any)?.__meta;
        const fd = meta?.form_data_v2
          ? ({ ...defaultFormData, ...meta.form_data_v2 } as AdmissionsFormData)
          : safeParseStored(d);
        const results = Array.isArray(d.analysis_results) ? d.analysis_results : [];
        return {
          id: d.id,
          name: d.name,
          sequence_number: d.sequence_number,
          form_data: fd,
          analysis_results: results,
          created_at: d.created_at,
        };
      });
      setHistory(entries);
    } catch (err) {
      console.error('Error loading admissions history:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveAnalysis = useCallback(
    async (formData: AdmissionsFormData, results: any[]) => {
      if (!user) return;
      setSaving(true);
      try {
        const nextSeq = history.length > 0 ? Math.max(...history.map((h) => h.sequence_number)) + 1 : 1;
        // Persist results AND structured form snapshot via a sentinel array entry on the JSON.
        const resultsWithMeta = results.map((r) => r);
        (resultsWithMeta as any).__meta = { form_data_v2: formData };
        const { error } = await supabase.from('admissions_data').insert({
          user_id: user.id,
          name: `Analysis ${nextSeq}`,
          sequence_number: nextSeq,
          gpa: formData.gpaValue,
          curriculum: formData.curriculum,
          sat_score: formData.sat.score,
          sat_taken: formData.sat.taken,
          act_score: formData.act.score,
          act_taken: formData.act.taken,
          ap_scores: '',
          ap_course_count: formData.apCourseCount,
          honors_course_count: formData.honorsCourseCount,
          class_rank: formData.classRank,
          class_size: formData.classSize,
          extracurricular_level: formData.extracurricularLevel,
          extracurricular_details: JSON.stringify({
            subjects: formData.subjects,
            psat: formData.psat,
            gpaSystem: formData.gpaSystem,
          }),
          analysis_results: JSON.parse(JSON.stringify(resultsWithMeta)),
        });
        if (error) throw error;
        await loadHistory();
        toast.success('Analysis saved to history');
      } catch (err) {
        console.error('Error saving analysis:', err);
        toast.error('Failed to save analysis');
      } finally {
        setSaving(false);
      }
    },
    [user, history, loadHistory],
  );

  const renameAnalysis = useCallback(
    async (id: string, newName: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('admissions_data')
        .update({ name: newName })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Failed to rename');
        return;
      }
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, name: newName } : h)));
    },
    [user],
  );

  const deleteAnalysis = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('admissions_data')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        toast.error('Failed to delete');
        return;
      }
      setHistory((prev) => prev.filter((h) => h.id !== id));
      toast.success('Analysis deleted');
    },
    [user],
  );

  return {
    history,
    loading,
    saving,
    saveAnalysis,
    renameAnalysis,
    deleteAnalysis,
    refreshHistory: loadHistory,
    defaultFormData,
    isAuthenticated: !!user,
  };
}
