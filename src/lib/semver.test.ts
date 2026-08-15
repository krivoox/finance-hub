import { describe, expect, it } from "vitest";

import { compareSemver, maxSemver, parseSemver, planRelease } from "../../scripts/semver.mjs";

describe("compareSemver", () => {
  it("orders patch, minor, and major", () => {
    expect(compareSemver("0.14.0", "0.15.0")).toBeLessThan(0);
    expect(compareSemver("v0.15.0", "0.15.0")).toBe(0);
    expect(compareSemver("0.16.0", "0.15.0")).toBeGreaterThan(0);
    expect(parseSemver("v0.16.0")).toEqual([0, 16, 0]);
  });

  it("picks the highest tag, not git-describe nearest", () => {
    expect(maxSemver(["v0.14.0", "v0.15.0", "v0.13.0"])).toBe("v0.15.0");
  });
});

describe("planRelease", () => {
  it("catch-up when package.json is ahead of the latest tag", () => {
    expect(
      planRelease({
        current: "0.16.0",
        latestTag: "v0.15.0",
        cliffNext: "v0.14.0",
      }),
    ).toEqual({ action: "catchup", tag: "v0.16.0", version: "0.16.0" });
  });

  it("refuses to bump backwards when git-cliff skips an empty tag", () => {
    expect(
      planRelease({
        current: "0.15.0",
        latestTag: "v0.15.0",
        cliffNext: "v0.14.0",
      }),
    ).toEqual({ action: "skip", tag: "", version: "0.15.0" });
  });

  it("bumps when cliff is strictly ahead of package and tags", () => {
    expect(
      planRelease({
        current: "0.15.0",
        latestTag: "v0.15.0",
        cliffNext: "v0.16.0",
      }),
    ).toEqual({ action: "bump", tag: "v0.16.0", version: "0.16.0" });
  });
});

describe("compareSemver", () => {
  it("orders patch, minor, and major", () => {
    expect(compareSemver("0.14.0", "0.15.0")).toBeLessThan(0);
    expect(compareSemver("v0.15.0", "0.15.0")).toBe(0);
    expect(compareSemver("0.16.0", "0.15.0")).toBeGreaterThan(0);
    expect(parseSemver("v0.16.0")).toEqual([0, 16, 0]);
  });

  it("picks the highest tag, not git-describe nearest", () => {
    expect(maxSemver(["v0.14.0", "v0.15.0", "v0.13.0"])).toBe("v0.15.0");
  });
});
