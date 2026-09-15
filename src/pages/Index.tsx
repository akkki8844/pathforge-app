import { useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { FallingLeaves } from "@/components/animations/FallingLeaves";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { useAuth } from "@/contexts/AuthContext";
import SpecularAnchor from "@/components/ui/specular/SpecularAnchor";
import SpecularLink from "@/components/ui/specular/SpecularLink";
import { MAC_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from "@/lib/desktopDownload";
import IntegrationsDirectory from "@/components/ui/integrations-directory";
import { TextRotate } from "@/components/ui/text-rotate";
import { fadeUp, transition } from "@/lib/motion";

const MotionLink = motion.create(Link);
const MotionSpecularLink = motion.create(SpecularLink);
const MotionSpecularAnchor = motion.create(SpecularAnchor);
const EASE = [0.16, 1, 0.3, 1] as const;
// Hero is served from /public so the browser can preload it before JS parses
// (see <link rel="preload"> in index.html). Keeps it out of the JS bundle.
const heroCampus = "/assets/hero-campus-cinematic-v1.webp";
import pathforgeMark from "@/assets/pathforge-logo.webp";
import talkforgeLogo from "@/assets/talkforge-logo.webp";

/**
 * The rotating showcase that replaced the five numbered department cards.
 *
 * `word` completes the sentence "Built for your ___", so every entry has to
 * read as a possessive noun phrase. `line` is that feature's one-line
 * description and is swapped in lockstep with the word — TextRotate's
 * `onNext` drives the index for both, so the two can never desync.
 *
 * Lines are kept to roughly one measure (~65 characters) so the copy under
 * the animation stays a single line on desktop and the block doesn't jump
 * height on every rotation.
 */
const rotatingFeatures = [
  { word: "journey", line: "A personalized application plan, built around where you want to go." },
  { word: "advisor", line: "Voice guidance that remembers your goals, context and progress." },
  { word: "activities", line: "Opportunities that strengthen your story, not just your résumé." },
  { word: "essays", line: "Drafts sharpened line by line, in your voice — never written for you." },
  { word: "resume", line: "Verified work, turned into a credible one-page student profile." },
  { word: "LinkedIn", line: "A professional presence that reflects what you have genuinely done." },
  { word: "recommendations", line: "Professors tracked, briefed and followed up — without the chasing." },
  { word: "odds", line: "An honest read on where you stand at every university on your list." },
];

/** Shared by the live pill and its reduced-motion counterpart. */
const ROTATE_PILL = "overflow-hidden rounded-[0.6rem] bg-[var(--accent)] px-[0.28em] py-[0.06em] text-[var(--surface)]";
const ROTATE_SPRING = { type: "spring" as const, damping: 30, stiffness: 400 };

const universities: { name: string; domain: string }[] = [
  { name: "Harvard", domain: "harvard.edu" },
  { name: "Stanford", domain: "stanford.edu" },
  { name: "MIT", domain: "mit.edu" },
  { name: "Princeton", domain: "princeton.edu" },
  { name: "Yale", domain: "yale.edu" },
  { name: "Columbia", domain: "columbia.edu" },
  { name: "Caltech", domain: "caltech.edu" },
  { name: "UChicago", domain: "uchicago.edu" },
  { name: "UPenn", domain: "upenn.edu" },
  { name: "Cornell", domain: "cornell.edu" },
  { name: "Brown", domain: "brown.edu" },
  { name: "Dartmouth", domain: "dartmouth.edu" },
  { name: "Duke", domain: "duke.edu" },
  { name: "Northwestern", domain: "northwestern.edu" },
  { name: "Johns Hopkins", domain: "jhu.edu" },
  { name: "UC Berkeley", domain: "berkeley.edu" },
  { name: "UCLA", domain: "ucla.edu" },
  { name: "Oxford", domain: "ox.ac.uk" },
  { name: "Cambridge", domain: "cam.ac.uk" },
  { name: "Imperial", domain: "imperial.ac.uk" },
  { name: "NUS", domain: "nus.edu.sg" },
  { name: "ETH Zurich", domain: "ethz.ch" },
];

export default function Index() {
  const prefersReduced = useReducedMotion();

  // Driven by TextRotate's onNext so the description under the animation is
  // always describing the word currently on screen.
  const [featureIndex, setFeatureIndex] = useState(0);
  const activeFeature = rotatingFeatures[featureIndex] ?? rotatingFeatures[0];

  // A signed-out visitor is being invited in ("Student workspace"); a returning
  // one is being sent back to work ("Open workspace"). While auth is still
  // resolving we show the signed-out wording — it's the safe guess for a
  // landing page, and it stops the label flickering for first-time visitors.
  const { user, loading: authLoading } = useAuth();
  const isReturning = !authLoading && !!user;
  const workspaceHref = isReturning
    ? "/dashboard"
    : "/auth?role=student&view=signup";


  // Whole-page scroll progress → the top reader bar.
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  // Hero parallax: copy drifts up and fades as the first screen scrolls away.
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProg } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProg, [0, 1], [0, prefersReduced ? 0 : -70]);
  const heroOpacity = useTransform(heroProg, [0, 0.75], [1, prefersReduced ? 1 : 0]);

  // Section reveal + per-item stagger, disabled under reduced motion.
  const reveal = prefersReduced
    ? {}
    : {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-12% 0px -10% 0px" },
        transition: { duration: 0.75, ease: EASE },
      };
  const item = (i: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-8% 0px -8% 0px" },
          transition: { duration: 0.55, delay: (i % 6) * 0.07, ease: EASE },
        };
  const load = (delay: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  // Tactile spring feedback on call-to-action buttons: a subtle lift on hover,
  // a press-down on tap. Disabled under reduced motion.
  const cta = prefersReduced
    ? {}
    : {
        whileHover: { y: -2, scale: 1.025 },
        whileTap: { scale: 0.97 },
        transition: { type: "spring" as const, stiffness: 400, damping: 22 },
      };

  return (
    <div className="atlas-page">
      <Seo
        title="Pathforge"
        description="Build a standout college application profile, one clear next step at a time — for students applying to selective global universities."
        path="/"
      />

      <a className="atlas-skip" href="#atlas-main">
        Skip to content
      </a>
      <div className="atlas-progress" aria-hidden="true">
        <motion.span style={{ width: "100%", scaleX: progressX, transformOrigin: "0% 50%" }} />
      </div>

      <header className="atlas-header">
        <div className="atlas-header-inner">
          <Link className="atlas-brand" to="/" aria-label="Pathforge home">
            <img src={pathforgeMark} width={96} height={96} decoding="async" alt="Pathforge logo" />
            <span>Pathforge</span>
          </Link>
          <nav className="atlas-nav" aria-label="Primary navigation">
            <a href="#departments">Explore platform</a>
            <Link to="/about">About</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/teacher/auth">Counsellor workspace</Link>
            <Link
              className="atlas-signin"
              to={workspaceHref}
              aria-label={isReturning ? "Open your Pathforge workspace" : "Create your Pathforge student workspace"}
            >
              {isReturning ? "Open workspace" : "Student workspace"} <span aria-hidden="true">↗</span>
            </Link>

          </nav>
        </div>
      </header>

      <main id="atlas-main">
        <section className="atlas-hero" aria-labelledby="atlas-title" ref={heroRef}>
          <figure className="atlas-hero-photo" aria-hidden="true">
            <img src={heroCampus} alt="" width={1600} height={1100} decoding="async" {...({ fetchpriority: "high" } as Record<string, string>)} />
          </figure>

          <FallingLeaves />

          <motion.div className="atlas-wrap atlas-hero-inner" style={{ y: heroY, opacity: heroOpacity }}>
            <div className="atlas-hero-copy">
              <motion.h1 id="atlas-title" {...load(0.05)}>
                Build a <em><span className="standout">standout</span> college profile</em>
              </motion.h1>
              <motion.p {...load(0.15)}>
                A planning workspace for students applying to selective universities. Your grades, activities,
                essays and deadlines live in one file — and it tells you the one thing worth doing next.
              </motion.p>
              <motion.div className="atlas-hero-actions" {...load(0.25)}>
                {/*
                 * Both installers, always, side by side — not one button that
                 * guesses. A visitor on a Mac reading "Download on Windows"
                 * concludes there is no Mac build; showing both says the
                 * product runs on either, which is the fact worth conveying in
                 * a hero. Each carries its platform's own colour — Windows
                 * blue, Apple black — so the two read as two products to
                 * choose between rather than one button duplicated.
                 *
                 * Each points at a fixed filename under
                 * releases/latest/download, so the link never needs to know
                 * the current version. Both are the installer, and both
                 * auto-update themselves once installed.
                 */}
                <MotionSpecularAnchor
                  href={WINDOWS_DOWNLOAD_URL}
                  className="atlas-install"
                  size="lg"
                  radius={14}
                  tint="#0078d4"
                  tintOpacity={1}
                  textColor="#ffffff"
                  lineColor="#9ad4ff"
                  baseColor="#0a4f96"
                  {...cta}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
                    <path d="M3 5.1 10.4 4v7.3H3zm0 13.8V12h7.4v7.9zM11.3 4.1 21 3v8.3H11.3zm0 15.8v-7.9H21V21z" />
                  </svg>
                  Download on Windows
                </MotionSpecularAnchor>

                <MotionSpecularAnchor
                  href={MAC_DOWNLOAD_URL}
                  className="atlas-install"
                  size="lg"
                  radius={14}
                  tint="#2a2a30"
                  tintOpacity={1}
                  textColor="#ffffff"
                  lineColor="#ffffff"
                  baseColor="#3a3a42"
                  {...cta}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
                    <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.5zM14.2 5.4c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 0 2-.5 2.7-1.3z" />
                  </svg>
                  Download on Mac
                </MotionSpecularAnchor>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <section className="atlas-universities" aria-label="Top universities worldwide">
          <motion.p {...reveal}>Where students using Pathforge are aiming</motion.p>
          <div className="atlas-marquee" aria-live="off">
            <div className="atlas-track">
              {[...universities, ...universities].map((u, index) => (
                <span key={`${u.domain}-${index}`}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${u.domain}&sz=32`}
                    alt={`${u.name} logo`}
                    width={20}
                    height={20}
                    loading="lazy"
                    decoding="async"
                  />
                  {u.name}
                </span>
              ))}
            </div>
          </div>
          <motion.p className="atlas-universities-disclaimer" {...reveal}>
            Pathforge is an independent planning platform, not affiliated with or endorsed by these universities.
          </motion.p>
        </section>

        <section id="departments" className="atlas-departments atlas-wrap" aria-labelledby="departments-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>Inside this issue</p>
            <h2 id="departments-title">
              One workspace,
              <br />
              <em>one continuous file.</em>
            </h2>
            <p className="atlas-intro">
              One profile. Every important next move. Edit one part and the rest — your resume, LinkedIn, advisor
              context — stays in sync. Build depth, not a random list of certificates. Whether you're drafting a
              personal statement, tracking recommendation letters, or mapping out the next application deadline,
              it lives in the same file — read by the same advisor, in the same voice.
            </p>
          </motion.div>

          {/*
            * What replaced the five numbered department cards.
            *
            * The cards restated the same sentence five times in five boxes.
            * This says the same thing in one line that keeps moving, so the
            * eye reads the whole platform in the time it took to skim one
            * card — and the description underneath carries the detail the
            * cards used to hold.
            */}
          <motion.div
            className="atlas-rotator"
            {...reveal}
            style={{
              marginTop: "clamp(3.4rem, 7vw, 6rem)",
              padding: "clamp(2rem, 4vw, 3.25rem)",
              border: "1px solid var(--line)",
              borderRadius: "1rem",
              background: "var(--surface)",
            }}
          >
            <LayoutGroup>
              <motion.p
                layout
                transition={ROTATE_SPRING}
                className="flex flex-wrap items-center whitespace-pre"
                style={{
                  margin: 0,
                  color: "var(--ink)",
                  fontFamily: "var(--display)",
                  fontSize: "clamp(2rem, 4.2vw, 3.5rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.022em",
                  lineHeight: 1.12,
                }}
              >
                <motion.span layout transition={ROTATE_SPRING}>
                  {"Built for your "}
                </motion.span>
                {prefersReduced ? (
                  <span className={ROTATE_PILL}>{rotatingFeatures[0].word}</span>
                ) : (
                  <TextRotate
                    texts={rotatingFeatures.map((f) => f.word)}
                    onNext={setFeatureIndex}
                    mainClassName={`justify-center ${ROTATE_PILL}`}
                    splitLevelClassName="overflow-hidden pb-[0.06em]"
                    staggerFrom="last"
                    staggerDuration={0.022}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    transition={ROTATE_SPRING}
                    rotationInterval={2600}
                  />
                )}
              </motion.p>
            </LayoutGroup>

            <div style={{ marginTop: "1.4rem", minHeight: "calc(2 * var(--text-lg) * var(--lh-body))" }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={activeFeature.word}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, y: -8, transition: transition.fast }}
                  style={{
                    margin: 0,
                    maxWidth: "46rem",
                    color: "var(--ink-soft)",
                    fontSize: "var(--text-lg)",
                    lineHeight: "var(--lh-body)",
                  }}
                >
                  {activeFeature.line}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </section>

        <section className="atlas-editorial" aria-label="Pathforge editorial">
          <motion.div className="atlas-wrap atlas-editorial-grid" {...reveal}>
            <p>Editorial</p>
            <blockquote>
              “The students who get in aren't the loudest. They are the ones whose <em>file tells a coherent story</em>{" "}
              — chosen carefully, edited honestly, defended with evidence.”
            </blockquote>
            <p className="atlas-editorial-note">
              That is the standard every activity, essay, and recommendation on Pathforge is held to before it
              enters your file.
            </p>
          </motion.div>
        </section>

        {/*
          * What replaced "six rules we never break".
          *
          * The rules were true and were stated plainly, but they were six
          * paragraphs of the product describing its own integrity — the one
          * claim a landing page cannot make on its own behalf. What a student
          * actually wants to know at this point on the page is whether their
          * file will talk to the things they already use. That is checkable,
          * so it is shown instead.
          */}
        <section className="atlas-house atlas-wrap" aria-labelledby="house-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>{"\n"}</p>
            <h2 id="house-title">
              Your file talks to <em>everything</em> else.
            </h2>
          </motion.div>

          <motion.div className="atlas-integrations" {...reveal}>
            <IntegrationsDirectory />
          </motion.div>
        </section>

        <section className="atlas-sister atlas-wrap" aria-labelledby="sister-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>{"\n"}</p>
            <h2 id="sister-title">
              Also in the <em>house.</em>
            </h2>
          </motion.div>
          <motion.a
            href="https://talkforge.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="atlas-talkforge"
            {...item(0)}
            whileHover={prefersReduced ? undefined : { y: -3 }}
          >
            <img src={talkforgeLogo} width={128} height={128} loading="lazy" decoding="async" alt="TalkForge logo" />
            <span>
              <strong>TalkForge</strong>
              <span>AI-powered communication and public speaking training. The spoken half of your application.</span>
            </span>
            <span>
              Visit publication <b aria-hidden="true">↗</b>
            </span>
          </motion.a>
        </section>

        <section className="atlas-brief" aria-labelledby="brief-title">
          <motion.div className="atlas-wrap atlas-brief-grid" {...reveal}>
            <div className="atlas-section-heading">
              <p>Subscribe</p>
              <h2 id="brief-title">
                Get the Sunday <em>brief.</em>
              </h2>
              <p>
                One short email each week. Deadlines, opportunities, and the single thing worth doing this week — for
                your major, your grade, your country.
              </p>
            </div>
            <div className="atlas-form-shell">
              <NewsletterSignup />
            </div>
          </motion.div>
        </section>

        <section className="atlas-colophon atlas-wrap" aria-labelledby="colophon-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>{"\n"}</p>
            <h2 id="colophon-title">
              Your file is already <span>being written.</span> <em>Start editing.</em>
            </h2>
          </motion.div>
          <motion.div className="atlas-colophon-actions" {...item(1)}>
            <MotionSpecularLink
              to={workspaceHref}
              size="lg"
              radius={12}
              tint="#4465d8"
              tintOpacity={1}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#29439c"
              {...cta}
            >
              Build your application plan <span aria-hidden="true">↗</span>
            </MotionSpecularLink>
            <MotionLink className="atlas-secondary" to="/activities" {...cta}>
              Browse the activities desk
            </MotionLink>
          </motion.div>
        </section>
      </main>

      <footer className="atlas-footer">
        <div className="atlas-wrap">
          <p>
            Founder — Govind Mulchandani <i>·</i> Co-founder — Avyaay Rathi <i>·</i> Co-founder — Zachary Samuel
          </p>
          <a href="mailto:pathforge.co@gmail.com">pathforge.co@gmail.com</a>
          <nav aria-label="Footer navigation">
            {/* About is hidden from the header below 640px to keep the glass bar
                from wrapping, so the footer is the only route to it on a phone.
                It leads here for that reason. */}
            <Link to="/about">About</Link>
            <i>·</i>
            <Link to="/pricing">Pricing</Link>
            <i>·</i>
            <Link to="/faq">FAQ</Link>
            <i>·</i>
            <Link to="/terms">Terms</Link>
            <i>·</i>
            <Link to="/privacy">Privacy</Link>
            <i>·</i>
            <Link to="/refund-policy">Refunds</Link>
            <i>·</i>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
