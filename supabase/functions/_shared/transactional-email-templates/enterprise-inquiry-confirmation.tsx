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
  organization?: string
  message?: string
}

const EnterpriseInquiryConfirmation = ({
  name,
  organization,
  message,
}: Props) => (
  <EmailLayout
    preview="Thanks — we received your enterprise inquiry"
    heading={name ? `Thanks, ${name}!` : 'Thanks for reaching out!'}
    ctaLabel="Visit Pathforge"
    ctaUrl="https://pathforge.co.in"
    footerNote="— The Pathforge Team"
  >
    <Paragraph>
      We've received your enterprise inquiry
      {organization ? ` for ${organization}` : ''} and a member of our team will
      get back to you within 24 hours.
    </Paragraph>

    {message && (
      <HighlightBox>
        <Label>Your message</Label>
        <Value>{message}</Value>
      </HighlightBox>
    )}

    <Paragraph>
      In the meantime, if anything is time-sensitive, just reply to this email
      — it routes straight to our team.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: EnterpriseInquiryConfirmation,
  subject: 'We received your enterprise inquiry — Pathforge',
  displayName: 'Enterprise inquiry — submitter confirmation',
  previewData: {
    name: 'Alex',
    organization: 'Riverdale International School',
    message: 'We are evaluating Pathforge for our Grade 11 cohort.',
  },
} satisfies TemplateEntry
