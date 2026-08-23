import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, GraduationCap, School, Clock, Compass,
  Heart, X, Search, LogOut, BookOpen,
} from 'lucide-react';
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
import { searchSchools, type School as SchoolType } from '@/lib/schools';
import {
  GPA_SYSTEMS, defaultGpaSystem, type GpaSystem,
  CURRICULA, CURRICULUM_ORDER, curriculaForGrade,
} from '@/lib/curriculumSubjects';
import { TOP_COUNTRIES, TOP_COUNTRY_NAMES } from '@/lib/countries';
import { CountryCombobox } from '@/components/CountryCombobox';
import { useStepBackNavigation } from '@/hooks/useStepBackNavigation';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import pathforgeLogo from '@/assets/pathforge-logo.webp';
import { AuroraBackdrop } from '@/components/visual/AuroraBackdrop';
import { InviteFriendsPanel } from '@/components/onboarding/InviteFriendsPanel';
import { FlowButton } from '@/components/ui/flow-button';
import { SubjectSelector, type SelectedSubject } from '@/components/onboarding/SubjectSelector';
import { fadeUp, staggerParent, staggerStep, transition } from '@/lib/motion';

const grades = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
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

const STEPS = [
  { icon: School, title: 'Profile foundation', description: 'School, country, targets and grades' },
  { icon: GraduationCap, title: 'Academic context', description: 'Your grade and curriculum programme' },
  { icon: BookOpen, title: 'Subjects', description: 'What you actually study' },
  { icon: Clock, title: 'Work style', description: 'Time, format and constraints' },
  { icon: Compass, title: 'Direction', description: 'Major and how sure you are' },
  { icon: Heart, title: 'Mindset', description: 'What drives you, what worries you' },
] as const;

const TOTAL_STEPS = STEPS.length;

/** Shared chip styling — one source of truth for every toggle in the survey. */
const chip = (selected: boolean, disabled = false) =>
  `text-xs px-3 py-1.5 rounded-full border transition-colors ${
    selected
      ? 'border-accent bg-accent/15 text-foreground font-medium'
      : disabled
        ? 'border-border bg-muted/40 text-muted-foreground/60 cursor-not-allowed'
        : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground'
  }`;

