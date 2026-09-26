import { AuthQuote } from "@/components/auth/AuthQuote";
import { COUNSELLOR_AUTH_QUOTES } from "@/data/authQuotes";

/**
 * The left-hand column of the counsellor sign-in screen.
 *
 * Only the house editorial line, set large. The panel used to carry a heading,
 * four feature rows, a crawling wall of every counsellor page and a university
 * strip; that was a tour of what is behind the sign-in, and the form beside it
 * is the quicker way to see that. No counsellor testimonials have been
 * collected, so none are shown - see `src/data/reviews.ts`.
 */
export function CounsellorRail() {
  return (
    <div className="w-full">
      <AuthQuote quotes={COUNSELLOR_AUTH_QUOTES} tone="onDark" size="lg" />

      <p className="mt-12 max-w-[52ch] text-[12px] leading-relaxed text-white/55">
        Counsellors never see student direct messages or private chat. What is
        visible is documented in the{" "}
        <a href="/privacy" className="underline hover:text-white">
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}
