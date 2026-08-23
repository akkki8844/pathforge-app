import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SchoolRow } from "@/components/SchoolPicker";

/* ------------------------------------------------------------------------ *
 * Why this exists
 * ------------------------------------------------------------------------
 * The settings page used to be eleven independent components, each owning its
 * own state, its own fetch and (in four cases) its own Save button. Three
 * problems fell out of that:
 *
 *  1. `SettingsShell` renders only the active section and unmounts the rest
 *     via AnimatePresence. Any edit you made in Preferences was destroyed the
 *     moment you clicked Privacy — there was no store above the section to
 *     hold it.
 *  2. Several sections had no persistence at all. Refinement tone, ambition,
 *     auto-sync, contextual tips, reduce motion, weekly digest and product
 *     announcements were `useState` and nothing else; layout density was an
 *     uncontrolled `<Select defaultValue>` that was never even read.
 *  3. Saves that did exist reported success unconditionally, including
 *     `profiles.update()` calls that matched zero rows.
 *
 * So: one store, above the sections, holding a `baseline` (what the server
 * has) and a `draft` (what the user has typed). Dirtiness is a diff of the
 * two. One save walks the diff, groups it by destination table, and reports
 * per-group success or failure — never a blanket "Saved".
 * ------------------------------------------------------------------------ */

export type SettingsDraft = {
  /* -- public.profiles -- */
  full_name: string;
  username: string;
  avatar_url: string | null;

  /* -- public.onboarding_data -- */
  grade: string;
  intended_major: string;
  country: string;
  study_destinations: string[];
  target_universities: string[];
  school_id: string | null;
  high_school_name: string;

  /* -- public.user_preferences -- */
  profile_visibility: "private" | "school" | "public";
  activity_visibility: "private" | "school" | "public";
  ai_personalization: boolean;
  notify_product_updates: boolean;
  notify_deadlines: boolean;
  notify_weekly_summary: boolean;
  notify_marketing: boolean;
  ai_tone: string;
  rec_rigor: string;
  auto_sync_calendar: boolean;
  show_tips: boolean;
  reduce_motion: boolean;
  auto_translate: boolean;
  email_weekly_digest: boolean;

  /* -- public.advisor_settings -- */
  nickname: string;
  occupation: string;
  traits: string;
  extra_notes: string;
  model: string;
  reasoning_effort: "none" | "low" | "medium" | "high" | "extra" | "max" | "ultracode";
  temperature: number;
  max_response_tokens: number;
  memory_enabled: boolean;
  autoplay_voice: boolean;
  show_suggestions: boolean;
  show_artifact_previews: boolean;
  history_retention_days: number;

  /* -- this device (localStorage, via lib/notifyTask) -- */
  notify_ai_tasks: boolean;
  notify_toasts: boolean;
};

export type SettingsField = keyof SettingsDraft;

/** Which write path a field belongs to. One group == one round trip. */
export type SaveGroup = "profile" | "academics" | "preferences" | "advisor" | "device";

export const GROUP_LABEL: Record<SaveGroup, string> = {
  profile: "Profile",
  academics: "Academic details",
  preferences: "Preferences & privacy",
  advisor: "Advisor",
  device: "Notifications on this device",
};

/** Which settings-page section a field is edited in — powers the nav dots. */
export type SectionKey =
  | "general"
  | "preferences"
  | "advisor"
  | "language"
  | "appearance"
  | "notifications"
  | "privacy";

