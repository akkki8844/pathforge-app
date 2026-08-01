import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, GraduationCap, School, Clock, Compass, Heart, X, Plus, Search, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { majors } from '@/lib/data';
import { getCollegeNamesByCountry } from '@/lib/colleges';
import { searchSchools, formatSchoolDisplay, type School as SchoolType } from '@/lib/schools';
import { GPA_SYSTEMS, defaultGpaSystem, type GpaSystem } from '@/lib/curriculumSubjects';
import { TOP_COUNTRIES, TOP_COUNTRY_NAMES } from '@/lib/countries';
import { CountryCombobox } from '@/components/CountryCombobox';
import { useStepBackNavigation } from '@/hooks/useStepBackNavigation';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import pathforgeLogo from '@/assets/pathforge-logo.png';
import { AuroraBackdrop } from '@/components/visual/AuroraBackdrop';
import { InviteFriendsPanel } from '@/components/onboarding/InviteFriendsPanel';

const grades = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const curricula = ['IB', 'AP', 'CBSE', 'ICSE', 'IGCSE', 'A-Levels', 'US', 'Other'];
// Curated top 30 destinations — full ISO list lives in profile settings.
const countries = TOP_COUNTRY_NAMES;
const weeklyHoursOptions = ['Less than 5 hours', '5-10 hours', '10-15 hours', '15-20 hours', '20+ hours'];
const workTypes = [
  { id: 'long-term', label: 'Long-term projects', description: 'Research, startups, multi-month initiatives' },
  { id: 'competitions', label: 'Competitions', description: 'Olympiads, hackathons, debate tournaments' },
  { id: 'independent', label: 'Independent work', description: 'Self-directed learning and personal projects' },
  { id: 'team-based', label: 'Team-based work', description: 'Clubs, group projects, collaborative efforts' },
];
const constraints = [
  { id: 'time', label: 'Time', description: 'Too many commitments already' },
  { id: 'guidance', label: 'Guidance', description: "Don't know where to start" },
  { id: 'confidence', label: 'Confidence', description: 'Unsure if I can compete' },
  { id: 'resources', label: 'Resources', description: 'Limited access to opportunities' },
];
const majorReasons = [
  { id: 'passion', label: 'Genuine passion for the subject' },
  { id: 'career', label: 'Strong career prospects' },
  { id: 'family', label: 'Family influence or expectations' },
  { id: 'aptitude', label: "I'm naturally good at it" },
  { id: 'exploring', label: 'Still exploring, not fully decided' },
];
const motivations = [
  { id: 'prestige', label: 'Prestige and reputation' },
  { id: 'opportunities', label: 'Better career opportunities' },
  { id: 'education', label: 'Quality of education' },
  { id: 'network', label: 'Alumni network and connections' },
  { id: 'location', label: 'Location and campus life' },
  { id: 'financial', label: 'Financial aid and scholarships' },
];
const fears = [
  { id: 'rejection', label: 'Getting rejected from top choices' },
  { id: 'essays', label: 'Writing compelling essays' },
  { id: 'standing-out', label: 'Not standing out enough' },
  { id: 'time', label: 'Running out of time to prepare' },
  { id: 'competition', label: 'Intense competition from others' },
  { id: 'uncertainty', label: 'Uncertainty about the process' },
];

interface FormData {
  // Step 0 — Profile foundation (required)
  fullName: string;
  highSchoolName: string;
  country: string;             // Country of Residence
  studyDestinations: string[]; // Countries student wants to study in (1-3)
  applicationYear: string;
  targetUniversities: string[];
  gpaSystem: GpaSystem;
  gpaValue: string;
  // Step 1 — Academic context
  grade: string;
  curriculum: string;
  // Step 2 — Work style
  weeklyHoursAvailable: string;
  preferredWorkTypes: string[];
  biggestConstraint: string;
  // Step 3 — Direction
  intendedMajor: string;
  majorConfidence: number;
  openToAdjacentMajors: boolean;
  majorReason: string;
  // Step 4 — Mindset
  primaryMotivation: string;
  biggestFear: string;
}

