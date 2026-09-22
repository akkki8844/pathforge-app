/**
 * Strip decoration out of generated report text.
 *
 * WHY A SANITISER AND NOT JUST A BETTER PROMPT
 *
 * The `college-requirements` prompt has said "no emojis" since it was written,
 * in a numbered list of non-negotiable rules, and the reports had emoji in
 * them anyway. A prompt is a request with a high success rate, not a
 * guarantee, and one leaked check mark is enough for a paying student to see
 * the thing as machine output. So the prompt asks and this enforces.
 *
 * Deliberately narrow. It removes symbols used as ornament and leaves
 * everything that carries meaning: currency, mathematical operators, arrows
 * inside a real sentence, accented characters, non-Latin scripts. A report on
 * a French Baccalauréat student applying to Tsinghua has to survive this
 * function intact, which rules out the obvious lazy implementation of
 * stripping everything above U+007F.
 */

/*
 * Pictographic ranges only. Notably NOT included: U+2190-U+21FF (arrows, which
 * appear legitimately in "grade 6 -> 7"), U+2200-U+22FF (maths), and the
 * Latin-1/Extended blocks that carry accents.
 */
const PICTOGRAPHIC = [
  "\\u{1F000}-\\u{1F0FF}", // playing cards, mahjong
  "\\u{1F100}-\\u{1F1FF}", // enclosed alphanumerics, regional indicators
  "\\u{1F200}-\\u{1F2FF}", // enclosed ideographic
  "\\u{1F300}-\\u{1F5FF}", // misc symbols and pictographs
  "\\u{1F600}-\\u{1F64F}", // emoticons
  "\\u{1F650}-\\u{1F67F}", // ornamental dingbats
  "\\u{1F680}-\\u{1F6FF}", // transport and map
  "\\u{1F700}-\\u{1F77F}", // alchemical
  "\\u{1F780}-\\u{1F7FF}", // geometric shapes extended
  "\\u{1F800}-\\u{1F8FF}", // supplemental arrows-C
  "\\u{1F900}-\\u{1F9FF}", // supplemental symbols and pictographs
  "\\u{1FA00}-\\u{1FAFF}", // symbols and pictographs extended-A
  "\\u{2600}-\\u{26FF}", // misc symbols: sun, warning, etc.
  "\\u{2700}-\\u{27BF}", // dingbats: check marks, crosses, stars
  "\\u{2B00}-\\u{2BFF}", // misc symbols and arrows: coloured squares, circles
].join("");

const EMOJI_RE = new RegExp(`[${PICTOGRAPHIC}]`, "gu");

/*
 * The joiners and modifiers, matched separately rather than as members of the
 * class above.
 *
 * Putting ZWJ, the variation selectors and the enclosing keycap inside a
 * character class is what eslint flags as a misleading character class, and it
 * is right to: those code points combine with their neighbours, so a class
 * containing them can match one half of a grapheme cluster and leave the other
 * half behind. Stripping the pictographs first and the leftover glue second
 * removes the whole cluster either way.
 */
const EMOJI_GLUE_RE = /‍|︎|️|⃣/g;

/*
 * Ornamental prefixes on a line or a list item. Anchored to the start (after
 * optional indentation and an optional real markdown bullet) so that an arrow
 * or asterisk occurring mid-sentence is left alone.
 */
const PREFIX_RE = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)?(?:(?:->|=>|>>|»|›|▸|▪|●|◦|·|\*{1,3}|\[!\]|\(!\)|!!+)\s*)+/gm;

/** A rule drawn from repeated punctuation, used as a divider. */
const ASCII_RULE_RE = /^\s*(?:[=~_*-]\s*){4,}$/gm;

/**
 * Remove emoji and ornamental prefixes from a single string.
 *
 * Collapses the whitespace an removed symbol leaves behind, so "Strong: ✅ your
 * maths" does not become "Strong:  your maths" with a double space, and a line
 * that was nothing but an emoji collapses to empty rather than to a stray
 * bullet with no text after it.
 */
export function stripReportDecoration(input: string): string {
  if (!input) return input;

  let out = input.replace(EMOJI_RE, "").replace(EMOJI_GLUE_RE, "");
  out = out.replace(ASCII_RULE_RE, "");
  // Re-run the prefix pass after emoji removal: "- ✅ Strong maths" only
  // exposes its "- " + leftover space once the check mark is gone.
  out = out.replace(PREFIX_RE, "$1");
  // Tidy the gaps the removals leave, without touching newlines.
  out = out.replace(/[ \t]{2,}/g, " ");
  out = out.replace(/[ \t]+$/gm, "");
  // A heading or bullet whose only content was an emoji is now empty noise.
  out = out.replace(/^\s*[-*+]\s*$/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

/**
 * Walk a parsed report object and sanitise every string in it.
 *
 * Reports are nested JSON of arrays and objects, and the emoji turn up inside
 * leaf strings several levels down (`fitAssessment.gaps[2]`), so sanitising
 * only the top-level summary misses most of them.
 *
 * Structure-preserving: keys, numbers, booleans and nulls pass through
 * untouched. Only string values are rewritten.
 */
export function sanitizeReport<T>(value: T): T {
  if (typeof value === "string") {
    return stripReportDecoration(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeReport(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeReport(v);
    }
    return out as unknown as T;
  }
  return value;
}

/** True if the text still carries decoration. Used by tests and the audit. */
export function hasReportDecoration(input: string): boolean {
  EMOJI_RE.lastIndex = 0;
  EMOJI_GLUE_RE.lastIndex = 0;
  return EMOJI_RE.test(input ?? "") || EMOJI_GLUE_RE.test(input ?? "");
}
