import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

const NewsletterWelcomeEmail = () => (
  <EmailLayout
    preview="Welcome to the Pathforge Newsletter"
    heading="Welcome to the Pathforge Newsletter"
    ctaLabel="Open Your Dashboard"
    ctaUrl="https://pathforge.co.in"
    footerNote="Built for students applying to top universities worldwide."
  >
    <Paragraph>
      You've successfully signed up for the Pathforge newsletter — thanks for
      joining the community.
    </Paragraph>
    <Paragraph>
      Expect occasional updates on new features, opportunities, and insights to
      help you build a stronger college application — straight to your inbox.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: NewsletterWelcomeEmail,
  subject: 'Welcome to the Pathforge Newsletter',
  displayName: 'Newsletter welcome',
  previewData: {},
} satisfies TemplateEntry
