import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

export default function Terms() {
  return (
    <div className="min-h-[100svh] bg-background">
      <Seo title='Terms of Service — Pathforge' description="The terms governing your use of Pathforge's college application guidance platform." path='/terms' />
      <div className="section-container max-w-3xl py-12 prose prose-sm dark:prose-invert">
        <ScrollReveal>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm mb-8">Last updated: August 12, 2026</p>
        </ScrollReveal>

        <p>
          These Terms of Service ("Terms") are a binding agreement between you and Pathforge
          ("Pathforge", "we", "us", or "our") governing your access to and use of the Pathforge
          platform, websites, applications, APIs, and related services (collectively, the
          "Service"). By creating an account, accessing, or continuing to use the Service, you
          agree to these Terms and to our{" "}
          <Link to="/privacy" className="text-accent underline">Privacy Notice</Link>. If you do
          not agree, do not use the Service.
        </p>

        <h2>1. Eligibility &amp; Parental Consent</h2>
        <p>
          The Service is designed for high school students in grades 9–12, their parents or
          guardians, and school or independent counsellors. You must be at least 13 years old to
          create an account. If you are under the age of majority in your place of residence, you
          confirm that a parent or legal guardian has reviewed and agreed to these Terms on your
          behalf and consents to your use of the Service. We may suspend any account we reasonably
          believe was created in breach of this section.
        </p>

        <h2>2. What the Service Is — and Is Not</h2>
        <p>
          Pathforge provides AI-assisted college readiness tools, including profile building,
          activity and Olympiad discovery, essay and application-statement refinement, scholarship
          discovery, recommendation-letter coordination, weekly planning, a guided Journey, and a
          chat and voice AI advisor.
        </p>
        <p>
          <strong>
            Pathforge is an informational and organisational tool. It is not a college counsellor,
            admissions officer, tutor, lawyer, financial adviser, or licensed professional of any
            kind.
          </strong>{" "}
          Nothing in the Service is a guarantee, prediction, promise, or representation that you
          will be admitted to, receive financial aid from, or be evaluated in any particular way by
          any school, university, scholarship body, or program. Scores, bands, probabilities, and
          rankings shown in the Service — including the College Readiness Score, Admissions
          Probability, Outcome Bands, and Journey Score — are directional estimates generated from
          the information you supply. They are not official assessments and carry no weight with
          any institution.
        </p>

        <h2>3. Your Account</h2>
        <p>
          You must provide accurate information and keep it current. You are responsible for
          safeguarding your credentials and for all activity that occurs under your account. Notify
          us promptly at{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>{" "}
          if you suspect unauthorised access. Accounts are personal to you; you may not share,
          transfer, or sell an account. One person may not maintain multiple free accounts to
          obtain additional credits.
        </p>
        <p>
          If you sign in using Google or GitHub, you authorise us to receive the basic profile
          information those providers make available for authentication. Your use of those
          providers is also governed by their own terms.
        </p>

        <h2>4. Plans, Credits &amp; Fair Use</h2>
        <ul>
          <li>
            <strong>Free</strong> — 3 AI credits per day, reset daily on your local timezone.
            Unused daily credits do not accumulate.
          </li>
          <li>
            <strong>Pro</strong> — a monthly allowance of AI credits, refilled at each billing
            renewal.
          </li>
          <li>
            <strong>Max</strong> — a larger monthly allowance with access to our deepest reasoning
            tier, refilled at each billing renewal.
          </li>
          <li>
            <strong>Enterprise</strong> — custom terms for schools and counsellor organisations,
            governed by a separate written agreement where one exists.
          </li>
        </ul>
        <p>
          Current allowances and prices are shown on our{" "}
          <Link to="/pricing" className="text-accent underline">Pricing page</Link>, which forms
          part of these Terms. Generally, one AI interaction consumes one credit; some
          heavier features may consume more, and this is disclosed in the interface before you run
          them. <strong>Credits are a licence to use the Service, not a currency.</strong> They
          have no cash value, cannot be transferred, exchanged, or redeemed, and unused monthly
          credits expire at the end of each billing period unless we state otherwise.
        </p>
        <p>
          A credit is consumed when a request is accepted for processing. If a request fails
          because of a fault on our side, tell us and we will restore the credit. We may apply
          reasonable rate limits, abuse thresholds, and fair-use controls to protect the Service
          and other users.
        </p>

        <h2>5. Payments &amp; Subscriptions</h2>
        <p>
          Our order process is conducted by our online reseller <strong>Paddle.com</strong>.
          Paddle.com is the Merchant of Record for all our orders. Paddle handles payment, billing,
          invoicing, sales tax and VAT, customer billing enquiries, and returns. Your purchase is
          therefore also subject to{" "}
          <a
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Paddle's Buyer Terms
          </a>
          .
        </p>
        <p>
          Subscriptions renew automatically for successive periods at the then-current price until
          cancelled. You authorise recurring charges through Paddle until you cancel. We will give
          reasonable advance notice of any price increase affecting your renewal; continuing after
          the change takes effect constitutes acceptance. Prices are shown exclusive of taxes
          unless stated otherwise; local currency pricing, including INR, may be available at
          checkout. Cancellation and refund mechanics are set out in our{" "}
          <Link to="/refund-policy" className="text-accent underline">Refund Policy</Link>.
        </p>

        <h2>6. Your Content</h2>
        <p>
          "Your Content" means everything you submit to the Service — essays, activity descriptions,
          resumes and LinkedIn exports, report cards, transcripts, prompts, chat and voice input,
          uploaded files, reflections, and profile information.
        </p>
        <p>
          <strong>You own Your Content.</strong> You grant us a worldwide, non-exclusive,
          royalty-free licence to host, store, reproduce, transmit, display, and process Your
          Content, and to create derived outputs from it, solely for the purposes of operating,
          securing, and providing the Service to you and, where applicable, to a counsellor you
          are connected to. This licence ends when you delete the content or your account, except
          for backups and records we are required to retain, as described in our{" "}
          <Link to="/privacy" className="text-accent underline">Privacy Notice</Link>.
        </p>
        <p>
          You represent that you have the rights necessary to submit Your Content and that it does
          not infringe anyone's rights or violate any law. Do not upload content you are not
          permitted to share, including confidential school records belonging to other students.
        </p>

        <h2>7. AI Features</h2>
        <p>
          AI features are powered by third-party large language models accessed through our
          providers. You understand and agree that:
        </p>
        <ul>
          <li>
            <strong>Outputs may be wrong.</strong> AI can be inaccurate, incomplete, outdated, or
            inconsistent. Deadlines, eligibility criteria, admission statistics, scholarship terms,
            and program details must be verified against the official source before you rely on
            them.
          </li>
          <li>
            <strong>You must review everything before use.</strong> You are responsible for what
            you do with an output, including anything you submit to a school, university,
            scholarship body, or employer.
          </li>
          <li>
            <strong>Outputs are not advice.</strong> They are not admissions, legal, financial,
            immigration, medical, or mental-health advice.
          </li>
          <li>
            <strong>Outputs are not unique.</strong> Other users may receive similar or identical
            responses to similar prompts, and we make no claim of exclusivity in any output.
          </li>
          <li>
            <strong>Live web results are third-party content.</strong> Search-backed features
            surface material from external websites that we do not control, endorse, or verify.
          </li>
        </ul>
        <p>
          As between you and us, and to the extent permitted by law, you own the outputs generated
          from Your Content. We may screen, filter, refuse, or remove prompts and outputs, and we
          operate automated moderation on inputs to the Service.
        </p>

        <h2>8. Academic &amp; Application Integrity</h2>
        <p>
          This section matters more than any other, so please read it carefully. Many universities,
          scholarship bodies, and application platforms restrict or prohibit AI-generated material
          in submitted work, and some require disclosure.
        </p>
        <ul>
          <li>
            You are solely responsible for complying with the academic-integrity and AI-use rules
            of every school, university, program, and application platform you deal with.
          </li>
          <li>
            Pathforge's refinement features are built to improve clarity, structure, and impact
            without inventing facts or credentials — but the final submission is your work and your
            responsibility.
          </li>
          <li>
            You must not use the Service to fabricate achievements, awards, grades, test scores,
            activities, recommendations, or any other credential, or to misrepresent yourself to
            any institution.
          </li>
          <li>
            We are not responsible for any academic penalty, rescinded offer, disqualification, or
            other consequence arising from how you use an output.
          </li>
        </ul>

        <h2>9. Information About Other People</h2>
        <p>
          Some features — recommendation-letter requests, the recommender portal, counsellor
          connections, and class joining — involve you giving us information about other people,
          such as a teacher's or professor's name and email address. When you do, you confirm that
          you have a legitimate reason to share it and that you are permitted to do so. We contact
          those people only for the purpose you initiated, and they may opt out at any time. Do not
          use these features to send unsolicited or repeated messages.
        </p>

        <h2>10. Counsellor, Teacher &amp; School Accounts</h2>
        <p>
          Counsellor and teacher accounts can view the profile, progress, and submitted work of
          students who are connected to them. If you hold such an account, you agree to access
          student data only as necessary for your legitimate guidance role, to keep it
          confidential, and to comply with all laws and institutional policies applicable to
          student records in your jurisdiction. Students and guardians may disconnect from a
          counsellor at any time. Where a school or organisation administers accounts on behalf of
          students, that organisation is responsible for obtaining any consents its own rules
          require.
        </p>

        <h2>11. Third-Party Services &amp; Integrations</h2>
        <p>
          The Service integrates with third parties including Paddle (payments), Google (sign-in
          and, if you connect it, Calendar), GitHub (sign-in and repository import), and web search
          providers. Optional integrations are activated only when you connect them, and you may
          disconnect them at any time from your settings. Third-party services are governed by
          their own terms and privacy policies; we are not responsible for their availability,
          accuracy, or acts. Links to external sites are provided for convenience and are not an
          endorsement.
        </p>

        <h2>12. Acceptable Use</h2>
        <p>You agree not to, and not to permit anyone else to:</p>
        <ul>
          <li>Use the Service for any unlawful, fraudulent, deceptive, or abusive purpose;</li>
          <li>
            Harass, threaten, defame, or impersonate any person, or submit content that is hateful,
            sexually explicit, or exploitative of minors;
          </li>
          <li>Send spam or unsolicited bulk messages through any Pathforge feature;</li>
          <li>
            Infringe the intellectual property, privacy, or other rights of any person or
            institution;
          </li>
          <li>
            Probe, scan, penetration-test, reverse engineer, decompile, or interfere with the
            security or integrity of the Service;
          </li>
          <li>
            Scrape, crawl, or use automated means to extract data or content from the Service
            except as expressly permitted;
          </li>
          <li>Upload malware, or attempt to gain unauthorised access to any account or system;</li>
          <li>
            Circumvent credit limits, rate limits, paywalls, or any other technical restriction, or
            create accounts to evade a suspension;
          </li>
          <li>
            Resell, sublicense, or provide the Service to third parties as a service of your own;
          </li>
          <li>
            Use the Service or its outputs to train, fine-tune, distil, or benchmark a competing AI
            model or product;
          </li>
          <li>
            Attempt to manipulate, jailbreak, or extract the system prompts, weights, or internal
            logic behind our AI features.
          </li>
        </ul>

        <h2>13. Intellectual Property</h2>
        <p>
          The Service — including its software, design, content, curated databases, frameworks,
          scoring methodologies, branding, and documentation — is owned by Pathforge or its
          licensors and protected by intellectual property laws. Subject to these Terms, we grant
          you a limited, revocable, non-exclusive, non-transferable, non-sublicensable right to use
          the Service for your personal, non-commercial college-preparation purposes within your
          selected plan. No other rights are granted. "Pathforge" and our logos are our trademarks
          and may not be used without permission.
        </p>
        <p>
          If you believe content on the Service infringes your copyright, email{" "}
          <a href="mailto:pathforge.co@gmail.com" className="text-accent underline">
            pathforge.co@gmail.com
          </a>{" "}
          with a description of the work, the location of the material, and your contact details.
          We remove infringing material and terminate repeat infringers.
        </p>

        <h2>14. Feedback</h2>
        <p>
          If you send us suggestions, ideas, or feedback about the Service, you grant us an
          unrestricted, perpetual, royalty-free right to use them without obligation or
          compensation to you. We will not identify you as the source without your permission.
        </p>

        <h2>15. Beta &amp; Experimental Features</h2>
        <p>
          We may label features as beta, preview, or experimental. These are provided as-is, may be
          changed or withdrawn at any time, may be unstable, and are excluded from any service
          commitment. Do not rely on a beta feature for anything time-critical.
        </p>

        <h2>16. Availability &amp; Changes to the Service</h2>
        <p>
          We may modify, add, or discontinue features at any time. If we discontinue a paid feature
          in a way that materially reduces the value of your plan, you may cancel and, where the
          change occurs mid-period, request a pro-rata refund of the unused portion. We may perform
          maintenance and may impose limits on storage, uploads, and request volume.
        </p>

        <h2>17. Suspension &amp; Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time from your settings. We
          may suspend or terminate your access for material breach of these Terms, non-payment,
          security or fraud risk, legal requirement, or repeated or serious policy violations.
          Where practical and lawful, we will give notice and an opportunity to cure.
        </p>
        <p>
          On termination, your right to use the Service ends immediately. You may export your data
          for 30 days after termination, after which it may be permanently deleted. Sections that
          by their nature should survive — including Content licence, Intellectual Property,
          Disclaimers, Limitation of Liability, Indemnity, and Governing Law — survive termination.
        </p>

        <h2>18. Communications</h2>
        <p>
          By creating an account you agree to receive service communications by email, including
          account, security, billing, and transactional messages. These are required to operate the
          Service and cannot be opted out of while your account is active. Marketing and newsletter
          emails are separate and can be unsubscribed from at any time using the link in each
          message or from your settings. Legal notices to you may be sent to the email address on
          your account.
        </p>

        <h2>19. Disclaimers</h2>
        <p>
          To the fullest extent permitted by law, the Service is provided <strong>"as is"</strong>{" "}
          and <strong>"as available"</strong>, without warranties of any kind, express or implied,
          including implied warranties of merchantability, fitness for a particular purpose,
          accuracy, and non-infringement. We do not warrant that the Service will be uninterrupted,
          secure, or error-free, that outputs will be accurate or reliable, or that defects will be
          corrected. Some jurisdictions do not allow certain exclusions, so parts of this section
          may not apply to you, and nothing here limits rights you have as a consumer that cannot
          be waived by law.
        </p>

        <h2>20. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Pathforge and its officers, employees, and
          suppliers will not be liable for any indirect, incidental, special, consequential,
          exemplary, or punitive damages, or for loss of profits, revenue, data, goodwill,
          educational or career opportunity, or admission to any institution, however caused and on
          any theory of liability.
        </p>
        <p>
          Our total aggregate liability for all claims arising out of or relating to these Terms or
          the Service is limited to the greater of (a) the amount you paid us in the twelve months
          before the event giving rise to the claim, or (b) USD 50. These limits do not apply to
          liability that cannot be excluded by law, including fraud, wilful misconduct, or death or
          personal injury caused by negligence.
        </p>

        <h2>21. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless Pathforge from any claim, loss, liability, or
          expense (including reasonable legal fees) arising out of Your Content, your use of
          outputs, your breach of these Terms or of any law, or your infringement of anyone's
          rights.
        </p>

        <h2>22. Governing Law &amp; Disputes</h2>
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws
          principles. The courts of competent jurisdiction in India will have exclusive
          jurisdiction over any dispute, except that consumers may have the right to bring
          proceedings in the courts of their country of residence where local law grants that
          right, and nothing here deprives you of mandatory consumer protections available to you
          locally. Before filing a claim, please contact us — most issues are resolved quickly by
          email.
        </p>

        <h2>23. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the updated version here with a
          new "Last updated" date, and for material changes we will provide reasonable advance
          notice by email or in-app. Continued use after the changes take effect constitutes
          acceptance. If you do not accept a change, stop using the Service and cancel your
          subscription.
        </p>

        <h2>24. General</h2>
        <ul>
          <li>
            <strong>Entire agreement:</strong> these Terms, the Privacy Notice,
            the Refund Policy, and the Pricing page are the entire agreement between us regarding
            the Service.
          </li>
          <li>
            <strong>Severability:</strong> if any provision is held unenforceable, the rest remains
            in effect.
          </li>
          <li>
            <strong>No waiver:</strong> failure to enforce a provision is not a waiver of it.
          </li>
          <li>
            <strong>Assignment:</strong> you may not assign these Terms without our consent; we may
            assign them in connection with a merger, acquisition, or sale of assets.
          </li>
          <li>
            <strong>Force majeure:</strong> neither party is liable for delays caused by events
            beyond its reasonable control.
          </li>
          <li>
            <strong>No third-party beneficiaries,</strong> except as expressly stated.
          </li>
        </ul>

        <h2>25. Contact</h2>
        <p>
          Questions about these Terms? Email{" "}
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
