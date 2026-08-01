import * as React from 'npm:react@18.3.1'
import { EmailLayout, Paragraph } from './_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface AdminBroadcastProps {
  subject?: string
  heading?: string
  preview?: string
  // Body is plain text. Blank lines separate paragraphs.
  body?: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
}

const AdminBroadcastEmail = ({
  subject,
  heading,
  preview,
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: AdminBroadcastProps) => {
  const safeHeading = heading || subject || 'A message from Pathforge'
  const safePreview = preview || subject || safeHeading
  const paragraphs = (body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <EmailLayout
      preview={safePreview}
      heading={safeHeading}
      ctaLabel={ctaLabel || undefined}
      ctaUrl={ctaUrl || undefined}
      footerNote={footerNote || 'You received this because you have a Pathforge account.'}
    >
      {paragraphs.length === 0 ? (
        <Paragraph>{body || ''}</Paragraph>
      ) : (
        paragraphs.map((p, i) => <Paragraph key={i}>{p}</Paragraph>)
      )}
    </EmailLayout>
  )
}

export const template = {
  component: AdminBroadcastEmail,
  // Subject is dynamic — pulled from templateData.subject sent by the admin.
  subject: (data: Record<string, any>) =>
    (typeof data?.subject === 'string' && data.subject.trim()) ||
    'A message from Pathforge',
  displayName: 'Admin broadcast',
  previewData: {
    subject: 'New feature: Weekly Planner is now live',
    heading: 'Weekly Planner is here',
    preview: 'Plan your week in minutes — track hours, deadlines, and goals.',
    body:
      'Hi there,\n\nWe just shipped the Weekly Planner — a faster way to plan your study week, track activities, and sync deadlines.\n\nLog in to try it now.',
    ctaLabel: 'Open Pathforge',
    ctaUrl: 'https://pathforge.co.in',
  },
} satisfies TemplateEntry
