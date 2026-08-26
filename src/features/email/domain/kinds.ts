export const EMAIL_KIND = {
  transactional: "transactional",
  marketing: "marketing",
} as const;

export type EmailKind = (typeof EMAIL_KIND)[keyof typeof EMAIL_KIND];

export const EMAIL_TEMPLATE = {
  passwordReset: "password_reset",
  productUpdates: "product_updates",
} as const;

export type EmailTemplate =
  (typeof EMAIL_TEMPLATE)[keyof typeof EMAIL_TEMPLATE];

export function isTransactionalTemplate(template: EmailTemplate): boolean {
  return template === EMAIL_TEMPLATE.passwordReset;
}

export function kindForTemplate(template: EmailTemplate): EmailKind {
  return isTransactionalTemplate(template)
    ? EMAIL_KIND.transactional
    : EMAIL_KIND.marketing;
}
