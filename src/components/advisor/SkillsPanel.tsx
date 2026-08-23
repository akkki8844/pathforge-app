import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Plus, Puzzle, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  SKILL_DESCRIPTION_MAX,
  SKILL_INSTRUCTIONS_MAX,
  SKILL_LIMIT,
  type CatalogSkill,
  type InstalledSkill,
} from "@/hooks/useAdvisorSkills";
import { cn } from "@/lib/utils";

/**
 * Skills manager.
 *
 * Installed skills first, catalogue second, hand-written last — that is the
 * order of how often each is touched, and the panel is opened to manage what is
 * already there far more often than to browse.
 *
 * The visual language follows the in-app editorial voice rather than the
 * landing page: tracked display caps for section labels, serif nowhere (these
 * are labels, not numerals), and `border-border bg-card` surfaces instead of
 * gradients. Source is shown as a plain tracked word, not a coloured chip —
 * "claude" and "codex" describe how a skill is written, and a badge would
 * imply a ranking that does not exist.
 */

function SourceTag({ source }: { source: string }) {
  return (
    <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {source}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

export function SkillsPanel({
  open,
  onOpenChange,
  catalog,
  installed,
  loading,
  onInstall,
  onRemove,
  onToggle,
  onWriteCustom,
  focus = "installed",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CatalogSkill[];
  installed: InstalledSkill[];
  loading: boolean;
  onInstall: (slug: string) => Promise<unknown>;
  onRemove: (slug: string) => Promise<unknown>;
  onToggle: (slug: string, enabled: boolean) => void;
  onWriteCustom: (input: { name: string; description: string; instructions: string }) => Promise<unknown>;
  /**
   * Which part of the panel the opener cares about. The sidebar offers two
   * doors into this one sheet — "Skills" for what is installed, "Plugins" for
   * what can be — and they are genuinely the same manager, so the second one
   * opens the panel and brings the catalogue up rather than duplicating it.
   */
  focus?: "installed" | "catalog";
}) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", instructions: "" });
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const installedSlugs = useMemo(() => new Set(installed.map((s) => s.slug)), [installed]);
  const available = useMemo(() => catalog.filter((c) => !installedSlugs.has(c.slug)), [catalog, installedSlugs]);
  const atLimit = installed.length >= SKILL_LIMIT;

  const catalogRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // Wait for the sheet's own entrance before scrolling, or the target is
    // still off-screen and the browser scrolls nothing.
    if (!open || focus !== "catalog" || loading) return;
    const id = window.setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
    return () => window.clearTimeout(id);
  }, [open, focus, loading, available.length]);

  const run = async (slug: string, fn: () => Promise<unknown>) => {
    setBusySlug(slug);
    try {
      await fn();
    } catch {
      // The hooks surface failures through the caller's toast. Swallowing here
      // only prevents an unhandled rejection; it does not hide the error.
    } finally {
      setBusySlug(null);
    }
  };

  const submitDraft = async () => {
    setDraftError(null);
    setSaving(true);
    try {
      await onWriteCustom(draft);
      setDraft({ name: "", description: "", instructions: "" });
      setWriting(false);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "That skill could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[41rem]">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <Puzzle className="h-4 w-4 text-accent" />
            Skills
          </SheetTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            A skill is a procedure the advisor follows for one kind of task. Installed skills load
            automatically when a message matches them — or name one directly with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">@slug</code>.
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-7 px-5 py-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : (
              <>
                {/* ─────────────────────────────────────────────── installed ── */}
                <section className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <SectionLabel>Installed</SectionLabel>
                    <span className="font-display text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {installed.length}/{SKILL_LIMIT}
                    </span>
                  </div>

                  {installed.length === 0 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Nothing installed yet. Add one below, or just ask the advisor — "install the
                      essay line editor" works.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {installed.map((skill) => (
                        <li
                          key={skill.slug}
                          className={cn(
                            "rounded-xl border border-border bg-card p-3 transition-opacity",
                            !skill.enabled && "opacity-55",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-display text-sm font-semibold">{skill.name}</span>
                                <SourceTag source={skill.source} />
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {skill.description}
                              </p>
                              <code className="mt-1.5 inline-block text-[11px] text-muted-foreground/80">
                                @{skill.slug}
                              </code>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <Switch
                                checked={skill.enabled}
                                onCheckedChange={(v) => onToggle(skill.slug, v)}
                                aria-label={`${skill.enabled ? "Disable" : "Enable"} ${skill.name}`}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={busySlug === skill.slug}
                                onClick={() => run(skill.slug, () => onRemove(skill.slug))}
                                aria-label={`Remove ${skill.name}`}
                              >
                                {busySlug === skill.slug ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* ─────────────────────────────────────────────── catalogue ── */}
                {available.length > 0 && (
                  <section ref={catalogRef} className="scroll-mt-4 space-y-3">
                    <SectionLabel>Available</SectionLabel>
                    <ul className="space-y-2">
                      {available.map((skill) => (
                        <li key={skill.slug} className="rounded-xl border border-border bg-card/60 p-3">
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-display text-sm font-semibold">{skill.name}</span>
                                <SourceTag source={skill.source} />
                                <span className="text-[11px] text-muted-foreground">· {skill.category}</span>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {skill.description}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 gap-1.5"
                              disabled={busySlug === skill.slug || atLimit}
                              onClick={() => run(skill.slug, () => onInstall(skill.slug))}
                            >
                              {busySlug === skill.slug ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                              Install
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {atLimit && (
                      <p className="text-xs text-muted-foreground">
                        You're at {SKILL_LIMIT} skills. Remove one to install another.
                      </p>
                    )}
                  </section>
                )}

                {/* ──────────────────────────────────────────────── your own ── */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Write your own</SectionLabel>
                    {writing && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setWriting(false);
                          setDraftError(null);
                        }}
                        aria-label="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {!writing ? (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      disabled={atLimit}
                      onClick={() => setWriting(true)}
                    >
                      <Plus className="h-4 w-4" />
                      New skill
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="skill-name" className="text-xs">
                          Name
                        </Label>
                        <Input
                          id="skill-name"
                          value={draft.name}
                          maxLength={80}
                          placeholder="Lab report reviewer"
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="skill-desc" className="text-xs">
                          When should it be used?
                        </Label>
                        <Input
                          id="skill-desc"
                          value={draft.description}
                          maxLength={SKILL_DESCRIPTION_MAX}
                          placeholder="Use when I paste a physics lab report."
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <Label htmlFor="skill-body" className="text-xs">
                            Instructions
                          </Label>
                          <span className="text-[11px] tabular-nums text-muted-foreground">
                            {draft.instructions.length}/{SKILL_INSTRUCTIONS_MAX}
                          </span>
                        </div>
                        <Textarea
                          id="skill-body"
                          value={draft.instructions}
                          maxLength={SKILL_INSTRUCTIONS_MAX}
                          rows={7}
                          placeholder={"Numbered steps work best.\n\n1. Check the hypothesis is falsifiable.\n2. Flag every claim with no measurement behind it."}
                          className="resize-y text-sm"
                          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                        />
                      </div>
                      {draftError && <p className="text-xs text-destructive">{draftError}</p>}
                      {/* No triggers field: a skill you wrote is loaded by name
                          or by @slug. Asking someone to invent keywords for
                          their own procedure produces skills that fire on turns
                          they did not mean. */}
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Your own skills load when you name them in a message.
                      </p>
                      <Button
                        className="w-full gap-2"
                        disabled={saving || !draft.name.trim() || !draft.instructions.trim()}
                        onClick={submitDraft}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Install skill
                      </Button>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
