/**
 * Student reviews. Currently none — deliberately.
 *
 * This file used to hold twelve hand-written reviews with invented student
 * names and graduating classes ("Class of 2026 · Computer Science"), rendered
 * on `/auth` beside a Google "G" logo and an aggregate 4.9-star score over the
 * caption "12 student reviews". No such reviews were ever collected from
 * anybody. The header of the old file set out an editorial rule for what each
 * line had to say and noted that earlier drafts had been rewritten — which is
 * the clearest possible evidence that this was marketing copy, since a real
 * review is not something the company it describes gets to rewrite.
 *
 * That is prohibited, not merely distasteful:
 *
 *  - **United States.** The FTC's Rule on Consumer Reviews and Testimonials,
 *    16 CFR Part 465, effective 21 October 2024, bars creating or disseminating
 *    a consumer review by someone who does not exist or who never used the
 *    product, and attaches civil penalties to each violation.
 *  - **India.** The Consumer Protection Act 2019 and the CCPA's Guidelines for
 *    Prevention of Misleading Advertisements (2022) treat fabricated
 *    endorsements as misleading advertising; IS 19000:2022 is the national
 *    standard for handling online consumer reviews honestly.
 *  - **Trade mark.** Presenting them under Google's logo and a star average
 *    implied Google Reviews as the source. It was not.
 *
 * IF YOU ADD REVIEWS HERE, every one must be:
 *  1. said by a real, identifiable person who actually used Pathforge;
 *  2. quoted in their own words — lightly trimmed for length at most, never
 *     rewritten to improve the pitch;
 *  3. published with that person's informed consent, and for a student under
 *     18, their parent or guardian's consent, recorded somewhere you can
 *     produce later;
 *  4. attributed accurately, and never dressed up as a rating from Google,
 *     Trustpilot or any other platform the review did not come from;
 *  5. accompanied by an average that is the true average of everything
 *     collected, not of a favourable selection.
 *
 * Until those exist, `ReviewsRail` shows the product's real pages instead.
 */

export interface StudentReview {
  name: string;
  /** Out of 5. */
  rating: number;
  /** Grade / destination context shown under the name. */
  context: string;
  body: string;
  /**
   * URL of a photograph of the reviewer, for the surfaces that show one.
   *
   * Optional, and separately consented. Anonymising a quote is the default
   * here (see the note above): a portrait undoes that, so it is only ever set
   * when the reviewer - and, for a reviewer under 18, their parent or
   * guardian - agreed specifically to their face being published, not merely
   * their words. A review without this field still renders everywhere except
   * the reel, which has nothing to put in its tile without it.
   */
  portrait?: string;
  /** Alt text for `portrait`. Defaults to the reviewer's name. */
  portraitAlt?: string;
}

/** Empty until genuine, consented reviews are collected. See the note above. */
export const studentReviews: StudentReview[] = [];

/**
 * Counsellor reviews, from the school side of the product. Empty for the same
 * reason and under the same rules as the list above.
 */
export const counsellorReviews: StudentReview[] = [];

/**
 * Reviews as the scroll reel renders them: the words, the reviewer, and a face.
 *
 * The reel's middle column is a strip of portraits, so a review with no
 * `portrait` has no tile and is dropped rather than given a stand-in. That is
 * the honest failure mode: a generated initial or a stock photograph in a slot
 * the design reads as "this is the person who said it" is the same
 * misattribution the note at the top of this file exists to prevent.
 *
 * `attribution` decides what sits under the quote. Pass the reviewer's name
 * where they consented to be named, and a neutral label where they did not -
 * though a named-face-plus-anonymous-label pairing is not anonymity, so in
 * practice a review with a portrait is a review that can be named.
 */
export function toReelTestimonials(
  reviews: StudentReview[],
  attribution: (review: StudentReview) => string = (r) => r.name
): { quote: string; author: string; image: string; alt: string }[] {
  return reviews
    .filter((r) => !!r.portrait)
    .map((r) => ({
      quote: r.body,
      author: attribution(r),
      image: r.portrait as string,
      alt: r.portraitAlt ?? r.name,
    }));
}
