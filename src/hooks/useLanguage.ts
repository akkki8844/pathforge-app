import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "pf_language";
const EVENT = "pf:language-changed";

export function getStoredLanguage(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(STORAGE_KEY) || "en";
}

// Map our internal codes to Google Translate language codes
function toGoogleCode(lang: string): string {
  const map: Record<string, string> = {
    "zh": "zh-CN",
    "zh-tw": "zh-TW",
  };
  return map[lang] || lang;
}

function setGoogTransCookie(lang: string) {
  const target = toGoogleCode(lang);
  const value = lang === "en" ? "" : `/en/${target}`;
  // Set on current host + parent domain so the widget picks it up
  const hostname = window.location.hostname;
  const domains = [hostname];
  const parts = hostname.split(".");
  if (parts.length > 1) domains.push("." + parts.slice(-2).join("."));
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  for (const d of domains) {
    document.cookie = `googtrans=${value}; expires=${expires}; path=/; domain=${d}`;
    document.cookie = `googtrans=${value}; expires=${expires}; path=/`;
  }
}

// Google's element.js is ~100KB and pulls further Google scripts once it runs.
// It used to sit in index.html and load on every cold start for every visitor,
// competing with our own bundle for bandwidth on the critical path — even
// though almost nobody leaves English. It is now injected only when a
// non-English language is actually in play. Idempotent.
let translateScriptInjected = false;
function ensureGoogleTranslate() {
  if (typeof document === "undefined" || translateScriptInjected) return;
  // A previous injection in this document (e.g. after a soft nav) still counts.
  if (document.querySelector("script[data-goog-translate]")) {
    translateScriptInjected = true;
    return;
  }
  translateScriptInjected = true;
  const s = document.createElement("script");
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  s.dataset.googTranslate = "1";
  document.head.appendChild(s);
}

function applyGoogleTranslate(lang: string): boolean {
  const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!select) return false;
  select.value = lang === "en" ? "" : toGoogleCode(lang);
  select.dispatchEvent(new Event("change"));
  return true;
}

export function setStoredLanguage(lang: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }));

  // Drive the Google Translate widget. If the widget hasn't initialised yet,
  // set the cookie and reload so it picks the target language on boot.
  setGoogTransCookie(lang);
  // Switching back to English never needs the widget if it was never loaded —
  // the page is already in English, and injecting it here would fetch ~100KB
  // to accomplish nothing.
  if (lang !== "en") ensureGoogleTranslate();
  else if (!translateScriptInjected) return;
  let attempts = 0;
  const tryApply = () => {
    if (applyGoogleTranslate(lang)) return;
    if (++attempts < 20) {
      setTimeout(tryApply, 250);
    } else {
      // Widget never appeared (e.g. blocked). Force a reload — the cookie
      // will make the widget translate the page on next load.
      window.location.reload();
    }
  };
  tryApply();
}

// Module-level guard so the 300ms Google Translate poll started on mount
// runs at most once per app instance, even though useLanguage() is called
// from multiple components simultaneously (each mount used to start its own
// redundant polling loop — up to 6s of duplicate setInterval churn per call site).
let translatePollLang: string | null = null;

/**
 * Global language hook. Reading + writing always go through the same
 * localStorage key, and any tab updates trigger a custom event so every
 * subscriber re-renders. Changing the language also drives the Google
 * Translate widget mounted in index.html so the entire UI is translated
 * at runtime — not just AI-generated text.
 */
export function useLanguage() {
  const [language, setLanguage] = useState<string>(() => getStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
    // On mount, re-apply the stored language so navigation/refresh keeps translation active.
    // Only one poll loop for a given target language runs per app instance.
    if (language && language !== "en" && translatePollLang !== language) {
      translatePollLang = language;
      setGoogTransCookie(language);
      ensureGoogleTranslate();
      let tries = 0;
      const id = window.setInterval(() => {
        if (applyGoogleTranslate(language) || ++tries > 20) {
          window.clearInterval(id);
          if (translatePollLang === language) translatePollLang = null;
        }
      }, 300);
    }
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (typeof next === "string") setLanguage(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setLanguage(e.newValue);
    };
    window.addEventListener(EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [language]);

  const update = useCallback((next: string) => {
    setStoredLanguage(next);
    setLanguage(next);
  }, []);

  return { language, setLanguage: update };
}
