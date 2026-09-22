/**
 * What a document actually says, counted.
 *
 * Word calls this pane Editor; the useful half of it is arithmetic over the
 * text, and that is what this file is. Nothing here calls out to a service and
 * nothing is graded by a model: a student writing an essay wants to know how
 * long it is, how long it takes to read aloud, and whether the sentences have
 * run away from them.
 *
 * The readability numbers are the two standard Flesch formulas. They are
 * estimates by construction — syllables are counted by a vowel-group heuristic
 * because English spelling admits no cheap exact method — so they are reported
 * as a band ("Fairly easy") next to the number rather than as a verdict.
 */

/** Words too common to be interesting in a "most used" list. */
const STOP_WORDS = new Set([
  "a", "about", "after", "all", "also", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "but", "by", "can", "could", "did",
  "do", "does", "doing", "done", "down", "each", "even", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how",
  "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me", "more", "most",
  "my", "no", "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "out", "over", "own", "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "then", "there", "these", "they",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
  "will", "with", "would", "you", "your", "yours",
]);

/** Words a minute, reading silently. The figure usually quoted for prose. */
const READING_WPM = 220;
/** Words a minute, read aloud at a measured pace — a presentation, a speech. */
const SPEAKING_WPM = 130;

export interface TopWord {
  word: string;
  count: number;
}

export interface DocumentStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  /** Minutes, fractional. Format with `formatMinutes`. */
  readingMinutes: number;
  speakingMinutes: number;
  wordsPerSentence: number;
  charactersPerWord: number;
  /** Flesch reading ease, 0–100. Higher is plainer. */
  readingEase: number;
  /** Flesch–Kincaid grade level, in US school years. */
  gradeLevel: number;
  topWords: TopWord[];
  longestSentence: { text: string; words: number } | null;
}

export const EMPTY_STATS: DocumentStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  readingMinutes: 0,
  speakingMinutes: 0,
  wordsPerSentence: 0,
  charactersPerWord: 0,
  readingEase: 0,
  gradeLevel: 0,
  topWords: [],
  longestSentence: null,
};

/**
 * Syllables in one word, by vowel groups.
 *
 * Each run of vowels is one syllable, a trailing silent "e" is not, and "le"
 * after a consonant is ("table"). Every word has at least one. This is the
 * standard heuristic behind readability scores, and it is wrong often enough
 * on names and loanwords that the scores it feeds are presented as estimates.
 */
export function syllablesIn(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** The band a Flesch reading-ease score falls in. */
export function easeBand(score: number): string {
  if (score >= 90) return "Very easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly easy";
  if (score >= 60) return "Plain English";
  if (score >= 50) return "Fairly hard";
  if (score >= 30) return "Hard";
  return "Very hard";
}

/** "4 min", "1 hr 12 min", "under a minute". */
export function formatMinutes(minutes: number): string {
  if (!minutes) return "—";
  if (minutes < 1) return "under a minute";
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/**
 * Count everything, from the document's plain text.
 *
 * `paragraphs` is passed in rather than inferred: the editor knows exactly how
 * many block nodes it holds, and splitting text on blank lines would count a
 * table row and a list item as paragraphs of prose.
 */
export function analyze(text: string, paragraphs: number): DocumentStats {
  const trimmed = text.replace(/ /g, " ").trim();
  if (!trimmed) return { ...EMPTY_STATS, paragraphs: 0 };

  const wordList: string[] = trimmed.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
  const words = wordList.length;
  const characters = trimmed.length;
  const charactersNoSpaces = trimmed.replace(/\s/g, "").length;

  // A sentence ends at . ! ? — but not inside "Dr.", "e.g." or "3.5", so the
  // terminator has to be followed by whitespace and a capital or a quote.
  const sentenceTexts = trimmed
    .split(/(?<=[.!?…])["'”’)\]]*\s+(?=[A-Z"'“(\[])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentences = Math.max(sentenceTexts.length, words ? 1 : 0);

  const syllables = wordList.reduce((sum, word) => sum + syllablesIn(word), 0);
  const perSentence = sentences ? words / sentences : 0;
  const perWord = words ? syllables / words : 0;

  const readingEase = words
    ? Math.max(0, Math.min(100, 206.835 - 1.015 * perSentence - 84.6 * perWord))
    : 0;
  const gradeLevel = words
    ? Math.max(0, 0.39 * perSentence + 11.8 * perWord - 15.59)
    : 0;

  const counts = new Map<string, number>();
  for (const raw of wordList) {
    const word = raw.toLowerCase().replace(/^['’-]+|['’-]+$/g, "");
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const topWords = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 8);

  let longestSentence: DocumentStats["longestSentence"] = null;
  for (const sentence of sentenceTexts) {
    const length = (sentence.match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;
    if (!longestSentence || length > longestSentence.words) {
      longestSentence = { text: sentence, words: length };
    }
  }

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingMinutes: words / READING_WPM,
    speakingMinutes: words / SPEAKING_WPM,
    wordsPerSentence: perSentence,
    charactersPerWord: words ? charactersNoSpaces / words : 0,
    readingEase,
    gradeLevel,
    topWords,
    longestSentence,
  };
}
