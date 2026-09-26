import { cn } from "@/lib/utils";
import { GEMINI_PATH, NVIDIA_PATH, OPENAI_PATH } from "@/components/icons/brandPaths";
import { VENDOR_NAMES, type ModelVendor } from "@/lib/advisorModels";

/**
 * The maker's mark for a model, drawn at text size.
 *
 * Gemini keeps its own blue-to-violet fill because that is the mark; the
 * others are single-colour marks and take `currentColor`, so they sit in the
 * surrounding text colour in light and dark mode alike.
 */
export function ModelLogo({ vendor, className }: { vendor: ModelVendor; className?: string }) {
  const size = cn("h-3.5 w-3.5 shrink-0", className);
  if (vendor === "google") {
    return (
      <svg viewBox="0 0 24 24" className={size} aria-hidden="true">
        <defs>
          <linearGradient id="pf-gemini-fill" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#1C7DFF" />
            <stop offset="0.52" stopColor="#1C69FF" />
            <stop offset="1" stopColor="#9168C0" />
          </linearGradient>
        </defs>
        <path d={GEMINI_PATH} fill="url(#pf-gemini-fill)" />
      </svg>
    );
  }
  if (vendor === "openai") {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="currentColor" aria-hidden="true">
        <path d={OPENAI_PATH} />
      </svg>
    );
  }
  if (vendor === "nvidia") {
    return (
      <svg viewBox="0 0 24 24" className={size} fill="#76B900" aria-hidden="true">
        <path d={NVIDIA_PATH} />
      </svg>
    );
  }
  // Z.ai publishes no single-path mark; a lettered tile reads the same at 14px.
  return (
    <span
      aria-hidden="true"
      className={cn(
        size,
        "inline-flex items-center justify-center rounded-[3px] bg-foreground text-[9px] font-bold leading-none text-background",
      )}
    >
      Z
    </span>
  );
}

/**
 * "Powered by <logo> Gemini 2.5 Flash".
 *
 * The advisor is built on third-party models, and the student is told which
 * one wrote what they are reading, by name and by mark, rather than being
 * shown only Pathforge's tier label.
 */
export function PoweredBy({
  vendor,
  name,
  className,
  compact = false,
}: {
  vendor: ModelVendor;
  name: string;
  className?: string;
  /** Drop the "Powered by" words, for places that already say it. */
  compact?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground", className)}
      title={`${name} by ${VENDOR_NAMES[vendor]}`}
    >
      {!compact && <span>Powered by</span>}
      <ModelLogo vendor={vendor} />
      <span className="font-medium text-foreground/80">{name}</span>
    </span>
  );
}
