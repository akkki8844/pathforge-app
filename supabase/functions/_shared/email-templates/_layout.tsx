/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

/**
 * Shared Pathforge email layout — premium SaaS design.
 * Used by ALL auth + transactional email templates for consistent branding.
 *
 * Structure:
 *   [Header band: PATHFORGE wordmark on navy]
 *   [White content area: heading + body children + optional CTA]
 *   [Divider]
 *   [Footer: tagline + contact]
 */

export const BRAND = {
  name: 'Pathforge',
  tagline: 'Outcome-Guaranteed College Readiness',
  url: 'https://pathforge.co.in',
  contactEmail: 'pathforge.co@gmail.com',
  navy: '#0f172a',
  accent: '#2563eb',
  accentDark: '#1d4ed8',
  text: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
}

interface EmailLayoutProps {
  preview: string
  heading: string
  children: React.ReactNode
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
}

export const EmailLayout = ({
  preview,
  heading,
  children,
  ctaLabel,
  ctaUrl,
  footerNote,
}: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={outerContainer}>
        {/* Header band */}
        <Section style={headerBand}>
          <Text style={wordmark}>PATHFORGE</Text>
        </Section>

        {/* Content card */}
        <Section style={card}>
          <Text style={eyebrow}>{BRAND.tagline}</Text>
          <Text style={h1}>{heading}</Text>
          <Section style={contentSection}>{children}</Section>

          {ctaLabel && ctaUrl && (
            <Section style={ctaWrap}>
              <Button style={primaryButton} href={ctaUrl}>
                {ctaLabel}
              </Button>
            </Section>
          )}

          {footerNote && <Text style={footerNote_}>{footerNote}</Text>}
        </Section>

        {/* Footer */}
        <Hr style={divider} />
        <Section style={footerSection}>
          <Text style={footerBrand}>Pathforge</Text>
          <Text style={footerText}>
            Helping students in grades 9–12 build credible, outcome-focused
            college applications.
          </Text>
          <Text style={footerText}>
            <Link href={BRAND.url} style={footerLink}>
              pathforge.co.in
            </Link>
            {' · '}
            <Link href={`mailto:${BRAND.contactEmail}`} style={footerLink}>
              {BRAND.contactEmail}
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

// Reusable inline elements for template bodies
export const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <Text style={paragraph}>{children}</Text>
)

export const HighlightBox = ({ children }: { children: React.ReactNode }) => (
  <Section style={highlightBox}>{children}</Section>
)

export const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={label}>{children}</Text>
)

export const Value = ({ children }: { children: React.ReactNode }) => (
  <Text style={value}>{children}</Text>
)

export const InlineLink = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <Link href={href} style={inlineLink}>
    {children}
  </Link>
)

export const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <Text style={codeBlock}>{children}</Text>
)

// ─── Styles ─────────────────────────────────────────────────────────────────

const body = {
  backgroundColor: '#ffffff',
  fontFamily:
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: '24px 12px',
  color: BRAND.text,
}

const outerContainer = {
  maxWidth: '560px',
  margin: '0 auto',
  width: '100%',
}

const headerBand = {
  backgroundColor: BRAND.navy,
  borderRadius: '12px 12px 0 0',
  padding: '20px 28px',
  textAlign: 'center' as const,
}

const wordmark = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 800 as const,
  letterSpacing: '0.18em',
  margin: 0,
  lineHeight: '1.2',
}

const card = {
  backgroundColor: '#ffffff',
  border: `1px solid ${BRAND.border}`,
  borderTop: 'none',
  borderRadius: '0 0 12px 12px',
  padding: '36px 32px 32px',
}

const eyebrow = {
  fontSize: '11px',
  fontWeight: 700 as const,
  color: BRAND.accent,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  margin: '0 0 12px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: BRAND.navy,
  lineHeight: '1.3',
  margin: '0 0 20px',
}

const contentSection = { margin: 0 }

const paragraph = {
  fontSize: '15px',
  color: BRAND.text,
  lineHeight: '1.65',
  margin: '0 0 16px',
}

const ctaWrap = {
  margin: '28px 0 8px',
  textAlign: 'left' as const,
}

const primaryButton = {
  backgroundColor: BRAND.accent,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '8px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footerNote_ = {
  fontSize: '13px',
  color: BRAND.muted,
  lineHeight: '1.6',
  margin: '24px 0 0',
}

const divider = {
  borderTop: `1px solid ${BRAND.border}`,
  margin: '24px 0 16px',
}

const footerSection = {
  padding: '0 8px',
}

const footerBrand = {
  fontSize: '13px',
  fontWeight: 700 as const,
  color: BRAND.navy,
  margin: '0 0 6px',
  letterSpacing: '0.02em',
}

const footerText = {
  fontSize: '12px',
  color: BRAND.muted,
  lineHeight: '1.6',
  margin: '0 0 4px',
}

const footerLink = {
  color: BRAND.muted,
  textDecoration: 'underline',
}

const highlightBox = {
  backgroundColor: BRAND.surface,
  borderLeft: `3px solid ${BRAND.accent}`,
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '8px 0 20px',
}

const label = {
  fontSize: '11px',
  color: BRAND.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontWeight: 700 as const,
  margin: '0 0 4px',
}

const value = {
  fontSize: '14px',
  color: BRAND.navy,
  lineHeight: '1.5',
  margin: '0 0 12px',
  whiteSpace: 'pre-wrap' as const,
}

const inlineLink = {
  color: BRAND.accent,
  textDecoration: 'underline',
}

const codeBlock = {
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: BRAND.navy,
  letterSpacing: '0.25em',
  backgroundColor: BRAND.surface,
  border: `1px solid ${BRAND.border}`,
  borderRadius: '8px',
  padding: '18px 20px',
  textAlign: 'center' as const,
  margin: '8px 0 20px',
}
