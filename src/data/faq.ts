/** Answers to the things people email us about before they email us about them.
 *  Shared by /contact and /faq — if these change, both pages and their
 *  FAQPage JSON-LD update together. Kept in sync with /refund-policy and /privacy. */
export const FAQS = [
  {
    q: "How quickly will someone reply?",
    a: "Most messages get a personal reply within 2–3 business days. Billing and refund emails are acknowledged within 2 business days. If you have written and heard nothing after that, write again — it is far more likely we missed it than that we are ignoring you.",
  },
  {
    q: "Do I have to pay to try Pathforge?",
    a: "No. The Free plan gives you 3 AI credits every day, forever, with no card required, and it includes the full 300-quest Journey along with the activities, essays and resume builders. We would rather you tested the product properly than paid and asked for it back.",
    reaction: "👍",
  },
  {
    q: "How do I get a refund?",
    a: "Every first paid subscription carries a 14-day money-back guarantee, and within that window we approve refunds without asking for an explanation. Request one through paddle.net using your checkout email, or email us and we will start it for you. Refunds reach your original payment method in about 5–10 business days.",
  },
  {
    q: "A request failed but still used one of my credits. Can I get it back?",
    a: "Yes. If something failed because of a fault on our side, email us and we will restore the credit. That is a credit correction rather than a refund, so it does not touch your 14-day guarantee.",
    reaction: "😮",
    reactOn: "question",
  },
  {
    q: "Can my school or counselling organisation use Pathforge?",
    a: "Yes — there is a counsellor portal with roster management, student deep-dives, intervention alerts and cohort announcements, and Enterprise plans are priced per organisation rather than per seat. Pick 'Enterprise / schools' as the subject above and tell us roughly how many students you support.",
  },
  {
    q: "How do I delete my account and everything in it?",
    a: "Email us from your account address and ask. We delete account data within 30 days, and it clears our backups within 90. Some billing and tax records have to be retained for longer because the law requires it — our Privacy Policy sets out exactly which, and for how long.",
  },
  {
    q: "Will my essays be used to train AI models?",
    a: "No. Your content is not used to train third-party AI models, and we do not sell personal data. The Privacy Policy names every subprocessor that touches your data and explains what each one does with it.",
    reaction: "❤️",
  },
];
