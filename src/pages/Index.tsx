import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CheckCircle2,
  Compass,
  FileSignature,
  Map as MapIcon,
  PenLine,
  Search,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { useAuth } from "@/contexts/AuthContext";
import { MAC_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL, canInstallDesktopApp } from "@/lib/desktopDownload";
import { WorldMap } from "@/components/ui/map";
import { STUDENT_MAP_DOTS, STUDENT_COUNTRY_COUNT } from "@/lib/studentCountries";
import { Footer } from "@/components/layout/Footer";
import { ModelLogo } from "@/components/advisor/ModelBadge";
import { CredlyMark } from "@/components/icons/CredlyMark";
import pathforgeMark from "@/assets/pathforge-logo.webp";
import "./landing.css";

/**
 * The public landing page.
 *
 * Layout follows the college-planning sites students already use: say what
 * the product is for in one plain sentence, put a college search first, show
 * real students, then one card per tool. Every claim on the page is about
 * what the product does; there are no invented student counts, testimonials
 * or outcomes. The one number shown (countries) is read from the database, see
 * src/lib/studentCountries.ts.
 *
 * Photos: the graduates are Korea University Business School's own CC0
 * release; the library is credited under its CC BY-SA licence where it is
 * shown. Both are served from /public so the hero can be preloaded.
 */

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

/** Suggestions for the hero search; any name can be typed. */
const COLLEGE_SUGGESTIONS = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "Princeton University",
  "Yale University",
  "Columbia University",
  "University of Pennsylvania",
  "Brown University",
  "Cornell University",
  "Dartmouth College",
  "Duke University",
  "Northwestern University",
  "University of Chicago",
  "Johns Hopkins University",
  "California Institute of Technology",
  "UC Berkeley",
  "UCLA",
  "Carnegie Mellon University",
  "Georgia Institute of Technology",
  "University of Michigan",
  "New York University",
  "University of Oxford",
  "University of Cambridge",
  "Imperial College London",
  "London School of Economics",
  "University of Toronto",
  "National University of Singapore",
  "ETH Zurich",
];

