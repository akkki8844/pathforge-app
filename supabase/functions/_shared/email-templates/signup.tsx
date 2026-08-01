/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph, InlineLink } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailLayout
    preview="Confirm your email to start your Pathforge journey"
    heading="Confirm your email"
    ctaLabel="Verify Email"
    ctaUrl={confirmationUrl}
    footerNote="If you didn't create an account, you can safely ignore this email."
  >
    <Paragraph>
      Welcome to Pathforge. You're one step away from a personalized college
      readiness plan built around your goals, grades, and target universities.
    </Paragraph>
    <Paragraph>
      Please confirm{' '}
      <InlineLink href={`mailto:${recipient}`}>{recipient}</InlineLink> by
      clicking the button below.
    </Paragraph>
  </EmailLayout>
)

export default SignupEmail
