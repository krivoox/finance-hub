const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

export type IdempotencyKeyInput = {
  eventType: string;
  entityId: string;
  /** Extra discriminator (e.g. reset token prefix) so a new request can resend. */
  qualifier?: string;
};

/**
 * Resend idempotency keys expire after 24h and max out at 256 chars.
 * Format: `<event-type>/<entity-id>` or `<event-type>/<entity-id>/<qualifier>`.
 */
export function buildIdempotencyKey(input: IdempotencyKeyInput): string {
  const eventType = input.eventType.trim().toLowerCase().replaceAll("/", "-");
  const entityId = input.entityId.trim();
  const qualifier = input.qualifier?.trim();

  const parts = [eventType, entityId, qualifier].filter(
    (part): part is string => Boolean(part),
  );
  const key = parts.join("/");

  if (key.length <= MAX_IDEMPOTENCY_KEY_LENGTH) {
    return key;
  }

  return key.slice(0, MAX_IDEMPOTENCY_KEY_LENGTH);
}

export function passwordResetIdempotencyKey(input: {
  userId: string;
  token: string;
}): string {
  return buildIdempotencyKey({
    eventType: "password-reset",
    entityId: input.userId,
    qualifier: input.token.slice(0, 16),
  });
}

export function marketingBroadcastIdempotencyKey(broadcastId: string): string {
  return buildIdempotencyKey({
    eventType: "batch-marketing",
    entityId: broadcastId,
  });
}
