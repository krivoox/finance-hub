import { describe, expect, it } from "vitest";

import {
  EMAIL_KIND,
  EMAIL_TEMPLATE,
  MarketingConsentRequiredError,
  MissingMarketingSegmentError,
  RESEND_UNSUBSCRIBE_PLACEHOLDER,
} from "@/features/email/domain";
import type {
  CreateBroadcastInput,
  EmailGateway,
  EmailSendResult,
  TransactionalSendInput,
  UpsertContactInput,
} from "./gateway";
import {
  sendMarketingBroadcast,
  sendPasswordResetEmail,
  subscribeMarketingContact,
} from "./send";

function createFakeGateway(): EmailGateway & {
  transactional: TransactionalSendInput[];
  contacts: UpsertContactInput[];
  broadcasts: CreateBroadcastInput[];
  sentBroadcastIds: string[];
  failNext: boolean;
} {
  const gateway: EmailGateway & {
    transactional: TransactionalSendInput[];
    contacts: UpsertContactInput[];
    broadcasts: CreateBroadcastInput[];
    sentBroadcastIds: string[];
    failNext: boolean;
  } = {
    transactional: [],
    contacts: [],
    broadcasts: [],
    sentBroadcastIds: [],
    failNext: false,
    async sendTransactional(input) {
      gateway.transactional.push(input);
      return maybeFail("email_1");
    },
    async upsertContact(input) {
      gateway.contacts.push(input);
      return maybeFail("contact_1");
    },
    async createBroadcast(input) {
      gateway.broadcasts.push(input);
      return maybeFail("bc_1");
    },
    async sendBroadcast(id) {
      gateway.sentBroadcastIds.push(id);
      return maybeFail(id);
    },
  };

  const maybeFail = (id: string): EmailSendResult => {
    if (gateway.failNext) {
      gateway.failNext = false;
      return { ok: false, error: "resend_down", retryable: true };
    }
    return { ok: true, id };
  };

  return gateway;
}

const FROM = "Finance Hub <hello@krivoox.com>";

describe("sendPasswordResetEmail (SPEC-21 T-01)", () => {
  it("sends a transactional email with idempotency key and reset URL", async () => {
    const gateway = createFakeGateway();
    const result = await sendPasswordResetEmail(
      {
        user: { id: "user-1", email: "Ana@Ejemplo.com", name: "Ana" },
        url: "https://app.example/reset-password?token=tok",
        token: "token-aaaaaaaaaaaa",
      },
      { gateway, from: FROM },
    );

    expect(result).toEqual({ ok: true, id: "email_1" });
    expect(gateway.transactional).toHaveLength(1);
    const sent = gateway.transactional[0];
    expect(sent?.to).toBe("ana@ejemplo.com");
    expect(sent?.from).toBe(FROM);
    expect(sent?.subject).toContain("contraseña");
    expect(sent?.html).toContain(
      "https://app.example/reset-password?token=tok",
    );
    expect(sent?.text).toContain(
      "https://app.example/reset-password?token=tok",
    );
    expect(sent?.idempotencyKey).toBe("password-reset/user-1/token-aaaaaaaaaa");
    expect(sent?.tags).toEqual(
      expect.arrayContaining([
        { name: "kind", value: EMAIL_KIND.transactional },
        { name: "template", value: EMAIL_TEMPLATE.passwordReset },
      ]),
    );
  });

  it("returns the gateway error without throwing (no email enumeration)", async () => {
    const gateway = createFakeGateway();
    gateway.failNext = true;
    const result = await sendPasswordResetEmail(
      {
        user: { id: "user-1", email: "ana@ejemplo.com" },
        url: "https://app.example/reset",
        token: "tok",
      },
      { gateway, from: FROM },
    );
    expect(result.ok).toBe(false);
  });
});

describe("subscribeMarketingContact (SPEC-21 T-04)", () => {
  it("upserts a consented contact onto the marketing segment", async () => {
    const gateway = createFakeGateway();
    const result = await subscribeMarketingContact(
      { email: "Ana@Ejemplo.com", explicitOptIn: true, firstName: "Ana" },
      { gateway, from: FROM, segmentId: "seg_news" },
    );
    expect(result.ok).toBe(true);
    expect(gateway.contacts[0]).toEqual({
      email: "ana@ejemplo.com",
      firstName: "Ana",
      unsubscribed: false,
      segmentId: "seg_news",
    });
  });

  it("does not upsert without explicit opt-in", async () => {
    const gateway = createFakeGateway();
    await expect(
      subscribeMarketingContact(
        { email: "ana@ejemplo.com", explicitOptIn: false },
        { gateway, from: FROM },
      ),
    ).rejects.toBeInstanceOf(MarketingConsentRequiredError);
    expect(gateway.contacts).toHaveLength(0);
  });
});

describe("sendMarketingBroadcast (SPEC-21 T-05)", () => {
  it("creates then sends a broadcast with unsubscribe URL", async () => {
    const gateway = createFakeGateway();
    const result = await sendMarketingBroadcast(
      {
        name: "Mayo",
        subject: "Novedades de Finance Hub",
        htmlBody: "<p>Hola hogar</p>",
        segmentId: "seg_news",
      },
      { gateway, from: FROM },
    );

    expect(result).toEqual({ ok: true, id: "bc_1" });
    expect(gateway.broadcasts[0]?.html).toContain(
      RESEND_UNSUBSCRIBE_PLACEHOLDER,
    );
    expect(gateway.sentBroadcastIds).toEqual(["bc_1"]);
  });

  it("does not send if create fails", async () => {
    const gateway = createFakeGateway();
    gateway.failNext = true;
    const result = await sendMarketingBroadcast(
      {
        name: "Mayo",
        subject: "Novedades",
        htmlBody: "<p>Hola</p>",
        segmentId: "seg_news",
      },
      { gateway, from: FROM },
    );
    expect(result.ok).toBe(false);
    expect(gateway.sentBroadcastIds).toHaveLength(0);
  });

  it("refuses to send without a segment", async () => {
    const gateway = createFakeGateway();
    await expect(
      sendMarketingBroadcast(
        {
          name: "Mayo",
          subject: "Novedades",
          htmlBody: "<p>Hola</p>",
        },
        { gateway, from: FROM },
      ),
    ).rejects.toBeInstanceOf(MissingMarketingSegmentError);
  });
});
