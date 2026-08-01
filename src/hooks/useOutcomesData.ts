import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types for outcomes data
export type EvidenceState = "not_started" | "in_progress" | "evidence_submitted" | "verified";

export interface Course {
  id: string;
  subject: string;
  level: "regular" | "honors" | "ap" | "ib";
  grade?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  duration: string;
  outcome: string;
  link?: string;
  evidenceState: EvidenceState;
}

export interface LeadershipRole {
  id: string;
  title: string;
  organization: string;
  duration: string;
  teamSize: number;
  evidenceState: EvidenceState;
}

export interface Competition {
  id: string;
  name: string;
  level: "school" | "regional" | "state" | "national" | "international";
  result: string;
  evidenceState: EvidenceState;
}

export interface ServiceRole {
  id: string;
  role: string;
  organization: string;
  hours: number;
  impact: string;
  evidenceState: EvidenceState;
}

export interface Internship {
  id: string;
  title: string;
  organization: string;
  duration: string;
  outcome: string;
  evidenceState: EvidenceState;
}

export interface ResearchOutput {
  id: string;
  title: string;
  venue: string;
  role: string;
  link?: string;
  evidenceState: EvidenceState;
}

export interface CreativeWork {
  id: string;
  title: string;
  platform: string;
  reach: string;
  link?: string;
  evidenceState: EvidenceState;
}

export interface OutcomesProfile {
  gradeLevel: string;
  targetTier: string;
  courses: Course[];
  testType: string;
  testScore: string;
  projects: Project[];
  leadershipRoles: LeadershipRole[];
  competitions: Competition[];
  serviceRoles: ServiceRole[];
  internships: Internship[];
  researchOutputs: ResearchOutput[];
  creativeWorks: CreativeWork[];
}

interface OutcomesDataRecord {
  id: string;
  user_id: string;
  grade_level: string;
  target_tier: string;
  test_type: string;
  test_score: string;
  courses: Course[];
  projects: Project[];
  leadership_roles: LeadershipRole[];
  competitions: Competition[];
  service_roles?: ServiceRole[];
  internships?: Internship[];
  research_outputs?: ResearchOutput[];
  creative_works?: CreativeWork[];
  task_states: Record<string, EvidenceState>;
  follow_pathforge: boolean;
}

const defaultProfile: OutcomesProfile = {
  gradeLevel: "11",
  targetTier: "top-20",
  courses: [],
  testType: "none",
  testScore: "",
  projects: [],
  leadershipRoles: [],
  competitions: [],
  serviceRoles: [],
  internships: [],
  researchOutputs: [],
  creativeWorks: [],
};

export function useOutcomesData() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OutcomesProfile>(defaultProfile);
  const [taskStates, setTaskStates] = useState<Record<string, EvidenceState>>({});
  const [followPathforge, setFollowPathforge] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load data from database
  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('outcomes_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const record = data as unknown as OutcomesDataRecord;
        setProfile({
          gradeLevel: record.grade_level,
          targetTier: record.target_tier,
          courses: (record.courses || []) as Course[],
          testType: record.test_type,
          testScore: record.test_score,
          projects: (record.projects || []) as Project[],
          leadershipRoles: (record.leadership_roles || []) as LeadershipRole[],
          competitions: (record.competitions || []) as Competition[],
          serviceRoles: (record.service_roles || []) as ServiceRole[],
          internships: (record.internships || []) as Internship[],
          researchOutputs: (record.research_outputs || []) as ResearchOutput[],
          creativeWorks: (record.creative_works || []) as CreativeWork[],
        });
        setTaskStates((record.task_states || {}) as Record<string, EvidenceState>);
        setFollowPathforge(record.follow_pathforge ?? true);
      }
    } catch (error) {
      console.error('Error loading outcomes data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save data to database with debounce
  const saveData = useCallback(async (
    newProfile: OutcomesProfile, 
    newTaskStates: Record<string, EvidenceState>,
    newFollowPathforge: boolean
  ) => {
    if (!user) return;

    setSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('outcomes_data')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const dataToSave = {
        user_id: user.id,
        grade_level: newProfile.gradeLevel,
        target_tier: newProfile.targetTier,
        test_type: newProfile.testType,
        test_score: newProfile.testScore,
        courses: JSON.parse(JSON.stringify(newProfile.courses)),
        projects: JSON.parse(JSON.stringify(newProfile.projects)),
        leadership_roles: JSON.parse(JSON.stringify(newProfile.leadershipRoles)),
        competitions: JSON.parse(JSON.stringify(newProfile.competitions)),
        service_roles: JSON.parse(JSON.stringify(newProfile.serviceRoles)),
        internships: JSON.parse(JSON.stringify(newProfile.internships)),
        research_outputs: JSON.parse(JSON.stringify(newProfile.researchOutputs)),
        creative_works: JSON.parse(JSON.stringify(newProfile.creativeWorks)),
        task_states: JSON.parse(JSON.stringify(newTaskStates)),
        follow_pathforge: newFollowPathforge,
      };

      let error;
      if (existing) {
        const result = await supabase
          .from('outcomes_data')
          .update(dataToSave)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('outcomes_data')
          .insert(dataToSave);
        error = result.error;
      }

      if (error) throw error;
    } catch (error) {
      console.error('Error saving outcomes data:', error);
      toast.error('Failed to save data');
    } finally {
      setSaving(false);
    }
  }, [user]);

  // Update profile and save
  const updateProfile = useCallback((updater: (prev: OutcomesProfile) => OutcomesProfile) => {
    setProfile(prev => {
      const newProfile = updater(prev);
      saveData(newProfile, taskStates, followPathforge);
      return newProfile;
    });
  }, [saveData, taskStates, followPathforge]);

  // Update task states and save
  const updateTaskStates = useCallback((updater: (prev: Record<string, EvidenceState>) => Record<string, EvidenceState>) => {
    setTaskStates(prev => {
      const newStates = updater(prev);
      saveData(profile, newStates, followPathforge);
      return newStates;
    });
  }, [saveData, profile, followPathforge]);

  // Update follow pathforge and save
  const updateFollowPathforge = useCallback((value: boolean) => {
    setFollowPathforge(value);
    saveData(profile, taskStates, value);
  }, [saveData, profile, taskStates]);

  return {
    profile,
    taskStates,
    followPathforge,
    loading,
    saving,
    updateProfile,
    updateTaskStates,
    updateFollowPathforge,
    isAuthenticated: !!user,
  };
}