export function OnboardingSurvey() {
  const [step, setStep] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);
  const [loading, setLoading] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const { toast } = useToast();
  const { user, refreshOnboardingData, signOut } = useAuth();
  const navigate = useNavigate();

  const requestExit = () => setExitOpen(true);

  const confirmExit = async () => {
    setExitOpen(false);
    try {
      await signOut();
    } catch (e) {
      console.error('Sign out failed', e);
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Wire the browser Back button: previous step OR confirm exit on step 0.
  useStepBackNavigation({
    step,
    onBack: () => setStep((s) => Math.max(0, s - 1)),
    onExitRequest: requestExit,
  });


  const currentYear = new Date().getFullYear();
  const applicationYears = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    highSchoolName: '',
    country: '',
    studyDestinations: [],
    applicationYear: String(currentYear + 1),
    targetUniversities: [],
    gpaSystem: 'gpa-4',
    gpaValue: '',
    grade: '',
    curriculum: '',
    weeklyHoursAvailable: '',
    preferredWorkTypes: [],
    biggestConstraint: '',
    intendedMajor: '',
    majorConfidence: 50,
    openToAdjacentMajors: true,
    majorReason: '',
    primaryMotivation: '',
    biggestFear: '',
  });

  // Persist in-progress onboarding (step + answers) so reloads/sign-outs don't wipe progress.
  const { clear: clearOnboardingDraft } = useDraftPersistence(
    'onboarding-survey',
    { step, formData },
    (saved) => {
      if (saved?.formData) setFormData((prev) => ({ ...prev, ...saved.formData }));
      if (typeof saved?.step === 'number') setStep(Math.max(0, Math.min(4, saved.step)));
    },
  );

  const totalSteps = 5;

  const gpaConfig = GPA_SYSTEMS.find((s) => s.value === formData.gpaSystem)!;
  const collegeOptions = useMemo(() => {
    const sources = formData.studyDestinations.length > 0 ? formData.studyDestinations : (formData.country ? [formData.country] : []);
    if (sources.length === 0) return [];
    const merged = new Set<string>();
    sources.forEach((c) => getCollegeNamesByCountry(c).forEach((n) => merged.add(n)));
    return Array.from(merged).sort();
  }, [formData.country, formData.studyDestinations]);

  const toggleStudyDestination = (c: string) => {
    setFormData((prev) => {
      if (prev.studyDestinations.includes(c)) {
        return { ...prev, studyDestinations: prev.studyDestinations.filter((x) => x !== c), targetUniversities: [] };
      }
      if (prev.studyDestinations.length >= 3) {
        toast({ title: 'Limit reached', description: 'You can pick up to 3 study destinations.' });
        return prev;
      }
      return { ...prev, studyDestinations: [...prev.studyDestinations, c], targetUniversities: [] };
    });
  };

  // School autocomplete state
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolIsOther, setSchoolIsOther] = useState(false);
  const schoolMatches = useMemo<SchoolType[]>(() => {
    if (!schoolQuery.trim() || schoolQuery.trim().length < 2) return [];
    return searchSchools(schoolQuery.trim(), 8);
  }, [schoolQuery]);

  // College selection grid: search filter
  const [collegeQuery, setCollegeQuery] = useState('');
  const filteredColleges = useMemo(() => {
    const q = collegeQuery.trim().toLowerCase();
    if (!q) return collegeOptions;
    return collegeOptions.filter((c) => c.toLowerCase().includes(q));
  }, [collegeOptions, collegeQuery]);

  // Country-of-Study chip search (full ISO list is too long for raw chip rendering)
  const [studyCountryQuery, setStudyCountryQuery] = useState('');

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWorkType = (typeId: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredWorkTypes: prev.preferredWorkTypes.includes(typeId)
        ? prev.preferredWorkTypes.filter((v) => v !== typeId)
        : [...prev.preferredWorkTypes, typeId],
    }));
  };

  const toggleUniversity = (uni: string) => {
    setFormData((prev) => {
      if (prev.targetUniversities.includes(uni)) {
        return { ...prev, targetUniversities: prev.targetUniversities.filter((u) => u !== uni) };
      }
      if (prev.targetUniversities.length >= 5) {
        toast({ title: 'Limit reached', description: 'You can select up to 5 target universities.' });
        return prev;
      }
      return { ...prev, targetUniversities: [...prev.targetUniversities, uni] };
    });
  };

  const validGpa = useMemo(() => {
    if (!formData.gpaValue) return false;
    const v = parseFloat(formData.gpaValue);
    if (isNaN(v)) return false;
    return v >= gpaConfig.min && v <= gpaConfig.max;
  }, [formData.gpaValue, gpaConfig]);

  const canProceed = () => {
    switch (step) {
      case 0:
        return (
          formData.fullName.trim().length >= 2 &&
          formData.highSchoolName.trim().length >= 2 &&
          !!formData.country &&
          formData.studyDestinations.length > 0 &&
          !!formData.applicationYear &&
          formData.targetUniversities.length > 0 &&
          validGpa
        );
      case 1:
        return !!formData.grade && !!formData.curriculum;
      case 2:
        return !!formData.weeklyHoursAvailable && formData.preferredWorkTypes.length > 0 && !!formData.biggestConstraint;
      case 3:
        return !!formData.intendedMajor && !!formData.majorReason;
      case 4:
        return !!formData.primaryMotivation && !!formData.biggestFear;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 1 && formData.curriculum) {
      // Auto-suggest GPA system on first curriculum pick if user didn't change it
      const suggested = defaultGpaSystem(formData.curriculum);
      if (!formData.gpaValue) {
        setFormData((p) => ({ ...p, gpaSystem: suggested }));
      }
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Resolve / create a school row for this student so the school exists
      // platform-wide. Picked-from-list -> verified=true; typed-as-other -> false.
      let resolvedSchoolId: string | null = null;
      try {
        const { data: schoolId } = await supabase.rpc("link_or_create_school", {
          _name: formData.highSchoolName.trim(),
          _country: formData.country || null,
          _city: null,
          _verified: !schoolIsOther,
        });
        resolvedSchoolId = (schoolId as string) || null;
      } catch (e) {
        console.warn("link_or_create_school failed; continuing without school_id", e);
      }

      const { error } = await supabase.from('onboarding_data').insert({
        user_id: user.id,
        grade: formData.grade,
        high_school_name: formData.highSchoolName.trim(),
        school_id: resolvedSchoolId,
        country: formData.country,
        study_destinations: formData.studyDestinations,
        curriculum: formData.curriculum,
        gpa: formData.gpaValue,
        gpa_range: `${formData.gpaSystem}:${formData.gpaValue}`,
        intended_major: formData.intendedMajor,
        target_universities: formData.targetUniversities,
        application_year: formData.applicationYear,
        extracurricular_level: 'Not specified',
        areas_of_interest: [],
        weekly_hours_available: formData.weeklyHoursAvailable,
        preferred_work_types: formData.preferredWorkTypes,
        biggest_constraint: formData.biggestConstraint,
        major_confidence: formData.majorConfidence,
        open_to_adjacent_majors: formData.openToAdjacentMajors,
        major_reason: formData.majorReason,
        primary_motivation: formData.primaryMotivation,
        biggest_fear: formData.biggestFear,
        onboarding_completed: true,
      });

      if (error) throw error;

      // Persist full name on the user's profile so the platform can address them by name.
      try {
        await supabase
          .from('profiles')
          .update({ full_name: formData.fullName.trim() })
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('Failed to save full_name to profile', e);
      }

      toast({ title: 'Profile Complete!', description: 'Your personalized recommendations are ready.' });
      clearOnboardingDraft();
      await refreshOnboardingData();
      navigate('/recommendations');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save your profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const stepIcons = [
    <School key="0" className="h-5 w-5" />,
    <GraduationCap key="1" className="h-5 w-5" />,
    <Clock key="2" className="h-5 w-5" />,
    <Compass key="3" className="h-5 w-5" />,
    <Heart key="4" className="h-5 w-5" />,
  ];
  const stepTitles = ['Profile Foundation', 'Academic Context', 'Work Style & Constraints', 'Direction Clarity', 'Motivation & Mindset'];
  const stepDescriptions = [
    'School, country, target universities, and grades',
    'Set your academic baseline',
    'Help us recommend feasible activities',
    'Understand your certainty level',
    'Personalize your guidance tone',
  ];

  return (
    <div ref={scrollContainerRef} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <AuroraBackdrop />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-2xl my-8">
        <div className="card-elevated p-6 sm:p-8 relative">
          {/* Exit to dashboard (sign out) */}
          <button
            type="button"
            onClick={requestExit}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/60 rounded-full px-3 py-1.5 transition-colors"
            aria-label="Exit onboarding and return to home"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <img src={pathforgeLogo} alt="Pathforge logo" className="h-10 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Let's Build Your Complete Profile</h1>
            <p className="text-muted-foreground mt-2">5 quick steps. We collect everything once — no follow-up surveys later.</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-between items-center mb-8">
            {[0, 1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                    step >= s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check className="h-5 w-5" /> : stepIcons[s]}
                </div>
                {s < 4 && <div className={`w-8 sm:w-14 h-1 mx-1 transition-colors ${step > s ? 'bg-accent' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {stepIcons[step]}
              {stepTitles[step]}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{stepDescriptions[step]}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* STEP 0 — Profile Foundation */}
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="e.g. Aarav Sharma"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      maxLength={100}
                      autoComplete="name"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      How counsellors and your AI advisor will address you.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>High School Name *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Type to search your school…"
                        value={schoolIsOther ? formData.highSchoolName : (schoolQuery || formData.highSchoolName)}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (schoolIsOther) {
                            updateField('highSchoolName', v);
                          } else {
                            setSchoolQuery(v);
                            updateField('highSchoolName', v);
                            setSchoolPickerOpen(true);
                          }
                        }}
                        onFocus={() => !schoolIsOther && setSchoolPickerOpen(true)}
                        onBlur={() => setTimeout(() => setSchoolPickerOpen(false), 150)}
                        maxLength={120}
                        className="pl-10"
                      />
                      {schoolPickerOpen && !schoolIsOther && schoolQuery.trim().length >= 2 && (
                        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                          {schoolMatches.length > 0 ? (
                            schoolMatches.map((s) => (
                              <button
                                key={`${s.name}-${s.city}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateField('highSchoolName', s.name);
                                  setSchoolQuery(s.name);
                                  setSchoolPickerOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b border-border/50 last:border-b-0"
                              >
                                <div className="font-medium text-foreground">{s.name}</div>
                                <div className="text-xs text-muted-foreground">{s.city}, {s.country}</div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-sm text-muted-foreground">No matches.</div>
                          )}
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSchoolIsOther(true);
                              updateField('highSchoolName', '');
                              setSchoolQuery('');
                              setSchoolPickerOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10 border-t border-border"
                          >
                            + School not listed — type it manually (Other)
                          </button>
                        </div>
                      )}
                    </div>
                    {schoolIsOther && (
                      <button
                        type="button"
                        onClick={() => { setSchoolIsOther(false); updateField('highSchoolName', ''); setSchoolQuery(''); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        ← Search from list instead
                      </button>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Can't find your school? Pick "Other" and type the full name.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Country of Residence *</Label>
                      <CountryCombobox
                        value={formData.country}
                        onChange={(v) => updateField('country', v)}
                        placeholder="Where do you live?"
                        options={TOP_COUNTRIES}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Application Year *</Label>
                      <Select value={formData.applicationYear} onValueChange={(v) => updateField('applicationYear', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {applicationYears.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Country of Study — multi-select up to 3 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Country of Study * <span className="text-muted-foreground font-normal">(pick 1–3)</span></Label>
                      <span className="text-xs text-muted-foreground">{formData.studyDestinations.length}/3 selected</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Where do you want to apply for university? This drives your university list and recommendations.</p>
                    {formData.studyDestinations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {formData.studyDestinations.map((c) => (
                          <Badge key={c} variant="secondary" className="gap-1">
                            {c}
                            <button type="button" onClick={() => toggleStudyDestination(c)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Search countries…"
                        value={studyCountryQuery}
                        onChange={(e) => setStudyCountryQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto border border-border rounded-lg p-2 bg-background/50">
                      <div className="flex flex-wrap gap-1.5">
                        {countries
                          .filter((c) => c.toLowerCase().includes(studyCountryQuery.trim().toLowerCase()))
                          .slice(0, 60)
                          .map((c) => {
                            const selected = formData.studyDestinations.includes(c);
                            const disabled = !selected && formData.studyDestinations.length >= 3;
                            return (
                              <button
                                key={c}
                                type="button"
                                disabled={disabled}
                                onClick={() => toggleStudyDestination(c)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  selected
                                    ? 'border-accent bg-accent/15 text-foreground font-medium'
                                    : disabled
                                      ? 'border-border bg-muted/40 text-muted-foreground/60 cursor-not-allowed'
                                      : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground'
                                }`}
                              >
                                {selected && <Check className="h-3 w-3 inline mr-1" />}
                                {c}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Target universities — visible selectable grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Target Universities * <span className="text-muted-foreground font-normal">(pick 1–5)</span></Label>
                      <span className="text-xs text-muted-foreground">{formData.targetUniversities.length}/5 selected</span>
                    </div>
                    {formData.studyDestinations.length === 0 ? (
                      <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-3">
                        Pick at least one Country of Study above to see relevant universities.
                      </p>
                    ) : (
                      <>
                        {formData.targetUniversities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {formData.targetUniversities.map((u) => (
                              <Badge key={u} variant="secondary" className="gap-1">
                                {u}
                                <button type="button" onClick={() => toggleUniversity(u)} className="hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="Search universities…"
                            value={collegeQuery}
                            onChange={(e) => setCollegeQuery(e.target.value)}
                            className="pl-10 mb-2"
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto border border-border rounded-lg p-2 bg-background/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {filteredColleges.length === 0 && (
                              <p className="text-xs text-muted-foreground p-2 col-span-full">No universities match your search.</p>
                            )}
                            {filteredColleges.map((c) => {
                              const selected = formData.targetUniversities.includes(c);
                              const disabled = !selected && formData.targetUniversities.length >= 5;
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => toggleUniversity(c)}
                                  className={`text-left text-xs sm:text-sm px-3 py-2 rounded-md border transition-colors ${
                                    selected
                                      ? 'border-accent bg-accent/15 text-foreground font-medium'
                                      : disabled
                                        ? 'border-border bg-muted/40 text-muted-foreground/60 cursor-not-allowed'
                                        : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate">{c}</span>
                                    {selected && <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* GPA / Percentage */}
                  <div className="space-y-2">
                    <Label>Grading System & Score *</Label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                      <Select
                        value={formData.gpaSystem}
                        onValueChange={(v) => {
                          updateField('gpaSystem', v as GpaSystem);
                          updateField('gpaValue', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GPA_SYSTEMS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={gpaConfig.min}
                          max={gpaConfig.max}
                          step={gpaConfig.step}
                          placeholder={`${gpaConfig.min}–${gpaConfig.max}`}
                          value={formData.gpaValue}
                          onChange={(e) => updateField('gpaValue', e.target.value)}
                          className={gpaConfig.suffix ? 'pr-8' : ''}
                        />
                        {gpaConfig.suffix && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                            {gpaConfig.suffix}
                          </span>
                        )}
                      </div>
                    </div>
                    {formData.gpaValue && !validGpa && (
                      <p className="text-xs text-destructive">
                        Value must be between {gpaConfig.min} and {gpaConfig.max}.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* STEP 1 — Academic Context */}
              {step === 1 && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Current Grade *</Label>
                      <Select value={formData.grade} onValueChange={(v) => updateField('grade', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Curriculum *</Label>
                      <Select value={formData.curriculum} onValueChange={(v) => updateField('curriculum', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select curriculum" />
                        </SelectTrigger>
                        <SelectContent>
                          {curricula.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can add per-subject grades and standardized test scores on the Admissions page.
                  </p>
                </>
              )}

              {/* STEP 2 — Work Style */}
              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Weekly Time Available for College Prep *</Label>
                    <Select
                      value={formData.weeklyHoursAvailable}
                      onValueChange={(v) => updateField('weeklyHoursAvailable', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select hours/week" />
                      </SelectTrigger>
                      <SelectContent>
                        {weeklyHoursOptions.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label>Preferred Work Types * (Select all that apply)</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {workTypes.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleWorkType(type.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            formData.preferredWorkTypes.includes(type.id)
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{type.label}</div>
                          <div className="text-xs opacity-80">{type.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Biggest Current Constraint *</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {constraints.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateField('biggestConstraint', c.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            formData.biggestConstraint === c.id
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{c.label}</div>
                          <div className="text-xs opacity-80">{c.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3 — Direction */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>Intended Major *</Label>
                    <Select value={formData.intendedMajor} onValueChange={(v) => updateField('intendedMajor', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select major" />
                      </SelectTrigger>
                      <SelectContent>
                        {majors.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Confidence in Your Major Choice</Label>
                      <span className="text-sm font-medium text-accent">{formData.majorConfidence}%</span>
                    </div>
                    <Slider
                      value={[formData.majorConfidence]}
                      onValueChange={([v]) => updateField('majorConfidence', v)}
                      max={100}
                      step={5}
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Still exploring</span>
                      <span>Very confident</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Open to Exploring Adjacent Majors?</Label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => updateField('openToAdjacentMajors', true)}
                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                          formData.openToAdjacentMajors
                            ? 'border-accent bg-accent/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                        }`}
                      >
                        Yes, I'm open
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('openToAdjacentMajors', false)}
                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                          !formData.openToAdjacentMajors
                            ? 'border-accent bg-accent/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                        }`}
                      >
                        No, I'm set
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Primary Reason for This Major *</Label>
                    <div className="grid gap-2">
                      {majorReasons.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => updateField('majorReason', r.id)}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            formData.majorReason === r.id
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 4 — Mindset */}
              {step === 4 && (
                <>
                  <div className="space-y-3">
                    <Label>Primary Motivation for Top Colleges *</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {motivations.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateField('primaryMotivation', m.id)}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            formData.primaryMotivation === m.id
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Biggest Fear About Applications *</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {fears.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateField('biggestFear', f.id)}
                          className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                            formData.biggestFear === f.id
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <InviteFriendsPanel />
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={requestExit}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Exit
              </Button>
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            {step < totalSteps - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 btn-accent">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canProceed()} className="gap-2 btn-accent">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    See My Recommendations
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Exit confirmation */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your account setup will not be completed
              and you'll be signed out. You can come back anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue setup</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>
              Exit & sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
