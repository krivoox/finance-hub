import { describe, expect, it } from "vitest";

import {
  EMAIL_KIND,
  EMAIL_TEMPLATE,
  InvalidBroadcastContentError,
  InvalidEmailAddressError,
  InvalidFromAddressError,
  MarketingConsentRequiredError,
  MissingMarketingSegmentError,
  MissingResetUrlError,
  RESEND_UNSUBSCRIBE_PLACEHOLDER,
  assertValidFromAddress,
  buildIdempotencyKey,
  buildPasswordResetEmail,
  escapeHtml,
  kindForTemplate,
  normalizeEmail,
  normalizeMarketingSubscribe,
  parseFromAddress,
  passwordResetIdempotencyKey,
  prepareMarketingBroadcast,
} from "./index";

describe("email kinds (SPEC-21)", () => {
  it("classifies password reset as transactional", () => {
    expect(kindForTemplate(EMAIL_TEMPLATE.passwordReset)).toBe(
      EMAIL_KIND.transactional,
    );
  });

  it("classifies product updates as marketing", () => {
    expect(kindForTemplate(EMAIL_TEMPLATE.productUpdates)).toBe(
      EMAIL_KIND.marketing,
    );
  });
});

describe("from address", () => {
  it("parses named from addresses", () => {
    expect(parseFromAddress("Finance Hub <hello@krivoox.com>")).toEqual({
      name: "Finance Hub",
      email: "hello@krivoox.com",
      formatted: "Finance Hub <hello@krivoox.com>",
    });
  });

  it("parses a bare email", () => {
    expect(parseFromAddress("hello@krivoox.com").email).toBe(
      "hello@krivoox.com",
    );
  });

  it("rejects empty or malformed values", () => {
    expect(() => assertValidFromAddress("")).toThrow(InvalidFromAddressError);
    expect(() => assertValidFromAddress("Finance Hub")).toThrow(
      InvalidFromAddressError,
    );
    expect(() => assertValidFromAddress("Name <not-an-email>")).toThrow(
      InvalidFromAddressError,
    );
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ana@Ejemplo.com ")).toBe("ana@ejemplo.com");
  });

  it("rejects invalid emails", () => {
    expect(() => normalizeEmail("nope")).toThrow(InvalidEmailAddressError);
    expect(() => normalizeEmail("")).toThrow(InvalidEmailAddressError);
  });
});

describe("idempotency keys", () => {
  it("uses event-type/entity-id[/qualifier]", () => {
    expect(
      buildIdempotencyKey({
        eventType: "password-reset",
        entityId: "user-1",
        qualifier: "tok123",
      }),
    ).toBe("password-reset/user-1/tok123");
  });

  it("keeps the same reset token stable and a new token distinct", () => {
    const tokenA = "aaaaaaaaaaaaaaaa-rest";
    const tokenB = "bbbbbbbbbbbbbbbb-rest";
    const first = passwordResetIdempotencyKey({
      userId: "user-1",
      token: tokenA,
    });
    const retry = passwordResetIdempotencyKey({
      userId: "user-1",
      token: tokenA,
    });
    const nextRequest = passwordResetIdempotencyKey({
      userId: "user-1",
      token: tokenB,
    });

    expect(first).toBe(retry);
    expect(nextRequest).not.toBe(first);
    expect(first.length).toBeLessThanOrEqual(256);
  });
});