const FIELD_META: Record<SettingsField, { group: SaveGroup; section: SectionKey }> = {
  full_name: { group: "profile", section: "general" },
  username: { group: "profile", section: "general" },
  avatar_url: { group: "profile", section: "general" },

  grade: { group: "academics", section: "general" },
  intended_major: { group: "academics", section: "general" },
  country: { group: "academics", section: "general" },
  study_destinations: { group: "academics", section: "general" },
  target_universities: { group: "academics", section: "general" },
  school_id: { group: "academics", section: "general" },
  high_school_name: { group: "academics", section: "general" },

  profile_visibility: { group: "preferences", section: "privacy" },
  activity_visibility: { group: "preferences", section: "privacy" },
  ai_personalization: { group: "preferences", section: "privacy" },
  notify_product_updates: { group: "preferences", section: "notifications" },
  notify_deadlines: { group: "preferences", section: "notifications" },
  notify_weekly_summary: { group: "preferences", section: "notifications" },
  notify_marketing: { group: "preferences", section: "notifications" },
  email_weekly_digest: { group: "preferences", section: "notifications" },
  ai_tone: { group: "preferences", section: "preferences" },
  rec_rigor: { group: "preferences", section: "preferences" },
  auto_sync_calendar: { group: "preferences", section: "preferences" },
  show_tips: { group: "preferences", section: "preferences" },
  reduce_motion: { group: "preferences", section: "appearance" },
  auto_translate: { group: "preferences", section: "language" },

  nickname: { group: "advisor", section: "advisor" },
  occupation: { group: "advisor", section: "advisor" },
  traits: { group: "advisor", section: "advisor" },
  extra_notes: { group: "advisor", section: "advisor" },
  model: { group: "advisor", section: "advisor" },
  reasoning_effort: { group: "advisor", section: "advisor" },
  temperature: { group: "advisor", section: "advisor" },
  max_response_tokens: { group: "advisor", section: "advisor" },
  memory_enabled: { group: "advisor", section: "advisor" },
  autoplay_voice: { group: "advisor", section: "advisor" },
  show_suggestions: { group: "advisor", section: "advisor" },
  show_artifact_previews: { group: "advisor", section: "advisor" },
  history_retention_days: { group: "advisor", section: "advisor" },

  notify_ai_tasks: { group: "device", section: "notifications" },
  notify_toasts: { group: "device", section: "notifications" },
};

const ALL_FIELDS = Object.keys(FIELD_META) as SettingsField[];

const EMPTY_DRAFT: SettingsDraft = {
  full_name: "",
  username: "",
  avatar_url: null,
  grade: "",
  intended_major: "",
  country: "",
  study_destinations: [],
  target_universities: [],
  school_id: null,
  high_school_name: "",
  profile_visibility: "private",
  activity_visibility: "private",
  ai_personalization: true,
  notify_product_updates: true,
  notify_deadlines: true,
  notify_weekly_summary: true,
  notify_marketing: false,
  ai_tone: "balanced",
  rec_rigor: "ambitious",
  auto_sync_calendar: true,
  show_tips: true,
  reduce_motion: false,
  auto_translate: false,
  email_weekly_digest: false,
  nickname: "",
  occupation: "",
  traits: "",
  extra_notes: "",
  model: "google/gemini-3-flash-preview",
  reasoning_effort: "none",
  temperature: 0.4,
  max_response_tokens: 1500,
  memory_enabled: true,
  autoplay_voice: false,
  show_suggestions: true,
  show_artifact_previews: true,
  history_retention_days: 0,
  notify_ai_tasks: true,
  notify_toasts: true,
};

/* -- user_preferences column split ---------------------------------------- *
 * The columns in EXTENDED are added by
 * supabase/migrations/20260808120000_user_preferences_extended.sql, which is
 * written but deliberately NOT applied from here. Until it is applied the
 * live table only has CORE, and including EXTENDED in the payload would make
 * PostgREST reject the whole statement (42703 / PGRST204) — taking the
 * currently-working privacy toggles down with it. So the writer degrades:
 * full payload first, core-only on a schema error, extended values mirrored
 * to localStorage so the UI stays truthful in the meantime.
 * ------------------------------------------------------------------------ */
const PREF_CORE: SettingsField[] = [
  "profile_visibility",
  "activity_visibility",
  "ai_personalization",
  "notify_product_updates",
  "notify_deadlines",
  "notify_weekly_summary",
  "notify_marketing",
];
const PREF_EXTENDED: SettingsField[] = [
  "ai_tone",
  "rec_rigor",
  "auto_sync_calendar",
  "show_tips",
  "reduce_motion",
  "auto_translate",
  "email_weekly_digest",
];

const localPrefsKey = (uid: string) => `pf_prefs_pending_${uid}`;
const notifPrefsKey = (uid: string) => `pf_notif_prefs_${uid}`;

function readLocalJson<T>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}

function writeLocalJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
  }
  return a === b;
}

/** A schema-cache / unknown-column rejection from PostgREST. */
function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column .* does not exist|could not find the .* column/i.test(error.message ?? "");
}

export interface GroupResult {
  group: SaveGroup;
  label: string;
  ok: boolean;
  error?: string;
}

interface SettingsFormValue {
  draft: SettingsDraft;
  loading: boolean;
  saving: boolean;
  /** Server row is missing the columns from the pending migration. */
  prefsSchemaDegraded: boolean;
  set: <K extends SettingsField>(key: K, value: SettingsDraft[K]) => void;
  isDirty: (key: SettingsField) => boolean;
  dirtyFields: SettingsField[];
  dirtyCount: number;
  dirtyBySection: Record<SectionKey, number>;
  /** Result of the most recent save attempt, cleared on the next edit. */
  lastResults: GroupResult[] | null;
  saveAll: () => Promise<GroupResult[]>;
  discardAll: () => void;
  /** Resolved school row for the picker — kept alongside school_id. */
  school: SchoolRow | null;
  setSchool: (row: SchoolRow | null) => void;
}

