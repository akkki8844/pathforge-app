import { ALL_COUNTRIES } from "@/lib/countries";

/**
 * Region-based price display for /pricing. This is a display-only estimate —
 * Paddle charges in USD and does its own localisation (real FX, local taxes)
 * at checkout, so these rates only need to be "close enough" to tell a
 * student roughly what they'll pay before they get there.
 */
export interface CurrencyInfo {
  code: string;
  symbol: string;
  /** Indicative USD -> this currency rate. */
  rate: number;
}

const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", rate: 1 },
  INR: { code: "INR", symbol: "₹", rate: 83 },
  GBP: { code: "GBP", symbol: "£", rate: 0.79 },
  EUR: { code: "EUR", symbol: "€", rate: 0.92 },
  CAD: { code: "CAD", symbol: "CA$", rate: 1.36 },
  AUD: { code: "AUD", symbol: "AU$", rate: 1.52 },
  NZD: { code: "NZD", symbol: "NZ$", rate: 1.66 },
  AED: { code: "AED", symbol: "AED ", rate: 3.67 },
  SGD: { code: "SGD", symbol: "S$", rate: 1.34 },
  JPY: { code: "JPY", symbol: "¥", rate: 149 },
  CNY: { code: "CNY", symbol: "¥", rate: 7.2 },
  BRL: { code: "BRL", symbol: "R$", rate: 5.1 },
  MXN: { code: "MXN", symbol: "MX$", rate: 17 },
  ZAR: { code: "ZAR", symbol: "R", rate: 18.5 },
  NGN: { code: "NGN", symbol: "₦", rate: 1550 },
  PKR: { code: "PKR", symbol: "Rs", rate: 278 },
  BDT: { code: "BDT", symbol: "Tk", rate: 110 },
  IDR: { code: "IDR", symbol: "Rp", rate: 15600 },
  PHP: { code: "PHP", symbol: "₱", rate: 56 },
  VND: { code: "VND", symbol: "₫", rate: 25400 },
  KRW: { code: "KRW", symbol: "₩", rate: 1330 },
  SAR: { code: "SAR", symbol: "SR", rate: 3.75 },
  TRY: { code: "TRY", symbol: "₺", rate: 34 },
};

// ISO 3166-1 alpha-2 -> currency code. Countries left out (including the US)
// just show USD, same as today.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  IN: "INR",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  AE: "AED",
  SG: "SGD",
  JP: "JPY",
  CN: "CNY",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  NG: "NGN",
  PK: "PKR",
  BD: "BDT",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  KR: "KRW",
  SA: "SAR",
  TR: "TRY",
  // Eurozone
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR",
  GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR", HR: "EUR",
};

const NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  ALL_COUNTRIES.map((c) => [c.name.toLowerCase(), c.code]),
);

function codeFromLocale(): string | null {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale;
    // "en-IN" -> "IN"; Intl.Locale isn't in every runtime, so parse manually.
    const region = locale.split("-")[1];
    return region ? region.toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * Pick a display currency for a visitor, preferring their onboarding survey
 * country (an explicit, student-given signal) over the browser locale (a
 * guess that can be wrong for travellers, VPNs, or a non-localised OS).
 */
export function resolveDisplayCurrency(countryName?: string | null): CurrencyInfo {
  const code = (countryName && NAME_TO_CODE[countryName.trim().toLowerCase()]) || codeFromLocale();
  const currencyCode = code ? COUNTRY_TO_CURRENCY[code] : undefined;
  return currencyCode ? CURRENCIES[currencyCode] : CURRENCIES.USD;
}

/** Convert a USD amount to the given display currency, indicative only. */
export function convertUSD(usd: number, currency: CurrencyInfo): number {
  return usd * currency.rate;
}

/** Format a USD amount in the given display currency, e.g. "₹332". */
export function formatConverted(usd: number, currency: CurrencyInfo): string {
  return `${currency.symbol}${Math.round(convertUSD(usd, currency)).toLocaleString()}`;
}
