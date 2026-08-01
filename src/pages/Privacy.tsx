import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title='Privacy policy | Pathforge' description='How Pathforge collects, uses, and protects student data across our college guidance platform.' path='/privacy' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Privacy Notice</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: April 17, 2026</p>
        </ScrollReveal>

        <h2>1. Who We Are</h2>
        <p>
          Pathforge ("Pathforge", "we", "us", or "our") operates the Pathforge platform. We act as
          the <strong>data controller</strong> for personal data collected through the Service. You
          can reach us at{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>.
        </p>

        <h2>2. Personal Data We Collect</h2>
        <ul>
          <li><strong>Account data:</strong> name, email, username, password (hashed).</li>
          <li>
            <strong>Profile & onboarding data:</strong> grade, curriculum, GPA range, country,
            intended major, target universities, interests, weekly hours.
          </li>
          <li>
            <strong>Application content:</strong> essays, activities, report cards, LinkedIn PDFs,
            and any text or documents you upload.
          </li>
          <li><strong>Support communications:</strong> messages you send via support, contact, or AI advisor.</li>
          <li>
            <strong>Usage & telemetry:</strong> pages visited, features used, AI credit
            consumption, device identifiers, IP address, browser/OS info.
          </li>
          <li><strong>Cookies & local storage:</strong> session tokens, preferences, theme.</li>
        </ul>

        <h2>3. How We Use Personal Data</h2>
        <ul>
          <li>To create and maintain your account (contract performance);</li>
          <li>To provide and personalize the Service (contract performance);</li>
          <li>To generate AI outputs based on your inputs (contract performance);</li>
          <li>To prevent fraud, abuse, and to secure the Service (legitimate interests);</li>
          <li>To improve the Service and develop new features (legitimate interests);</li>
          <li>To send service-related communications (contract performance);</li>
          <li>To send marketing communications where you have opted in (consent);</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>4. Legal Basis</h2>
        <p>
          We process personal data on the bases of (a) performance of our contract with you, (b)
          our legitimate interests in operating and improving the Service, (c) your consent (where
          required, e.g. marketing emails), and (d) compliance with legal obligations.
        </p>

        <h2>5. Sharing Personal Data</h2>
        <p>We share personal data only with:</p>
        <ul>
          <li>
            <strong>Service providers / subprocessors:</strong> cloud hosting, AI inference
            providers, email delivery, analytics, and support tooling.
          </li>
          <li>
            <strong>Merchant of Record — Paddle.com:</strong> for the sale of subscriptions,
            payment processing, billing, tax compliance, invoicing, and refund handling.
          </li>
          <li><strong>Professional advisers:</strong> legal, accounting, and compliance advisers.</li>
          <li><strong>Authorities:</strong> where required by law or to protect rights and safety.</li>
        </ul>

        <h2>6. International Transfers</h2>
        <p>
          Personal data may be processed in countries outside your country of residence, including
          the United States and the European Union. Where required, we use appropriate safeguards
          such as Standard Contractual Clauses or rely on adequacy decisions.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain personal data only as long as needed to provide the Service and comply with
          legal obligations. Account data is retained while your account is active. If you delete
          your account, we delete or anonymize your personal data within 30 days, except where
          retention is required by law (e.g. tax records held by Paddle).
        </p>

        <h2>8. Your Rights</h2>
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you;</li>
          <li>Request correction of inaccurate data;</li>
          <li>Request deletion of your data ("right to be forgotten");</li>
          <li>Restrict or object to certain processing;</li>
          <li>Request portability of data you provided;</li>
          <li>Withdraw consent at any time (without affecting prior processing);</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>. We respond within one month.
        </p>

        <h2>9. Security</h2>
        <p>
          We implement appropriate technical and organisational measures to protect personal data,
          including encryption in transit, access controls, Row-Level Security on our database,
          and least-privilege server-side credentials. No system is 100% secure, but we work to
          continually improve our protections.
        </p>

        <h2>10. Cookies</h2>
        <p>
          We use cookies and similar technologies for essential functionality (authentication,
          session management, preferences). We may use limited analytics cookies to understand
          aggregate usage. You can control cookies through your browser settings; disabling
          essential cookies may break parts of the Service.
        </p>

        <h2>11. Children</h2>
        <p>
          The Service is intended for high school students. Users under the age of majority should
          have parental or guardian permission to use the Service. We do not knowingly collect
          data from children under 13 without appropriate consent.
        </p>

        <h2>12. Changes to This Notice</h2>
        <p>
          We may update this Privacy Notice from time to time. We will post the updated version
          here with a new "Last updated" date.
        </p>

        <h2>13. Contact</h2>
        <p>
          For privacy questions or to exercise your rights, contact{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>.
        </p>

        <p className="mt-8">
          <Link to="/" className="text-accent underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
