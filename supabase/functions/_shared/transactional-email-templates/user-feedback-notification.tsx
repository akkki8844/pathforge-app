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
  message: string
  fromEmail?: string
  fromUserId?: string | null
}

const UserFeedbackNotification = ({ message, fromEmail, fromUserId }: Props) => (
  <EmailLayout
    preview="New user feedback received on Pathforge"
    heading="New feedback received"
    footerNote="— Pathforge feedback pipeline"
  >
    <Paragraph>
      A user just submitted feedback through the in-app widget. Details below.
    </Paragraph>

    <HighlightBox>
      <Label>From</Label>
      <Value>{fromEmail || '(anonymous guest)'}</Value>
      {fromUserId ? (
        <>
          <Label>User ID</Label>
          <Value>{fromUserId}</Value>
        </>
      ) : null}
      <Label>Message</Label>
      <Value>{message}</Value>
    </HighlightBox>

    <Paragraph>
      You can also review and triage this feedback inside the Admin Panel
      under the Feedback tab.
    </Paragraph>
  </EmailLayout>
)

export const template = {
  component: UserFeedbackNotification,
  subject: 'New feedback on Pathforge',
  displayName: 'User feedback notification',
  to: 'pathforge.co@gmail.com',
  previewData: {
    message: 'I love the journey tracker but the credits reset feels off in IST.',
    fromEmail: 'student@example.com',
    fromUserId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry
