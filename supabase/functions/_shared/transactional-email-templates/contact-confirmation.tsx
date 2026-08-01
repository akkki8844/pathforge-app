import * as React from 'npm:react@18.3.1'
import {
  EmailLayout,
  Paragraph,
  HighlightBox,
  Label,
  Value,
} from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  subject?: string
  message?: string
}

const ContactConfirmation = ({ name, subject, message }: Props) => (
  <EmailLayout
    preview="We received your message — Pathforge will reply within 2–3 business days"
    heading={name ? `Thanks, ${name}!` : 'Thanks for reaching out!'}
    ctaLabel="Open Pathforge"
    ctaUrl="https://pathforge.co.in"
    footerNote="— The Pathforge Team"
  >
    <Paragraph>
      We've received your message and a member of our team will get back to you
      within 2–3 business days.
    </Paragraph>

    {(subject || message) && (
      <HighlightBox>
        {subject && <Label>Subject</Label>}
        {subject && <Value>{subject}</Value>}
        {message && <Label>Your message</Label>}
        {message && <Value>{message}</Value>}
      </HighlightBox>
    )}

    <Paragraph>
      In the meantime, feel free to explore your dashboard and continue
      building your college readiness profile.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: ContactConfirmation,
  subject: 'We received your message — Pathforge',
  displayName: 'Contact form confirmation',
  previewData: {
    name: 'Alex',
    subject: 'Question about Pro plan',
    message: 'Hi! I had a quick question about how credits work.',
  },
} satisfies TemplateEntry
