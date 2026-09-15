/**
 * The integrations directory.
 *
 * This was an orbit: three concentric half-rings of logos around the
 * Pathforge mark, with a comet looping each arc and a blurred blue/violet
 * glow behind the whole thing. It read as decoration rather than
 * information — the motion drew the eye away from the logos, the glow was
 * the only place on the page with a neon gradient, and the names were
 * hidden until you hovered, so on a phone the section was twenty-four
 * unlabelled circles.
 *
 * It is now a plain directory, set in the landing page's own type: two
 * honest groups, every logo named, every note visible without interaction.
 *
 * Two things carried over because they were the right calls:
 *
 * - The marks are each vendor's real logo, in full colour, served from
 *   `public/logos` — our own origin. Hotlinking brand SVGs from a
 *   third-party bucket is twenty-four render-blocking requests to a host we
 *   do not control, on the one page that is measured for it. Monochrome
 *   icon-font glyphs were tried first and were wrong: a tinted silhouette
 *   is not a logo, and nobody recognises one.
 * - The groups are honest about their contents. "Available now" is
 *   services this codebase actually talks to — every one has an edge
 *   function, an OAuth handler or a dependency behind it. "On the roadmap"
 *   is queued work and says so, in its label and in the dashed, unfilled
 *   tiles it is drawn with. Nothing there is presented as available.
 */

type Ring = "connected" | "platform" | "planned";

type Integration = {
  name: string;
  /** Real vendor logo under `public/logos`, full colour. */
  logo: string;
  /** What it does here. */
  note: string;
  ring: Ring;
};

/** Connected today: each of these has an OAuth handler or edge function behind it. */
const CONNECTED: Integration[] = [
  {
    name: "Google Calendar",
    logo: "/logos/google-calendar.svg",
    note: "Deadlines and tasks sync both ways",
    ring: "connected",
  },
  {
    name: "Gmail",
    logo: "/logos/gmail.svg",
    note: "Send and track application email",
    ring: "connected",
  },
  {
    name: "LinkedIn",
    logo: "/logos/linkedin.svg",
    note: "Pulls your record in, keeps it current",
    ring: "connected",
  },
  {
    name: "GitHub",
    logo: "/logos/github.svg",
    note: "Repositories as evidence of what you built",
    ring: "connected",
  },
  {
    name: "Google",
    logo: "/logos/google.svg",
    note: "Sign in and connect your account",
    ring: "connected",
  },
  {
    name: "MCP",
    logo: "/logos/mcp.svg",
    note: "Bring your own tools to the advisor",
    ring: "connected",
  },
];

/** What the product runs on, and what it hands back to you. */
const PLATFORM: Integration[] = [
  {
    name: "Supabase",
    logo: "/logos/supabase.svg",
    note: "Your file, stored and access-controlled",
    ring: "platform",
  },
  {
    name: "Google Gemini",
    logo: "/logos/gemini.svg",
    note: "The reasoning behind advisor answers",
    ring: "platform",
  },
  {
    name: "ElevenLabs",
    logo: "/logos/elevenlabs.svg",
    note: "Talk to your advisor instead of typing",
    ring: "platform",
  },
  {
    name: "Firecrawl",
    logo: "/logos/firecrawl.svg",
    note: "Live web research behind college answers",
    ring: "platform",
  },
  {
    name: "Microsoft Word",
    logo: "/logos/word.svg",
    note: "Essays and resumes exported as .docx",
    ring: "platform",
  },
  {
    name: "PDF",
    logo: "/logos/pdf.svg",
    note: "Your file, print-ready",
    ring: "platform",
  },
  {
    name: "PowerPoint",
    logo: "/logos/powerpoint.svg",
    note: "Portfolios exported as .pptx",
    ring: "platform",
  },
  {
    name: "Google Slides",
    logo: "/logos/slides.svg",
    note: "The same deck, straight into Slides",
    ring: "platform",
  },
];

/** Queued. Not available yet — the group label and the tiles both say so. */
const PLANNED: Integration[] = [
  {
    name: "Slack",
    logo: "/logos/slack.svg",
    note: "Team and counsellor channels",
    ring: "planned",
  },
  {
    name: "Notion",
    logo: "/logos/notion.svg",
    note: "Import your notes and trackers",
    ring: "planned",
  },
  {
    name: "Google Drive",
    logo: "/logos/drive.svg",
    note: "Attach proof straight from Drive",
    ring: "planned",
  },
  {
    name: "Microsoft 365",
    logo: "/logos/microsoft.svg",
    note: "School accounts and Outlook",
    ring: "planned",
  },
  {
    name: "Dropbox",
    logo: "/logos/dropbox.svg",
    note: "File storage for evidence",
    ring: "planned",
  },
  {
    name: "Zoom",
    logo: "/logos/zoom.svg",
    note: "Counsellor sessions on your calendar",
    ring: "planned",
  },
  {
    name: "Canvas",
    logo: "/logos/canvas.svg",
    note: "Coursework and grades from Instructure",
    ring: "planned",
  },
  {
    name: "Google Classroom",
    logo: "/logos/classroom.svg",
    note: "Assignments alongside your deadlines",
    ring: "planned",
  },
  {
    name: "Discord",
    logo: "/logos/discord.svg",
    note: "Cohort and club spaces",
    ring: "planned",
  },
  {
    name: "Microsoft Teams",
    logo: "/logos/teams.svg",
    note: "School-managed group work",
    ring: "planned",
  },
];

const LIVE = [...CONNECTED, ...PLATFORM];

function IntegrationTile({ item }: { item: Integration }) {
  const planned = item.ring === "planned";

  return (
    <li className={`pfi-tile${planned ? " pfi-tile-planned" : ""}`}>
      <span className="pfi-mark">
        <img src={item.logo} alt="" width={28} height={28} loading="lazy" decoding="async" />
      </span>
      <span className="pfi-copy">
        <strong>{item.name}</strong>
        <span>{item.note}</span>
      </span>
    </li>
  );
}

function Group({
  label,
  caption,
  items,
}: {
  label: string;
  caption: string;
  items: Integration[];
}) {
  return (
    <section className="pfi-group" aria-labelledby={`pfi-${label.replace(/\s+/g, "-").toLowerCase()}`}>
      <header className="pfi-group-head">
        <h3 id={`pfi-${label.replace(/\s+/g, "-").toLowerCase()}`}>
          {label} <b>{"\n"}</b>
        </h3>
        <p>{caption}</p>
      </header>
      <ul className="pfi-grid">
        {items.map((item) => (
          <IntegrationTile key={item.name} item={item} />
        ))}
      </ul>
    </section>
  );
}

export default function IntegrationsDirectory() {
  return (
    <div className="pfi">
      <Group
        label="Available now"
        caption="Connected today — each one has an OAuth handler, an export path, or an edge function behind it."
        items={LIVE}
      />
      <Group
         label={"On the roadmap\n"}
        caption="Queued, not yet available. Listed so you know what is coming, not to imply it is here."
        items={PLANNED}
      />
    </div>
  );
}
