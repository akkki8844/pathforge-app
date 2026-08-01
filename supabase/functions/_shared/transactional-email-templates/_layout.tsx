/**
 * Re-export the shared email layout so transactional templates can use the
 * same branded layout as auth templates without duplicating code.
 */
export {
  BRAND,
  EmailLayout,
  Paragraph,
  HighlightBox,
  Label,
  Value,
  InlineLink,
  CodeBlock,
} from '../email-templates/_layout.tsx'