const TOOLS: {
  icon: LucideIcon;
  title: string;
  body: string;
  chips?: string[];
  to: string;
}[] = [
  {
    icon: Target,
    title: "College list and chances",
    body: "Add the colleges you want and see where your profile stands against each one, with what would move it.",
    chips: ["Reach", "Target", "Likely"],
    to: "/admissions-probability",
  },
  {
    icon: Award,
    title: "Olympiads and competitions",
    body: "Competitions matched to your major, with registration windows, deadlines and results verified through Credly.",
    chips: ["USACO", "IOI", "ISEF", "Credly"],
    to: "/activities",
  },
  {
    icon: PenLine,
    title: "Essays",
    body: "Draft personal statements and supplements with line-by-line feedback, in your own voice. Nothing is written for you.",
    to: "/essays",
  },
  {
    icon: Compass,
    title: "Scholarships",
    body: "A checked list of awards for your country, grade and major, plus alerts the day a new one fits you.",
    chips: ["Live alerts"],
    to: "/scholarships",
  },
  {
    icon: FileSignature,
    title: "Recommendations",
    body: "Track who is writing your letters, brief them with a brag sheet and follow up without chasing.",
    to: "/professors",
  },
  {
    icon: MapIcon,
    title: "Your application plan",
    body: "A month-by-month plan built for your grade, curriculum and colleges, so you always know the next step.",
    to: "/journey",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isReturning = !authLoading && !!user;
  const signupHref = "/auth?role=student&view=signup";
  const workspaceHref = isReturning ? "/dashboard" : signupHref;

  // Installers on Windows and macOS; the web workspace everywhere else. Starts
  // true so the prerendered HTML and its hydration match, then corrects.
  const [desktopCapable, setDesktopCapable] = useState(true);
  useEffect(() => {
    setDesktopCapable(canInstallDesktopApp());
  }, []);

  const [college, setCollege] = useState("");
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const name = college.trim();
    const target = name ? `/requirements?college=${encodeURIComponent(name)}` : "/requirements";
    navigate(isReturning ? target : `${signupHref}&redirect=${encodeURIComponent(target)}`);
  };

  return (
    <div className="pfh">
      <Seo
        title="Pathforge - Build your college profile"
        description="Pathforge keeps your grades, activities, olympiads, essays and deadlines in one college profile, and shows you the next step for the colleges on your list."
        path="/"
      />

      <a className="pfh-skip" href="#pfh-main">
        Skip to content
      </a>

      <header className="pfh-header">
        <div className="pfh-wrap pfh-header-inner">
          <Link className="pfh-brand" to="/" aria-label="Pathforge home">
            <img src={pathforgeMark} width={30} height={30} alt="" />
            Pathforge
          </Link>
          <nav className="pfh-nav" aria-label="Primary">
            <a href="#tools">Tools</a>
            <a href="#verified">Verified profile</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/about">About</Link>
            <Link to="/teacher/auth">For counsellors</Link>
          </nav>
          <div className="pfh-header-actions">
            {isReturning ? (
              <Link className="pfh-btn pfh-btn-primary pfh-btn-sm" to="/dashboard">
                Open workspace
              </Link>
            ) : (
              <>
                <Link className="pfh-link" to="/auth">
                  Sign in
                </Link>
                <Link className="pfh-btn pfh-btn-primary pfh-btn-sm" to={signupHref}>
                  Create free profile
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="pfh-main">
        {/* Hero */}
        <section className="pfh-hero" aria-labelledby="pfh-title">
          <div className="pfh-wrap pfh-hero-grid">
            <div>
              <span className="pfh-eyebrow">
                <CheckCircle2 size={15} aria-hidden="true" /> College planning for high school students
              </span>
              <h1 id="pfh-title">
                Build the college profile that <span>gets you in.</span>
              </h1>
              <p className="pfh-hero-lede">
                Your grades, activities, olympiads, test scores, essays and deadlines in one profile, with the next
                step for every college on your list.
              </p>

              <form className="pfh-search" onSubmit={onSearch} role="search">
                <label htmlFor="pfh-college">Where do you want to go?</label>
                <div className="pfh-search-row">
                  <div className="pfh-search-field">
                    <Search size={18} aria-hidden="true" />
                    <input
                      id="pfh-college"
                      list="pfh-college-list"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="Search a college, e.g. Stanford University"
                      autoComplete="off"
                    />
                    <datalist id="pfh-college-list">
                      {COLLEGE_SUGGESTIONS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                  <button type="submit" className="pfh-btn pfh-btn-primary">
                    See what it takes
                  </button>
                </div>
                <p className="pfh-search-hint">
                  Requirements, deadlines and how your profile compares. Free to start.{" "}
                  {!isReturning && <Link to={signupHref}>Create your profile</Link>}
                </p>
              </form>

              <div className="pfh-hero-alt">
                {desktopCapable ? (
                  <>
                    <span>Also on desktop:</span>
                    <a href={WINDOWS_DOWNLOAD_URL}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                        <path d="M3 5.1 10.4 4v7.3H3zm0 13.8V12h7.4v7.9zM11.3 4.1 21 3v8.3H11.3zm0 15.8v-7.9H21V21z" />
                      </svg>
                      Windows
                    </a>
                    <a href={MAC_DOWNLOAD_URL}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
                        <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.6 2.3 2.8 2.2 1.1 0 1.6-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.9-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.5zM14.2 5.4c.6-.8 1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.9 1 0 2-.5 2.7-1.3z" />
                      </svg>
                      Mac
                    </a>
                  </>
                ) : (
                  <span>Works in any browser, on any device.</span>
                )}
              </div>
            </div>

            <div className="pfh-hero-media">
              <figure className="pfh-hero-photo">
                <img
                  src="/assets/home-graduates-1100.webp"
                  srcSet="/assets/home-graduates-640.webp 640w, /assets/home-graduates-1100.webp 1100w"
                  sizes="(max-width: 960px) 100vw, 520px"
                  width={1100}
                  height={1500}
                  alt="Graduates in gowns throwing their caps in the air on the steps of a university hall"
                  decoding="async"
                  {...({ fetchpriority: "high" } as Record<string, string>)}
                />
              </figure>

              {/* An example of the product, labelled as one. */}
              <div className="pfh-float pfh-float-profile" aria-hidden="true">
                <div className="pfh-float-label">Example profile</div>
                <div className="pfh-float-row">
                  <span>Academics</span>
                  <b>82</b>
                </div>
                <div className="pfh-meter">
                  <span style={{ width: "82%" }} />
                </div>
                <div className="pfh-float-row">
                  <span>Activities</span>
                  <b>74</b>
                </div>
                <div className="pfh-meter">
                  <span style={{ width: "74%" }} />
                </div>
                <div className="pfh-float-row">
                  <span>Essays</span>
                  <b>61</b>
                </div>
                <div className="pfh-meter">
                  <span style={{ width: "61%" }} />
                </div>
                <p className="pfh-float-note">Next: finish your Common App personal statement draft.</p>
              </div>
              <div className="pfh-float pfh-float-badge" aria-hidden="true">
                <BadgeCheck size={22} color="#15803d" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Olympiad result verified</div>
                  <div style={{ fontSize: 12, color: "#4a5468" }}>Checked with the issuer on Credly</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Where students are aiming */}
        <section className="pfh-colleges" aria-label="Universities students are aiming for">
          <div className="pfh-wrap">
            <p>Students on Pathforge are aiming for</p>
          </div>
          <div className="pfh-marquee" aria-hidden="true">
            <div className="pfh-track">
              {[...universities, ...universities].map((u, i) => (
                <span key={`${u.domain}-${i}`}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${u.domain}&sz=32`}
                    alt=""
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
          <div className="pfh-wrap">
            <p className="pfh-disclaimer">
              Pathforge is an independent planning platform, not affiliated with or endorsed by these universities.
            </p>
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="pfh-section" aria-labelledby="pfh-tools-title">
          <div className="pfh-wrap">
            <div className="pfh-head">
              <p className="pfh-kicker">Tools for every step</p>
              <h2 id="pfh-tools-title">Everything your application needs, in one profile</h2>
              <p>
                Each tool reads the same profile, so what you add once shows up everywhere: your college list, your
                resume, your essays and your advisor.
              </p>
            </div>
            <div className="pfh-tools">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.title} to={isReturning ? t.to : signupHref} className="pfh-card">
                    <span className="pfh-card-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3>{t.title}</h3>
                    <p>{t.body}</p>
                    {t.chips && (
                      <div className="pfh-chips">
                        {t.chips.map((c) => (
                          <span key={c}>{c}</span>
                        ))}
                      </div>
                    )}
                    <span className="pfh-card-more">
                      {isReturning ? "Open" : "Get started"} <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Verified + advisor */}
        <section id="verified" className="pfh-section pfh-section-tint" aria-labelledby="pfh-verified-title">
          <div className="pfh-wrap">
            <div className="pfh-split">
              <figure className="pfh-split-media">
                <img
                  src="/assets/home-library-1400.webp"
                  srcSet="/assets/home-library-720.webp 720w, /assets/home-library-1400.webp 1400w"
                  sizes="(max-width: 900px) 100vw, 560px"
                  width={1400}
                  height={1227}
                  alt="Students studying at long desks in a domed university reading room"
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>
                  Photo:{" "}
                  <a
                    href="https://commons.wikimedia.org/wiki/File:La_Trobe_Reading_Room_viewed_through_archway_State_Library_Victoria.jpg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Bhullargraphic, Wikimedia Commons
                  </a>
                  , CC BY-SA 4.0
                </figcaption>
              </figure>
              <div className="pfh-head">
                <p className="pfh-kicker">A profile you can prove</p>
                <h2 id="pfh-verified-title">Your achievements, verified at the source</h2>
                <ul className="pfh-points">
                  <li>
                    <CredlyMark className="h-6 w-12" />
                    <span>
                      <b>Credly badges, checked with the issuer.</b> Olympiad results, certificates and exam badges are
                      verified against Credly before they go on your profile.
                    </span>
                  </li>
                  <li>
                    <BadgeCheck size={20} aria-hidden="true" />
                    <span>
                      <b>Proof on every activity.</b> Links and documents sit next to each entry, so a counsellor can
                      check it in one click.
                    </span>
                  </li>
                  <li>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    <span>
                      <b>One file, many outputs.</b> Your resume, LinkedIn and application lists are built from the
                      same record and stay in step.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pfh-split pfh-split-reverse">
              <div className="pfh-head">
                <p className="pfh-kicker">Advisor</p>
                <h2>An advisor that has read your whole profile</h2>
                <p>
                  Ask what to do this week, which schools fit, or where your essay loses the reader. It answers from
                  your file, and it always tells you which AI model wrote the answer.
                </p>
                <div className="pfh-models" aria-label="AI models used by the advisor">
                  <span>
                    <ModelLogo vendor="google" /> Gemini 2.5 Flash
                  </span>
                  <span>
                    <ModelLogo vendor="openai" /> GPT-5 mini
                  </span>
                  <span>
                    <ModelLogo vendor="google" /> Gemini 2.5 Pro
                  </span>
                </div>
              </div>
              <div className="pfh-chat" aria-hidden="true">
                <div className="pfh-bubble pfh-bubble-me">
                  I have 6 weeks before Early Action. What should I focus on?
                </div>
                <div className="pfh-bubble pfh-bubble-ai">
                  Your list is set and your scores are in range, so the gap is the essay. Finish the personal statement
                  draft this week, then ask Ms. Rao for her letter by Friday so she has three weeks.
                </div>
                <div className="pfh-chat-foot">
                  Powered by <ModelLogo vendor="google" /> <b style={{ color: "#111a2e" }}>Gemini 2.5 Flash</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Where students are */}
        <section className="pfh-section" aria-labelledby="pfh-map-title">
          <div className="pfh-wrap">
            <div className="pfh-head pfh-head-center">
              <p className="pfh-kicker">Around the world</p>
              <h2 id="pfh-map-title">Students in {STUDENT_COUNTRY_COUNT} countries plan with Pathforge</h2>
            </div>
            <div className="pfh-map">
              <WorldMap dots={STUDENT_MAP_DOTS} lineColor="#4465d8" />
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="pfh-section pfh-section-tint" aria-labelledby="pfh-brief-title">
          <div className="pfh-wrap">
            <div className="pfh-brief">
              <div className="pfh-head">
                <p className="pfh-kicker">The Sunday brief</p>
                <h2 id="pfh-brief-title">One email a week, only what matters</h2>
                <p>Deadlines, new scholarships and competitions for your major, grade and country.</p>
              </div>
              <NewsletterSignup />
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="pfh-cta" aria-labelledby="pfh-cta-title">
          <div className="pfh-wrap pfh-cta-inner">
            <div>
              <h2 id="pfh-cta-title">Start your college profile today</h2>
              <p>Free to start. Upgrade only if you want more.</p>
            </div>
            <div className="pfh-cta-actions">
              <Link className="pfh-btn pfh-btn-primary" to={workspaceHref}>
                {isReturning ? "Open your workspace" : "Create free profile"}
              </Link>
              <Link className="pfh-btn pfh-btn-quiet" to="/pricing">
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
