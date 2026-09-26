import { AuthQuote } from "@/components/auth/AuthQuote";
import { STUDENT_AUTH_QUOTES } from "@/data/authQuotes";

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
 * The panel then became a wall of the product's real pages under a "What's
 * behind the sign-in" heading. That has gone too: the panel is now only the
 * house editorial line, set large, because one sentence about what the product
 * is for does more beside a sign-in form than a scrolling sitemap did.
 *
 * If real reviews are collected later - with the reviewer's informed consent,
 * their own words, and a record of who said them - they can be shown here. They
 * must be genuine, attributed accurately, and must not be dressed as a
 * third-party platform's ratings.
 */

export function ReviewsRail() {
  return (
    <div className="w-full">
      <AuthQuote quotes={STUDENT_AUTH_QUOTES} size="lg" />
    </div>
  );
}
