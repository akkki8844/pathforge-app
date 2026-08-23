import { useReducedMotion } from "framer-motion";
import { Award, ExternalLink } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { cn } from "@/lib/utils";
import podcastShot from "@/assets/podcast-future-mogul.webp.asset.json";
import articleShot from "@/assets/feature-article.webp.asset.json";

/**
 * The 2026 Global Recognition Award section on /about.
 *
 * Written from the award citation rather than reproducing it: the citation runs
 * to a thousand words of third-person prose, and a page that pastes its own
 * press release in full reads as though it has nothing else to say. What is
 * kept is the part a reader is actually weighing — who gave it, for what, how
 * competitive it was, and how it was judged — plus one attributed quote.
 *
 * Every figure here comes from the citation. Nothing is rounded up, and the
 * usage numbers are stated as the award body stated them, because the whole
 * value of this section is that it is checkable.
 */

/**
 * The badge artwork is set on a deep navy that runs to the edge of every asset.
 * Tiles share one aspect ratio so the grid stays even, and the art is contained
 * rather than cropped — these are certificates, and cutting a signature or a URL
 * off the bottom to fill a box would be worse than a little matting. The mat is
 * this navy, sampled from the artwork, so it reads as part of the frame.
 */
const MAT = "#0d1c34";

interface MediaTile {
  kind: "image" | "video";
  src: string;
  poster?: string;
  alt: string;
  /** Shown under the tile. Says what the asset is, not what it looks like. */
  caption: string;
}

const MEDIA: MediaTile[] = [
  {
    kind: "image",
    src: "/awards/gra-badge-wide.jpg",
    alt: "2026 Global Recognition Award winner badge",
    caption: "Winner badge",
  },
  {
    kind: "image",
    src: "/awards/gra-badge-square.jpg",
    alt: "2026 Global Recognition Award winner seal, signed by presidents James Sinclair and Jethro Sparks",
    caption: "Signed seal",
  },
  {
    kind: "video",
    src: "/awards/gra-reel-wide.mp4",
    poster: "/awards/gra-reel-wide-poster.jpg",
    alt: "Animated 2026 Global Recognition Award winner announcement",
    caption: "Announcement reel",
  },
  {
    kind: "video",
    src: "/awards/gra-reel-vertical.mp4",
    poster: "/awards/gra-reel-vertical-poster.jpg",
    alt: "Vertical animated 2026 Global Recognition Award winner announcement",
    caption: "Vertical cut",
  },
];

interface AppearanceItem {
  href: string;
  outlet: string;
  title: string;
  blurb: string;
  image: string;
  alt: string;
  cta: string;
}

const APPEARANCES: AppearanceItem[] = [
  {
    href: "https://open.spotify.com/episode/6a4eX63LoRFjjnR81QLlrr?si=3424b8f0f9754f04",
    outlet: "The Future Mogul Podcast",
    title: "Building strategic clarity for students",
    blurb:
      "Dhiya Raja sits down with Pathforge founder Govind Mulchandani on what long-term positioning looks like for a student, and why it is not the same as stacking a résumé.",
    image: podcastShot.url,
    alt: "Spotify episode card for the Future Mogul Podcast interview with Pathforge",
    cta: "Listen on Spotify",
  },
  {
    href: "https://drive.google.com/file/d/1icmOVcuJwhP_2Mmw2b-5qEooRcnmlzGN/view",
    outlet: "Feature article",
    title: "Pathforge — Govind Mulchandani",
    blurb:
      "A written profile on the thinking behind the platform: AI as a way to add depth and structure to a student's work, rather than a shortcut around it.",
    image: articleShot.url,
    alt: "First page of the printed feature article about Pathforge and Govind Mulchandani",
    cta: "Read the article",
  },
];

function Appearance({ item, index }: { item: AppearanceItem; index: number }) {
  return (
    <ScrollReveal delay={index * 0.06} className="min-w-0">
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background",
          "transition-colors hover:border-accent/60",
        )}
      >
        <div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted">
          <img
            src={item.image}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            width={900}
            height={506}
            {...({ fetchpriority: "low" } as Record<string, string>)}
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {item.outlet}
          </div>
          <div className="mt-2 font-display text-base font-semibold leading-snug text-foreground">
            {item.title}
          </div>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.blurb}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            {item.cta}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      </a>
    </ScrollReveal>
  );
}


