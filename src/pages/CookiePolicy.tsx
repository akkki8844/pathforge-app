import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

/**
 * Cookie & Local Storage Policy.
 *
 * WHY THIS LISTS REAL KEYS RATHER THAN CATEGORIES
 *
 * Every entry below was taken from the code, not from a template: the cookie
 * names are the two the app actually writes (`sidebar:state` in
 * `src/components/ui/sidebar.tsx`, `googtrans` in `src/hooks/useLanguage.ts`),
 * and the storage keys are the ones grepped out of the source. A cookie notice
 * that describes storage the site does not use, or omits storage it does, is
 * worse than none — it is a written statement that a regulator can hold you to.
 *
 * WHY THERE IS NO COOKIE BANNER
 *
 * Because after removing Google AdSense there is nothing here that needs one.
 * Consent under ePrivacy Article 5(3) is required for storage that is not
 * strictly necessary for a service the user asked for. What is left is session
 * management, security, and preferences the user set themselves — plus two
 * third parties that only ever load when the user actively invokes the feature
 * (Google Translate on choosing a language, Paddle on opening checkout).
 *
 * This stops being true the moment anyone adds an analytics, advertising, A/B
 * testing, heatmap or session-replay tag. If that happens, a consent gate has
 * to be built BEFORE the tag ships, and this page has to be updated the same
 * day. See the note in `index.html` where the ad tag used to be.
 */
