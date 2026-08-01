import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <Seo title='Refund policy | Pathforge' description="Pathforge's refund policy for credits, subscriptions, and one-time purchases." path='/refund-policy' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: April 17, 2026</p>
        </ScrollReveal>

        <h2>14-Day Money-Back Guarantee</h2>
        <p>
          Pathforge offers a <strong>14-day money-back guarantee</strong> on all paid subscription
          plans. If you are not satisfied with your purchase, you may request a full refund within
          14 days of your order date.
        </p>

        <h2>How to Request a Refund</h2>
        <p>
          Refunds are processed by our payment provider, <strong>Paddle.com</strong>, who is the
          Merchant of Record for all Pathforge orders. To request a refund:
        </p>
        <ul>
          <li>
            Visit{" "}
            <a
              href="https://paddle.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              paddle.net
            </a>{" "}
            and look up your order using the email address used at checkout, or
          </li>
          <li>
            Email us at{" "}
            <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
              pathforge.co@gmail.com
            </a>{" "}
            and we will help you start the refund process.
          </li>
        </ul>

        <h2>Cancellations</h2>
        <p>
          You may cancel your subscription at any time from your account or via the Paddle
          customer portal. Cancellation takes effect at the end of your current billing period;
          you continue to have access until then. Cancellations after the 14-day refund window do
          not entitle you to a refund of the current billing period.
        </p>

        <h2>Renewals</h2>
        <p>
          Subscriptions renew automatically. To avoid being charged for the next period, cancel
          before the renewal date. We do not refund partial months for renewals after the 14-day
          window.
        </p>

        <h2>Exceptions</h2>
        <p>
          Refunds may be declined in cases of suspected fraud, abuse of the refund policy, or
          violation of our{" "}
          <Link to="/terms" className="text-accent underline">Terms of Service</Link>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about refunds? Email{" "}
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
