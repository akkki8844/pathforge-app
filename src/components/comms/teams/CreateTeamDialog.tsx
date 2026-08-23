import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Button as MotionButton } from "@/components/ui/be-ui-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accent } from "@/lib/comms/accents";
import {
  TEAM_ACCENTS,
  TEAM_CATEGORIES,
  TEAM_CATEGORY_LABELS,
  type TeamAccent,
  type TeamCategory,
} from "@/lib/comms/types";
import { useTeamActions } from "@/hooks/comms/useTeams";

/**
 * Create a team.
 *
 * One RPC, not four inserts: the team, the owner's membership, the team's chat
 * and the owner's seat in that chat all have to land together, or the creator
 * ends up locked out of their own team — every policy on it keys off membership,
 * so a team whose owner row failed to write is unreadable by everyone including
 * the person who just made it.
 */
export function CreateTeamDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teamId: string) => void;
}) {
  const { createTeam } = useTeamActions();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TeamCategory>("school_project");
  const [tint, setTint] = useState<TeamAccent>("indigo");

  const close = (next: boolean) => {
    if (!next) {
      setName("");
      setDescription("");
      setCategory("school_project");
      setTint("indigo");
    }
    onOpenChange(next);
  };

  const submit = async () => {
    try {
      const id = await createTeam.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        accent: tint,
      });
      close(false);
      onCreated(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create that team.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[41rem]">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            A team gets its own chat, objectives, announcements and files. You can
            invite people once it exists.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Robotics build, IB Physics HL, Debate squad…"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-description">
              What are you building?{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two lines, so a new member knows what they've joined."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-category">Type</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TeamCategory)}
            >
              <SelectTrigger id="team-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {TEAM_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_ACCENTS.map((name_) => (
                <button
                  key={name_}
                  type="button"
                  onClick={() => setTint(name_)}
                  aria-label={name_}
                  aria-pressed={tint === name_}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    accent(name_).dot,
                    tint === name_
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-105",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <MotionButton
            onClick={submit}
            ripple
            disabled={!name.trim() || createTeam.isPending}
            className="rounded-xl h-10"
          >
            {createTeam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create team
          </MotionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
