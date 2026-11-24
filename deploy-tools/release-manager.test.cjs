"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  applyRelease,
  createReleaseId,
  validateArchiveEntries,
} = require("./release-manager.cjs");

function createReleaseArchive(t, rootDir, commit = "a".repeat(40)) {
  const sourceDir = path.join(rootDir, "source");
  const archive = path.join(rootDir, "incoming.tar.gz");
  const files = {
    "manifest.json": JSON.stringify({ commit, ref: "main", version: "0.0.1" }),
    "apps/customer-portal/dist/index.html": "<html>customer</html>",
    "apps/staff-portal/dist/index.html": "<html>staff</html>",
    "services/auth-service/package.json": JSON.stringify({
      name: "auth-service",
    }),
    "services/auth-service/dist/main.js": "module.exports = {};",
    "services/auth-service/node_modules/@kgpay/contracts/package.json": "{}",
    "services/auth-service/node_modules/@nestjs/core/package.json": "{}",
    "services/auth-service/node_modules/@prisma/client/package.json": "{}",
    "services/auth-service/prisma/schema.prisma": "datasource db {}",
    "services/auth-service/prisma/migrations/migration_lock.toml":
      'provider = "postgresql"',
    "services/auth-service/prisma/migrations/20261122000000_init/migration.sql":
      "CREATE TABLE test (id integer);",
    "packages/contracts/dist/index.js": "module.exports = {};",
  };

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(sourceDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
  execFileSync("tar", ["-czf", archive, "-C", sourceDir, "."]);
  return archive;
}

function createTempDirectory(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "kgpay-release-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  return rootDir;
}

test("release promotion keeps a dated history and atomically updates dist", (t) => {
  const tempDir = createTempDirectory(t);
  const commit = "a".repeat(40);
  const archive = createReleaseArchive(t, tempDir, commit);
  const deployRoot = path.join(tempDir, "planet-host");
  const now = new Date("2026-11-24T17:00:00.000Z");

  const result = applyRelease({
    archive,
    deployRoot,
    expectedCommit: commit,
    now,
  });

  assert.equal(result.releaseId, "20261124T170000Z");
  assert.equal(result.manifest.ref, "main");
  assert.equal(
    fs.readFileSync(
      path.join(
        deployRoot,
        "dist",
        "apps",
        "customer-portal",
        "dist",
        "index.html",
      ),
      "utf8",
    ),
    "<html>customer</html>",
  );
  assert.equal(
    fs.existsSync(
      path.join(
        deployRoot,
        "dist",
        "services",
        "auth-service",
        "node_modules",
        "@nestjs",
        "core",
        "package.json",
      ),
    ),
    true,
  );
  assert.equal(
    fs.readFileSync(
      path.join(
        deployRoot,
        "local-builds",
        result.releaseId,
        "services",
        "auth-service",
        "dist",
        "main.js",
      ),
      "utf8",
    ),
    "module.exports = {};",
  );
  assert.equal(
    fs.existsSync(
      path.join(deployRoot, "local-builds", result.releaseId, ".env"),
    ),
    false,
  );
});

test("release promotion retains only the five newest dated releases", (t) => {
  const tempDir = createTempDirectory(t);
  const commit = "a".repeat(40);
  const archive = createReleaseArchive(t, tempDir, commit);
  const deployRoot = path.join(tempDir, "planet-host");
  const historyDir = path.join(deployRoot, "local-builds");
  fs.mkdirSync(historyDir, { recursive: true });
  const olderIds = [
    "20261119T120000Z",
    "20261120T120000Z",
    "20261121T120000Z",
    "20261122T120000Z",
    "20261123T120000Z",
  ];
  for (const releaseId of olderIds) {
    fs.mkdirSync(path.join(historyDir, releaseId));
  }
  fs.mkdirSync(path.join(historyDir, "keep-manual-notes"));

  const result = applyRelease({
    archive,
    deployRoot,
    expectedCommit: commit,
    now: new Date("2026-11-24T17:00:00.000Z"),
  });

  assert.equal(result.retainedReleaseIds.length, 5);
  assert.equal(fs.existsSync(path.join(historyDir, olderIds[0])), false);
  assert.equal(fs.existsSync(path.join(historyDir, olderIds[1])), true);
  assert.equal(fs.existsSync(path.join(historyDir, "keep-manual-notes")), true);
});

test("release promotion rejects an archive that does not match the requested commit", (t) => {
  const tempDir = createTempDirectory(t);
  const archive = createReleaseArchive(t, tempDir, "a".repeat(40));

  assert.throws(
    () =>
      applyRelease({
        archive,
        deployRoot: path.join(tempDir, "planet-host"),
        expectedCommit: "b".repeat(40),
      }),
    /does not match the requested deployment commit/,
  );
});

test("release metadata uses a UTC date identifier and rejects unsafe archive paths", () => {
  assert.equal(
    createReleaseId(new Date("2026-11-24T17:00:00.000Z")),
    "20261124T170000Z",
  );
  assert.throws(
    () => validateArchiveEntries(["./manifest.json", "../outside.txt"]),
    /Unsafe or forbidden/,
  );
  assert.throws(
    () => validateArchiveEntries(["./manifest.json", "./.env"]),
    /Unsafe or forbidden/,
  );
  assert.throws(
    () =>
      validateArchiveEntries([
        "./manifest.json",
        "./apps/customer-portal/node_modules/package.json",
      ]),
    /Unsafe or forbidden/,
  );
  assert.deepEqual(
    validateArchiveEntries([
      "./manifest.json",
      "./services/auth-service/node_modules/@nestjs/core/package.json",
    ]),
    [
      "manifest.json",
      "services/auth-service/node_modules/@nestjs/core/package.json",
    ],
  );
});
