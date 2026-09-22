import { Marquee } from "@/components/ui/3d-testimonails";
import { ReviewReel } from "@/components/auth/ReviewReel";
import { AuthQuote } from "@/components/auth/AuthQuote";
import { STUDENT_AUTH_QUOTES } from "@/data/authQuotes";
import { studentReviews, toReelTestimonials } from "@/data/reviews";
import { ROUTINE_DESTINATIONS } from "@/lib/routine/nav";
import { COMMUNICATIONS_DESTINATIONS } from "@/lib/comms/nav";
import { cn } from "@/lib/utils";

/**
 * The left-hand panel of the student sign-in screen.
 *
 * WHY THIS IS NO LONGER A REVIEW WALL
 *
 * It used to render an aggregate star rating beside a Google "G" logo, over the
 * caption "12 student reviews", fed from a hand-written array in
 * `src/data/reviews.ts`. That array was product copy: its own header described
 * an editorial rule for what each line must say, and recorded that earlier
 * drafts had been "rewritten" to remove unflattering comparisons. Genuine
 * reviews cannot be rewritten by the company they describe.
 *
 * Presented that way it was not merely puffery, it was three distinct problems:
 *
 *  - The Google mark and the 4.9 average implied the ratings came from Google
 *    Reviews. They did not. That is a misuse of someone else's trade mark to
 *    borrow their credibility.
 *  - The US FTC's Rule on Consumer Reviews and Testimonials (16 CFR Part 465,
 *    in force since October 2024) prohibits writing or disseminating reviews
 *    attributed to people who do not exist, with civil penalties per violation.
 *  - In India, the Consumer Protection Act 2019 and the CCPA's guidelines on
 *    misleading advertisements treat fabricated endorsements the same way, and
 *    the reviews carried invented student names and graduating classes.
 *
 * So the panel now shows what `CounsellorWorkspaceWall` already shows on the
 * counsellor side, for the reason given there: the pages that actually exist
 * behind the form, by their real labels and real descriptions, read straight
 * from the nav definitions. Every card is a claim that can be checked by
 * signing in. When a page is added to the product it appears here too, and
 * there is no second list to keep honest.
 *
 * If real reviews are collected later - with the reviewer's informed consent,
 * their own words, and a record of who said them - they can be shown here. They
 * must be genuine, attributed accurately, and must not be dressed as a
 * third-party platform's ratings.
 */

interface SurfaceCard {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SURFACES: SurfaceCard[] = [
  ...ROUTINE_DESTINATIONS.map(({ label, description, icon }) => ({ label, description, icon })),
  ...COMMUNICATIONS_DESTINATIONS.map(({ label, description, icon }) => ({
    label,
    description,
    icon,
  })),
];

function Card({ label, description, icon: Icon }: SurfaceCard) {
  return (
    <div className="w-56 rounded-xl border border-border bg-card/70 p-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
          <Icon className="h-4 w-4 text-foreground" />
        </span>
        <p className="truncate text-[14px] font-semibold leading-snug text-foreground">{label}</p>
      </div>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/** Deal round-robin so no column is all one part of the product. */
function dealIntoColumns(items: SurfaceCard[], columns: number) {
  const out: SurfaceCard[][] = Array.from({ length: columns }, () => []);
  items.forEach((item, i) => out[i % columns].push(item));
  return out;
}

export function ReviewsRail() {
  const columns = dealIntoColumns(SURFACES, 3);

  /*
   * Real reviews, on the reel.
   *
   * The surface is wired up and empty: `studentReviews` holds nothing, so this
   * branch is dead until genuine, consented reviews are collected, and the
   * panel below runs instead. That is the whole design — the reviews surface
   * exists, and the only way to fill it is to collect some.
   */
  const reel = toReelTestimonials(studentReviews);
  if (reel.length) {
    return (
      <div className="w-full max-w-[37rem] 2xl:max-w-[56rem]">
        <AuthQuote quotes={STUDENT_AUTH_QUOTES} className="mb-9" />
        <ReviewReel
          testimonials={reel}
          eyebrow="Student reviews"
          title="What students say"
          caption="Published with consent, in the student's own words."
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[37rem] 2xl:max-w-[56rem]">
      {/* The editorial line leads, the pages follow. The cards say what is
          behind the sign-in; this says what the thing behind the sign-in is
          for, and that is the shorter of the two arguments. */}
      <AuthQuote quotes={STUDENT_AUTH_QUOTES} className="mb-9" />

      <div className="mb-6">
        <h2 className="text-2xl font-semibold leading-tight text-foreground">
          What's behind the sign-in
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Every card is a page of the product, described the way it describes itself.
        </p>
      </div>

      {/* Cards fade out before either edge, so the loop seam is never visible. */}
      <div className="flex max-h-[30rem] justify-start gap-5 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
        {columns.map((column, i) => (
          <Marquee
            key={i}
            vertical
            pauseOnHover
            ariaLabel="Pathforge pages"
            className={cn(
              "[--gap:1.25rem]",
              // Speed is a CSS variable on this component, not a prop. Equal
              // speeds read as one rigid sheet, so each column differs.
              ["[--duration:26s]", "[--duration:32s]", "[--duration:29s]"][i],
              i === 1 && "hidden xl:flex",
              i === 2 && "hidden 2xl:flex",
            )}
          >
            {column.map((item) => (
              <Card key={item.label} {...item} />
            ))}
          </Marquee>
        ))}
      </div>
    </div>
  );
}
