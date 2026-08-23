import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function RefundPolicy() {
  return (
    <div className="min-h-[100svh] bg-background">
      <Seo title='Refund Policy — Pathforge' description="Pathforge's refund policy for credits, subscriptions, and one-time purchases." path='/refund-policy' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: August 6, 2026</p>
        </ScrollReveal>

        <p>
          This policy explains when you can get your money back, how to ask, and how long it takes.
          It applies to all Pathforge paid plans and forms part of our{" "}
          <Link to="/terms" className="text-accent underline">Terms of Service</Link>.
        </p>

        <h2>14-Day Money-Back Guarantee</h2>
        <p>
          Pathforge offers a <strong>14-day money-back guarantee</strong> on your first paid
          subscription. If the platform is not right for you, request a full refund within 14 days
          of your order date and we will approve it — no explanation required.
        </p>
        <p>
          The guarantee applies to the initial purchase of a plan. Renewals are covered by the{" "}
          <a href="#renewals" className="text-accent underline">Renewals</a> section below.
        </p>

        <h2>Try Before You Pay</h2>
        <p>
          Every core part of Pathforge is available on the <strong>Free plan</strong> — 3 AI credits
          a day, forever, with no card required. We would rather you tested the product properly
          than paid and asked for it back, so please use the free tier first.
        </p>

        <h2>How to Request a Refund</h2>
        <p>
          Refunds are processed by our payment provider, <strong>Paddle.com</strong>, who is the
          Merchant of Record for all Pathforge orders. To request one:
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
            and look up your order using the email address you used at checkout, or
          </li>
          <li>
            Email us at{" "}
            <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
              pathforge.co@gmail.com
            </a>{" "}
            from your account email and we will start the process for you.
          </li>
        </ul>
        <p>
          We acknowledge refund emails within 2 business days. Once approved, Paddle issues the
          refund to your original payment method, typically within 5–10 business days depending on
          your bank or card issuer. Refunds are made in the currency of the original charge; we do
          not compensate for exchange-rate movement or bank fees.
        </p>

        <h2>Credits Already Used</h2>
        <p>
          You do not need to have left your credits unused to qualify for the 14-day guarantee —
          use the product properly and decide honestly. However, credits have no cash value and
          cannot be refunded, transferred, or converted separately from a subscription refund. On a
          refund, any remaining credits from that billing period are removed and the account
          returns to the Free plan.
        </p>
        <p>
          If a request failed because of a fault on our side and a credit was consumed, contact us
          and we will restore the credit. That is a credit correction, not a refund, and does not
          use up the guarantee.
        </p>

        <h2>Cancellations</h2>
        <p>
          You may cancel at any time from your account settings or through the Paddle customer
          portal. Cancellation takes effect at the end of the current billing period — you keep
          full access until then, and you are not charged again. Cancelling does not by itself
          trigger a refund of the current period outside the 14-day window.
        </p>

        <h2 id="renewals">Renewals</h2>
        <p>
          Subscriptions renew automatically at the then-current price until cancelled. To avoid
          the next charge, cancel before your renewal date. We do not routinely refund renewal
          periods after the 14-day window, and we do not pro-rate partial months.
        </p>
        <p>
          That said, if you were charged for a renewal you clearly did not intend and you have not
          meaningfully used the Service in that period, write to us within 14 days of the charge —
          we will look at it and usually refund it. We would rather do that than keep money you did
          not mean to spend.
        </p>

        <h2>Upgrades &amp; Downgrades</h2>
        <p>
          Upgrading takes effect immediately, with the remaining value of your current period
          credited against the new plan by Paddle. Downgrading takes effect at your next renewal;
          you keep the higher tier and its credit allowance until then. Neither an upgrade nor a
          downgrade restarts the 14-day guarantee.
        </p>

        <h2>Discontinued Features</h2>
        <p>
          If we discontinue a paid feature in a way that materially reduces the value of your plan
          mid-period, you may cancel and request a pro-rata refund of the unused portion.
        </p>

        <h2>Enterprise &amp; School Plans</h2>
        <p>
          Enterprise, school, and counsellor-organisation plans are governed by the refund and
          cancellation terms in their own written agreement, which takes precedence over this page.
        </p>

        <h2>Exceptions</h2>
        <p>Refunds may be declined where:</p>
        <ul>
          <li>The request falls outside the 14-day window and none of the cases above apply;</li>
          <li>There are reasonable indications of fraud, chargeback abuse, or payment-method misuse;</li>
          <li>
            The account has repeatedly purchased and refunded, or created multiple accounts to
            reuse the guarantee;
          </li>
          <li>
            The account was suspended or terminated for breach of our{" "}
            <Link to="/terms" className="text-accent underline">Terms of Service</Link>.
          </li>
        </ul>

        <h2>Chargebacks</h2>
        <p>
          Please contact us before disputing a charge with your bank. A chargeback typically
          suspends the account while the dispute is open and costs both sides more than simply
          asking us for a refund, which we will usually just give you.
        </p>

        <h2>Your Statutory Rights</h2>
        <p>
          Nothing in this policy limits consumer rights you have under the law of your country,
          including any statutory right of withdrawal or cancellation for digital services. Where
          local law gives you a stronger right than this policy, that right applies.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about billing or refunds? Email{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>{" "}
          or use our{" "}
          <Link to="/contact" className="text-accent underline">contact page</Link>.
        </p>

        <p className="mt-8">
          <Link to="/" className="text-accent underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
