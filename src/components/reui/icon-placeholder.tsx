import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  RepeatIcon,
  type LucideProps,
} from "lucide-react";

/**
 * The icon shim the ReUI event calendar is authored against.
 *
 * Upstream ships `<IconPlaceholder lucide="ChevronLeftIcon" tabler="..."
 * hugeicons="..." phosphor="..." />` so one source file works whichever icon
 * library the consuming app uses; their CLI rewrites it at install time. We
 * install the files verbatim from the registry instead, so the shim has to
 * exist at runtime — implementing it here is what lets all thirteen calendar
 * files stay byte-identical to upstream. The only edit they carry is the
 * import path to this file.
 *
 * Pathforge is a lucide app, so `lucide` is the prop that resolves and the rest
 * are accepted and ignored.
 *
 * The map is explicit rather than `import * as Icons from "lucide-react"`: a
 * namespace import defeats tree-shaking and would drag the entire icon set —
 * well over a thousand components — into the calendar chunk. Six icons are
 * used; six are imported.
 */
const LUCIDE = {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  RepeatIcon,
} as const;

export interface IconPlaceholderProps extends LucideProps {
  /** Export name in `lucide-react`. The only one this app resolves. */
  lucide?: keyof typeof LUCIDE | (string & {});
  /** Accepted for source parity with upstream; unused here. */
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
}

export function IconPlaceholder({
  lucide,
  // Pulled out so they never reach the DOM as unknown attributes.
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: IconPlaceholderProps) {
  const Icon = lucide ? LUCIDE[lucide as keyof typeof LUCIDE] : undefined;
  // An unmapped name renders nothing rather than throwing: a missing glyph is
  // a cosmetic gap, a crashed calendar is not.
  if (!Icon) return null;
  return <Icon {...props} />;
}

export default IconPlaceholder;