export default function CookiePolicy() {
  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Cookie Policy"
        description="Exactly which cookies and browser storage Pathforge uses, what each one does, and why we do not run advertising or analytics trackers."
        path="/cookies"
      />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Cookie &amp; Storage Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: September 16, 2026</p>
        </ScrollReveal>

        <p>
          This page lists every cookie and every piece of browser storage Pathforge uses, what each
          one is for, and how long it lasts. It forms part of our{" "}
          <Link to="/privacy" className="text-accent underline">Privacy Notice</Link>.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>
            <strong>We run no advertising cookies and no analytics trackers.</strong> There is no
            Google Analytics, no advertising pixel, no heatmap and no session recording on this
            site.
          </li>
          <li>
            We previously served Google AdSense. <strong>It has been removed.</strong> Our users are
            school students, and advertising directed at children is something we should not have
            been doing.
          </li>
          <li>
            Almost everything below is stored in <strong>local storage</strong>, not in cookies, and
            stays on your own device. We only use two actual cookies.
          </li>
          <li>
            Because none of it is used for advertising, tracking or measurement, there is no consent
            banner to click through. You can still clear all of it at any time — see{" "}
            <a href="#control" className="text-accent underline">how to clear it</a>.
          </li>
        </ul>

        <h2>1. Cookies we set</h2>
        <p>Two, and only when the relevant thing happens.</p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sidebar:state</code></td>
              <td>
                Remembers whether you left the app sidebar expanded or collapsed, so it looks the
                same on your next visit. Contains only <code>true</code> or <code>false</code>.
              </td>
              <td>7 days</td>
            </tr>
            <tr>
              <td><code>googtrans</code></td>
              <td>
                Records which language you asked the site to be translated into. Written{" "}
                <strong>only if you pick a language other than English</strong>; if you never touch
                the language picker, this cookie is never set.
              </td>
              <td>Up to 1 year, or until you switch back to English</td>
            </tr>
          </tbody>
        </table>

        <h2>2. Local storage we use</h2>
        <p>
          Local storage is held by your browser on your device. We cannot read it from our servers,
          and it is not transmitted with every request the way a cookie is.
        </p>

        <h3>Strictly necessary — the app does not work without these</h3>
        <ul>
          <li>
            <strong>Your sign-in session</strong> (a <code>sb-…-auth-token</code> entry written by
            Supabase, our authentication provider). This is what keeps you signed in. Deleting it
            signs you out.
          </li>
          <li>
            <strong><code>pathforge_stay_logged_in</code></strong> — whether you asked us to keep you
            signed in on this device, or only until you close the tab.
          </li>
          <li>
            <strong><code>pathforge_pending_oauth_redirect</code></strong> — holds where to send you
            back to after a Google sign-in, across the redirect. It is cleared as soon as sign-in
            finishes.
          </li>
        </ul>

        <h3>Your preferences — set by you, kept for you</h3>
        <ul>
          <li><code>theme</code> — light or dark mode.</li>
          <li><code>pf_language</code> — your chosen display language.</li>
          <li><code>pf_advisor_model</code> — which AI model you last chose in the advisor.</li>
          <li><code>pf.advisor.sidebar</code> — whether the advisor side panel is open.</li>
          <li><code>pf_focus_home_airport</code> — the home airport for the focus-timer visual.</li>
          <li>
            <code>pf_product_tour_seen</code>, <code>pf_product_tour_pending</code>,{" "}
            <code>pf_journey_tour_seen</code> — so we do not show you the same walkthrough twice.
          </li>
          <li>
            <code>pathforge_dismissed_announcements</code>,{" "}
            <code>linkedin-import-popup-dismissed</code> — so a notice you dismissed stays dismissed.
          </li>
          <li><code>pf_tz_synced</code> — stops us re-asking your timezone on every load.</li>
          <li><code>pf:lastCelebratedSub</code> — so an upgrade is celebrated once, not repeatedly.</li>
        </ul>

        <h3>Your work, cached so the app is usable offline and fast</h3>
        <ul>
          <li>
            <code>pathforge-rq-cache</code> and <code>pathforge-rq-owner</code> — a copy of data
            already loaded, so screens you have visited open instantly. The second key records which
            account the cache belongs to, so signing in as someone else discards it rather than
            showing you the previous person's data.
          </li>
          <li>
            <code>pathforge_profile</code>, <code>pathforge_weekly_planner</code>,{" "}
            <code>pathforge_bookmarks</code>, <code>pathforge_completed_activities</code>,{" "}
            <code>pf-scholarship-bookmarks</code>, <code>pf-scholarship-checklist</code>,{" "}
            <code>pathforge_monthly_focus_v1</code>, <code>pf_testprep_sat_v1</code>,{" "}
            <code>pathforge_newsletter_signed</code> — your own saved work and choices.
          </li>
        </ul>

        <h2>3. Third parties, and when they load</h2>
        <p>
          None of these run in the background. Each one loads only at the moment you use the feature
          it belongs to.
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentication, database and file storage. Active whenever
            you are signed in, because it <em>is</em> the app's backend.
          </li>
          <li>
            <strong>Paddle</strong> — our payment provider, and the merchant of record for your
            purchase. Loads when you open checkout, and sets its own cookies at that point under{" "}
            <a
              href="https://www.paddle.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Paddle's privacy policy
            </a>
            . Your card details go to Paddle directly and never reach us.
          </li>
          <li>
            <strong>Google Translate</strong> — loads only if you select a language other than
            English, and is not fetched at all otherwise. Google sets the <code>googtrans</code>{" "}
            cookie described above and may set its own cookies under{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Google's privacy policy
            </a>
            .
          </li>
          <li>
            <strong>Google Sign-In</strong> — only if you choose to sign in with Google.
          </li>
        </ul>

        <h2 id="control">4. How to clear or block it</h2>
        <ul>
          <li>
            <strong>Clear everything for this site:</strong> in your browser settings, clear site
            data for <code>pathforge.co.in</code>. This signs you out and resets your preferences;
            nothing you have saved to your account is lost, because that lives on our servers, not
            in your browser.
          </li>
          <li>
            <strong>Block storage entirely:</strong> your browser can block cookies and site data
            per-site. Doing so means we cannot keep you signed in, so most of Pathforge will not
            work — that is a consequence of blocking, not a penalty we apply.
          </li>
          <li>
            <strong>Delete your account data:</strong> that is separate and covered by your rights
            in the <Link to="/privacy" className="text-accent underline">Privacy Notice</Link>.
          </li>
        </ul>

        <h2>5. Changes</h2>
        <p>
          If we ever add storage that is not strictly necessary — analytics, advertising, or
          testing tools — we will ask for your consent before it loads, and update this page at the
          same time. Until then, this page describes everything.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about anything on this page:{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>
          , or our <Link to="/contact" className="text-accent underline">contact page</Link>. See
          also our <Link to="/privacy" className="text-accent underline">Privacy Notice</Link>,{" "}
          <Link to="/terms" className="text-accent underline">Terms of Service</Link> and{" "}
          <Link to="/refund-policy" className="text-accent underline">Refund Policy</Link>.
        </p>

        <p className="mt-8">
          <Link to="/" className="text-accent underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
