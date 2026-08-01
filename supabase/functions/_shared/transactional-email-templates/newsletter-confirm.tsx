import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  confirmUrl?: string
}

const NewsletterConfirmEmail = ({ confirmUrl }: Props) => (
  <EmailLayout
    preview="Confirm your Pathforge newsletter subscription"
    heading="Confirm your subscription"
    ctaLabel="Confirm subscription"
    ctaUrl={confirmUrl || 'https://pathforge.co.in'}
    footerNote="If you didn't request this, you can safely ignore this email — no subscription will be created."
  >
    <Paragraph>
      Someone (hopefully you) asked to subscribe this email address to the
      Pathforge newsletter. Please confirm to start receiving updates.
    </Paragraph>
    <Paragraph>
      This link will expire in 7 days. If you didn't sign up, just ignore this
      email — we won't add you to any list.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: NewsletterConfirmEmail,
  subject: 'Confirm your Pathforge newsletter subscription',
  displayName: 'Newsletter confirmation (double opt-in)',
  previewData: {
    confirmUrl: 'https://pathforge.co.in/newsletter/confirm?token=example',
  },
} satisfies TemplateEntry
