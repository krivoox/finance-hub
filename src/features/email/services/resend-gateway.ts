import type { Resend } from "resend";

import type {
  CreateBroadcastInput,
  EmailGateway,
  EmailSendResult,
  TransactionalSendInput,
  UpsertContactInput,
} from "./gateway";

function retryableStatus(statusCode: number | null): boolean {
  return statusCode === 429 || (statusCode != null && statusCode >= 500);
}

function fail(
  message: string,
  statusCode: number | null = null,
): EmailSendResult {
  return { ok: false, error: message, retryable: retryableStatus(statusCode) };
}

function isAlreadyExists(statusCode: number | null, message: string): boolean {
  if (statusCode === 409) return true;
  return /already|exists|duplicate/i.test(message);
}

export function createResendGateway(client: Resend): EmailGateway {
  return {
    async sendTransactional(input: TransactionalSendInput) {
      const { data, error } = await client.emails.send(
        {
          from: input.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          replyTo: input.replyTo,
          tags: input.tags,
        },
        { idempotencyKey: input.idempotencyKey },
      );

      if (error) {
        return fail(error.message, error.statusCode);
      }
      if (!data?.id) {
        return fail("Resend no devolvió id de email");
      }
      return { ok: true, id: data.id };
    },

    async upsertContact(input: UpsertContactInput) {
      const segments = input.segmentId ? [{ id: input.segmentId }] : undefined;
      const created = await client.contacts.create({
        email: input.email,
        firstName: input.firstName ?? undefined,
        unsubscribed: input.unsubscribed,
        segments,
      });

      if (created.data?.id) {
        return { ok: true, id: created.data.id };
      }

      const message = created.error?.message ?? "No se pudo crear el contacto";
      if (!isAlreadyExists(created.error?.statusCode ?? null, message)) {
        return fail(message, created.error?.statusCode ?? null);
      }

      const existing = await client.contacts.get({ email: input.email });
      if (existing.error || !existing.data?.id) {
        return fail(
          existing.error?.message ?? "No se pudo leer el contacto",
          existing.error?.statusCode ?? null,
        );
      }

      const updated = await client.contacts.update({
        email: input.email,
        firstName: input.firstName ?? undefined,
        unsubscribed: input.unsubscribed,
      });
      if (updated.error) {
        return fail(updated.error.message, updated.error.statusCode);
      }

      if (input.segmentId) {
        const added = await client.contacts.segments.add({
          email: input.email,
          segmentId: input.segmentId,
        });
        if (
          added.error &&
          !isAlreadyExists(added.error.statusCode, added.error.message)
        ) {
          return fail(added.error.message, added.error.statusCode);
        }
      }

      return { ok: true, id: existing.data.id };
    },

    async createBroadcast(input: CreateBroadcastInput) {
      const { data, error } = await client.broadcasts.create({
        name: input.name,
        from: input.from,
        subject: input.subject,
        html: input.html,
        text: input.text,
        previewText: input.previewText,
        segmentId: input.segmentId,
      });
      if (error) {
        return fail(error.message, error.statusCode);
      }
      if (!data?.id) {
        return fail("Resend no devolvió id de broadcast");
      }
      return { ok: true, id: data.id };
    },

    async sendBroadcast(id: string) {
      const { data, error } = await client.broadcasts.send(id);
      if (error) {
        return fail(error.message, error.statusCode);
      }
      if (!data?.id) {
        return { ok: true, id };
      }
      return { ok: true, id: data.id };
    },
  };
}
