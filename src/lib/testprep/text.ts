/**
 * Plain-text helpers for question markup (see `RichText` in components/testprep/Figure).
 */

/** The same text with the markup removed, for search and one-line previews. */
export function plainText(text: string): string {
  return text
    .replace(/_{4,}/g, "____")
    .replace(/\[\/?u\]/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\^\{([^}]*)\}/g, "^$1")
    .replace(/_\{([^}]*)\}/g, "$1");
}
