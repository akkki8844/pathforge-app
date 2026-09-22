import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Search, X } from "lucide-react";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Seo } from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  COUNSELLOR_RESOURCES,
  RESOURCE_CATEGORIES,
  type CounsellorResource,
} from "@/lib/teacher/resources";
import { cn } from "@/lib/utils";

/**
 * The resource library.
 *
 * The previous version listed twelve documents that did not exist. Every entry
 * carried `url: "#"`, the card had `cursor-pointer` and a hover colour but no
 * click handler and no link, and the `ExternalLink`, `Download` and `Bookmark`
 * icons it imported were never rendered. It was a page-shaped description of a
 * feature.
 *
 * Now every row goes somewhere. There are two kinds, and the difference
 * matters enough to show on the card:
 *
 *  - Official sources open in a new tab at the body that runs the process -
 *    UCAS, the Home Office, the Department of Education. The publisher is
 *    named on the card, because "the UCAS deadline" is worth a different
 *    amount depending on who is saying it.
 *  - Pathforge pages cannot be opened by a counsellor at all: the student app
 *    bounces a counsellor account back to this workspace. So those copy the
 *    student's link instead, which is the thing a counsellor actually wanted
 *    to do with them.
 *
 * See `src/lib/teacher/resources.ts` for the rule a new entry has to meet.
 */
export default function TeacherResources() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COUNSELLOR_RESOURCES.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        (r.region ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  const copyShareLink = async (resource: CounsellorResource) => {
    const url = `${window.location.origin}${resource.url}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(resource.id);
      setTimeout(() => setCopied((c) => (c === resource.id ? null : c)), 1800);
      toast({
        title: "Link copied",
        description: `${resource.title} - send this to a student.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy",
        description: url,
      });
    }
  };

  return (
    <TeacherLayout>
      <Seo
        title="Resources"
        description="Official sources and Pathforge pages you can point a student at."
        path="/teacher/resources"
        noindex
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official sources, and the Pathforge pages you can send a student to. Every
            link here goes somewhere.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, publisher or country"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              {RESOURCE_CATEGORIES.map((c) => (
                <TabsTrigger key={c.id} value={c.id} className="text-xs">
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Nothing matches that. Clear the search to see all{" "}
            {COUNSELLOR_RESOURCES.length} resources.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {COUNSELLOR_RESOURCES.length}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) =>
                r.kind === "external" ? (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/25"
                  >
                    <ResourceBody resource={r} />
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open {hostOf(r.url)}
                    </span>
                  </a>
                ) : (
                  <div
                    key={r.id}
                    className="flex h-full flex-col rounded-xl border border-border bg-card p-4"
                  >
                    <ResourceBody resource={r} />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <code className="truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {r.url}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-[12px]"
                        onClick={() => copyShareLink(r)}
                      >
                        {copied === r.id ? (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Copy link
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}

/** The part of the card that is the same whichever kind it is. */
function ResourceBody({ resource }: { resource: CounsellorResource }) {
  const share = resource.kind === "share";
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold leading-snug text-foreground">
          {resource.title}
        </p>
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
            share ? "border-border bg-muted" : "border-transparent bg-muted",
          )}
          aria-hidden="true"
        >
          {share ? (
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </div>

      <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
        {resource.description}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {/* Who publishes it. On an official source this is the whole reason to
            trust the page; on a Pathforge one it says the link is ours. */}
        <Badge variant="outline" className="text-[10px] font-medium">
          {resource.source}
        </Badge>
        {resource.region && (
          <span className="text-[11px] text-muted-foreground">{resource.region}</span>
        )}
      </div>
    </>
  );
}

/** "www.ucas.com" out of a full URL, for the label on the open link. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "link";
  }
}
