import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Advisor skills — installable instruction packs in the Claude/Codex shape.
 *
 * Two sources, one shape:
 *   `advisor_skill_catalog` — what can be installed. Read-only.
 *   `advisor_skills`        — what this account has installed. Owner-scoped RLS.
 *
 * Installing copies the catalogue row's body into the user's row rather than
 * referencing it. That is deliberate — see the migration
 * `20260810130000_advisor_skills.sql` — so a skill someone relies on cannot
 * change underneath them, and hand-written skills need no second table.
 *
 * `as any` on the table names throughout: both tables are newer than the
 * checked-in `src/integrations/supabase/types.ts`, which cannot be regenerated
 * without an interactive `supabase login`. The casts are confined to the query
 * builder call; every row that comes back is typed on the way out.
 */

export type SkillSource = "claude" | "codex" | "custom";

export interface CatalogSkill {
  slug: string;
  name: string;
  description: string;
  instructions: string;
  source: Exclude<SkillSource, "custom">;
  category: string;
  triggers: string[];
}

export interface InstalledSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  instructions: string;
  source: SkillSource;
  triggers: string[];
  enabled: boolean;
  created_at: string;
}

/** Room for a hand-written skill, matched to the CHECK on the column. */
export const SKILL_INSTRUCTIONS_MAX = 8000;
export const SKILL_DESCRIPTION_MAX = 400;
export const SKILL_LIMIT = 30;

/** `Essay Editor!` → `essay-editor`. Empty when nothing survives. */
export function slugifySkillName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function useAdvisorSkills() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [installed, setInstalled] = useState<InstalledSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCatalog([]);
      setInstalled([]);
      setLoading(false);
      return;
    }
    const [cat, mine] = await Promise.all([
      (supabase.from("advisor_skill_catalog" as any) as any)
        .select("slug, name, description, instructions, source, category, triggers")
        .order("sort_order", { ascending: true }),
      (supabase.from("advisor_skills" as any) as any)
        .select("id, slug, name, description, instructions, source, triggers, enabled, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);
    setCatalog((cat.data ?? []) as CatalogSkill[]);
    setInstalled((mine.data ?? []) as InstalledSkill[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Install a catalogue skill by slug.
   *
   * This is also the path the advisor's `install_skill` tool takes, which is
   * why it resolves the body from the catalogue rather than accepting one:
   * the model can name a skill, but it can never author the instructions that
   * end up in the student's system prompt.
   */
  const installFromCatalog = useCallback(
    async (slug: string): Promise<InstalledSkill> => {
      if (!user) throw new Error("Not signed in.");
      const entry = catalog.find((c) => c.slug === slug);
      if (!entry) throw new Error(`There's no skill called "${slug}".`);
      if (installed.some((s) => s.slug === slug)) {
        throw new Error(`${entry.name} is already installed.`);
      }
      const { data, error } = await (supabase.from("advisor_skills" as any) as any)
        .insert({
          user_id: user.id,
          slug: entry.slug,
          name: entry.name,
          description: entry.description,
          instructions: entry.instructions,
          source: entry.source,
          triggers: entry.triggers ?? [],
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const row = data as InstalledSkill;
      setInstalled((prev) => [...prev, row]);
      return row;
    },
    [catalog, installed, user],
  );

  /** Install a skill the user wrote themselves. */
  const installCustom = useCallback(
    async (input: { name: string; description: string; instructions: string }): Promise<InstalledSkill> => {
      if (!user) throw new Error("Not signed in.");
      const name = input.name.trim();
      const description = input.description.trim();
      const instructions = input.instructions.trim();
      if (!name) throw new Error("Give the skill a name.");
      if (!instructions) throw new Error("A skill needs instructions.");

      const base = slugifySkillName(name);
      if (!base) throw new Error("That name has no letters or numbers in it.");
      // Collisions are realistic — "Essay editor" twice — and a raw unique
      // violation would surface as a Postgres error string.
      let slug = base;
      for (let i = 2; installed.some((s) => s.slug === slug); i++) slug = `${base}-${i}`;

      const { data, error } = await (supabase.from("advisor_skills" as any) as any)
        .insert({
          user_id: user.id,
          slug,
          name: name.slice(0, 80),
          description: (description || `Custom skill: ${name}.`).slice(0, SKILL_DESCRIPTION_MAX),
          instructions: instructions.slice(0, SKILL_INSTRUCTIONS_MAX),
          source: "custom",
          // No triggers: a hand-written skill is loaded by @mention or by its
          // own name. Guessing keywords for someone else's procedure would make
          // it fire on turns they did not mean.
          triggers: [],
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const row = data as InstalledSkill;
      setInstalled((prev) => [...prev, row]);
      return row;
    },
    [installed, user],
  );

  const remove = useCallback(
    async (slug: string): Promise<InstalledSkill> => {
      if (!user) throw new Error("Not signed in.");
      const existing = installed.find((s) => s.slug === slug);
      if (!existing) throw new Error(`"${slug}" isn't installed.`);
      const { error } = await (supabase.from("advisor_skills" as any) as any)
        .delete()
        .eq("user_id", user.id)
        .eq("slug", slug);
      if (error) throw new Error(error.message);
      setInstalled((prev) => prev.filter((s) => s.slug !== slug));
      return existing;
    },
    [installed, user],
  );

  /** Turn a skill off without losing it — the roster line goes too. */
  const setEnabled = useCallback(
    async (slug: string, enabled: boolean) => {
      if (!user) return;
      setInstalled((prev) => prev.map((s) => (s.slug === slug ? { ...s, enabled } : s)));
      const { error } = await (supabase.from("advisor_skills" as any) as any)
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("slug", slug);
      // Put the switch back where it was rather than lying about the state.
      if (error) setInstalled((prev) => prev.map((s) => (s.slug === slug ? { ...s, enabled: !enabled } : s)));
    },
    [user],
  );

  return {
    catalog,
    installed,
    loading,
    reload: load,
    installFromCatalog,
    installCustom,
    remove,
    setEnabled,
  };
}
