import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title='Terms of service | Pathforge' description="The terms governing your use of Pathforge's college application guidance platform." path='/terms' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: April 17, 2026</p>
        </ScrollReveal>

        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service ("Terms") govern your access to and use of the Pathforge platform,
          websites, and services (collectively, the "Service") operated by Pathforge ("Pathforge",
          "we", "us", or "our"). By accessing or continuing to use the Service, you agree to be
          bound by these Terms. If you do not agree, do not use the Service.
        </p>

        <h2>2. The Service</h2>
        <p>
          Pathforge provides a comprehensive college readiness platform for students in
          grades 9–12, including AI-powered tools for admissions analysis, profile building,
          activities, scholarships, and weekly planning. Pathforge does not guarantee
          admission to any college or program.
        </p>

        <h2>3. Account & Authority</h2>
        <p>
          You must provide accurate information and keep your credentials confidential. You are
          responsible for all activity under your account. If you are under the age of majority,
          you confirm that a parent or guardian has authorized your use of the Service.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to misuse the Service. You will not:</p>
        <ul>
          <li>Use the Service for any unlawful, fraudulent, or abusive purpose;</li>
          <li>Send spam or infringe the intellectual property rights of others;</li>
          <li>Probe, scan, scrape, reverse engineer, or otherwise interfere with security;</li>
          <li>Upload malware or attempt to gain unauthorized access to any system;</li>
          <li>Resell, redistribute, or circumvent the technical limits of the Service.</li>
        </ul>

        <h2>5. Intellectual Property</h2>
        <p>
          The Service, including all software, content, branding, and documentation, is owned by
          Pathforge and protected by intellectual property laws. We grant you a limited,
          non-exclusive, non-transferable right to use the Service within your selected plan.
        </p>

        <h2>6. AI-Generated Content</h2>
        <p>
          Outputs from AI features may be inaccurate or incomplete. You are responsible for your
          prompts and how you use the outputs, including verifying accuracy. AI outputs are not a
          substitute for professional admissions, legal, financial, or medical advice. You must
          have rights to any content you input. We may filter, refuse, or remove outputs and
          suspend accounts for misuse.
        </p>

        <h2>7. Payments & Subscriptions</h2>
        <p>
          Our order process is conducted by our online reseller <strong>Paddle.com</strong>.
          Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer
          service inquiries and handles returns. Payment, billing, tax, cancellation, and refund
          mechanics are governed by{" "}
          <a
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Paddle's Buyer Terms
          </a>
          . Subscriptions renew automatically until canceled. See our{" "}
          <Link to="/refund-policy" className="text-accent underline">Refund Policy</Link> for refund details.
        </p>

        <h2>8. Service Level</h2>
        <p>
          The Service is provided "as is" and "as available". We do not guarantee that the Service
          will be uninterrupted, error-free, or meet your specific requirements. To the fullest
          extent permitted by law, we disclaim all implied warranties, including merchantability
          and fitness for a particular purpose.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Pathforge's aggregate liability for any claim
          arising out of these Terms or the Service is limited to the fees you paid in the 12
          months preceding the claim. We are not liable for indirect, consequential, special, or
          incidental damages, including loss of profits, data, or goodwill.
        </p>

        <h2>10. Suspension & Termination</h2>
        <p>
          We may suspend or terminate your access to the Service for material breach of these
          Terms, non-payment, security or fraud risk, or repeated/serious policy violations. On
          termination, your right to use the Service ends immediately; you may request export of
          your data within 30 days, after which it may be deleted.
        </p>

        <h2>11. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless Pathforge from claims arising out of your
          content, your unlawful use of the Service, or your violation of these Terms.
        </p>

        <h2>12. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service after changes
          take effect constitutes acceptance of the updated Terms.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws
          principles. Disputes will be resolved in the courts of competent jurisdiction in India.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
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
