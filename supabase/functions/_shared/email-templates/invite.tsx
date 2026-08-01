/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview="You've been invited to join Pathforge"
    heading="You've been invited"
    ctaLabel="Accept Invitation"
    ctaUrl={confirmationUrl}
    footerNote="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <Paragraph>
      You've been invited to join Pathforge — the outcome-guaranteed college
      readiness platform built for students applying to top universities.
    </Paragraph>
    <Paragraph>
      Accept the invitation below to create your account and get started.
    </Paragraph>
  </EmailLayout>
)

export default InviteEmail
