import { describe, expect, it } from "vitest";
import { resolveGoogleCallbackURL } from "@/features/auth/lib/google-callback-url";

describe("resolveGoogleCallbackURL", () => {
  it("prefers invite token path", () => {
    expect(
      resolveGoogleCallbackURL({
        mode: "login",
        inviteToken: "tok-1",
        callbackUrl: "/dashboard",
      }),
    ).toBe("/invitaciones/tok-1");
  });

  it("uses onboarding for register without invite", () => {
    expect(resolveGoogleCallbackURL({ mode: "register" })).toBe("/onboarding");
  });

  it("uses safe relative callback on login", () => {
    expect(
      resolveGoogleCallbackURL({
        mode: "login",
        callbackUrl: "/cuentas",
      }),
    ).toBe("/cuentas");
  });

  it("defaults login to dashboard", () => {
    expect(resolveGoogleCallbackURL({ mode: "login" })).toBe("/dashboard");
  });
});
