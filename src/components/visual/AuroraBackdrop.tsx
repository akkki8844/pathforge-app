/**
 * AuroraBackdrop
 * The shared backdrop behind every app page. Static, layered: colour field,
 * vertical depth, dot grid, horizontal rules, centre rule, grain.
 *
 * Nothing here animates — the app lives in a long-lived tab, and a drifting
 * blur behind it costs battery for something nobody looks at directly.
 * Layer styling lives in index.css (`.backdrop-*`) because each layer needs
 * a dark-mode value.
 */
export function AuroraBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background"
    >
      {/* Colour field — blue → violet → cyan, wide and low-contrast */}
      <div className="backdrop-field absolute inset-0" />

      {/* Depth: settles into muted at the top edge, under the navbar, and
          again at the bottom so long pages don't end on flat colour */}
      <div className="backdrop-depth absolute inset-0" />

      {/* Dot grid. Masked to a wide ellipse so the texture thins toward the
          edges instead of tiling to the corners. Desktop only — on a phone
          it's dense enough to shimmer against text. */}
      <div
        className="absolute inset-0 hidden opacity-[0.08] md:block dark:opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 90% 85% at 50% 42%, black 35%, transparent 92%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 85% at 50% 42%, black 35%, transparent 92%)",
        }}
      />

      {/* Faint horizontal rules — the editorial baseline grid */}
      <div
        className="absolute inset-0 hidden opacity-[0.04] md:block"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "100% 120px",
        }}
      />

      {/* Centre hairline */}
      <div className="backdrop-rule absolute inset-y-0 left-1/2 hidden w-px md:block" />

      {/* Grain, on top of everything so it textures the tints too */}
      <div className="backdrop-grain absolute inset-0" />
    </div>
  );
}
