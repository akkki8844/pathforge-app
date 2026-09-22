/**
 * The SVG half of the landing header's liquid glass.
 *
 * The site already has glass in CSS — translucency, a blur, an inner highlight
 * ring. What CSS alone cannot do is *refract*: real glass bends what is behind
 * it, and a flat blur does not. This filter supplies that, by displacing the
 * blurred backdrop along a low-frequency noise field so the campus photo behind
 * the header warps slightly rather than simply smearing.
 *
 * It renders nothing visible. It exists only so `filter: url(#atlas-glass-refract)`
 * in index.css has something to point at, and it is mounted once on the landing
 * page rather than per-element, because a filter is referenced by id and a second
 * copy would be a duplicate id for no gain.
 *
 * DELIBERATELY RESTRAINED. The reference implementation for this effect uses a
 * displacement scale of 200, which is tuned for a large floating dock. The
 * landing header is roughly 54px tall; at that size a scale of 200 does not read
 * as glass, it reads as a smeared bar with illegible text running through it.
 * The scale here is set for the element it is actually applied to.
 *
 * The scale of 70 is paired with the header's own `blur(8px)`, and the two are
 * load-bearing together. The header previously blurred its backdrop by 18px,
 * which left the campus photo behind it with almost no structure for a
 * displacement map to bend — measured side by side, scale 28 and scale 60 were
 * indistinguishable, because there were no edges left to move. Easing the blur
 * to 8px is what makes the refraction visible at all. Going further (blur 4,
 * scale 90) was tried and rejected: over the bright sky in the photo the bar
 * turns too transparent and the white nav links lose their contrast. If someone
 * raises that blur back toward 18px, this filter quietly stops doing anything.
 *
 * Browser support is uneven — referencing an SVG filter from a backdrop layer is
 * a Chromium capability and is ignored elsewhere. That is why the CSS applies
 * this on a separate pointer-events-none pseudo-element layered *under* the
 * header's own translucent fill: where the filter is unsupported the layer
 * simply contributes nothing and the existing CSS glass renders exactly as it
 * did before. The effect can be absent; it can never break the navigation.
 */
export function GlassFilter() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="atlas-glass-refract"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          {/*
            Low frequency and few octaves on purpose: high-frequency noise at
            this scale reads as grain or compression artefacts, not as a
            refracting surface. Two octaves of coarse noise gives the slow,
            uneven warp that glass actually has.
          */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.01"
            numOctaves="2"
            seed="41"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
