/**
 * AuroraBackdrop
 * The shared backdrop behind every app page: flat white in light mode, flat
 * black in dark mode. Deliberately plain — not `bg-background` (the Atlas
 * palette's warm cream/navy) — because the app shell asked for a clean
 * finish with no tint and no lines, distinct from the landing page's
 * editorial colour field.
 */
export function AuroraBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-white dark:bg-black"
    />
  );
}
