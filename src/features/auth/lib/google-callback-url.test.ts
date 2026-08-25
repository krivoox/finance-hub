import { describe, expect, it } from "vitest";
import { resolveGoogleCallbackURL } from "@/features/auth/lib/google-callback-url";

describe("resolveGoogleCallbackURL", () => {
  it("uses onboarding for register", () => {
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
