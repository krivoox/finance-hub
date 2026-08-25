import { describe, expect, it } from "vitest";

import {
  parseShellLayout,
  readShellLayoutCookie,
  resolveShellLayout,
  shellLayoutFromMatchMedia,
} from "./shell-layout";

describe("shell layout cookie", () => {
  it("parses compact and full only", () => {
    expect(parseShellLayout("compact")).toBe("compact");
    expect(parseShellLayout("full")).toBe("full");
    expect(parseShellLayout("desktop")).toBeNull();
    expect(parseShellLayout("")).toBeNull();
  });

  it("defaults missing cookie to compact (mobile-first)", () => {
    expect(resolveShellLayout(undefined)).toBe("compact");
    expect(resolveShellLayout("full")).toBe("full");
  });

  it("maps md matchMedia to full", () => {
    expect(shellLayoutFromMatchMedia(false)).toBe("compact");
    expect(shellLayoutFromMatchMedia(true)).toBe("full");
  });

  it("reads fh-shell from a document.cookie header", () => {
    expect(readShellLayoutCookie("fh-shell=full; fh-workspace-id=abc")).toBe(
      "full",
    );
    expect(readShellLayoutCookie("sidebar_state=true; fh-shell=compact")).toBe(
      "compact",
    );
    expect(readShellLayoutCookie("fh-workspace-id=abc")).toBeNull();
  });
});
