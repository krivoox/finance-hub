import type {
  EmailGateway,
  EmailSendResult,
  TransactionalSendInput,
} from "./gateway";

export type ConsoleGatewayOptions = {
  isProduction: boolean;
};

function logEmail(input: TransactionalSendInput): void {
  console.info(
    `[email] Dev log (Resend no configurado)\n` +
      `  to:      ${input.to}\n` +
      `  subject: ${input.subject}\n` +
      `  text:\n${input.text}`,
  );
}

/**
 * Fallback when `RESEND_API_KEY` is missing: log in development, refuse in
 * production. Never throws — public auth flows must not enumerate emails.
 */
export function createConsoleGateway(
  options: ConsoleGatewayOptions,
): EmailGateway {
  const notConfigured = (): EmailSendResult => ({
    ok: false,
    error: "resend_not_configured",
    retryable: false,
  });

  return {
    async sendTransactional(input) {
      if (options.isProduction) {
        console.error(
          `[email] RESEND_API_KEY missing; password reset not sent to ${input.to}`,
        );
        return notConfigured();
      }
      logEmail(input);
      return { ok: true, id: "dev-log" };
    },
    async upsertContact(input) {
      if (options.isProduction) {
        console.error(
          `[email] RESEND_API_KEY missing; contact not upserted (${input.email})`,
        );
        return notConfigured();
      }
      console.info(`[email] Dev contact upsert: ${input.email}`);
      return { ok: true, id: "dev-contact" };
    },
    async createBroadcast(input) {
      if (options.isProduction) {
        console.error("[email] RESEND_API_KEY missing; broadcast not created");
        return notConfigured();
      }
      console.info(
        `[email] Dev broadcast draft: ${input.name} / ${input.subject}`,
      );
      return { ok: true, id: "dev-broadcast" };
    },
    async sendBroadcast(id) {
      if (options.isProduction) {
        console.error("[email] RESEND_API_KEY missing; broadcast not sent");
        return notConfigured();
      }
      console.info(`[email] Dev broadcast send: ${id}`);
      return { ok: true, id };
    },
  };
}
