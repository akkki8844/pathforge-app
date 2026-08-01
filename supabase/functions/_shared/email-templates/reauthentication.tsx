/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph, CodeBlock } from './_layout.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Your Pathforge verification code"
    heading="Confirm reauthentication"
    footerNote="This code expires shortly. If you didn't request it, you can safely ignore this email."
  >
    <Paragraph>
      Enter the code below to confirm your identity on Pathforge:
    </Paragraph>
    <CodeBlock>{token}</CodeBlock>
  </EmailLayout>
)

export default ReauthenticationEmail
