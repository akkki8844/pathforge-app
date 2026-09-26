import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Durations and easings have to be registered rather than written inline
      // as `duration-[320ms]` / `ease-[cubic-bezier(...)]`. Both core Tailwind
      // and tailwindcss-animate claim the `duration-*` and `ease-*` namespaces
      // (transition-* and animation-*), so an arbitrary value is ambiguous —
      // Tailwind reports it and then emits no rule at all. Every dialog, sheet
      // and alert-dialog was silently falling back to default timing, and none
      // of these easing curves reached the page. Named here, they resolve.
      transitionDuration: {
        "250": "250ms",
        "320": "320ms",
        "600": "600ms",
        "800": "800ms",
        "1400": "1400ms",
      },
      transitionTimingFunction: {
        // Decelerating: things arriving on screen.
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
        // Accelerating: things leaving.
        exit: "cubic-bezier(0.4, 0, 1, 1)",
        swift: "cubic-bezier(0.23, 1, 0.32, 1)",
        // Slight overshoot, for a control that should feel springy.
        overshoot: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        glide: "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Work Sans", "system-ui", "sans-serif"],
        // Display / headings: Sora — a clean, open geometric sans that reads
        // well and takes real weights (500/600/700). Work Sans is fallback.
        display: ["Sora", "Work Sans", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        // Fraunces — the landing page's headline face. It is self-hosted,
        // preloaded and @font-face'd in index.html, so it is already on every
        // page for free. This used to name Instrument Serif, which is not
        // loaded anywhere in the app, so every `font-serif` figure and heading
        // was silently rendering as Georgia while claiming to be editorial.
        serif: ['"Fraunces Variable"', "Fraunces", "ui-serif", "Georgia", "serif"],
        // The Outcomes route keeps Cluely's layout (the panels, the ledgers,
        // the zinc palette in index.css) but reads in the same face as the
        // signed-in home rather than Cluely's own Geist — one student account,
        // one typeface, not two products stitched together.
        // Now simply the app's text face. It was Inter, which made every page
        // using it read as a different product from the rest of the bar.
        cluely: ["Plus Jakarta Sans", "Work Sans", "system-ui", "sans-serif"],
        // The printed résumé wants a book serif, not a display one. Instrument
        // Serif is lazy-loaded by that route alone (see Resume.tsx).
        document: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        // Focus Flight's marker yellow. Deliberately outside the theme tokens:
        // it belongs to the aviation surfaces (badges, route markers, boarding
        // furniture) and must stay identical in light and dark, the way real
        // airfield signage does.
        "flight-yellow": "hsl(52 96% 56%)",
        // Semantic states, so "done" / "due soon" / "informational" have their
        // own vocabulary instead of borrowing the brand indigo or destructive red.
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        // Podium places. Categorical identity, not severity — see index.css.
        medal: {
          gold: "hsl(var(--medal-gold))",
          silver: "hsl(var(--medal-silver))",
          bronze: "hsl(var(--medal-bronze))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        // The `--duration`/`--gap` driven pair used by `components/ui/3d-testimonails`.
        // Kept separate from `marquee` above, which CollegeLogosMarquee runs on
        // at a fixed 50s and a -50% translate; merging them would retime it.
        "marquee-x": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-y": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        marquee: "marquee 50s linear infinite",
        "marquee-x": "marquee-x var(--duration, 40s) linear infinite",
        "marquee-y": "marquee-y var(--duration, 40s) linear infinite",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(226 65% 56% / 0.14), 0 18px 48px -38px hsl(226 65% 56% / 0.5)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    // AgentTrace sizes its name gutter and result column off the card it sits in,
    // not the viewport, so it stays readable in a narrow settings column.
    require("@tailwindcss/container-queries"),
  ],
} satisfies Config;
