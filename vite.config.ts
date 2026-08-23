import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

/**
 * Strips HTML comments from index.html in production builds only.
 *
 * index.html carries a lot of explanatory comment — why og tags are marked
 * `data-rh`, why AdSense loads on the window load event, why the translate
 * widget isn't fetched eagerly. That commentary is worth keeping in source and
 * worth nothing to a browser: it was 2.9 kB of the 13 kB served, so 22% of the
 * HTML on every page view of a client-rendered site was comment text. It also
 * counts as markup rather than content, which is part of why the site audit put
 * every page under a 10% text-to-HTML ratio.
 *
 * Comments are preserved in dev so the file stays self-documenting while you
 * work on it, and only ever removed on the way out.
 *
 * Script and style bodies are cut out and reinserted around the strip, because
 * a `<!--` sequence inside JS or CSS is not an HTML comment and a naive global
 * replace would happily eat live code.
 */
function stripHtmlComments(): Plugin {
  return {
    name: "pathforge:strip-html-comments",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      const preserved: string[] = [];
      const withPlaceholders = html.replace(
        /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,
        (block) => `__PF_PRESERVED_${preserved.push(block) - 1}__`,
      );

      return withPlaceholders
        .replace(/<!--[\s\S]*?-->/g, "")
        // Collapse the blank lines the removed comments leave behind.
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .replace(/__PF_PRESERVED_(\d+)__/g, (_, i) => preserved[Number(i)]);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // The Lovable MCP plugin re-bundles supabase/functions/mcp/index.ts on every run.
  // On Windows its generator emits a Windows absolute path inside an `npm:` specifier
  // (`import mcp from "npm:C:\\Users\\...\\src\\lib\\mcp\\index.ts"`), which Deno cannot
  // resolve — so a Windows build silently replaced the working bundle with an edge
  // function that fails to boot once deployed.
  //
  // Skipping the plugin on win32 keeps the committed (correct) bundle authoritative
  // here; POSIX machines and CI still regenerate it exactly as before. Anyone editing
  // src/lib/mcp/ should therefore re-bundle on POSIX/WSL and commit the result.
  plugins: [react(), stripHtmlComments(), process.platform === "win32" ? null : mcpPlugin()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split heavy vendor libs into their own chunks so first paint doesn't wait
    // on 1.4MB of PDF/chart/3D code that most routes never touch.
    //
    // Rules match on the resolved package NAME, not on a substring of the path.
    // Substring matching silently mis-sorts lookalikes — `react-is` never matched
    // the old "/react/" test, fell through to the entry chunk, and made the
    // charts chunk depend on the entry that imports it. That cycle evaluated
    // charts before React was initialised and blanked the whole app.
    //
    // Every node_modules id must therefore return a chunk name. The `vendor`
    // fallback is what guarantees no library can drift back into the entry.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's dynamic-import helper (`__vitePreload`) is a virtual module
          // that every lazy route needs, so the entry chunk always imports it.
          // Left unassigned, Rollup parks it in whichever chunk it likes — and
          // it picked `pdf`, which made the entry statically import 1MB of
          // jsPDF/pdf.js on first paint for a landing page that never uses it.
          // Pinning it to a chunk the entry loads anyway keeps that from
          // silently reoccurring whenever chunk membership shifts.
          if (id.includes("vite/preload-helper") || id.includes("vite/modulepreload-polyfill"))
            return "react-core";

          // Rollup's CommonJS interop helpers (`getDefaultExportFromCjs`,
          // `commonjsGlobal`) are a synthetic module it emits once and imports
          // from everywhere else. Left unassigned it parks them in whichever
          // chunk it likes — and it picked `pdf`. React, react-dom and
          // scheduler are all CommonJS, so react-core had to import the helper
          // back out of a 1.2MB chunk it otherwise has nothing to do with:
          //
          //   react-core -> pdf -> vendor -> radix -> react-core
          //
          // That cycle made the browser evaluate radix while react-core was
          // still initialising, so `React` was undefined when Radix called
          // `React.forwardRef` at module scope, and the entire app rendered a
          // blank page. Pinning the helpers to react-core makes it a true leaf.
          if (id.includes("commonjsHelpers") || id.includes("commonjs-dynamic-modules"))
            return "react-core";

          if (!id.includes("node_modules")) return;

          const pkg = id
            .replace(/\\/g, "/")
            .match(/node_modules\/(?:\.pnpm\/)?((?:@[^/]+\/)?[^/]+)/)?.[1];
          if (!pkg) return "vendor";

          // React plus anything that must initialise alongside it. Splitting any
          // of these away from react-dom reintroduces the cycle above.
          if (
            [
              "react",
              "react-dom",
              "scheduler",
              "react-is",
              "object-assign",
              "prop-types",
              "use-sync-external-store",
            ].includes(pkg)
          )
            return "react-core";

          if (pkg.startsWith("react-router")) return "router";
          // framer-motion v12 is split across these three packages.
          if (pkg === "framer-motion" || pkg === "motion-dom" || pkg === "motion-utils")
            return "framer";
          if (pkg === "three" || pkg.startsWith("@react-three")) return "three";
          if (pkg === "recharts" || pkg.startsWith("d3-") || pkg === "victory-vendor")
            return "charts";
          // General-purpose compression, wanted on both sides of the split:
          // jsPDF needs fflate, and fast-png (which reaches the bundle through
          // the vendor fallback) needs pako. Grouping them with `pdf` made
          // `vendor` statically import the 1.1MB pdf chunk for one Inflate
          // class, which is both a cycle (pdf imports vendor back) and a
          // defeat of the code-split — the PDF stack was on the critical path
          // regardless. They have no dependencies of their own, so a chunk of
          // their own is a true leaf that either side can import safely.
          if (pkg === "pako" || pkg === "fflate") return "compression";

          // jsPDF's optional satellites. Without naming them they land in
          // `vendor`, which the entry DOES load eagerly — so the PDF stack
          // would keep half its weight on the critical path even after the
          // main pdf chunk was pulled off it.
          if (
            [
              "jspdf",
              "html2canvas",
              "canvg",
              "dompurify",
              "rgbcolor",
              "stackblur-canvas",
              "raf",
              "performance-now",
            ].includes(pkg) ||
            pkg.startsWith("pdfjs")
          )
            return "pdf";

          // maplibre-gl is a ~500kB WebGL map renderer used by exactly one
          // component, `LiveRouteMap` on the lazy `/routine/focus` route. Left
          // unassigned it fell to the `vendor` fallback alongside gsap and ogl
          // below — both of which the landing page imports eagerly (LayeredText,
          // SpecularLink) — so every visitor to `/` downloaded a map renderer
          // they can never reach from that page. Its own dependency tree is
          // listed explicitly for the same reason the radix closure above is:
          // left out, they'd fall to `vendor` too and drag the eager libs
          // there right back onto the critical path.
          if (
            pkg === "maplibre-gl" ||
            pkg.startsWith("@mapbox/") ||
            pkg.startsWith("@maplibre/") ||
            [
              "@types/geojson",
              "earcut",
              "gl-matrix",
              "kdbush",
              "murmurhash-js",
              "pbf",
              "potpack",
              "quickselect",
              "tinyqueue",
            ].includes(pkg)
          )
            return "maps";

          // gsap (LayeredText) and ogl (SpecularLink's shader) are both reached
          // eagerly from the landing page, so splitting them from `maps` above
          // is what actually gets maplibre-gl off the critical path — grouping
          // them together changes nothing for first paint, since both are eager
          // regardless, but keeps the fallback bucket from becoming a second
          // home for whichever library gets imported eagerly next.
          if (pkg === "gsap" || pkg === "ogl") return "fx";

          // Radix plus its own runtime dependencies, so `radix` imports nothing
          // but react-core. Left in `vendor` these made radix depend on vendor
          // while vendor already depended on radix (cmdk and vaul both pull
          // @radix-ui packages) — the same mutual-import shape that blanked the
          // app twice before. The list below is the full closure: none of these
          // packages depends on anything outside it.
          if (
            pkg.startsWith("@radix-ui") ||
            pkg.startsWith("@floating-ui") ||
            [
              "aria-hidden",
              "react-remove-scroll",
              "react-remove-scroll-bar",
              "react-style-singleton",
              "use-callback-ref",
              "use-sidecar",
              "get-nonce",
              "detect-node-es",
              "tslib",
            ].includes(pkg)
          )
            return "radix";
          // `tslib` and `iceberg-js` are dependencies of @supabase/storage-js
          // and the auth/postgrest clients, but neither is named @supabase/*,
          // so both used to land in `vendor` — and that one edge from the
          // (eager) supabase chunk pulled the whole fallback onto first paint.
          // They are already downloaded as part of the supabase client; this
          // only puts them in the chunk that actually needs them.
          if (pkg.startsWith("@supabase") || pkg === "tslib" || pkg === "iceberg-js")
            return "supabase";
          if (pkg === "lucide-react") return "icons";
          if (pkg.startsWith("@tanstack")) return "tanstack";

          /*
           * Everything below here exists to keep the `vendor` fallback off the
           * critical path.
           *
           * `vendor` is preloaded on first paint, because a handful of things
           * the app boots with land in it — sonner, react-helmet-async, the
           * Lovable auth client. Anything else that fell through to the same
           * fallback was therefore also downloaded and parsed before the
           * landing page could render, however lazily its importer was loaded.
           * That was 311 kB, of which date-fns, zod and cmdk are the bulk and
           * none of the three is reachable from any route the first paint
           * renders.
           *
           * Each of these is a leaf — it imports react-core, or radix, or
           * nothing — so none of them can recreate the mutual-import cycles
           * documented above.
           */
          /*
           * The Lovable OAuth client is only reachable from the sign-in
           * button, which lives on a lazy route — but it was landing in
           * `vendor`, and `vendor` is preloaded. Worse, it pulls `fast-png`,
           * which pulls pako's Inflate out of the `compression` chunk, so a
           * visitor reading the landing page downloaded a PNG decoder and a
           * zlib implementation before the hero could paint.
           */
          /*
           * The self-hosted @fontsource stylesheets are imported from
           * src/main.tsx, so they are eager by design — but they are CSS, and
           * their JS wrapper was landing in `vendor`. That put a bare
           * `import "./vendor.js"` in the entry chunk, which is why `vendor`
           * stayed on the preload list even after every eager *package* had
           * been named: the thing dragging it in was a font, not a library.
           * Pure CSS, so it cannot import anything and cannot form a cycle.
           */
          if (pkg.startsWith("@fontsource")) return "fonts";

          if (pkg.startsWith("@lovable.dev") || pkg === "fast-png") return "lovable";

          /*
           * The handful of libraries the app genuinely boots with. Naming them
           * is what lets `vendor` fall off the critical path entirely: with
           * nothing eager left in it, nothing preloads it, and it becomes what
           * a fallback chunk should be — the place rarely-used packages go.
           */
          if (
            [
              "sonner",
              "react-helmet-async",
              "next-themes",
              "clsx",
              "tailwind-merge",
              "class-variance-authority",
              // react-helmet-async's own dependencies. Naming the parent is not
              // enough: leaving these three in `vendor` gave `shell` an edge
              // into it, and one edge is all it takes — the whole 138 kB
              // fallback chunk goes back on the preload list, which is the
              // exact problem this block exists to solve.
              "react-fast-compare",
              "invariant",
              "shallowequal",
            ].includes(pkg)
          )
            return "shell";

          if (pkg === "date-fns") return "dates";
          if (pkg === "zod") return "validation";
          if (pkg === "cmdk") return "cmdk";
          if (pkg === "react-hook-form" || pkg.startsWith("@hookform")) return "forms";
          if (
            [
              "embla-carousel-react",
              "embla-carousel",
              "embla-carousel-reactive-utils",
              "vaul",
              "input-otp",
              "react-day-picker",
              "react-resizable-panels",
            ].includes(pkg)
          )
            return "ui-extras";
          if (pkg.startsWith("@elevenlabs")) return "voice";
          if (
            /^(react-markdown|remark|rehype|mdast|micromark|hast|unified|unist|vfile|property-information|character-entities|decode-named-character-reference|space-separated-tokens|comma-separated-tokens|trim-lines|zwitch|longest-streak|ccount|markdown-table|escape-string-regexp|bail|is-plain-obj|trough|devlop|estree|parse-entities|stringify-entities)/.test(
              pkg
            )
          )
            return "markdown";

          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
}));
