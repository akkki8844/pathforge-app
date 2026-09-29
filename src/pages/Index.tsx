import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { FallingLeaves } from "@/components/animations/FallingLeaves";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { useAuth } from "@/contexts/AuthContext";
import SpecularAnchor from "@/components/ui/specular/SpecularAnchor";
import SpecularLink from "@/components/ui/specular/SpecularLink";
import { MAC_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL, canInstallDesktopApp } from "@/lib/desktopDownload";
import { Footer } from "@/components/layout/Footer";
import { FeatureSurfer } from "@/components/landing/FeatureSurfer";

const MotionLink = motion.create(Link);
const MotionSpecularLink = motion.create(SpecularLink);
const MotionSpecularAnchor = motion.create(SpecularAnchor);
const EASE = [0.16, 1, 0.3, 1] as const;
// Hero is served from /public so the browser can preload it before JS parses
// (see <link rel="preload"> in index.html). Keeps it out of the JS bundle.
const heroCampus = "/assets/hero-campus-cinematic-v1.webp";
import pathforgeMark from "@/assets/pathforge-logo.webp";
import { GlassFilter } from "@/components/GlassFilter";

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

  // A signed-out visitor is being invited in ("Student workspace"); a returning
  // one is being sent back to work ("Open workspace"). While auth is still
  // resolving we show the signed-out wording — it's the safe guess for a
  // landing page, and it stops the label flickering for first-time visitors.
  const { user, loading: authLoading } = useAuth();
  const isReturning = !authLoading && !!user;
  const workspaceHref = isReturning
    ? "/dashboard"
    : "/auth?role=student&view=signup";

  // Installers on Windows and macOS; the web workspace everywhere else. Starts
  // true so the prerendered HTML (and its hydration) match, then corrects on
  // the client.
  const [desktopCapable, setDesktopCapable] = useState(true);
  useEffect(() => {
    setDesktopCapable(canInstallDesktopApp());
  }, []);


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
        title="Pathforge — AI College Application Guide"
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
        <GlassFilter />
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
            <img src={heroCampus} alt="Sunlit university campus with historic academic buildings and a green quad" width={1600} height={1100} decoding="async" {...({ fetchpriority: "high" } as Record<string, string>)} />
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
                {!desktopCapable ? (
                  /*
                   * A phone, tablet, Chromebook or Linux machine cannot run
                   * either installer, so the hero offers what it can use: the
                   * same workspace, in the browser it is already in.
                   */
                  <>
                    <MotionSpecularLink
                      to={workspaceHref}
                      className="atlas-install"
                      size="lg"
                      radius={14}
                      tint="#4465d8"
                      tintOpacity={1}
                      textColor="#ffffff"
                      lineColor="#ffffff"
                      baseColor="#29439c"
                      {...cta}
                    >
                      {isReturning ? "Open your workspace" : "Start in your browser"} <span aria-hidden="true">↗</span>
                    </MotionSpecularLink>
                    <p className="atlas-hero-note">Works on any device. Desktop apps for Windows and Mac too.</p>
                  </>
                ) : (
                <>
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
                </>
                )}
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

        <section id="departments" className="atlas-departments atlas-departments--photo" aria-labelledby="departments-title">
          {/*
            * The same move as the hero: a photograph with the copy set on it.
            * The photo is Korea University Business School's own CC0 release
            * on Wikimedia Commons (036A0151), so it needs no credit line. The
            * graduates stand on the left; the copy sits over the dark doorway
            * on the right, where the gradient can carry it. It runs edge to
            * edge, like the hero, so it sits outside the atlas-wrap column.
            */}
          <motion.div className="atlas-grad" {...reveal}>
            <figure className="atlas-grad-photo">
              <img
                src="/assets/graduates-steps-2000.webp"
                srcSet="/assets/graduates-steps-1100.webp 1100w, /assets/graduates-steps-2000.webp 2000w"
                sizes="100vw"
                width={2000}
                height={1333}
                alt="Graduates in gowns throwing their caps in the air on the steps of a university hall"
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div className="atlas-section-heading atlas-grad-copy">
              <p>Graduation day</p>
              <h2 id="departments-title">
                The day the caps go up
                <br />
                <em>starts years before it.</em>
              </h2>
              <p className="atlas-intro">
                Every cap in the air stands for years of classes, activities, essays and deadlines. Pathforge
                keeps all of it in one profile, from your first activity to your last application, and points
                you at the next step, so the walk up these steps is the only thing left to plan.
              </p>
            </div>
          </motion.div>
        </section>

        <FeatureSurfer />

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

      {/* The shared black footer, not a second one written inline.

          This page used to carry its own `.atlas-footer` on a light
          `var(--surface)` plate, which is why the landing page ended in cream
          while every other page ended in black. It also meant the footer here
          silently missed anything added to the real one - the cookie policy
          link, the business identity and the Merchant of Record line were all
          absent from the single most visited page on the site.

          One footer, one place to change it. */}
      <Footer />
    </div>
  );
}
