// Re-exported from CreditsContext so all consumers share one fetch + one
// realtime subscription instead of each call site opening its own.
export { useCredits, notifyCreditConsumed } from "@/contexts/CreditsContext";
