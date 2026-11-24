"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  bumpVersion,
  isVersionOnlyChange,
  updateRootPackageVersion,
} = require("./bump-version.cjs");

function createGitWorkspace(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "kgpay-version-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  execFileSync("git", ["init", "-q"], { cwd: rootDir });
  execFileSync("git", ["config", "user.name", "Version Bump Test"], {
    cwd: rootDir,
  });
  execFileSync("git", ["config", "user.email", "version-bump@example.test"], {
    cwd: rootDir,
  });

  return rootDir;
}

function commitAll(rootDir, message) {
  execFileSync("git", ["add", "--all"], { cwd: rootDir });
  execFileSync("git", ["commit", "-q", "-m", message], { cwd: rootDir });
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();
}

test("bumps patch, minor, and major versions with semantic resets", () => {
  assert.equal(bumpVersion("1.0.9", "patch"), "1.0.10");
  assert.equal(bumpVersion("1.1.10", "minor"), "1.2.0");
  assert.equal(bumpVersion("1.61.0", "major"), "2.0.0");
});

test("rejects unsupported bump types and non-stable versions", () => {
  assert.throws(() => bumpVersion("1.0.0", "higher"), /Unsupported bump type/);
  assert.throws(
    () => bumpVersion("1.0.0-rc.1", "patch"),
    /stable semantic version/,
  );
  assert.throws(
    () => bumpVersion("01.0.0", "patch"),
    /stable semantic version/,
  );
});

test("updates only the root package version", (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "kgpay-manifest-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  const manifestPath = path.join(rootDir, "package.json");
  const original = { name: "kgpay", version: "0.0.0", private: true };
  fs.writeFileSync(manifestPath, `${JSON.stringify(original, null, 2)}\n`);

  assert.equal(updateRootPackageVersion("patch", rootDir), "0.0.1");
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")), {
    ...original,
    version: "0.0.1",
  });
});

test("recognizes version-only commits to prevent workflow loops", (t) => {
  const rootDir = createGitWorkspace(t);
  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "kgpay", version: "1.0.0", private: true }, null, 2)}\n`,
  );
  const baseRef = commitAll(rootDir, "initial");

  fs.writeFileSync(
    path.join(rootDir, "package.json"),
    `${JSON.stringify({ name: "kgpay", version: "1.0.1", private: true }, null, 2)}\n`,
  );
  const versionOnlyRef = commitAll(rootDir, "version bump");
  assert.equal(isVersionOnlyChange(baseRef, versionOnlyRef, rootDir), true);

  fs.writeFileSync(path.join(rootDir, "README.md"), "A project change\n");
  const projectChangeRef = commitAll(rootDir, "project change");
  assert.equal(
    isVersionOnlyChange(versionOnlyRef, projectChangeRef, rootDir),
    false,
  );
});
