import * as React from 'npm:react@18.3.1'
import {
  EmailLayout,
  Paragraph,
  HighlightBox,
  Label,
  Value,
  CodeBlock,
} from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email: string
  password: string
  loginUrl: string
}

// Mirrors the auth "invite" template look-and-feel but with copy tailored
// for counsellors who have been onboarded by a Pathforge administrator.
const CounsellorInvite = ({ name, email, password, loginUrl }: Props) => (
  <EmailLayout
    preview="You've been invited to join Pathforge as a counsellor"
    heading={name ? `Welcome aboard, ${name}` : "You've been invited to Pathforge"}
    ctaLabel="Accept invitation & sign in"
    ctaUrl={loginUrl}
    footerNote="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <Paragraph>
      A Pathforge administrator has set up a counsellor workspace for you so
      you can guide students through their college readiness journey — from
      profile building all the way to admissions.
    </Paragraph>

    <Paragraph>
      Use the credentials below to sign in for the first time. We strongly
      recommend changing your password from <strong>Profile → Security</strong>
      immediately after signing in.
    </Paragraph>

    <HighlightBox>
      <Label>Sign-in email</Label>
      <Value>{email}</Value>
      <Label>Temporary password</Label>
      <CodeBlock>{password}</CodeBlock>
    </HighlightBox>

    <Paragraph>
      This password is shown only once, in this email. Keep it private and
      change it as soon as possible.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: CounsellorInvite,
  subject: "You've been invited to Pathforge",
  displayName: 'Counsellor invite',
  previewData: {
    name: 'Alex',
    email: 'alex@school.edu',
    password: 'TempPass-XyZ123',
    loginUrl: 'https://pathforge.co.in/auth',
  },
} satisfies TemplateEntry
