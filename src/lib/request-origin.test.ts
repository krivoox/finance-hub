import { describe, expect, it } from "vitest";

import { originFromForwardedHeaders } from "./request-origin";

const fallback = "https://app.example.com";

describe("originFromForwardedHeaders", () => {
  it("prefers the current host over the canonical auth URL (preview alias vs ephemeral)", () => {
    expect(
      originFromForwardedHeaders({
        host: "finance-cz5lgjeai-example.vercel.app",
        forwardedHost: "finance-hub-git-feat.vercel.app",
        forwardedProto: "https",
        fallbackOrigin: fallback,
      }),
    ).toBe("https://finance-hub-git-feat.vercel.app");
  });

  it("uses host when forwarded-host is missing", () => {
    expect(
      originFromForwardedHeaders({
        host: "finance-hub.vercel.app",
        forwardedHost: null,
        forwardedProto: "https",
        fallbackOrigin: fallback,
      }),
    ).toBe("https://finance-hub.vercel.app");
  });

  it("falls back to the canonical origin when no host is present", () => {
    expect(
      originFromForwardedHeaders({
        host: null,
        forwardedHost: null,
        forwardedProto: null,
        fallbackOrigin: `${fallback}/`,
      }),
    ).toBe("https://app.example.com");
  });

  it("uses http for localhost when proto is missing", () => {
    expect(
      originFromForwardedHeaders({
        host: "localhost:3000",
        forwardedHost: null,
        forwardedProto: null,
        fallbackOrigin: fallback,
      }),
    ).toBe("http://localhost:3000");
  });
});
