import { describe, expect, it } from "vitest";

import {
  isSwCacheableStaticPath,
  isSwForbiddenMoneyPath,
  shouldPrecachePath,
} from "./sw-cache-policy";

describe("sw-cache-policy (SPEC-20 H4)", () => {
  it("allows only hashed Next static assets", () => {
    expect(isSwCacheableStaticPath("/_next/static/chunks/app.js")).toBe(true);
    expect(isSwCacheableStaticPath("/_next/static/css/app.css")).toBe(true);
    expect(isSwCacheableStaticPath("/_next/image")).toBe(false);
    expect(isSwCacheableStaticPath("/offline")).toBe(false);
    expect(isSwCacheableStaticPath("/dashboard")).toBe(false);
  });

  it("flags API and money HTML paths as forbidden offline SoT", () => {
    expect(isSwForbiddenMoneyPath("/api/auth/session")).toBe(true);
    expect(isSwForbiddenMoneyPath("/dashboard")).toBe(true);
    expect(isSwForbiddenMoneyPath("/accounts")).toBe(true);
    expect(isSwForbiddenMoneyPath("/transactions?new=expense")).toBe(true);
    expect(isSwForbiddenMoneyPath("/transactions")).toBe(true);
    expect(isSwForbiddenMoneyPath("/offline")).toBe(false);
    expect(isSwForbiddenMoneyPath("/settings")).toBe(false);
  });

  it("precache list is offline-only", () => {
    expect(shouldPrecachePath("/offline")).toBe(true);
    expect(shouldPrecachePath("/dashboard")).toBe(false);
    expect(shouldPrecachePath("/_next/static/x")).toBe(false);
  });
});
