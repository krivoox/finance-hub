import {
  assertValidFromAddress,
  buildPasswordResetEmail,
  kindForTemplate,
  EMAIL_TEMPLATE,
  normalizeEmail,
  normalizeMarketingSubscribe,
  passwordResetIdempotencyKey,
  prepareMarketingBroadcast,
  type MarketingBroadcastInput,
  type MarketingSubscribeInput,
} from "@/features/email/domain";
import type {
  CreateBroadcastInput,
  EmailGateway,
  EmailSendResult,
} from "./gateway";

export type SendPasswordResetInput = {
  user: { id: string; email: string; name?: string | null };
  url: string;
  token: string;
};

export type EmailRuntimeConfig = {
  gateway: EmailGateway;
  from: string;
  replyTo?: string;
};

export async function sendPasswordResetEmail(
  input: SendPasswordResetInput,
  config: EmailRuntimeConfig,
): Promise<EmailSendResult> {
  const from = assertValidFromAddress(config.from);
  const to = normalizeEmail(input.user.email);
  const rendered = buildPasswordResetEmail({
    email: to,
    displayName: input.user.name,
    resetUrl: input.url,
  });

  return config.gateway.sendTransactional({
    to,
    from,
    replyTo: config.replyTo,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    idempotencyKey: passwordResetIdempotencyKey({
      userId: input.user.id,
      token: input.token,
    }),
    tags: [
      { name: "kind", value: kindForTemplate(EMAIL_TEMPLATE.passwordReset) },
      { name: "template", value: EMAIL_TEMPLATE.passwordReset },
    ],
  });
}

export async function subscribeMarketingContact(
  input: MarketingSubscribeInput,
  config: EmailRuntimeConfig & { segmentId?: string | null },
): Promise<EmailSendResult> {
  const subscriber = normalizeMarketingSubscribe(input);
  return config.gateway.upsertContact({
    email: subscriber.email,
    firstName: subscriber.firstName,
    unsubscribed: subscriber.unsubscribed,
    segmentId: config.segmentId,
  });
}

export async function sendMarketingBroadcast(
  input: MarketingBroadcastInput,
  config: EmailRuntimeConfig,
): Promise<EmailSendResult> {
  const from = assertValidFromAddress(config.from);
  const prepared = prepareMarketingBroadcast(input);

  const created = await config.gateway.createBroadcast({
    name: prepared.name,
    from,
    subject: prepared.subject,
    html: prepared.html,
    text: prepared.text,
    previewText: prepared.previewText,
    segmentId: prepared.segmentId,
  } satisfies CreateBroadcastInput);

  if (!created.ok) {
    return created;
  }

  return config.gateway.sendBroadcast(created.id);
}
