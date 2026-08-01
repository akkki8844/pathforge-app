import { useMemo, useState } from "react";
import { Link2, Copy, Check, RefreshCw, Loader2, Download, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRecommenderInvites } from "@/hooks/useRecommenderInvites";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Recommender } from "@/hooks/useRecommenders";

export function PortalLinkSection({ recommender }: { recommender: Recommender }) {
  const { list, create, revoke } = useRecommenderInvites(recommender.id);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const active = useMemo(() => {
    return (list.data ?? []).find(
      (i) => !i.revoked_at && new Date(i.expires_at) > new Date()
    );
  }, [list.data]);

  const url = active
    ? `${window.location.origin}/lor/portal/${active.token}`
    : null;

  const onCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setCopied(false), 1500);
  };

  const onRotate = async () => {
    if (active) await revoke.mutateAsync(active.id);
    await create.mutateAsync();
  };

  const onDownloadLetter = async () => {
    if (!recommender.letter_file_path) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("lor-letters")
        .createSignedUrl(recommender.letter_file_path, 600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      toast({ title: "Could not download", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mt-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Recommender portal</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        Share a private link so {recommender.name || "your recommender"} can review the packet and upload their letter directly.
      </p>

      {url ? (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Share link</Label>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 rounded-md border bg-background px-3 py-2 text-xs font-mono truncate"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="sm" variant="outline" onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          {active && (
            <p className="text-xs text-muted-foreground">
              Expires {formatDistanceToNow(new Date(active.expires_at), { addSuffix: true })}
            </p>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!url ? (
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Link2 className="h-4 w-4 mr-1.5" />}
            Create share link
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onRotate} disabled={create.isPending || revoke.isPending}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Rotate link
          </Button>
        )}
      </div>

      {recommender.letter_file_path ? (
        <div className="rounded-md border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Letter uploaded</span>
            {recommender.letter_uploaded_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(recommender.letter_uploaded_at), { addSuffix: true })}
              </span>
            )}
          </div>
          {recommender.letter_notes && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{recommender.letter_notes}</p>
          )}
          <Button size="sm" variant="outline" onClick={onDownloadLetter} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download letter
          </Button>
        </div>
      ) : null}
    </div>
  );
}
