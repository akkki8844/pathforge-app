import * as React from 'npm:react@18.3.1'
import {
  EmailLayout,
  HighlightBox,
  Label,
  Value,
} from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  organization?: string
  message?: string
}

const EnterpriseInquiryNotification = ({
  name,
  email,
  organization,
  message,
}: Props) => (
  <EmailLayout
    preview={`New enterprise inquiry from ${name || 'a prospect'}`}
    heading="New enterprise inquiry"
    footerNote={`Reply directly to this prospect via ${email || 'the address above'}.`}
  >
    <HighlightBox>
      <Label>From</Label>
      <Value>{name || '—'}</Value>

      <Label>Email</Label>
      <Value>{email || '—'}</Value>

      <Label>Organization</Label>
      <Value>{organization || '—'}</Value>

      <Label>Message / Requirements</Label>
      <Value>{message || '—'}</Value>
    </HighlightBox>
  </EmailLayout>
)

export const template = {
  component: EnterpriseInquiryNotification,
  subject: (data: Record<string, any>) =>
    `New enterprise inquiry: ${data?.organization || data?.name || 'Unknown'}`,
  to: 'pathforge.co@gmail.com',
  displayName: 'Enterprise inquiry — internal notification',
  previewData: {
    name: 'Alex Chen',
    email: 'alex@example.edu',
    organization: 'Riverdale International School',
    message:
      'We are evaluating Pathforge for our Grade 11 cohort of 80 students. Looking for school-wide dashboards and a counsellor seat.',
  },
} satisfies TemplateEntry
