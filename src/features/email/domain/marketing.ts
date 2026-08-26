import {
  InvalidBroadcastContentError,
  MarketingConsentRequiredError,
  MissingMarketingSegmentError,
  MissingUnsubscribeError,
} from "./errors";
import { EMAIL_KIND, EMAIL_TEMPLATE } from "./kinds";
import { normalizeEmail } from "./normalize-email";

export const RESEND_UNSUBSCRIBE_PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}";

export const MARKETING_TOPIC = {
  productUpdates: "product_updates",
} as const;

export type MarketingTopic =
  (typeof MARKETING_TOPIC)[keyof typeof MARKETING_TOPIC];

export type MarketingSubscribeInput = {
  email: string;
  /** Must be true — no implied consent from account creation. */
  explicitOptIn: boolean;
  firstName?: string | null;
  topic?: MarketingTopic;
};

export type NormalizedMarketingSubscribe = {
  kind: typeof EMAIL_KIND.marketing;
  template: typeof EMAIL_TEMPLATE.productUpdates;
  email: string;
  firstName: string | null;
  unsubscribed: false;
  topic: MarketingTopic;
};

export function normalizeMarketingSubscribe(
  input: MarketingSubscribeInput,
): NormalizedMarketingSubscribe {
  if (input.explicitOptIn !== true) {
    throw new MarketingConsentRequiredError();
  }

  const firstName = input.firstName?.trim() || null;

  return {
    kind: EMAIL_KIND.marketing,
    template: EMAIL_TEMPLATE.productUpdates,
    email: normalizeEmail(input.email),
    firstName,
    unsubscribed: false,
    topic: input.topic ?? MARKETING_TOPIC.productUpdates,
  };
}

export type MarketingBroadcastInput = {
  name: string;
  subject: string;
  htmlBody: string;
  previewText?: string;
  segmentId?: string | null;
};

export type PreparedMarketingBroadcast = {
  kind: typeof EMAIL_KIND.marketing;
  name: string;
  subject: string;
  previewText: string;
  html: string;
  text: string;
  segmentId: string;
};

function ensureUnsubscribe(html: string): string {
  if (html.includes(RESEND_UNSUBSCRIBE_PLACEHOLDER)) {
    return html;
  }

  return `${html}
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#5c5850;">
  Finance Hub · novedades de producto.
  <a href="${RESEND_UNSUBSCRIBE_PLACEHOLDER}">Darse de baja</a>
</p>`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]+)"[^>]*>/gi, "$1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prepareMarketingBroadcast(
  input: MarketingBroadcastInput,
): PreparedMarketingBroadcast {
  const segmentId = input.segmentId?.trim();
  if (!segmentId) {
    throw new MissingMarketingSegmentError();
  }

  const name = input.name.trim();
  const subject = input.subject.trim();
  const htmlBody = input.htmlBody.trim();
  if (!name || !subject || !htmlBody) {
    throw new InvalidBroadcastContentError();
  }

  const html = ensureUnsubscribe(htmlBody);
  if (!html.includes(RESEND_UNSUBSCRIBE_PLACEHOLDER)) {
    throw new MissingUnsubscribeError();
  }

  const previewText =
    input.previewText?.trim() ||
    "Novedades de Finance Hub. Podés darte de baja en cualquier momento.";

  return {
    kind: EMAIL_KIND.marketing,
    name,
    subject,
    previewText,
    html,
    text: htmlToText(html),
    segmentId,
  };
}
