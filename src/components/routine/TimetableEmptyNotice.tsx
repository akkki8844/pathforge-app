import { Link } from "react-router-dom";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "No timetable yet", in one place.
 *
 * The Timetable page, the dashboard card and Today all have to say this, and
 * the wording is fixed — so it is one component rather than three copies that
 * drift apart the first time anyone rephrases one of them. **Timetable** is the
 * link, so the sentence names the destination and is also the way there; a
 * separate "go to timetable" button underneath would make the reader choose
 * between two things that do the same thing.
 *
 * `tone="bare"` is for slots that already sit inside a panel (the dashboard
 * card, Today's agenda column), where a second dashed box would be a box in a
 * box.
 *
 * COLOUR IS INHERITED, NOT NAMED — and that is the whole fix here.
 *
 * The bare tone hardcoded `text-muted-foreground` for the sentence and
 * `text-accent` for the link. On the dashboard the panel it drops into is the
 * blue `bg-primary` "Today" card, where `--accent` and `--primary` are the
 * same indigo: the link rendered rgb(70,104,216) on an rgb(70,104,216)
 * background. Measured contrast 1.00 — the word "Timetable" was invisible, and
 * the muted sentence around it was barely better.
 *
 * A component that can be dropped into "whatever panel" cannot name its own
 * ink. It inherits the host's colour and earns its emphasis from weight and an
 * underline instead, so it is legible on a white card and on a saturated one
 * without either caller knowing about the other.
 */
export function TimetableEmptyNotice({
  tone = "panel",
  className,
}: {
  tone?: "panel" | "bare";
  className?: string;
}) {
  const sentence = (
    <>
      You don&rsquo;t have a set timetable. Set one at &lsquo;
      <Link
        to="/routine/timetable"
        className="font-semibold underline decoration-current/40 underline-offset-4 transition-[text-decoration-color] hover:decoration-current focus-visible:decoration-current"
      >
        Timetable
      </Link>
      &rsquo;.
    </>
  );

  if (tone === "bare") {
    return (
      /* No colour of its own: 80% of whatever the host panel already sets
         reads as secondary on a white card and on a blue one alike. */
      <p className={cn("text-[13px] leading-relaxed opacity-80", className)}>{sentence}</p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center",
        className,
      )}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background">
        <CalendarRange className="h-5 w-5 text-accent" />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{sentence}</p>
    </div>
  );
}
