/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph, HighlightBox, Label, Value } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview="Confirm your email change for Pathforge"
    heading="Confirm your email change"
    ctaLabel="Confirm Change"
    ctaUrl={confirmationUrl}
    footerNote="If you didn't request this change, please secure your account immediately by resetting your password."
  >
    <Paragraph>
      You requested to change the email address on your Pathforge account.
    </Paragraph>
    <HighlightBox>
      <Label>From</Label>
      <Value>{email}</Value>
      <Label>To</Label>
      <Value>{newEmail}</Value>
    </HighlightBox>
    <Paragraph>
      Confirm this change by clicking the button below.
    </Paragraph>
  </EmailLayout>
)

export default EmailChangeEmail
