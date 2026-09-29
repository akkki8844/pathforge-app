import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import "./feature-surfer.css";

/**
 * "Built for your ___" as a scroll-driven stack of feature cards.
 *
 * Adapted from the Componentry collection surfer
 * (`src/components/ui/collection-surfer.tsx`). The original pins a fixed
 * viewport over a 50,000px spacer and loops forever, which would swallow the
 * rest of the landing page. Here the stage is `position: sticky` inside a
 * section whose height is one scroll step per card, so the stack plays once
 * and the page carries on. The card at the front of the stack is the one
 * named in the headline; cards already passed fade out instead of flying
 * through the camera.
 *
 * Each card is a small screen from the product written with example data:
 * a header naming the feature, one figure worth reading at a glance, and the
 * surface behind it.
 */

interface Feature {
  word: string;
  title: string;
  line: string;
  meta: string;
  /** Domain whose mark sits beside the meta line, for a named product. */
  brand?: string;
  preview: ReactNode;
}

// Custom properties passed through `style`.
const vars = (v: Record<string, string | number>) => v as CSSProperties;

// Same favicon source as the universities marquee on this page.
function Logo({ domain, small = false }: { domain: string; small?: boolean }) {
  return (
    <img
      className={small ? "fs-logo fs-logo--small" : "fs-logo"}
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
    />
  );
}

const WAVE = [30, 55, 80, 45, 95, 70, 40, 85, 60, 35, 75, 50, 90, 40, 65, 30, 55, 80, 45, 25];