/** Shared styling for the larger option cards (work types, reasons, fears). */
const optionCard = (selected: boolean) =>
  `p-4 rounded-xl border text-left transition-colors ${
    selected
      ? 'border-accent bg-accent/10 text-foreground'
      : 'border-border bg-card text-muted-foreground hover:border-accent/50'
  }`;

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
  curriculum: string;          // a CurriculumKey, e.g. "IB-MYP"
  // Step 2 — Subjects
  subjects: SelectedSubject[];
  // Step 3 — Work style
  weeklyHoursAvailable: string;
  preferredWorkTypes: string[];
  biggestConstraint: string;
  // Step 4 — Direction
  intendedMajor: string;
  majorConfidence: number;
  openToAdjacentMajors: boolean;
  majorReason: string;
  // Step 5 — Mindset
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
    subjects: [],
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
      if (typeof saved?.step === 'number') setStep(Math.max(0, Math.min(TOTAL_STEPS - 1, saved.step)));
    },
  );

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

  /**
   * Programmes are ordered so the ones that fit the student's year come first.
   * A 10th grader should not have to scroll past the DP to find MYP.
   */
  const orderedCurricula = useMemo(() => {
    const recommended = new Set(curriculaForGrade(formData.grade));
    return [...CURRICULUM_ORDER].sort((a, b) => {
      const diff = Number(recommended.has(b)) - Number(recommended.has(a));
      return diff !== 0 ? diff : CURRICULUM_ORDER.indexOf(a) - CURRICULUM_ORDER.indexOf(b);
    });
  }, [formData.grade]);

  const recommendedCurricula = useMemo(
    () => new Set(curriculaForGrade(formData.grade)),
    [formData.grade],
  );

  /**
   * Subjects belong to a programme, so switching programme has to drop them —
   * carrying "Mathematics: Analysis & Approaches (AA) HL" into an IGCSE
   * selection would persist a subject that board does not offer.
   */
  const selectCurriculum = (key: string) => {
    setFormData((prev) =>
      prev.curriculum === key ? prev : { ...prev, curriculum: key, subjects: [] },
    );
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
        return formData.subjects.length >= 2;
      case 3:
        return !!formData.weeklyHoursAvailable && formData.preferredWorkTypes.length > 0 && !!formData.biggestConstraint;
      case 4:
        return !!formData.intendedMajor && !!formData.majorReason;
      case 5:
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

      // Subjects go in a follow-up write, like full_name below: the columns
      // ship with a migration, and an environment that hasn't run it yet must
      // still be able to complete onboarding rather than fail the whole insert.
      try {
        await supabase
          .from('onboarding_data')
          .update({
            subjects: formData.subjects,
            curriculum_programme: formData.curriculum,
          } as never)
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('Failed to save subject selection', e);
      }

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
      // Read once by WelcomeTourDialog on /recommendations, then cleared —
      // this is what makes the welcome tour "once, right after onboarding"
      // rather than something a later revisit could re-trigger.
      try {
        sessionStorage.setItem('pf:justOnboarded', '1');
      } catch { /* private browsing / storage disabled — tour just won't show */ }
      navigate('/recommendations');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save your profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const ActiveIcon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      <AuroraBackdrop />

      {/* ── Left rail: identity, progress, escape hatch ───────────────── */}
      <aside className="relative z-10 hidden w-[320px] shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-sm px-8 py-10 lg:flex xl:w-[360px]">
        <img src={pathforgeLogo} alt="Pathforge" className="h-8 w-auto self-start object-contain" />

        <div className="mt-10">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            Step {step + 1} of {TOTAL_STEPS}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground">
            Build your complete profile
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We collect everything once. No follow-up surveys later.
          </p>
        </div>

        <nav className="mt-10 flex-1" aria-label="Onboarding progress">
          <ol className="space-y-1">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative">
                  {i < TOTAL_STEPS - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[15px] top-[34px] h-[calc(100%-22px)] w-px transition-colors ${
                        done ? 'bg-accent/50' : 'bg-border'
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => done && setStep(i)}
                    disabled={!done}
                    aria-current={active ? 'step' : undefined}
                    className={`group flex w-full items-start gap-3 rounded-lg py-2 pr-2 text-left transition-colors ${
                      done ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'
                    }`}
                  >
                    <span
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        active
                          ? 'border-accent bg-accent text-accent-foreground'
                          : done
                            ? 'border-accent/50 bg-accent/15 text-accent'
                            : 'border-border bg-card text-muted-foreground/60'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 pt-1">
                      <span
                        className={`block font-display text-sm font-semibold leading-none transition-colors ${
                          active ? 'text-foreground' : done ? 'text-foreground/80' : 'text-muted-foreground/70'
                        }`}
                      >
                        {s.title}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-muted-foreground/70">
                        {s.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <button
          type="button"
          onClick={requestExit}
          className="mt-6 inline-flex items-center gap-2 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Save and exit
        </button>
      </aside>

      {/* ── Right pane: the actual form ───────────────────────────────── */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Mobile header — the rail is hidden below lg, so progress lives here */}
        <header className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-4 lg:hidden">
          <img src={pathforgeLogo} alt="Pathforge" className="h-7 w-auto object-contain" />
          <div className="flex flex-1 items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-accent' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={requestExit}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Exit onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={staggerParent}
                custom={staggerStep(4)}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, transition: transition.fast }}
              >
                <motion.header variants={fadeUp} className="mb-8">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-accent lg:hidden">
                    Step {step + 1} of {TOTAL_STEPS}
                  </p>
                  <h2 className="mt-1.5 flex items-center gap-2.5 font-display text-2xl font-semibold text-foreground sm:text-3xl">
                    <ActiveIcon className="h-6 w-6 text-accent" />
                    {STEPS[step].title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">{STEPS[step].description}</p>
                </motion.header>

                <motion.div variants={fadeUp} className="space-y-7">
                  {/* STEP 0 — Profile Foundation */}
                  {step === 0 && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Full name *</Label>
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
                          <Label>Application year *</Label>
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
                          <p className="text-[11px] text-muted-foreground">
                            The year you'll submit applications.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>High school name *</Label>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
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
                                    className="w-full border-b border-border/50 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
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
                                className="w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-accent hover:bg-accent/10"
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
                            className="text-xs text-muted-foreground underline hover:text-foreground"
                          >
                            ← Search from list instead
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Country of residence *</Label>
                        <div className="max-w-sm">
                          <CountryCombobox
                            value={formData.country}
                            onChange={(v) => updateField('country', v)}
                            placeholder="Where do you live?"
                            options={TOP_COUNTRIES}
                          />
                        </div>
                      </div>

                      {/* Country of Study — multi-select up to 3 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Country of study * <span className="font-normal text-muted-foreground">(pick 1–3)</span></Label>
                          <span className="text-xs text-muted-foreground">{formData.studyDestinations.length}/3 selected</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Where you want to apply for university. This drives your university list and recommendations.</p>
                        {formData.studyDestinations.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {formData.studyDestinations.map((c) => (
                              <Badge key={c} variant="secondary" className="gap-1">
                                {c}
                                <button type="button" onClick={() => toggleStudyDestination(c)} className="hover:text-destructive" aria-label={`Remove ${c}`}>
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="relative mb-2">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search countries…"
                            value={studyCountryQuery}
                            onChange={(e) => setStudyCountryQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background/50 p-2">
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
                                    aria-pressed={selected}
                                    className={chip(selected, disabled)}
                                  >
                                    {selected && <Check className="mr-1 inline h-3 w-3" />}
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
                          <Label>Target universities * <span className="font-normal text-muted-foreground">(pick 1–5)</span></Label>
                          <span className="text-xs text-muted-foreground">{formData.targetUniversities.length}/5 selected</span>
                        </div>
                        {formData.studyDestinations.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                            Pick at least one country of study above to see relevant universities.
                          </p>
                        ) : (
                          <>
                            {formData.targetUniversities.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-1.5">
                                {formData.targetUniversities.map((u) => (
                                  <Badge key={u} variant="secondary" className="gap-1">
                                    {u}
                                    <button type="button" onClick={() => toggleUniversity(u)} className="hover:text-destructive" aria-label={`Remove ${u}`}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="Search universities…"
                                value={collegeQuery}
                                onChange={(e) => setCollegeQuery(e.target.value)}
                                className="mb-2 pl-10"
                              />
                            </div>
                            <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-background/50 p-2">
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {filteredColleges.length === 0 && (
                                  <p className="col-span-full p-2 text-xs text-muted-foreground">No universities match your search.</p>
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
                                      aria-pressed={selected}
                                      className={`rounded-md border px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
                                        selected
                                          ? 'border-accent bg-accent/15 font-medium text-foreground'
                                          : disabled
                                            ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground/60'
                                            : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate">{c}</span>
                                        {selected && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
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
                        <Label>Grading system & score *</Label>
                        <div className="grid max-w-lg gap-2 sm:grid-cols-[1fr_180px]">
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
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
                      <div className="space-y-2">
                        <Label>Current grade *</Label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {grades.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => updateField('grade', g)}
                              aria-pressed={formData.grade === g}
                              className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                                formData.grade === g
                                  ? 'border-accent bg-accent/10 text-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label>Curriculum programme *</Label>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Pick the exact programme, not just the board — MYP and the Diploma are graded
                            and structured differently, and this decides which subjects we offer you next.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {orderedCurricula.map((key) => {
                            const c = CURRICULA[key];
                            const selected = formData.curriculum === key;
                            const recommended = recommendedCurricula.has(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => selectCurriculum(key)}
                                aria-pressed={selected}
                                className={`rounded-xl border p-4 text-left transition-colors ${
                                  selected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-border bg-card hover:border-accent/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`font-display text-sm font-semibold ${selected ? 'text-foreground' : 'text-foreground/90'}`}>
                                    {c.shortLabel}
                                  </span>
                                  {selected ? (
                                    <Check className="h-4 w-4 shrink-0 text-accent" />
                                  ) : recommended && formData.grade ? (
                                    <span className="shrink-0 rounded-full border border-accent/40 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-accent">
                                      Likely
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{c.blurb}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 2 — Subjects */}
                  {step === 2 && (
                    formData.curriculum ? (
                      <SubjectSelector
                        curriculum={formData.curriculum}
                        value={formData.subjects}
                        onChange={(next) => updateField('subjects', next)}
                      />
                    ) : (
                      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Go back and choose your curriculum programme first — subjects depend on it.
                      </p>
                    )
                  )}

                  {/* STEP 3 — Work Style */}
                  {step === 3 && (
                    <>
                      <div className="space-y-2">
                        <Label>Weekly time available for college prep *</Label>
                        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                          {weeklyHoursOptions.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => updateField('weeklyHoursAvailable', h)}
                              aria-pressed={formData.weeklyHoursAvailable === h}
                              className={`rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                                formData.weeklyHoursAvailable === h
                                  ? 'border-accent bg-accent/10 text-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                              }`}
                            >
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Preferred work types * <span className="font-normal text-muted-foreground">(select all that apply)</span></Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {workTypes.map((type) => (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => toggleWorkType(type.id)}
                              aria-pressed={formData.preferredWorkTypes.includes(type.id)}
                              className={optionCard(formData.preferredWorkTypes.includes(type.id))}
                            >
                              <div className="text-sm font-medium">{type.label}</div>
                              <div className="mt-0.5 text-xs opacity-80">{type.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Biggest current constraint *</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {constraints.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => updateField('biggestConstraint', c.id)}
                              aria-pressed={formData.biggestConstraint === c.id}
                              className={optionCard(formData.biggestConstraint === c.id)}
                            >
                              <div className="text-sm font-medium">{c.label}</div>
                              <div className="mt-0.5 text-xs opacity-80">{c.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 4 — Direction */}
                  {step === 4 && (
                    <>
                      <div className="space-y-2">
                        <Label>Intended major *</Label>
                        <div className="max-w-md">
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
                      </div>
                      <div className="space-y-3 rounded-xl border border-border bg-card/50 p-5">
                        <div className="flex items-center justify-between">
                          <Label>Confidence in your major choice</Label>
                          <span className="font-serif text-2xl leading-none text-accent">{formData.majorConfidence}%</span>
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
                        <Label>Open to exploring adjacent majors?</Label>
                        <div className="flex max-w-md gap-3">
                          <button
                            type="button"
                            onClick={() => updateField('openToAdjacentMajors', true)}
                            aria-pressed={formData.openToAdjacentMajors}
                            className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-colors ${
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
                            aria-pressed={!formData.openToAdjacentMajors}
                            className={`flex-1 rounded-xl border p-3 text-sm font-medium transition-colors ${
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
                        <Label>Primary reason for this major *</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {majorReasons.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => updateField('majorReason', r.id)}
                              aria-pressed={formData.majorReason === r.id}
                              className={`${optionCard(formData.majorReason === r.id)} text-sm`}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 5 — Mindset */}
                  {step === 5 && (
                    <>
                      <div className="space-y-3">
                        <Label>Primary motivation for top colleges *</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {motivations.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => updateField('primaryMotivation', m.id)}
                              aria-pressed={formData.primaryMotivation === m.id}
                              className={`${optionCard(formData.primaryMotivation === m.id)} text-sm`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Biggest fear about applications *</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {fears.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => updateField('biggestFear', f.id)}
                              aria-pressed={formData.biggestFear === f.id}
                              className={`${optionCard(formData.biggestFear === f.id)} text-sm`}
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Sticky action bar — never scrolls out of reach on a long step */}
        <footer className="border-t border-border/60 bg-background/80 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()} className="gap-2 btn-accent">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : loading ? (
              <Button disabled className="gap-2 btn-accent">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </Button>
            ) : (
              <FlowButton
                text="See my recommendations"
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="disabled:pointer-events-none disabled:opacity-50"
              />
            )}
          </div>
        </footer>
      </main>

      {/* Exit confirmation */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your account setup will not be completed
              and you'll be signed out. Your answers are saved, so you can pick up where
              you left off.
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
