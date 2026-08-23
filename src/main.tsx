import { createRoot } from "react-dom/client";
// Only the essential weights are eager-loaded. Rarely used weights are
// lazy-loaded inside the specific routes that need them (e.g. Resume).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
// Work Sans is deliberately NOT loaded. In tailwind.config.ts it appears only
// as a fallback, never as the first family in any stack — `sans` leads with
// Plus Jakarta Sans and `display` with Sora, both self-hosted from this origin
// and therefore never failing to load. So Work Sans could only ever paint in a
// case that cannot occur, while costing three woff2 downloads on every cold
// start. It stays in the font stacks as a named fallback, which is free.
// Display headings use Sora — a clean, open geometric sans that reads well at
// large sizes. Work Sans / Plus Jakarta remain the body + fallback.
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
// Fraunces (serif) is NOT imported here on purpose. index.html already
// declares @font-face for "Fraunces Variable" against the self-hosted,
// <link rel=preload>ed /fonts/fraunces-latin-wght-normal.woff2 so the hero H1
// can paint without waiting on the bundle's CSS.
//
// Importing @fontsource-variable/fraunces as well declared a SECOND @font-face
// for the very same family name, from the bundled stylesheet — which loads
// later and therefore won. The result was that the preloaded file was fetched
// and then never used, and a different copy of the identical font was
// downloaded instead: two font downloads and a wasted high-priority preload,
// for one typeface. The italic axis was imported too and is used nowhere.
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import { initWebVitalsReporting } from "./lib/webVitals";
import "./index.css";

// ---- Browser-extension noise shield ----------------------------------------
// Many extensions (MetaMask, Phantom, Grammarly, ChatGPT sidebar, password
// managers, ad blockers) inject scripts that throw or reject inside our page
// context. Without this guard, a single thrown error from an extension can
// blank the React tree. We swallow only errors that clearly originate from an
// extension or known wallet/AI sidebar prefix — never from our own code.
const EXT_HINTS = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "webkit-masked-url",
  "MetaMask",
  "ethereum",
  "Phantom",
  "solana",
  "Coinbase",
  "TronLink",
  "Brave",
  "Grammarly",
  "LanguageTool",
  "Honey",
  "LastPass",
  "1Password",
  "Bitwarden",
  "Dashlane",
  "AdBlock",
  "uBlock",
  "chatgpt",
  "Cannot redefine property: ethereum",
  "Cannot set property ethereum",
  "evmAsk",
  "inpage.js",
  "injected.js",
  "contentScript",
  "content_script",
  "content-script",
  "Extension context invalidated",
  "message channel closed",
  "Receiving end does not exist",
  "RESET_BLANK_CHECK",
  "ResizeObserver loop",
  "ResizeObserver loop completed",
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection captured",
  "The message port closed",
  "A listener indicated an asynchronous response",
];

const looksLikeExtension = (text: unknown): boolean => {
  if (!text) return false;
  const s = String(text);
  return EXT_HINTS.some((h) => s.includes(h));
};

window.addEventListener("unhandledrejection", (event) => {
  const r = event.reason as { message?: string; stack?: string } | undefined;
  if (looksLikeExtension(r?.message) || looksLikeExtension(r?.stack)) {
    event.preventDefault();
  }
});

window.addEventListener(
  "error",
  (event) => {
    if (
      looksLikeExtension(event.message) ||
      looksLikeExtension(event.filename) ||
      looksLikeExtension((event.error as { stack?: string } | null)?.stack)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },
  true,
);

initWebVitalsReporting();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </HelmetProvider>
);
