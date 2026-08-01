/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout
    preview="Your secure login link for Pathforge"
    heading="Your login link"
    ctaLabel="Log In to Pathforge"
    ctaUrl={confirmationUrl}
    footerNote="This link expires shortly. If you didn't request it, you can safely ignore this email."
  >
    <Paragraph>
      Click the button below to securely log in to your Pathforge account.
      No password needed.
    </Paragraph>
  </EmailLayout>
)

export default MagicLinkEmail