function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      {/* Serif numerals, display caps beneath — the same pairing the dashboard
          uses for figures, so a number on the marketing site and a number in
          the product are recognisably the same kind of thing. */}
      <div className="font-serif text-3xl leading-none tracking-tight text-foreground sm:text-4xl">
        {value}
      </div>
      <div className="mt-2 font-display text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Tile({ item, index, reduced }: { item: MediaTile; index: number; reduced: boolean }) {
  return (
    // ScrollReveal rather than a bare `whileInView`: it drops out to a plain
    // <div> under prefers-reduced-motion, so the tile is never left sitting at
    // opacity 0 for a reader whose browser will not run the reveal. The same
    // property makes it safe in the prerendered HTML, where nothing scrolls.
    <ScrollReveal delay={index * 0.06} className="min-w-0">
      <figure className="min-w-0">
        <div
          className={cn(
            "flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl",
            "border border-border/60 shadow-sm",
          )}
          style={{ backgroundColor: MAT }}
        >
          {item.kind === "image" ? (
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              src={item.src}
              poster={item.poster}
              aria-label={item.alt}
              // Muted + playsInline are what make autoplay legal on iOS and in
              // Chrome; without both the tile shows a frozen poster on mobile.
              muted
              playsInline
              loop
              // A visitor who has asked for less motion gets the poster and a
              // control, not a loop running in their peripheral vision.
              autoPlay={!reduced}
              controls={reduced}
              preload="metadata"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <figcaption className="mt-2 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {item.caption}
        </figcaption>
      </figure>
    </ScrollReveal>
  );
}

export function AwardSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section aria-labelledby="award-heading" className="mt-16">
      <ScrollReveal className="rounded-2xl border border-border/60 bg-card p-6 sm:p-10">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            Awards &amp; media appearances
          </span>
        </div>

        <h2
          id="award-heading"
          className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Pathforge won a 2026 Global Recognition Award
        </h2>

        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Global Recognition Awards named Pathforge a 2026 winner in{" "}
          <span className="text-foreground">Innovation</span>. The award recognises the platform for
          organising scholarships, competitions, internships, research programmes and activities
          around a student's own interests and goals — rather than leaving them scattered across
          portals, institutional pages and informal communities.
        </p>

        {/* Four figures, all of them figures. The category is a word, so it
            lives in the sentence above rather than being set in numeral type
            next to a percentage and a year. */}
        <div className="mt-8 grid grid-cols-2 gap-6 border-y border-border/60 py-6 sm:grid-cols-4">
          <Stat value="2026" label="Award year" />
          <Stat value="15,000" label="Entrants a year" />
          <Stat value="5.8%" label="Recognised" />
          <Stat value="1,000+" label="Users at judging" />
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              How it was judged
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Entries were first screened for eligibility, industry recognition, innovation,
              leadership, service, sustainability and social responsibility. Shortlisted applicants
              were then assessed by independent experts on a 1-to-5 framework, scored through the
              Rasch model — a measurement method that puts achievements of very different kinds onto
              one comparable scale.
            </p>
          </div>
          <div>
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              What it was awarded for
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The citation credits originality, technical development, user engagement and practical
              application, alongside a direct response to unequal access to educational guidance. At
              the time of judging Pathforge had reached more than 1,000 users and had been tested by
              around 100 students, whose feedback shaped what the platform does.
            </p>
          </div>
        </div>

        <blockquote className="mt-8 border-l-2 border-accent pl-5">
          <p className="font-serif text-lg leading-relaxed text-foreground sm:text-xl">
            "Pathforge and team have shown exceptional qualities through his ability to address a
            difficult student challenge with a functioning platform that has practical value,
            careful development, and the capacity to assist more users over time.”
          </p>
          <footer className="mt-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Alex Sterling — Global Recognition Awards
          </footer>
        </blockquote>

        <div className="mt-10">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            The award assets
          </h3>
          {/* Two across, not four. At four these are 150px wide and a
              certificate with two signatures and a URL on it becomes texture. */}
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {MEDIA.map((item, i) => (
              <Tile key={item.src} item={item} index={i} reduced={reduced} />
            ))}
          </div>
        </div>

        {/* Media appearances — a podcast episode and a written feature. Both are
            links out to the original source, with the screenshot as the visual
            so a reader can see what they are clicking before they leave. */}
        <div className="mt-12 border-t border-border/60 pt-8">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Media appearances
          </h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {APPEARANCES.map((item, i) => (
              <Appearance key={item.href} item={item} index={i} />
            ))}
          </div>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Issued by Global Recognition Awards. The award recognises the work behind Pathforge; it is
          not an endorsement by, or an affiliation with, any university or admissions office, and it
          does not affect any admissions decision.
        </p>
      </ScrollReveal>
    </section>
  );
}
