/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as contactNotification } from './contact-notification.tsx'
import { template as newsletterWelcome } from './newsletter-welcome.tsx'
import { template as newsletterConfirm } from './newsletter-confirm.tsx'
import { template as enterpriseInquiryNotification } from './enterprise-inquiry-notification.tsx'
import { template as enterpriseInquiryConfirmation } from './enterprise-inquiry-confirmation.tsx'
import { template as counsellorInvite } from './counsellor-invite.tsx'
import { template as userFeedbackNotification } from './user-feedback-notification.tsx'
import { template as adminBroadcast } from './admin-broadcast.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'contact-notification': contactNotification,
  'newsletter-welcome': newsletterWelcome,
  'newsletter-confirm': newsletterConfirm,
  'enterprise-inquiry-notification': enterpriseInquiryNotification,
  'enterprise-inquiry-confirmation': enterpriseInquiryConfirmation,
  'counsellor-invite': counsellorInvite,
  'user-feedback-notification': userFeedbackNotification,
  'admin-broadcast': adminBroadcast,
}
