#!/usr/bin/env node
/**
 * Production release: SemVer bump from conventional commits + insert dated section.
 * Preserves existing CHANGELOG history (e.g. handcrafted 0.1.0 baseline).
 * Does not publish to npm. Git push / GitHub Release are CI's job.
 *
 * Usage:
 *   node scripts/release.mjs
 *   node scripts/release.mjs --plan
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maxSemver, planRelease } from './semver.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const changelogPath = join(root, 'CHANGELOG.md');
const dryRun = process.argv.includes('--dry-run');
const REPO = 'https://github.com/krivoox/finance-hub';

function sh(cmd, args) {
  return execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function hasReleaseTags() {
  return Boolean(maxTag());
}

function previousTag() {
  return maxTag();
}

function maxTag() {
  const tags = sh('git', ['tag', '--list', 'v[0-9]*'])
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
  return maxSemver(tags);
}

function cliffBumpedVersion() {
  try {
    return sh('npx', ['git-cliff', '--bumped-version']).replace(
      /\u001b\[[0-9;]*m/g,
      '',
    );
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.message || String(err);
    throw new Error(`Could not compute bumped version: ${msg}`);
  }
}

const wantPlan = process.argv.includes('--plan');
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const current = pkg.version;

if (!hasReleaseTags()) {
  if (wantPlan) {
    console.log(`CATCHUP v${current}`);
    process.exit(0);
  }
  console.log(
    `No SemVer tags yet. First production tag v${current} is created by the Release workflow on main (bootstrap).`,
  );
  console.log(`Suggested tag: v${current}`);
  process.exit(0);
}

let cliffNext;
try {
  cliffNext = cliffBumpedVersion();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const latestTag = maxTag();
const plan = planRelease({
  current,
  latestTag,
  cliffNext,
});

if (wantPlan) {
  console.log(plan.action === 'skip' ? 'SKIP' : `${plan.action.toUpperCase()} ${plan.tag}`);
  process.exit(0);
}

if (plan.action === 'skip') {
  console.log(
    `No SemVer bump (package ${current}, latest tag ${latestTag}, git-cliff ${cliffNext}). Skipping.`,
  );
  process.exit(0);
}

if (plan.action === 'catchup') {
  console.log(
    `Catch-up: package.json ${current} is ahead of latest tag ${latestTag}. Tag ${plan.tag} without rewriting changelog.`,
  );
  process.exit(0);
}

const nextTag = plan.tag;
const nextVersion = plan.version;

console.log(`Version: ${current} → ${nextVersion} (${nextTag})`);

if (dryRun) {
  process.exit(0);
}

const section = sh('npx', [
  'git-cliff',
  '--unreleased',
  '--tag',
  nextTag,
  '--strip',
  'header',
]);

if (!/^## \[/.test(section)) {
  console.error('git-cliff produced no release section:\n', section);
  process.exit(1);
}

pkg.version = nextVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const changelog = readFileSync(changelogPath, 'utf8');
const unreleasedStart = changelog.search(/^## \[Unreleased\]/m);
if (unreleasedStart === -1) {
  console.error('CHANGELOG.md is missing ## [Unreleased]');
  process.exit(1);
}

const afterUnreleased = changelog.slice(unreleasedStart);
const nextHeading = afterUnreleased.search(/^## \[[0-9]/m);
const before = changelog.slice(0, unreleasedStart);
const older =
  nextHeading === -1 ? '' : afterUnreleased.slice(nextHeading);

// Drop old footer compare links; rebuild below
const olderWithoutFooter = older.replace(/\n\[Unreleased\]:[\s\S]*$/m, '\n').trimEnd();

const prev = previousTag();
const footer = [
  '',
  `[Unreleased]: ${REPO}/compare/${nextTag}...HEAD`,
  prev
    ? `[${nextVersion}]: ${REPO}/compare/${prev}...${nextTag}`
    : `[${nextVersion}]: ${REPO}/releases/tag/${nextTag}`,
  // Keep prior version anchors if present in olderWithoutFooter text; append common ones
  `[0.1.0]: ${REPO}/releases/tag/v0.1.0`,
  '',
].join('\n');

const next = `${before}## [Unreleased]\n\n${section}\n\n${olderWithoutFooter}\n${footer}`;
writeFileSync(changelogPath, next.replace(/\n{3,}/g, '\n\n'));

console.log(`Updated package.json and CHANGELOG.md for ${nextTag}`);
console.log(nextTag);
