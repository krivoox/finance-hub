export type EmailSendResult =
  { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

export type TransactionalSendInput = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags: { name: string; value: string }[];
};

export type UpsertContactInput = {
  email: string;
  firstName?: string | null;
  unsubscribed: boolean;
  segmentId?: string | null;
};

export type CreateBroadcastInput = {
  name: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  previewText: string;
  segmentId: string;
};

/**
 * Port over Resend (or a log/fake). Domain stays pure; services talk through this.
 */
export type EmailGateway = {
  sendTransactional(input: TransactionalSendInput): Promise<EmailSendResult>;
  upsertContact(
    input: UpsertContactInput,
  ): Promise<EmailSendResult & { contactId?: string }>;
  createBroadcast(input: CreateBroadcastInput): Promise<EmailSendResult>;
  sendBroadcast(id: string): Promise<EmailSendResult>;
};
