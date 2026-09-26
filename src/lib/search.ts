/**
 * Opening the search window from anywhere, without importing it.
 *
 * The window itself (components/search/GlobalSearch) is mounted once in the
 * app shell and listens for this event, so a nav button or a page can open it
 * without pulling the search code into its own bundle.
 */
export const OPEN_SEARCH_EVENT = "pf-open-search";

export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

/** "Ctrl K" on Windows and Linux, the command-key glyph on Apple devices. */
export function searchShortcutLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl K";
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "\u2318K" : "Ctrl K";
}
