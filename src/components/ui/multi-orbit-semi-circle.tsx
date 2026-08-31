import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Cloud,
  CreditCard,
  FileText,
  Github,
  Globe,
  GraduationCap,
  HardDrive,
  Image as ImageIcon,
  Linkedin,
  Mail,
  MessageSquare,
  Mic,
  Notebook,
  Plug,
  Presentation,
  Search,
  Slack,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * The integrations orbit.
 *
 * Three concentric half-rings around the Pathforge mark: what your file is
 * already wired into, what the product itself runs on, and what is queued.
 *
 * Two departures from the component as published, both load-bearing:
 *
 * - The icons are `lucide-react` glyphs on the page's own surface tokens, not
 *   remote brand SVGs from a third-party R2 bucket. Twenty-four hotlinked
 *   images on the landing page is twenty-four render-blocking requests to a
 *   host we do not control, on the one page that is measured for it.
 * - The glow is rendered once by the section rather than once per ring. The
 *   original mounts it inside `SemiCircleOrbit`, so three identical 1000px
 *   blurred gradients stack on top of each other — three times the paint for
 *   an effect that is only visible once.
 *
 * The rings are also honest about their own contents. Everything on the two
 * inner rings is shipped and connectable today from Settings → Connectors or
 * is a service the product already runs on. The outer ring is queued work, and
 * says so — in the legend, in every tooltip, and in the dashed ring the chips
 * are drawn with. Nothing there is presented as available.
 */

type Integration = {
  name: string;
  icon: LucideIcon;
  /** What it does here, in the tooltip. */
  note: string;
};

/** Connectable today from Settings → Connectors. */
const CONNECTED: Integration[] = [
  { name: "Google Calendar", icon: CalendarDays, note: "Deadlines and tasks sync both ways" },
  { name: "Gmail", icon: Mail, note: "Send and track application email" },
  { name: "LinkedIn", icon: Linkedin, note: "Pulls your record in, keeps it current" },
  { name: "GitHub", icon: Github, note: "Repositories as evidence of what you built" },
  { name: "Google", icon: Globe, note: "Sign in and connect your account" },
  { name: "Email", icon: MessageSquare, note: "Reminders and digests to your inbox" },
];

/** Services the product itself runs on, visible in what it can do for you. */
const PLATFORM: Integration[] = [
  { name: "Web research", icon: Search, note: "Live sourcing behind college answers" },
  { name: "Voice advisor", icon: Mic, note: "Talk to your advisor instead of typing" },
  { name: "MCP", icon: Plug, note: "Bring your own tools to the advisor" },
  { name: "Billing", icon: CreditCard, note: "Subscriptions and invoices" },
  { name: "Word export", icon: FileText, note: "Essays and resumes as .docx" },
  { name: "PDF export", icon: BookOpen, note: "Your file, print-ready" },
  { name: "Slides export", icon: Presentation, note: "Portfolios and presentations" },
  { name: "Image export", icon: ImageIcon, note: "Shareable cards from your record" },
];

/** Queued. Not available yet — every tooltip on this ring says so. */
const PLANNED: Integration[] = [
  { name: "Slack", icon: Slack, note: "Planned — team and counsellor channels" },
  { name: "Notion", icon: Notebook, note: "Planned — import your notes and trackers" },
  { name: "Google Drive", icon: HardDrive, note: "Planned — attach proof straight from Drive" },
  { name: "Microsoft 365", icon: Building2, note: "Planned — school accounts and Outlook" },
  { name: "Dropbox", icon: Cloud, note: "Planned — file storage for evidence" },
  { name: "Zoom", icon: Video, note: "Planned — counsellor sessions on your calendar" },
  { name: "Common App", icon: GraduationCap, note: "Planned — carry your file into the form" },
  { name: "Canvas", icon: BookOpen, note: "Planned — coursework and grades" },
  { name: "Discord", icon: MessageSquare, note: "Planned — cohort and club spaces" },
  { name: "Teams", icon: Users, note: "Planned — school-managed group work" },
];

function Orbit({
  items,
  radius,
  centerX,
  centerY,
  iconSize,
  planned = false,
}: {
  items: Integration[];
  radius: number;
  centerX: number;
  centerY: number;
  iconSize: number;
  planned?: boolean;
}) {
  const count = items.length;

  return (
    <>
      {items.map((item, index) => {
        // Spread across the half-circle. `count - 1` puts one chip at each end
        // of the arc rather than leaving a gap at 180°.
        const angle = count === 1 ? 90 : (index / (count - 1)) * 180;
        const x = radius * Math.cos((angle * Math.PI) / 180);
        const y = radius * Math.sin((angle * Math.PI) / 180);
        const tooltipAbove = angle > 90;
        const Icon = item.icon;

        return (
          <div
            key={item.name}
            className="pfo-node group"
            style={{
              left: `${centerX + x - iconSize / 2}px`,
              top: `${centerY - y - iconSize / 2}px`,
              width: iconSize,
              height: iconSize,
            }}
          >
            {/*
             * A button, not a bare div: the tooltip is the only place the
             * integration is named, so it has to be reachable from the
             * keyboard. `aria-label` carries the same sentence for readers
             * that never see the hover state.
             */}
            <button
              type="button"
              className={`pfo-chip ${planned ? "pfo-chip-planned" : ""}`}
              aria-label={`${item.name}. ${item.note}.`}
            >
              <Icon
                strokeWidth={1.6}
                style={{ width: iconSize * 0.44, height: iconSize * 0.44 }}
                aria-hidden
              />
            </button>

            <span className={`pfo-tip ${tooltipAbove ? "pfo-tip-above" : "pfo-tip-below"}`}>
              <strong>{item.name}</strong>
              {item.note}
            </span>
          </div>
        );
      })}
    </>
  );
}

export default function MultiOrbitSemiCircle() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Nothing to lay out until the first measurement lands.
  const base = Math.min(Math.max(width * 0.82, 320), 720);
  const centerX = base / 2;
  const centerY = base * 0.52;
  const iconSize = width < 480 ? 34 : width < 768 ? 40 : 46;

  return (
    <div className="pfo" style={{ width: base, height: base * 0.62 }}>
      <div className="pfo-glow" aria-hidden />

      {/* The arcs the chips sit on, so the rings read as rings when the
          spacing alone is ambiguous. */}
      <svg className="pfo-arcs" viewBox={`0 0 ${base} ${base * 0.62}`} aria-hidden>
        {[0.22, 0.36, 0.5].map((r) => (
          <path
            key={r}
            d={`M ${centerX - base * r} ${centerY} A ${base * r} ${base * r} 0 0 1 ${
              centerX + base * r
            } ${centerY}`}
            fill="none"
          />
        ))}
      </svg>

      <Orbit
        items={CONNECTED}
        radius={base * 0.22}
        centerX={centerX}
        centerY={centerY}
        iconSize={iconSize}
      />
      <Orbit
        items={PLATFORM}
        radius={base * 0.36}
        centerX={centerX}
        centerY={centerY}
        iconSize={iconSize}
      />
      <Orbit
        items={PLANNED}
        radius={base * 0.5}
        centerX={centerX}
        centerY={centerY}
        iconSize={iconSize}
        planned
      />
    </div>
  );
}
