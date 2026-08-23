import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { FallingLeaves } from "@/components/animations/FallingLeaves";
import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { useAuth } from "@/contexts/AuthContext";
import SpecularLink from "@/components/ui/specular/SpecularLink";
import { LayeredText } from "@/components/ui/layered-text";

const MotionLink = motion.create(Link);
const MotionSpecularLink = motion.create(SpecularLink);
const MotionA = motion.a;
const EASE = [0.16, 1, 0.3, 1] as const;
// Hero is served from /public so the browser can preload it before JS parses
// (see <link rel="preload"> in index.html). Keeps it out of the JS bundle.
const heroCampus = "/assets/hero-campus-cinematic-v1.webp";
import pathforgeMark from "@/assets/pathforge-logo.webp";
import talkforgeLogo from "@/assets/talkforge-logo.webp";

const features = [
  {
    n: "01",
    kicker: "Roadmap",
    title: "The Journey",
    description: "A personalized application plan built around where you are and where you want to go.",
    href: "/journey",
  },
  {
    n: "02",
    kicker: "Counsel",
    title: "Voice Advisor",
    description: "Guidance that remembers your goals, context, and progress.",
    href: "/advisor",
  },
  {
    n: "03",
    kicker: "Discovery",
    title: "Activities",
    description: "Find opportunities that strengthen your actual story, not just your résumé.",
    href: "/activities",
  },
  {
    n: "04",
    kicker: "Document",
    title: "Resume",
    description: "Turn verified work into a clear, credible one-page student profile.",
    href: "/resume",
  },
  {
    n: "05",
    kicker: "Presence",
    title: "LinkedIn",
    description: "Build a professional presence that reflects what you have genuinely done.",
    href: "/profile-builder",
  },
];

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
        title="Pathforge — College Application Profile"
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
                One clear next step at a time.
              </motion.p>
              <motion.div className="atlas-hero-actions" {...load(0.25)}>
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
                <MotionA
                  className="atlas-download-win"
                  href="https://github.com/akkki8844/pathforge-app/releases/latest/download/PathForge-Setup.exe"
                  {...cta}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                    <path d="M3 5.1 10.4 4v7.3H3zm0 13.8V12h7.4v7.9zM11.3 4.1 21 3v8.3H11.3zm0 15.8v-7.9H21V21z" />
                  </svg>
                  Download on Windows
                </MotionA>
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
              Five departments,
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
          <div className="atlas-department-list">
            {features.map((feature, index) => (
              <MotionLink
                className="atlas-department"
                to={feature.href}
                key={feature.title}
                {...item(index)}
                whileHover={prefersReduced ? undefined : { y: -3 }}
              >
                <span className="atlas-index">{feature.n}</span>
                <span className="atlas-kicker">{feature.kicker}</span>
                <span className="atlas-department-copy">
                  <strong>{feature.title}</strong>
                  <span>{feature.description}</span>
                </span>
                <span className="atlas-link-label">
                  {index === 0 ? "Open department" : "Read"} <b aria-hidden="true">↗</b>
                </span>
              </MotionLink>
            ))}
          </div>
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

        <section className="atlas-house atlas-wrap" aria-labelledby="house-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>The House Style</p>
            <h2 id="house-title">
              Six rules we <em>never</em> break.
            </h2>
          </motion.div>
          <LayeredText />
        </section>

        <section className="atlas-sister atlas-wrap" aria-labelledby="sister-title">
          <motion.div className="atlas-section-heading" {...reveal}>
            <p>Sister Publication</p>
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
            <p>Colophon</p>
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
