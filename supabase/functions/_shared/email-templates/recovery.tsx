/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview="Reset your Pathforge password"
    heading="Reset your password"
    ctaLabel="Reset Password"
    ctaUrl={confirmationUrl}
    footerNote="If you didn't request a password reset, you can safely ignore this email — your password won't change."
  >
    <Paragraph>
      We received a request to reset your Pathforge password. Click the button
      below to choose a new one.
    </Paragraph>
    <Paragraph>For your security, this link will expire shortly.</Paragraph>
  </EmailLayout>
)

export default RecoveryEmail
