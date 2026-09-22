import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Liftable } from "@/components/lor/lorSurface";
import { safeExternalUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";
import type { Professor } from "./professorTypes";

/**
 * One professor.
 *
 * What this replaces, and why every removal was a removal:
 *
 * The old card carried ten icons — a building beside the university, an
 * envelope beside the email, two arrows beside two links, a briefcase and a
 * book beside two headings, and one in each of three buttons. An icon next to
 * a word that already says the thing is not wayfinding, it is texture, and a
 * grid of thirty cards each wearing ten of them reads as generated. The only
 * icons left are the two that replace words outright: the copy affordance and
 * the disclosure chevron.
 *
 * It also carried three buttons of equal weight. Composing an email is what
 * a student came here to do; saving to the roster and drafting a brag sheet
 * are things they do occasionally and afterwards. One filled button and a
 * quiet row of text actions says that. Three outlined buttons says nothing,
 * thirty times.
 *
 * Radii: one documented scale, three steps, used everywhere. The card is
 * 16px, anything nested inside it is 10px (the route's own `--radius`, which
 * is why the Button is pushed off shadcn's 8px default onto it), and anything
 * pill-shaped is fully round. The old card mixed five — 2xl card, xl logo, lg
 * email box, md copy button, full badges — inside a 340px box, which is the
 * kind of detail that makes a surface look assembled rather than designed.
 * Measured, not assumed: an earlier pass of this rewrite still had four,
 * because `rounded` on a text button is 4px and nobody notices by eye.
 */
export function ProfessorCard({
  p,
  onCompose,
  onSave,
  onBragSheet,
}: {
  p: Professor;
  onCompose: () => void;
  onSave: () => void;
  onBragSheet: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const experience = p.experience ?? [];
  const publications = p.publications ?? [];
  const hasDossier = experience.length > 0 || publications.length > 0;
  const profileUrl = safeExternalUrl(p.profile_url);
  const sourceUrl = safeExternalUrl(p.email_source_url);

  /* Three fit on a card line at every width this grid produces; a fourth wraps
     and pushes the bio down by a row for no gain in what you learn. */
  const shown = p.research_interests.slice(0, 3);
  const extra = p.research_interests.length - shown.length;

  const copyEmail = async () => {
    await navigator.clipboard.writeText(p.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Liftable
      /* `layout` is motivated, not ornament: opening a dossier changes this
         card's height, and without it the neighbouring card in the two-up grid
         snaps to the new row height in a single frame. */
      layout
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className="flex flex-col rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.18)] transition-colors hover:border-primary/30 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <InstitutionMark p={p} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]">
              {p.name}
            </h3>
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {[p.title, p.department].filter(Boolean).join(" · ")}
            </p>
            {p.university && (
              /* No building icon. The line reads "Stanford University, United
                 States" — nothing about it is ambiguous enough to need a
                 glyph explaining that a university is a place. */
              <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-foreground/80">
                {[p.university, p.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {shown.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {shown.map((r) => (
              /* Not shadcn's default `Badge`, which arrives as a bordered
                 secondary chip and reads with the same weight as the name
                 above it. These are labels you skim, so they sit at label
                 weight: tinted fill, no border, no shadow. */
              <span
                key={r}
                className="rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-medium text-muted-foreground"
              >
                {r}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                +{extra} more
              </span>
            )}
          </div>
        )}

        {p.bio && (
          <p
            className={cn(
              "mt-3 text-[12.5px] leading-relaxed text-muted-foreground",
              !open && "line-clamp-2",
            )}
          >
            {p.bio}
          </p>
        )}

        {hasDossier && (
          <CollapsibleContent className="overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
            {experience.length > 0 && (
              <DossierBlock title="Experience">
                {experience.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50"
                    />
                    <span>{e}</span>
                  </li>
                ))}
              </DossierBlock>
            )}

            {publications.length > 0 && (
              <DossierBlock title="Selected papers">
                {publications.map((pub, i) => {
                  const href = safeExternalUrl(pub.url ?? "");
                  const meta = [pub.venue, pub.year].filter(Boolean).join(", ");
                  return (
                    <li key={`${pub.title}-${i}`}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
                        >
                          {pub.title}
                        </a>
                      ) : (
                        <span className="font-medium text-foreground/90">{pub.title}</span>
                      )}
                      {meta && <span className="text-muted-foreground">, {meta}</span>}
                    </li>
                  );
                })}
              </DossierBlock>
            )}
            </motion.div>
          </CollapsibleContent>
        )}

        {hasDossier && (
          <CollapsibleTrigger className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {open ? "Show less" : "Experience and papers"}
            <ChevronDown
              aria-hidden
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
            />
          </CollapsibleTrigger>
        )}

        {/*
          * No mt-auto, and the grid is items-start rather than stretch. Pinning
          * the actions to the bottom of the tallest card in the row put 350px
          * of white inside the border of any professor with no bio and no
          * papers, which reads as a card that failed to load rather than as a
          * short one. Ragged bottoms are the honest shape of ragged data.
          */}
        <div className="pt-4">
          {/*
            * The email, as a line of text rather than as a bordered box with an
            * envelope in it. The old card boxed it, linked it with mailto:, put
            * a copy button beside it, and then offered a Compose button under
            * it — three routes to the same address, one of which opens whatever
            * mail client the machine happens to have registered.
            *
            * The hover card is the one piece of provenance worth keeping: this
            * address was scraped off a page, and the page is the reason to
            * trust it.
            */}
          <div className="flex items-center gap-1.5">
            <HoverCard openDelay={200}>
              <HoverCardTrigger asChild>
                <span className="min-w-0 flex-1 cursor-default truncate text-[12.5px] text-muted-foreground">
                  {p.email}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 text-[12.5px] leading-relaxed" side="top">
                <p className="font-medium text-foreground">Where this came from</p>
                <p className="mt-1 break-words text-muted-foreground">
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-border underline-offset-2 hover:decoration-foreground"
                    >
                      {sourceUrl}
                    </a>
                  ) : (
                    "A university page that listed it verbatim."
                  )}
                </p>
              </HoverCardContent>
            </HoverCard>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={copyEmail}
                  aria-label={`Copy ${p.name}'s email address`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                >
                  {/* One cell, two states, so the swap does not shift the row.
                      The check is `primary`, not emerald: a success green that
                      appears nowhere else on this route is a second accent
                      introduced for one 1.5-second moment. */}
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={copied ? "done" : "copy"}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{copied ? "Copied" : "Copy address"}</TooltipContent>
            </Tooltip>
          </div>

          <Button size="sm" className="mt-2.5 w-full rounded-lg" onClick={onCompose}>
            Compose email
          </Button>

          {/* Occasional actions, at the weight of occasional actions. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            <QuietAction onClick={onSave}>Save as recommender</QuietAction>
            <Dot />
            <QuietAction onClick={onBragSheet}>Brag sheet</QuietAction>
            {profileUrl && (
              <>
                <Dot />
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Faculty profile
                </a>
              </>
            )}
          </div>
        </div>
      </Collapsible>
    </Liftable>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground">
      ·
    </span>
  );
}

function QuietAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px"
    >
      {children}
    </button>
  );
}

/**
 * A heading inside the dossier.
 *
 * Sentence case at normal tracking. The pair it replaces were
 * `text-[11px] uppercase tracking-wide` with an icon each, which is the
 * eyebrow signature the recommenders tab had already been cleared of — two
 * of them survived down here because nobody scrolled this far.
 */
function DossierBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3.5">
      <h4 className="text-[12px] font-semibold tracking-[-0.01em] text-foreground">{title}</h4>
      <ul className="mt-1.5 space-y-1.5 text-[12.5px] leading-relaxed text-foreground/80">
        {children}
      </ul>
    </div>
  );
}

/**
 * The institution's mark.
 *
 * unavatar → Google favicon → DuckDuckGo → monogram. The monogram fallback
 * used to be a `bg-gradient-to-br from-muted to-muted/60` tile: a two-stop
 * gradient across 44 pixels of near-identical grey, which is invisible as a
 * gradient and present only as the habit of reaching for one.
 */
function InstitutionMark({ p }: { p: Professor }) {
  const domain = institutionDomain(p);
  const candidates = domain
    ? [
        `https://unavatar.io/${domain}?fallback=false`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      ]
    : [];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const initials =
    (p.university || p.name)
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";

  if (failed || candidates.length === 0) {
    return (
      <span
        aria-hidden
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-muted text-[13px] font-semibold text-muted-foreground"
      >
        {initials}
      </span>
    );
  }

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background p-1.5">
      <img
        key={candidates[idx]}
        src={candidates[idx]}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => (idx + 1 < candidates.length ? setIdx(idx + 1) : setFailed(true))}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}

/**
 * The institution's web domain, used to fetch its logo. The email domain is the
 * most reliable signal (prof@stanford.edu → stanford.edu); the profile URL host
 * is the fallback.
 */
function institutionDomain(p: Professor): string | null {
  const emailHost = p.email?.split("@")[1]?.trim().toLowerCase();
  if (emailHost && emailHost.includes(".")) return emailHost;
  try {
    return new URL(p.profile_url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
