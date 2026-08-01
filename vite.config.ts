import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  // No Lovable MCP plugin here, unlike the website repo. That plugin exists to
  // regenerate supabase/functions/mcp/index.ts on every build, which is a
  // deploy concern owned by pathforge-tech — and on Windows its generator emits
  // an unresolvable `npm:C:\...` specifier that corrupts the bundle. The desktop
  // app only *calls* the already-deployed edge functions, so it has no business
  // rewriting them. supabase/ is vendored here read-only, for reference.
  plugins: [react()],
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
          if (pkg === "jspdf" || pkg === "html2canvas" || pkg.startsWith("pdfjs")) return "pdf";
          if (pkg.startsWith("@radix-ui")) return "radix";
          if (pkg.startsWith("@supabase")) return "supabase";
          if (pkg === "lucide-react") return "icons";
          if (pkg.startsWith("@tanstack")) return "tanstack";
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
