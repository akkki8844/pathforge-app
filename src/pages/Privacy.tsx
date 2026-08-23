import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Privacy() {
  return (
    <div className="min-h-[100svh] bg-background">
      <Seo title='Privacy Policy — Pathforge' description='How Pathforge collects, uses, and protects student data across our college guidance platform.' path='/privacy' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Privacy Notice</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: August 12, 2026</p>
        </ScrollReveal>

        <p>
          This notice explains what personal data Pathforge collects, why we collect it, who we
          share it with, and the rights you have over it. Our users are mostly teenagers, so we
          have tried to write this plainly. If anything is unclear, email us and we will explain
          it.
        </p>

        <h2>1. Who We Are</h2>
        <p>
          Pathforge ("Pathforge", "we", "us", or "our") operates the Pathforge platform at{" "}
          <a href="https://pathforge.co.in" className="text-accent underline">pathforge.co.in</a>.
          We act as the <strong>data controller</strong> for personal data collected through the
          Service. You can reach us at{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>{" "}
          for any privacy question or request.
        </p>

        <h2>2. The Short Version</h2>
        <ul>
          <li>We collect what we need to run your account and generate your guidance — no more.</li>
          <li>
            <strong>We do not sell your personal data, and we never have.</strong> We do not share
            it for cross-context behavioural advertising.
          </li>
          <li>
            <strong>Your content is not used to train third-party AI models.</strong> Our AI
            providers process your prompts to return a response and are contractually barred from
            training on them.
          </li>
          <li>You can export or delete your data at any time from your account settings.</li>
          <li>Payments are handled by Paddle — we never see or store your card number.</li>
        </ul>

        <h2>3. Personal Data We Collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> name, email address, username, avatar, password (stored
            only as a salted hash), and the identifier returned by Google or GitHub if you sign in
            that way.
          </li>
          <li>
            <strong>Profile &amp; onboarding data:</strong> grade, curriculum, GPA range, country,
            intended major, target universities, interests, and weekly study hours.
          </li>
          <li>
            <strong>Application content:</strong> essays, activity descriptions, resumes and
            LinkedIn exports, report cards and transcripts, and any other text or document you
            upload.
          </li>
          <li>
            <strong>AI interaction data:</strong> your chat and advisor prompts, the responses
            returned, and the credit consumed. Voice advisor sessions are transcribed to text so
            the model can respond; we retain the transcript with your conversation, not a
            recording of your voice.
          </li>
          <li>
            <strong>Progress data:</strong> Journey and quest progress, streaks, scores, planner
            entries, reflections, and evaluation history.
          </li>
          <li>
            <strong>Recommender &amp; counsellor data:</strong> the names and email addresses of
            teachers, professors, or counsellors you ask us to contact on your behalf, plus the
            content of what they submit through the recommender portal.
          </li>
          <li>
            <strong>Connected-account data:</strong> if you connect Google Calendar or GitHub, the
            access tokens and the specific data those integrations need (calendar events we create
            for you; public repository metadata you choose to import).
          </li>
          <li>
            <strong>Billing data:</strong> plan, subscription status, renewal date, transaction
            identifiers, and country for tax purposes. <strong>Card and bank details go directly
            to Paddle and are never stored by us.</strong>
          </li>
          <li>
            <strong>Support communications:</strong> messages you send through support, contact
            forms, or email.
          </li>
          <li>
            <strong>Usage &amp; technical data:</strong> pages visited, features used, credit
            consumption, approximate location derived from IP, IP address, device and browser
            information, and error logs.
          </li>
          <li>
            <strong>Local storage:</strong> session tokens, preferences, theme,
            language, and onboarding state.
          </li>
        </ul>
        <p>
          Please do not upload sensitive information you do not need us to have — for example
          medical records, government identity numbers, or financial statements. Our tools do not
          require them.
        </p>

        <h2>4. How We Use Personal Data, and Our Legal Basis</h2>
        <ul>
          <li>
            To create and maintain your account, and to authenticate you — <em>performance of our
            contract with you</em>.
          </li>
          <li>
            To provide, personalise, and save your work across the platform — <em>contract</em>.
          </li>
          <li>
            To generate AI outputs from your inputs and to meter credit usage — <em>contract</em>.
          </li>
          <li>
            To process payments, renewals, and refunds through Paddle — <em>contract</em> and{" "}
            <em>legal obligation</em>.
          </li>
          <li>
            To contact recommenders and counsellors you have asked us to contact —{" "}
            <em>contract</em> and <em>legitimate interests</em>.
          </li>
          <li>
            To moderate content, detect fraud and abuse, enforce credit limits, and keep the
            Service secure — <em>legitimate interests</em>.
          </li>
          <li>
            To debug, monitor reliability, and improve existing features and build new ones —{" "}
            <em>legitimate interests</em>.
          </li>
          <li>
            To send service, security, and billing emails — <em>contract</em>.
          </li>
          <li>
            To send newsletters and marketing where you have opted in — <em>consent</em>, which you
            can withdraw at any time.
          </li>
          <li>
            To comply with law and to establish, exercise, or defend legal claims —{" "}
            <em>legal obligation</em> and <em>legitimate interests</em>.
          </li>
        </ul>

        <h2>5. AI Processing</h2>
        <p>
          When you use an AI feature, the relevant parts of your prompt and profile are sent to a
          large language model provider through our AI gateway so a response can be generated.
          Currently this includes models from <strong>Google (Gemini)</strong> and{" "}
          <strong>OpenAI (GPT)</strong>, accessed via the <strong>Lovable AI Gateway</strong>.
        </p>
        <ul>
          <li>
            Your prompts and content are <strong>not used to train</strong> those providers' models.
          </li>
          <li>
            Providers may retain inputs briefly for abuse monitoring under their own enterprise
            terms, then delete them.
          </li>
          <li>
            We store your prompts and the outputs in your account so you can return to your work.
            You can delete individual items or your whole account.
          </li>
          <li>
            Prompts pass through an automated moderation step before processing, to block abusive
            or unsafe content.
          </li>
        </ul>

        <h2>6. Automated Scoring</h2>
        <p>
          Pathforge produces automated estimates — the College Readiness Score, Admissions
          Probability, Outcome Bands, and Journey Score — from the information you supply. These
          are informational and directional only. They do not determine access to any service, are
          not shared with universities or admissions bodies, and produce no legal or similarly
          significant effect on you. You can always see the inputs behind a score, change them, and
          re-run it, and you may contact us to ask how a result was produced.
        </p>

        <h2>7. Who We Share Personal Data With</h2>
        <p>
          We share personal data only with the categories below, and only as needed. We do not sell
          it.
        </p>
        <ul>
          <li>
            <strong>Lovable Cloud (Supabase)</strong> — application hosting, database,
            authentication, file storage, and serverless functions.
          </li>
          <li>
            <strong>Lovable AI Gateway</strong>, routing to <strong>Google</strong> and{" "}
            <strong>OpenAI</strong> — AI inference for advisor, essay, evaluation, and generation
            features.
          </li>
          <li>
            <strong>Paddle.com</strong> — Merchant of Record for all orders: payment processing,
            billing, invoicing, tax compliance, and refunds.
          </li>
          <li>
            <strong>Firecrawl</strong> — live web search and page retrieval for search-backed
            features. Your search query is sent; your profile is not.
          </li>
          <li>
            <strong>Google</strong> — sign-in, and Calendar access if you connect it.
          </li>
          <li>
            <strong>GitHub</strong> — sign-in, and repository metadata import if you connect it.
          </li>
          <li>
            <strong>Email delivery providers</strong> — transactional email such as verification,
            password reset, recommender requests, reminders, and newsletters.
          </li>
          <li>
            <strong>Your counsellor or teacher</strong> — if you connect to one, or join a class
            they administer, they can see your profile, progress, and submitted work. You can
            disconnect at any time.
          </li>
          <li>
            <strong>Recommenders you nominate</strong> — receive only the context needed to write
            and submit a letter for you.
          </li>
          <li>
            <strong>Professional advisers</strong> — legal, accounting, and compliance advisers,
            under confidentiality.
          </li>
          <li>
            <strong>Authorities</strong> — where required by valid legal process, or to protect
            rights, safety, or the integrity of the Service.
          </li>
          <li>
            <strong>A successor</strong> — in a merger, acquisition, or sale of assets, subject to
            this notice continuing to apply. We will notify you before your data becomes subject to
            a different policy.
          </li>
        </ul>

        <h2>8. Information About Other People</h2>
        <p>
          When you give us a teacher's, professor's, or counsellor's name and email so we can
          contact them for you, we use that information only for the request you initiated. We
          identify you as the requester, honour opt-outs and unsubscribes, and delete recommender
          contact details when the related request is withdrawn or your account is deleted. Please
          only nominate people you have a genuine reason to contact.
        </p>

        <h2>9. International Transfers</h2>
        <p>
          Personal data may be processed in countries other than your own, including the United
          States, the European Union, and India. Where personal data leaves a jurisdiction with
          transfer restrictions, we rely on appropriate safeguards — Standard Contractual Clauses,
          the UK Addendum, or an adequacy decision — and on our processors' own certified transfer
          mechanisms.
        </p>

        <h2>10. Retention</h2>
        <ul>
          <li>
            <strong>Account and profile data</strong> — kept while your account is active.
          </li>
          <li>
            <strong>Your content and AI history</strong> — kept until you delete it or delete your
            account.
          </li>
          <li>
            <strong>Deleted accounts</strong> — deleted or irreversibly anonymised within 30 days,
            except where law requires retention.
          </li>
          <li>
            <strong>Backups</strong> — purged on our normal backup rotation, within 90 days.
          </li>
          <li>
            <strong>Billing and tax records</strong> — retained by Paddle and by us for the period
            required by applicable tax law, typically up to 7 years.
          </li>
          <li>
            <strong>Security, abuse, and moderation logs</strong> — retained up to 12 months.
          </li>
          <li>
            <strong>Support emails</strong> — retained up to 24 months.
          </li>
        </ul>

        <h2>11. Security</h2>
        <p>
          We use technical and organisational measures appropriate to the risk, including
          encryption in transit, encryption at rest at our hosting provider, Row-Level Security on
          every database table so one user cannot read another's rows, least-privilege server-side
          credentials, secrets held outside the codebase, signed webhooks, and access logging. No
          system is perfectly secure. If a breach affects your personal data and poses a risk to
          you, we will notify you and the relevant supervisory authority without undue delay and
          within the timeframes the law requires.
        </p>

        <h2>12. Your Rights</h2>
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you and receive a copy;</li>
          <li>Correct data that is inaccurate or incomplete;</li>
          <li>Delete your data ("right to be forgotten");</li>
          <li>Restrict or object to certain processing, including processing based on our legitimate interests;</li>
          <li>Receive data you provided in a portable, machine-readable format;</li>
          <li>Withdraw consent at any time, without affecting processing already carried out;</li>
          <li>Opt out of marketing at any time;</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          Most of this is self-service: you can edit your profile, delete individual items, export
          your data, and delete your account from your settings. For anything else, email{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>
          . We respond within one month and will never charge you or treat you differently for
          exercising a right.
        </p>

        <h3>India (DPDP Act)</h3>
        <p>
          If you are in India, you have the rights to access, correction, erasure, grievance
          redressal, and to nominate another person to exercise your rights in the event of death
          or incapacity. Grievances go to the same address above and we will acknowledge them
          promptly. Where you are a child under 18, we rely on verifiable parental or guardian
          consent, and we do not undertake tracking or behavioural advertising directed at
          children.
        </p>

        <h3>United States (California and other states)</h3>
        <p>
          We do not sell personal information and do not share it for cross-context behavioural
          advertising, including for anyone under 16. Residents of California and other states with
          comparable laws have rights to know, access, delete, correct, and to non-discrimination
          for exercising them. Use the same contact address to make a request; we will verify your
          identity through your account email before acting.
        </p>

        <h2>13. Children, Schools &amp; Guardians</h2>
        <p>
          The Service is intended for high school students aged 13 and over. We do not knowingly
          collect personal data from children under 13; if we learn that we have, we delete it
          promptly. Users under the age of majority should have parental or guardian permission,
          and a parent or guardian may contact us to review, correct, or delete their child's data.
        </p>
        <p>
          Where a school or counsellor organisation administers accounts, that institution decides
          which students are enrolled and is responsible for any notices or consents its own rules
          and local student-privacy laws require. We process student data on the institution's
          instructions for the educational purpose it selected, do not use it for advertising, and
          will return or delete it on request.
        </p>

        <h2>14. Local Storage</h2>
        <p>
          We use local storage for essential functionality — keeping you signed in, maintaining
          your session, remembering theme, language, and onboarding state, and protecting against
          abuse. These are never optional, since the Service cannot function without them. We do
          not use analytics or marketing cookies.
        </p>

        <h2>15. Changes to This Notice</h2>
        <p>
          We may update this notice from time to time. We will post the updated version here with a
          new "Last updated" date, and for material changes we will give notice by email or in-app
          before they take effect.
        </p>

        <h2>16. Contact</h2>
        <p>
          For privacy questions, requests, or complaints, contact{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>{" "}
          or use our{" "}
          <Link to="/contact" className="text-accent underline">contact page</Link>. See also our{" "}
          <Link to="/terms" className="text-accent underline">Terms of Service</Link>,{" "}
          and{" "}
          <Link to="/refund-policy" className="text-accent underline">Refund Policy</Link>.
        </p>

        <p className="mt-8">
          <Link to="/" className="text-accent underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
