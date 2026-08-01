import { createRoot } from "react-dom/client";
// Only the essential weights are eager-loaded. Rarely used weights are
// lazy-loaded inside the specific routes that need them (e.g. Resume).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/600.css";
import "@fontsource/work-sans/700.css";
// Display headings use Sora — a clean, open geometric sans that reads well at
// large sizes. Work Sans / Plus Jakarta remain the body + fallback.
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@fontsource/sora/800.css";
// Fraunces (serif) is kept for the landing hero headline only — see
// `.atlas-hero h1` in index.css. Not used elsewhere in the app chrome.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
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
