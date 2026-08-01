// Syncs a single completed/uncompleted Activity into the user's
// outcomes_data record so it flows into Outcomes, Resume, Recommendations, etc.
//
// Mapping rules:
//   Competition → competitions[]
//   Project     → projects[]
//   Research    → research_outputs[]
//   Leadership  → leadership_roles[]
//   Service     → service_roles[]
//
// We use the Activity.id as the synced entry id so we can locate and remove
// it cleanly when the user un-checks the activity. Entries created this way
// are tagged with `source: "activity_checklist"` so they're easy to identify
// downstream without colliding with user-typed entries.

import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "@/lib/activities";

const SOURCE = "activity_checklist";
const SYNCED_ID_PREFIX = "act:"; // ensures no collision with user-typed ids

const buildId = (activityId: string) => `${SYNCED_ID_PREFIX}${activityId}`;

type AnyRow = Record<string, unknown>;

function bucketFor(type: Activity["type"]) {
  switch (type) {
    case "Competition": return "competitions";
    case "Project":     return "projects";
    case "Research":    return "research_outputs";
    case "Leadership":  return "leadership_roles";
    case "Service":     return "service_roles";
    default:            return "projects";
  }
}

function buildEntry(activity: Activity): AnyRow {
  const id = buildId(activity.id);
  const base = {
    id,
    source: SOURCE,
    evidenceState: "in_progress" as const,
  };
  switch (activity.type) {
    case "Competition":
      return { ...base, name: activity.name, level: "regional", result: "Participated" };
    case "Project":
      return { ...base, title: activity.name, description: activity.description, duration: "", outcome: "", link: activity.learnMoreUrl };
    case "Research":
      return { ...base, title: activity.name, venue: activity.category, role: "Contributor", link: activity.learnMoreUrl };
    case "Leadership":
      return { ...base, title: activity.name, organization: activity.category, duration: "", teamSize: 0 };
    case "Service":
      return { ...base, role: activity.name, organization: activity.category, hours: 0, impact: activity.description };
    default:
      return { ...base, title: activity.name, description: activity.description, duration: "", outcome: "", link: activity.learnMoreUrl };
  }
}

async function fetchRow(userId: string) {
  const { data, error } = await supabase
    .from("outcomes_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as AnyRow | null;
}

async function upsertRow(userId: string, patch: AnyRow, existed: boolean) {
  if (existed) {
    const { error } = await supabase.from("outcomes_data").update(patch as any).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("outcomes_data")
      .insert({ user_id: userId, grade_level: "11", target_tier: "top-20", test_type: "none", test_score: "", ...patch });
    if (error) throw error;
  }
}

export async function addCompletedActivityToOutcomes(userId: string, activity: Activity) {
  const row = await fetchRow(userId);
  const bucket = bucketFor(activity.type);
  const existing = (row?.[bucket] as AnyRow[] | undefined) ?? [];
  const syncedId = buildId(activity.id);
  if (existing.some((e) => e?.id === syncedId)) return; // already there
  const next = [...existing, buildEntry(activity)];
  await upsertRow(userId, { [bucket]: next }, !!row);
}

export async function removeCompletedActivityFromOutcomes(userId: string, activity: Activity) {
  const row = await fetchRow(userId);
  if (!row) return;
  const bucket = bucketFor(activity.type);
  const existing = (row[bucket] as AnyRow[] | undefined) ?? [];
  const syncedId = buildId(activity.id);
  const next = existing.filter((e) => e?.id !== syncedId);
  if (next.length === existing.length) return;
  await upsertRow(userId, { [bucket]: next }, true);
}
