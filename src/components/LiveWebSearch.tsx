import { useState } from "react";
import { Globe2, Loader2, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LiveResult {
  title?: string;
  url?: string;
  description?: string;
  snippet?: string;
}

interface LiveWebSearchProps {
  /** Optional initial query the dialog opens with */
  defaultQuery?: string;
  /** Label for the trigger button */
  label?: string;
  /** Smaller-sized trigger button */
  size?: "sm" | "default";
  /** Title shown inside the dialog */
  title?: string;
  /** Description shown under the dialog title */
  description?: string;
  /** Search prefix prepended to the user's query (e.g. "scholarships for ") */
  queryPrefix?: string;
  /** Restrict to recent results: 'qdr:m' (month), 'qdr:y' (year) */
  recency?: string;
  className?: string;
}

export function LiveWebSearch({
  defaultQuery = "",
  label = "Live web search",
  size = "sm",
  title = "Live web search",
  description = "Pull fresh results from the web — current deadlines, new programs, and updates the static database may not have yet.",
  queryPrefix = "",
  recency,
  className,
}: LiveWebSearchProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LiveResult[]>([]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 3) {
      toast({ title: "Type a longer query", description: "At least 3 characters." });
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: {
          mode: "search",
          query: queryPrefix + q,
          limit: 10,
          recency,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Search failed");
      }
      const raw = (data as any)?.data;
      // Normalize Firecrawl v2 search response shapes
      const items: LiveResult[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.web)
        ? raw.web
        : Array.isArray(raw?.results)
        ? raw.results
        : [];
      setResults(items);
      if (items.length === 0) {
        toast({ title: "No results", description: "Try a different search phrase." });
      }
    } catch (e: any) {
      toast({ title: "Live search failed", description: e?.message || "Try again later.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className={className}>
          <Globe2 className="h-3.5 w-3.5 mr-1.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-accent" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
              placeholder="e.g. STEM scholarships India 2026 deadline"
              className="pl-9"
            />
          </div>
          <Button onClick={runSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        <div className="space-y-2 mt-2">
          {loading && (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Fetching live results…
            </div>
          )}
          {!loading && results.length > 0 && results.map((r, i) => {
            const url = r.url || "";
            const host = (() => { try { return new URL(url).hostname.replace("www.", ""); } catch { return url; } })();
            return (
              <a
                key={`${url}-${i}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.title || host || url}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{host}</p>
                    {(r.description || r.snippet) && (
                      <p className="text-xs text-foreground/80 mt-1.5 line-clamp-2">{r.description || r.snippet}</p>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </a>
            );
          })}
          {!loading && results.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Run a search to see live web results.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