const FEATURES: Feature[] = [
  {
    word: "journey",
    title: "Journey",
    meta: "Week 14",
    line: "A personal application plan that always shows the next step.",
    preview: (
      <div className="fs-body">
        <div className="fs-stat">
          <div>
            <p className="fs-figure">
              2<span> of 4</span>
            </p>
            <p className="fs-caption">steps done this week</p>
          </div>
          <span className="fs-ring" style={vars({ "--p": "50%" })} aria-hidden="true">
            50%
          </span>
        </div>
        <ul className="fs-steps">
          <li data-state="done">Finish the activities list</li>
          <li data-state="done">Draft the Common App essay</li>
          <li data-state="now">
            Ask two teachers for letters
            <small>Due Friday</small>
          </li>
          <li>Send test scores</li>
        </ul>
        <p className="fs-foot">Next deadline: Michigan early action, Nov 1</p>
      </div>
    ),
  },
  {
    word: "advisor",
    title: "Voice advisor",
    meta: "Live",
    line: "Guidance that remembers your goals, context and progress.",
    preview: (
      <div className="fs-body fs-chat">
        <p className="fs-chat-day">Today, 4:12 pm</p>
        <p className="fs-msg fs-msg--me">Is it too late to start research this summer?</p>
        <p className="fs-msg">
          No. Three programs near you still take applications. I added the earliest deadline to your plan.
        </p>
        <div className="fs-voice">
          <span className="fs-mic" aria-hidden="true" />
          <span className="fs-wave" aria-hidden="true">
            {WAVE.map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </span>
          <span className="fs-voice-time">0:14</span>
        </div>
      </div>
    ),
  },
  {
    word: "activities",
    title: "Activities",
    meta: "4 new matches",
    line: "Opportunities that strengthen your story, not just your resume.",
    preview: (
      <div className="fs-body">
        <ul className="fs-list">
          <li>
            <Logo domain="mit.edu" />
            <div>
              <strong>MIT THINK Scholars</strong>
              <small>Research, closes Jan 1</small>
            </div>
            <b>96%</b>
          </li>
          <li>
            <Logo domain="congressionalappchallenge.us" />
            <div>
              <strong>Congressional App Challenge</strong>
              <small>Coding, closes Oct 30</small>
            </div>
            <b>91%</b>
          </li>
          <li>
            <Logo domain="artandwriting.org" />
            <div>
              <strong>Scholastic Art and Writing</strong>
              <small>Writing, closes Dec 4</small>
            </div>
            <b>84%</b>
          </li>
          <li>
            <Logo domain="societyforscience.org" />
            <div>
              <strong>Regeneron Science Talent Search</strong>
              <small>Research, closes Nov 12</small>
            </div>
            <b>79%</b>
          </li>
        </ul>
        <p className="fs-foot">Match to your profile</p>
      </div>
    ),
  },
  {
    word: "essays",
    title: "Essays",
    meta: "Common App, draft 3",
    brand: "commonapp.org",
    line: "Feedback line by line, in your voice. Never written for you.",
    preview: (
      <div className="fs-body fs-essay">
        <p className="fs-essay-text">
          The first time I rebuilt the engine, I got it wrong. The timing was off by a single tooth and it would not
          start. <mark>I learned a lot from this experience.</mark>
        </p>
        <p className="fs-comment">Show it instead. What did you do differently the second time?</p>
        <p className="fs-essay-text fs-essay-text--next">
          So I took it apart again, slower this time, and labeled every part with masking tape.
        </p>
        <div className="fs-meter" style={vars({ "--p": "63%" })}>
          <span>412 of 650 words</span>
        </div>
      </div>
    ),
  },
  {
    word: "resume",
    title: "Resume",
    meta: "1 page, PDF",
    line: "Your verified work, turned into a credible one-page profile.",
    preview: (
      <div className="fs-body fs-paper">
        <p className="fs-paper-name">Maya Okafor</p>
        <p className="fs-paper-sub">Robotics captain, student researcher</p>
        <p className="fs-paper-label">Experience</p>
        <div className="fs-entry">
          <strong>Research intern, soil sensing lab</strong>
          <small>UC Davis, summer 2025</small>
        </div>
        <div className="fs-entry">
          <strong>Captain, FRC Team 5427</strong>
          <small>2023 to present</small>
        </div>
        <p className="fs-paper-label">Awards</p>
        <div className="fs-entry fs-entry--row">
          <strong>AP Scholar with Distinction</strong>
          <span className="fs-tag fs-tag--solid">Verified</span>
        </div>
        <div className="fs-entry fs-entry--row">
          <strong>USACO Silver division</strong>
          <span className="fs-tag fs-tag--solid">Verified</span>
        </div>
      </div>
    ),
  },
  {
    word: "LinkedIn",
    title: "LinkedIn",
    meta: "Profile preview",
    brand: "linkedin.com",
    line: "A professional profile that reflects what you have actually done.",
    preview: (
      <div className="fs-body fs-profile">
        <div className="fs-banner" aria-hidden="true" />
        <img className="fs-avatar" src="/avatars/maya-okafor.webp" alt="" width={64} height={64} decoding="async" />
        <p className="fs-paper-name">Maya Okafor</p>
        <p className="fs-paper-sub">Student researcher in environmental sensing. Captain, FRC Team 5427.</p>
        <span className="fs-tag">Open to research internships</span>
        <dl className="fs-kpis">
          <div>
            <dt>Profile views</dt>
            <dd>128</dd>
          </div>
          <div>
            <dt>Connections</dt>
            <dd>42</dd>
          </div>
        </dl>
      </div>
    ),
  },
  {
    word: "letters",
    title: "Recommendations",
    meta: "Due Nov 1",
    line: "Recommenders briefed and followed up, without the chasing.",
    preview: (
      <div className="fs-body">
        <div className="fs-stat">
          <div>
            <p className="fs-figure">
              1<span> of 3</span>
            </p>
            <p className="fs-caption">letters submitted</p>
          </div>
          <span className="fs-segs" aria-hidden="true">
            <i data-on="" />
            <i data-half="" />
            <i />
          </span>
        </div>
        <ul className="fs-list fs-list--people">
          <li>
            <img className="fs-initials" src="/avatars/ms-alvarez.webp" alt="" width={32} height={32} decoding="async" />
            <div>
              <strong>Ms. Alvarez</strong>
              <small>Physics</small>
            </div>
            <span className="fs-tag fs-tag--solid">Submitted</span>
          </li>
          <li>
            <img className="fs-initials" src="/avatars/mr-chen.webp" alt="" width={32} height={32} decoding="async" />
            <div>
              <strong>Mr. Chen</strong>
              <small>English</small>
            </div>
            <span className="fs-tag">Brief sent</span>
          </li>
          <li>
            <img className="fs-initials" src="/avatars/dr-patel.webp" alt="" width={32} height={32} decoding="async" />
            <div>
              <strong>Dr. Patel</strong>
              <small>Research mentor</small>
            </div>
            <span className="fs-tag fs-tag--quiet">Requested</span>
          </li>
        </ul>
        <p className="fs-foot">Follow-up to Mr. Chen goes out Tuesday</p>
      </div>
    ),
  },
  {
    word: "odds",
    title: "Admission odds",
    meta: "Updated today",
    line: "An honest read on where you stand at every school on your list.",
    preview: (
      <div className="fs-body">
        <ul className="fs-list fs-odds">
          <li style={vars({ "--p": "12%" })}>
            <Logo domain="stanford.edu" />
            <div>
              <strong>Stanford</strong>
              <small>Reach</small>
            </div>
            <b>12%</b>
          </li>
          <li style={vars({ "--p": "46%" })}>
            <Logo domain="umich.edu" />
            <div>
              <strong>University of Michigan</strong>
              <small>Target</small>
            </div>
            <b>46%</b>
          </li>
          <li style={vars({ "--p": "78%" })}>
            <Logo domain="ucdavis.edu" />
            <div>
              <strong>UC Davis</strong>
              <small>Likely</small>
            </div>
            <b>78%</b>
          </li>
          <li style={vars({ "--p": "88%" })}>
            <Logo domain="purdue.edu" />
            <div>
              <strong>Purdue University</strong>
              <small>Likely</small>
            </div>
            <b>88%</b>
          </li>
        </ul>
      </div>
    ),
  },
];

const N = FEATURES.length;

// One step of the track, in px. Each card sits one step up, right and deeper
// than the one before it; the track slides back one step per card scrolled.
const STEP_X = 240;
const STEP_Y = -64;
const STEP_Z = -340;
const TILT = 18;
const EXIT_X = 1400;

function Card({ f, withLine = false }: { f: Feature; withLine?: boolean }) {
  return (
    <article className="fs-card">
      <header className="fs-card-head">
        <h3>{f.title}</h3>
        <span data-live={f.meta === "Live" ? "" : undefined}>
          {f.brand && <Logo domain={f.brand} small />}
          {f.meta}
        </span>
      </header>
      {withLine && <p className="fs-card-line">{f.line}</p>}
      {f.preview}
    </article>
  );
}

function SurferCard({
  f,
  i,
  pos,
  front,
  onSelect,
}: {
  f: Feature;
  i: number;
  pos: MotionValue<number>;
  front: boolean;
  onSelect: (i: number) => void;
}) {
  // Distance from the front of the stack, in cards. Negative means the card
  // has been scrolled past.
  const opacity = useTransform(pos, (p) => {
    const d = i - p;
    if (d < -0.32) return 0;
    if (d < -0.1) return 1 - (-d - 0.1) / 0.22;
    if (d > 3.5) return Math.max(0, 1 - (d - 3.5) / 1.5);
    return 1;
  });
  // Cards further back sink into the stage colour, which reads as depth.
  const wash = useTransform(pos, (p) => Math.min(0.42, Math.max(0, (i - p) * 0.14)));

  // A card that has faded out must not catch clicks meant for the panel.
  const pointerEvents = useTransform(opacity, (o) => (o > 0.05 ? "auto" : "none"));
  // The front card faces the viewer so its text stays sharp; cards turn
  // away as they move back into the stack.
  const rotateY = useTransform(pos, (p) => -TILT * Math.min(1, Math.max(0, i - p)));
  // A card leaving the front slides out to the left so it never sits over
  // the card taking its place.
  const slotX = useTransform(pos, (p) => i * STEP_X + Math.min(0, i - p + 0.1) * EXIT_X);

  return (
    <motion.div
      className="fs-slot"
      data-front={front ? "" : undefined}
      style={{ opacity, pointerEvents, x: slotX, y: i * STEP_Y, z: i * STEP_Z, rotateY }}
      // Mouse shortcut only; the feature index is the keyboard path.
      onClick={() => onSelect(i)}
    >
      <Card f={f} />
      <motion.div className="fs-wash" style={{ opacity: wash }} />
    </motion.div>
  );
}

export function FeatureSurfer() {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.35 });
  // Track position in cards: 0 with the first card in front, N-1 with the last.
  const pos = useTransform(smooth, [0, 1], [0, N - 1]);
  const x = useTransform(pos, (p) => -p * STEP_X);
  const y = useTransform(pos, (p) => -p * STEP_Y);
  const z = useTransform(pos, (p) => -p * STEP_Z);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Hand over as soon as the outgoing card starts to leave (see SurferCard's
    // fade), so the headline never names a card that is no longer there.
    const next = Math.min(N - 1, Math.max(0, Math.floor(v * (N - 1) + 0.75)));
    setActive((prev) => (prev === next ? prev : next));
  });

  // Jump the page to the scroll position that brings card `i` to the front.
  const goTo = (i: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (travel * i) / (N - 1) + 1, behavior: "smooth" });
  };

  // The static branch still attaches `sectionRef`: useScroll throws on a
  // target ref that never mounts, which would take the whole page down.
  if (prefersReduced) {
    return (
      <section
        ref={sectionRef}
        className="fs-section fs-section--static"
        aria-labelledby="features-title"
      >
        <div className="atlas-wrap">
          <h2 id="features-title" className="fs-title">
            Built for your <em>whole application.</em>
          </h2>
          <div className="fs-grid">
            {FEATURES.map((f) => (
              <Card key={f.word} f={f} withLine />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const f = FEATURES[active];

  return (
    <section
      ref={sectionRef}
      className="fs-section"
      aria-labelledby="features-title"
      style={{ ["--fs-count" as string]: N }}
    >
      <div className="fs-stage">
        <div className="fs-copy">
          <h2 id="features-title" className="fs-title">
            Built for your{" "}
            <br />
            <span className="fs-word-slot">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.em
                  key={f.word}
                  initial={{ y: "80%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-80%", opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                >
                  {f.word}.
                </motion.em>
              </AnimatePresence>
            </span>
          </h2>
          <div className="fs-lead-slot" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={f.word}
                className="fs-lead"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {f.line}
              </motion.p>
            </AnimatePresence>
          </div>
          <nav className="fs-index" aria-label="Features">
            {FEATURES.map((item, i) => (
              <button
                key={item.word}
                type="button"
                aria-current={i === active ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                {item.title}
              </button>
            ))}
          </nav>
        </div>

        <div className="fs-panel" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.span
              key={f.word}
              className="fs-backword"
              style={{ ["--len" as string]: f.word.length + 1 }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {f.word}.
            </motion.span>
          </AnimatePresence>
          <div className="fs-scene">
            <div className="fs-scene-anchor">
              <motion.div className="fs-track" style={{ x, y, z }}>
                {FEATURES.map((item, i) => (
                  <SurferCard key={item.word} f={item} i={i} pos={pos} front={i === active} onSelect={goTo} />
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* The 3D stack is decorative motion; screen readers get the list. */}
        <ul className="sr-only">
          {FEATURES.map((item) => (
            <li key={item.word}>
              {item.title}: {item.line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
