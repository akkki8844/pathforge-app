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
        className="font-semibold text-accent underline-offset-4 hover:underline focus-visible:underline"
      >
        Timetable
      </Link>
      &rsquo;.
    </>
  );

  if (tone === "bare") {
    return (
      <p className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}>
        {sentence}
      </p>
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