const Ctx = createContext<SettingsFormValue | null>(null);

export function useSettingsForm(): SettingsFormValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettingsForm must be used inside <SettingsFormProvider>");
  return ctx;
}

/**
 * Convenience binding for a single field:
 *   const name = useSettingsField("full_name");
 *   <Input value={name.value} onChange={e => name.set(e.target.value)} />
 */
export function useSettingsField<K extends SettingsField>(key: K) {
  const { draft, set, isDirty } = useSettingsForm();
  return {
    value: draft[key],
    set: useCallback((v: SettingsDraft[K]) => set(key, v), [set, key]),
    dirty: isDirty(key),
  };
}

export function SettingsFormProvider({ children }: { children: ReactNode }) {
  const { user, onboardingData, refreshOnboardingData, updateUsername } = useAuth();

  const [baseline, setBaseline] = useState<SettingsDraft>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<SettingsDraft>(EMPTY_DRAFT);
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefsSchemaDegraded, setPrefsSchemaDegraded] = useState(false);
  const [lastResults, setLastResults] = useState<GroupResult[] | null>(null);

  // Guards a late-resolving load from clobbering edits the user already made.
  const loadedRef = useRef(false);

  /* ---------------------------------------------------------------- load -- */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const [profileRes, prefsRes, advisorRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, username")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_preferences" as never)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("advisor_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const profileRow = (profileRes.data ?? {}) as Record<string, unknown>;
      const prefsRow = (prefsRes.data ?? null) as Record<string, unknown> | null;
      const advisorRow = (advisorRes.data ?? {}) as Record<string, unknown>;
      const ob = (onboardingData ?? {}) as Record<string, unknown>;

      // Extended prefs may not exist server-side yet (see PREF_EXTENDED note).
      const pendingLocal = readLocalJson<SettingsDraft>(localPrefsKey(user.id));
      const notifLocal = readLocalJson<{ aiTasks: boolean; toasts: boolean }>(
        notifPrefsKey(user.id),
      );

      const missingExtended =
        !!prefsRow && PREF_EXTENDED.some((k) => !(k in prefsRow));
      if (missingExtended) setPrefsSchemaDegraded(true);

      const pick = <K extends SettingsField>(
        row: Record<string, unknown> | null,
        key: K,
      ): SettingsDraft[K] => {
        const v = row?.[key];
        return (v === undefined || v === null ? EMPTY_DRAFT[key] : v) as SettingsDraft[K];
      };

      const next: SettingsDraft = {
        ...EMPTY_DRAFT,

        full_name: (profileRow.full_name as string) ?? "",
        username: (profileRow.username as string) ?? "",
        avatar_url: (profileRow.avatar_url as string | null) ?? null,

        grade: (ob.grade as string) ?? "",
        intended_major: (ob.intended_major as string) ?? "",
        country: (ob.country as string) ?? "",
        study_destinations: (ob.study_destinations as string[]) ?? [],
        target_universities: (ob.target_universities as string[]) ?? [],
        school_id: (ob.school_id as string | null) ?? null,
        high_school_name: (ob.high_school_name as string) ?? "",

        notify_ai_tasks: notifLocal.aiTasks ?? true,
        notify_toasts: notifLocal.toasts ?? true,
      };

      for (const key of PREF_CORE) {
        (next[key] as unknown) = pick(prefsRow, key);
      }
      for (const key of PREF_EXTENDED) {
        (next[key] as unknown) =
          prefsRow && key in prefsRow
            ? pick(prefsRow, key)
            : (pendingLocal[key] ?? EMPTY_DRAFT[key]);
      }
      for (const key of ALL_FIELDS) {
        if (FIELD_META[key].group === "advisor") {
          (next[key] as unknown) = pick(advisorRow, key);
        }
      }

      setBaseline(next);
      // Only seed the draft on the first successful load. A refetch triggered
      // by `refreshOnboardingData()` after a save must not wipe unsaved edits
      // sitting in other sections.
      // The flag has to be read *now*, not inside the updater: React runs the
      // updater during the next render, by which point `loadedRef.current` is
      // already true — which is why the first load never reached the draft and
      // every field rendered empty.
      const isFirstLoad = !loadedRef.current;
      loadedRef.current = true;
      setDraft((prev) => (isFirstLoad ? next : prev));

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // onboardingData is intentionally a dependency: it arrives asynchronously
    // from AuthContext and carries every academic field.
  }, [user, onboardingData]);

  /* Resolve the school row so SchoolPicker can render its current value. */
  useEffect(() => {
    const sid = draft.school_id;
    if (!sid) {
      setSchool(null);
      return;
    }
    if (school?.id === sid) return;
    let cancelled = false;
    supabase
      .from("schools")
      .select("id,name,city,country,domain")
      .eq("id", sid)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setSchool(data as SchoolRow);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.school_id, school?.id]);

  /* Reduce motion previews live off the draft, so the effect is visible the
     instant you flip the switch and reverts if you Discard — while the value
     itself is still committed by the page-level Save like everything else.
     The matching rule lives in src/index.css. */
  useEffect(() => {
    const root = document.documentElement;
    if (draft.reduce_motion) root.setAttribute("data-reduce-motion", "true");
    else root.removeAttribute("data-reduce-motion");
  }, [draft.reduce_motion]);

  /* --------------------------------------------------------------- edits -- */
  const set = useCallback(
    <K extends SettingsField>(key: K, value: SettingsDraft[K]) => {
      setDraft((prev) => (sameValue(prev[key], value) ? prev : { ...prev, [key]: value }));
      setLastResults(null);
    },
    [],
  );

  const handleSetSchool = useCallback(
    (row: SchoolRow | null) => {
      setSchool(row);
      setDraft((prev) => ({
        ...prev,
        school_id: row?.id ?? null,
        high_school_name: row?.name ?? prev.high_school_name,
      }));
      setLastResults(null);
    },
    [],
  );

  const dirtyFields = useMemo(
    () => ALL_FIELDS.filter((k) => !sameValue(draft[k], baseline[k])),
    [draft, baseline],
  );

  const dirtyBySection = useMemo(() => {
    const counts = {
      general: 0,
      preferences: 0,
      advisor: 0,
      language: 0,
      appearance: 0,
      notifications: 0,
      privacy: 0,
    } as Record<SectionKey, number>;
    for (const f of dirtyFields) counts[FIELD_META[f].section] += 1;
    return counts;
  }, [dirtyFields]);

  const isDirty = useCallback(
    (key: SettingsField) => !sameValue(draft[key], baseline[key]),
    [draft, baseline],
  );

  const discardAll = useCallback(() => {
    setDraft(baseline);
    setLastResults(null);
  }, [baseline]);

  /* ---------------------------------------------------------------- save -- */
  const saveAll = useCallback(async (): Promise<GroupResult[]> => {
    if (!user) {
      const r: GroupResult[] = [
        { group: "profile", label: "Session", ok: false, error: "You're signed out." },
      ];
      setLastResults(r);
      return r;
    }

    const changed = ALL_FIELDS.filter((k) => !sameValue(draft[k], baseline[k]));
    if (changed.length === 0) return [];

    const groups = new Set<SaveGroup>(changed.map((k) => FIELD_META[k].group));
    setSaving(true);

    const results: GroupResult[] = [];
    // Fields that made it to the server, so a partial failure only advances
    // the baseline for the groups that actually committed.
    const committed = new Set<SettingsField>();

    const record = (group: SaveGroup, error?: string) => {
      results.push({ group, label: GROUP_LABEL[group], ok: !error, error });
      if (!error) changed.filter((k) => FIELD_META[k].group === group).forEach((k) => committed.add(k));
    };

    /* -- profiles --------------------------------------------------------- */
    if (groups.has("profile")) {
      let error: string | undefined;

      const profilePatch: Record<string, unknown> = {};
      if (!sameValue(draft.full_name, baseline.full_name)) {
        profilePatch.full_name = draft.full_name.trim() || null;
      }
      if (!sameValue(draft.avatar_url, baseline.avatar_url)) {
        profilePatch.avatar_url = draft.avatar_url;
      }

      if (Object.keys(profilePatch).length) {
        // `.select()` is what makes a zero-row UPDATE detectable. Without it
        // PostgREST returns success for an update that matched nothing, which
        // is how "Saved" was being reported for writes that did nothing.
        const { data, error: pErr } = await supabase
          .from("profiles")
          .update(profilePatch as never)
          .eq("user_id", user.id)
          .select("user_id");
        if (pErr) error = pErr.message;
        else if (!data || data.length === 0) {
          error = "No profile row matched your account. Contact support.";
        }
      }

      if (!error && !sameValue(draft.username, baseline.username)) {
        const trimmed = draft.username.trim();
        if (!trimmed) {
          error = "Display name can't be empty.";
        } else {
          const { error: uErr } = await updateUsername(trimmed);
          if (uErr) error = uErr.message;
        }
      }

      record("profile", error);
    }

    /* -- onboarding_data -------------------------------------------------- */
    if (groups.has("academics")) {
      let error: string | undefined;
      const patch: Record<string, unknown> = {};
      for (const key of changed) {
        if (FIELD_META[key].group !== "academics") continue;
        patch[key] = draft[key];
      }
      // Keep the denormalised school name aligned with the picked school.
      if (patch.school_id !== undefined && school?.name) {
        patch.high_school_name = school.name;
      }

      const { data, error: oErr } = await supabase
        .from("onboarding_data")
        .update(patch as never)
        .eq("user_id", user.id)
        .select("user_id");
      if (oErr) error = oErr.message;
      else if (!data || data.length === 0) {
        error = "No onboarding record matched your account. Finish onboarding first.";
      }

      record("academics", error);
      if (!error) {
        try {
          await refreshOnboardingData();
        } catch {
          /* the write landed; a stale context refresh is not a save failure */
        }
      }
    }

    /* -- user_preferences ------------------------------------------------- */
    if (groups.has("preferences")) {
      let error: string | undefined;

      const fullPayload: Record<string, unknown> = { user_id: user.id };
      for (const key of [...PREF_CORE, ...PREF_EXTENDED]) fullPayload[key] = draft[key];

      const { error: prefErr } = await supabase
        .from("user_preferences" as never)
        .upsert(fullPayload as never, { onConflict: "user_id" });

      if (prefErr && isMissingColumnError(prefErr)) {
        // Pending migration. Persist what the live schema accepts and keep
        // the rest on this device rather than failing the whole save.
        const corePayload: Record<string, unknown> = { user_id: user.id };
        for (const key of PREF_CORE) corePayload[key] = draft[key];

        const { error: retryErr } = await supabase
          .from("user_preferences" as never)
          .upsert(corePayload as never, { onConflict: "user_id" });

        if (retryErr) {
          error = retryErr.message;
        } else {
          const mirror: Record<string, unknown> = {};
          for (const key of PREF_EXTENDED) mirror[key] = draft[key];
          writeLocalJson(localPrefsKey(user.id), mirror);
          setPrefsSchemaDegraded(true);
        }
      } else if (prefErr) {
        error = prefErr.message;
      } else {
        setPrefsSchemaDegraded(false);
      }

      record("preferences", error);
    }

    /* -- advisor_settings ------------------------------------------------- */
    if (groups.has("advisor")) {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      for (const key of ALL_FIELDS) {
        if (FIELD_META[key].group === "advisor") payload[key] = draft[key];
      }
      const { error: aErr } = await supabase
        .from("advisor_settings")
        .upsert(payload as never, { onConflict: "user_id" });
      record("advisor", aErr?.message);
    }

    /* -- this device ------------------------------------------------------ */
    if (groups.has("device")) {
      writeLocalJson(notifPrefsKey(user.id), {
        aiTasks: draft.notify_ai_tasks,
        toasts: draft.notify_toasts,
      });
      record("device");
    }

    // Advance the baseline only for fields whose group committed.
    setBaseline((prev) => {
      const next = { ...prev };
      for (const key of committed) (next[key] as unknown) = draft[key];
      return next;
    });

    setSaving(false);
    setLastResults(results);
    return results;
  }, [user, draft, baseline, school, updateUsername, refreshOnboardingData]);

  /* ------------------------------------------------- unsaved-changes guard *
   * The guard itself lives in `useUnsavedChangesGuard` and is mounted by
   * <UnsavedChangesDialog /> inside SettingsShell, so the confirmation can be
   * a real AlertDialog instead of window.confirm(). This store stays the one
   * source of truth for dirtiness — the guard reads `dirtyCount` and calls
   * `saveAll` / `discardAll`; it does not track anything of its own.
   * ------------------------------------------------------------------------ */
  const dirtyCount = dirtyFields.length;

  const value: SettingsFormValue = {
    draft,
    loading,
    saving,
    prefsSchemaDegraded,
    set,
    isDirty,
    dirtyFields,
    dirtyCount,
    dirtyBySection,
    lastResults,
    saveAll,
    discardAll,
    school,
    setSchool: handleSetSchool,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
