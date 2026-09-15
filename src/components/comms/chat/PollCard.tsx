import { useState } from "react";
import { BarChart3, Check, Plus, Trash2, Vote } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { usePollActions, type PollWithVotes } from "@/hooks/comms/useMessages";
import { displayName, type PersonMap } from "@/hooks/comms/usePeople";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

/**
 * The composer's "Poll" button — a small dialog that collects a question and
 * its options, then hands the result to the caller as one payload. It doesn't
 * write anything itself; the poll is created together with its message, the
 * same way an attachment rides along with `onSend`.
 */
export function PollComposerButton({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (poll: { question: string; allowMultiple: boolean; options: string[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setAllowMultiple(false);
  };

  const setOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));

  const removeOption = (i: number) =>
    setOptions((prev) => prev.filter((_, idx) => idx !== i));

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const canCreate = question.trim().length > 0 && cleanOptions.length >= MIN_OPTIONS;

  const handleCreate = () => {
    if (!canCreate) {
      toast.error(`A poll needs a question and at least ${MIN_OPTIONS} options.`);
      return;
    }
    onCreate({ question: question.trim(), allowMultiple, options: cleanOptions });
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          aria-label="Create a poll"
          title="Poll"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New poll</DialogTitle>
          <DialogDescription>
            Sends as its own message. Everyone in this chat can vote once
            they see it — the results update live for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Where should we meet?"
              maxLength={300}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Options</Label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    maxLength={120}
                  />
                  {options.length > MIN_OPTIONS && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(i)}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < MAX_OPTIONS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add option
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">Allow multiple choices</div>
              <div className="text-xs text-muted-foreground">
                Otherwise picking a new option replaces your vote.
              </div>
            </div>
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            Create poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A poll, as it renders inside a message bubble.
 *
 * Voting writes straight to the database and waits for the same realtime
 * round-trip every other viewer gets — see `usePollActions` for why there is
 * no separate optimistic path. On the same connection that round-trip is
 * fast enough that it doesn't read as a wait.
 */
export function PollCard({ poll, people }: { poll: PollWithVotes; people: PersonMap }) {
  const { user } = useAuth();
  const { vote, retractVote } = usePollActions();

  const totalVotes = poll.message_poll_votes.length;
  const myVotes = new Set(
    poll.message_poll_votes.filter((v) => v.user_id === user?.id).map((v) => v.option_id),
  );

  const busy = vote.isPending || retractVote.isPending;

  const handlePick = (optionId: string) => {
    if (busy) return;
    if (myVotes.has(optionId)) {
      retractVote.mutate(optionId);
      return;
    }
    vote.mutate({
      pollId: poll.id,
      optionId,
      allowMultiple: poll.allow_multiple,
      myOtherVotedOptionIds: poll.allow_multiple ? [] : [...myVotes],
    });
  };

  const options = [...poll.message_poll_options].sort((a, b) => a.position - b.position);

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-background/60 p-3">
      <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Vote className="h-3 w-3" />
        {poll.allow_multiple ? "Poll · pick any" : "Poll · pick one"}
      </div>
      <p className="mb-3 text-sm font-semibold text-foreground">{poll.question}</p>

      <div className="space-y-1.5">
        {options.map((opt) => {
          const optionVotes = poll.message_poll_votes.filter((v) => v.option_id === opt.id);
          const pct = totalVotes > 0 ? Math.round((optionVotes.length / totalVotes) * 100) : 0;
          const mine = myVotes.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePick(opt.id)}
              disabled={busy}
              className={cn(
                "group relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                mine ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30",
              )}
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {mine && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  <span className="truncate">{opt.label}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {optionVotes.length} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2.5 text-[11px] text-muted-foreground">
        {totalVotes === 0
          ? "No votes yet"
          : `${totalVotes} vote${totalVotes === 1 ? "" : "s"}${
              poll.message_poll_votes.length
                ? " · " +
                  [...new Set(poll.message_poll_votes.map((v) => v.user_id))]
                    .slice(0, 3)
                    .map((id) => displayName(people[id]))
                    .join(", ")
                : ""
            }`}
      </p>
    </div>
  );
}
