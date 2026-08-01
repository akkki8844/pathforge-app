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
  fromName?: string
  fromEmail?: string
  subject?: string
  message?: string
}

const ContactNotification = ({
  fromName,
  fromEmail,
  subject,
  message,
}: Props) => (
  <EmailLayout
    preview="New contact form submission on Pathforge"
    heading="New contact form submission"
    footerNote={`Reply directly to ${fromEmail || 'the sender'} to respond.`}
  >
    <HighlightBox>
      <Label>From</Label>
      <Value>
        {fromName || 'Unknown'}
        {fromEmail ? ` <${fromEmail}>` : ''}
      </Value>
      <Label>Subject</Label>
      <Value>{subject || '(none)'}</Value>
      <Label>Message</Label>
      <Value>{message || '(empty)'}</Value>
    </HighlightBox>
    <Paragraph>
      Open the inbox or reply directly to the sender to respond.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: ContactNotification,
  subject: (d: Record<string, any>) =>
    `[Pathforge Contact] ${d.subject || 'New message'} — ${d.fromName || d.fromEmail || 'Unknown'}`,
  displayName: 'Contact form notification (admin)',
  previewData: {
    fromName: 'Alex Kim',
    fromEmail: 'alex@example.com',
    subject: 'Question about Pro plan',
    message: 'Hi! I had a quick question about how credits work.',
  },
} satisfies TemplateEntry
