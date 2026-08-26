export {
  EmailDomainError,
  InvalidBroadcastContentError,
  InvalidEmailAddressError,
  InvalidFromAddressError,
  MarketingConsentRequiredError,
  MissingMarketingSegmentError,
  MissingResetUrlError,
  MissingUnsubscribeError,
} from "./errors";
export { assertValidFromAddress, parseFromAddress } from "./from-address";
export type { ParsedFromAddress } from "./from-address";
export { escapeHtml } from "./html";
export {
  buildIdempotencyKey,
  marketingBroadcastIdempotencyKey,
  passwordResetIdempotencyKey,
} from "./idempotency";
export {
  EMAIL_KIND,
  EMAIL_TEMPLATE,
  isTransactionalTemplate,
  kindForTemplate,
} from "./kinds";
export type { EmailKind, EmailTemplate } from "./kinds";
export {
  MARKETING_TOPIC,
  RESEND_UNSUBSCRIBE_PLACEHOLDER,
  normalizeMarketingSubscribe,
  prepareMarketingBroadcast,
} from "./marketing";
export type {
  MarketingBroadcastInput,
  MarketingSubscribeInput,
  MarketingTopic,
  NormalizedMarketingSubscribe,
  PreparedMarketingBroadcast,
} from "./marketing";
export { normalizeEmail } from "./normalize-email";
export {
  PASSWORD_RESET_EXPIRES_HOURS,
  buildPasswordResetEmail,
} from "./password-reset";
export type { PasswordResetEmailInput, RenderedEmail } from "./password-reset";