describe("buildPasswordResetEmail (SPEC-01 FR-06 / SPEC-21 T-01)", () => {
  const email = buildPasswordResetEmail({
    email: "ana@ejemplo.com",
    displayName: "Ana",
    resetUrl: "https://finance.krivoox.com/reset-password?token=abc",
  });

  it("is transactional and actionable", () => {
    expect(email.kind).toBe(EMAIL_KIND.transactional);
    expect(email.template).toBe(EMAIL_TEMPLATE.passwordReset);
    expect(email.subject).toContain("contraseña");
    expect(email.subject).toContain("Finance Hub");
    expect(email.preview).toMatch(/vence/i);
  });

  it("includes the reset URL in html and text", () => {
    expect(email.html).toContain(
      "https://finance.krivoox.com/reset-password?token=abc",
    );
    expect(email.text).toContain(
      "https://finance.krivoox.com/reset-password?token=abc",
    );
    expect(email.html).toContain("Restablecer contraseña");
  });

  it("explains how to ignore an unsolicited reset and does not add marketing unsubscribe", () => {
    expect(email.html).toMatch(/si no pediste/i);
    expect(email.text).toMatch(/si no pediste/i);
    expect(email.html).not.toContain(RESEND_UNSUBSCRIBE_PLACEHOLDER);
  });

  it("escapes untrusted display names", () => {
    const rendered = buildPasswordResetEmail({
      email: "ana@ejemplo.com",
      displayName: `<img src=x onerror=alert(1)>`,
      resetUrl: "https://example.com/reset",
    });
    expect(rendered.html).not.toContain("<img src=x");
    expect(rendered.html).toContain(escapeHtml(`<img src=x onerror=alert(1)>`));
  });

  it("rejects a missing or non-http reset URL", () => {
    expect(() =>
      buildPasswordResetEmail({
        email: "ana@ejemplo.com",
        resetUrl: "",
      }),
    ).toThrow(MissingResetUrlError);
    expect(() =>
      buildPasswordResetEmail({
        email: "ana@ejemplo.com",
        resetUrl: "javascript:alert(1)",
      }),
    ).toThrow(MissingResetUrlError);
  });
});

describe("marketing subscribe (SPEC-21 T-04)", () => {
  it("requires explicit opt-in", () => {
    expect(() =>
      normalizeMarketingSubscribe({
        email: "ana@ejemplo.com",
        explicitOptIn: false,
      }),
    ).toThrow(MarketingConsentRequiredError);
  });

  it("normalizes a consented subscriber", () => {
    expect(
      normalizeMarketingSubscribe({
        email: "  Ana@Ejemplo.com ",
        explicitOptIn: true,
        firstName: " Ana ",
      }),
    ).toEqual({
      kind: EMAIL_KIND.marketing,
      template: EMAIL_TEMPLATE.productUpdates,
      email: "ana@ejemplo.com",
      firstName: "Ana",
      unsubscribed: false,
      topic: "product_updates",
    });
  });
});

describe("marketing broadcast (SPEC-21 T-05)", () => {
  it("requires a segment id", () => {
    expect(() =>
      prepareMarketingBroadcast({
        name: "Mayo",
        subject: "Novedades",
        htmlBody: "<p>Hola</p>",
        segmentId: "  ",
      }),
    ).toThrow(MissingMarketingSegmentError);
  });

  it("injects the Resend unsubscribe placeholder when missing", () => {
    const prepared = prepareMarketingBroadcast({
      name: "Mayo",
      subject: "Novedades de Finance Hub",
      htmlBody: "<p>Hola hogar</p>",
      segmentId: "seg_123",
    });
    expect(prepared.kind).toBe(EMAIL_KIND.marketing);
    expect(prepared.html).toContain(RESEND_UNSUBSCRIBE_PLACEHOLDER);
    expect(prepared.html).toMatch(/darse de baja/i);
    expect(prepared.segmentId).toBe("seg_123");
  });

  it("keeps an existing unsubscribe placeholder", () => {
    const html = `<p>Hola</p><a href="${RESEND_UNSUBSCRIBE_PLACEHOLDER}">Salir</a>`;
    const prepared = prepareMarketingBroadcast({
      name: "Mayo",
      subject: "Novedades",
      htmlBody: html,
      segmentId: "seg_123",
    });
    expect(prepared.html).toBe(html);
  });

  it("rejects empty content", () => {
    expect(() =>
      prepareMarketingBroadcast({
        name: "",
        subject: "Novedades",
        htmlBody: "<p>Hola</p>",
        segmentId: "seg_123",
      }),
    ).toThrow(InvalidBroadcastContentError);
  });
});
