import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBragSheets } from "@/hooks/useBragSheets";
import { useRecommenders, type Recommender } from "@/hooks/useRecommenders";
import { useRecommenderPacket } from "@/hooks/useRecommenderPacket";

export function PacketSection({ recommender }: { recommender: Recommender }) {
  const { list: bragList } = useBragSheets();
  const { update } = useRecommenders();
  const { generate } = useRecommenderPacket();

  const sheets = bragList.data ?? [];
  const selectedId = recommender.brag_sheet_id ?? "none";

  const lastArtifact = useQuery({
    queryKey: ["recommender_packet_signed", recommender.last_packet_artifact_id],
    enabled: !!recommender.last_packet_artifact_id,
    queryFn: async (): Promise<string | null> => {
      const { data: art, error } = await supabase
        .from("advisor_artifacts")
        .select("file_path")
        .eq("id", recommender.last_packet_artifact_id!)
        .maybeSingle();
      if (error || !art?.file_path) return null;
      const { data: signed } = await supabase.storage
        .from("advisor-artifacts")
        .createSignedUrl(art.file_path, 600);
      return signed?.signedUrl ?? null;
    },
  });

  const onPickBrag = async (value: string) => {
    await update.mutateAsync({
      id: recommender.id,
      patch: { brag_sheet_id: value === "none" ? null : value } as any,
    });
  };

  const onGenerate = async () => {
    const res = await generate.mutateAsync(recommender);
    window.open(res.url, "_blank");
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mt-2">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Recommendation packet</h4>
      </div>
      <p className="text-xs text-muted-foreground">
        One PDF combining your profile, outcomes, application narrative, and the brag sheet you pick.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Attach brag sheet</Label>
        <Select value={selectedId} onValueChange={onPickBrag}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {sheets.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" onClick={onGenerate} disabled={generate.isPending}>
          {generate.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          {recommender.last_packet_artifact_id ? "Regenerate packet" : "Generate packet"}
        </Button>
        {recommender.last_packet_artifact_id && lastArtifact.data ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(lastArtifact.data!, "_blank")}
          >
            <Download className="h-4 w-4 mr-1.5" /> Last packet
          </Button>
        ) : null}
      </div>

      {recommender.last_packet_at ? (
        <p className="text-xs text-muted-foreground">
          Last generated {formatDistanceToNow(new Date(recommender.last_packet_at), { addSuffix: true })}
        </p>
      ) : null}
    </div>
  );
}
