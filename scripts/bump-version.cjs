"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const VALID_BUMPS = new Set(["patch", "minor", "major"]);

function parseVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) {
    throw new Error(
      `Expected a stable semantic version in X.Y.Z format, received: ${version}`,
    );
  }

  const parts = match.slice(1).map(Number);
  if (!parts.every(Number.isSafeInteger)) {
    throw new Error(`Version components must be safe integers: ${version}`);
  }

  return parts;
}

function bumpVersion(version, bump) {
  if (!VALID_BUMPS.has(bump)) {
    throw new Error(`Unsupported bump type: ${bump}`);
  }

  const [major, minor, patch] = parseVersion(version);
  const next = {
    patch: [major, minor, patch + 1],
    minor: [major, minor + 1, 0],
    major: [major + 1, 0, 0],
  }[bump];

  if (!next.every(Number.isSafeInteger)) {
    throw new Error(`Version bump exceeds the safe integer range: ${version}`);
  }

  return next.join(".");
}

function updateRootPackageVersion(bump, rootDir = process.cwd()) {
  const packagePath = path.join(rootDir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  manifest.version = bumpVersion(manifest.version, bump);
  fs.writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest.version;
}

function readPackageAtRef(ref, rootDir) {
  const contents = execFileSync("git", ["show", `${ref}:package.json`], {
    cwd: rootDir,
    encoding: "utf8",
  });
  return JSON.parse(contents);
}

function isVersionOnlyChange(baseRef, headRef, rootDir = process.cwd()) {
  const changedPaths = execFileSync(
    "git",
    ["diff", "--name-only", baseRef, headRef],
    {
      cwd: rootDir,
      encoding: "utf8",
    },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (changedPaths.length !== 1 || changedPaths[0] !== "package.json") {
    return false;
  }

  const baseManifest = readPackageAtRef(baseRef, rootDir);
  const headManifest = readPackageAtRef(headRef, rootDir);
  const baseVersion = baseManifest.version;
  const headVersion = headManifest.version;
  delete baseManifest.version;
  delete headManifest.version;

  return (
    baseVersion !== headVersion &&
    JSON.stringify(baseManifest) === JSON.stringify(headManifest)
  );
}

function main(args) {
  if (args[0] === "--is-version-only") {
    if (!args[1] || !args[2]) {
      throw new Error(
        "Usage: bump-version.cjs --is-version-only <base-ref> <head-ref>",
      );
    }
    process.stdout.write(`${isVersionOnlyChange(args[1], args[2])}\n`);
    return;
  }

  const bump = args[0];
  if (!bump || args.length !== 1) {
    throw new Error("Usage: bump-version.cjs <patch|minor|major>");
  }

  process.stdout.write(`${updateRootPackageVersion(bump)}\n`);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = {
  bumpVersion,
  isVersionOnlyChange,
  updateRootPackageVersion,
};
