/**
 * SemVer helpers for the release workflow. No prerelease / build metadata.
 */

export function parseSemver(version) {
  const normalized = String(version).replace(/^v/, "");
  const [major, minor, patch] = normalized.split(".").map((part) => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
  return [major, minor, patch];
}

/** @returns {number} negative if a < b, 0 if equal, positive if a > b */
export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

export function maxSemver(versions) {
  let best = null;
  for (const version of versions) {
    if (!version) continue;
    if (best == null || compareSemver(version, best) > 0) {
      best = version;
    }
  }
  return best;
}

/**
 * git-cliff --bumped-version can return an *older* tag when a later tag has
 * no conventional commits (empty release). Never go backwards.
 *
 * catchup: package.json is already ahead of the highest git tag (manual fix).
 * bump: cliff next is strictly greater than package.json and latest tag.
 * skip: nothing to do.
 */
export function planRelease({ current, latestTag, cliffNext }) {
  const latest = latestTag ? String(latestTag).replace(/^v/, "") : null;
  const cliff = cliffNext ? String(cliffNext).replace(/^v/, "") : null;

  if (latest && compareSemver(current, latest) > 0) {
    return { action: "catchup", tag: `v${current}`, version: current };
  }

  const floor = maxSemver([current, latest].filter(Boolean));
  if (cliff && floor && compareSemver(cliff, floor) > 0) {
    return { action: "bump", tag: `v${cliff}`, version: cliff };
  }

  return { action: "skip", tag: "", version: current };
}
