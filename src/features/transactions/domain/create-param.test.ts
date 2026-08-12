import { describe, expect, it } from "vitest";

import {
  initialTypeFromCreateParam,
  isTransactionCreateParam,
} from "./create-param";

describe("transaction create query param (SPEC-20 H3)", () => {
  it("accepts legacy and shortcut values", () => {
    expect(isTransactionCreateParam("1")).toBe(true);
    expect(isTransactionCreateParam("transaction")).toBe(true);
    expect(isTransactionCreateParam("expense")).toBe(true);
    expect(isTransactionCreateParam("income")).toBe(true);
    expect(isTransactionCreateParam("fx")).toBe(false);
    expect(isTransactionCreateParam(null)).toBe(false);
  });

  it("maps shortcuts to form initial type", () => {
    expect(initialTypeFromCreateParam("expense")).toBe("expense");
    expect(initialTypeFromCreateParam("income")).toBe("income");
    expect(initialTypeFromCreateParam("1")).toBe("expense");
    expect(initialTypeFromCreateParam("transaction")).toBe("expense");
    expect(initialTypeFromCreateParam(null)).toBe("expense");
  });
});
