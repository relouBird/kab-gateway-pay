"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const MAX_RELEASES = 5;
const RELEASE_ID_PATTERN = /^\d{8}T\d{6}Z$/;

function fail(message) {
  throw new Error(message);
}

function createReleaseId(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    fail("A valid release date is required.");
  }
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function normalizeArchiveEntry(entry) {
  return entry.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function validateArchiveEntries(entries) {
  const normalized = entries.map(normalizeArchiveEntry).filter(Boolean);

  for (const entry of normalized) {
    const segments = entry.split("/");
    const isAuthServiceRuntimeDependency =
      entry === "services/auth-service/node_modules" ||
      entry.startsWith("services/auth-service/node_modules/");
    if (
      entry.startsWith("/") ||
      /^[A-Za-z]:/.test(entry) ||
      segments.includes("..") ||
      segments.some(
        (segment) =>
          (segment === "node_modules" && !isAuthServiceRuntimeDependency) ||
          segment === ".env" ||
          segment.startsWith(".env."),
      )
    ) {
      fail(`Unsafe or forbidden archive entry: ${entry}`);
    }
  }

  if (!normalized.includes("manifest.json")) {
    fail("The archive does not contain manifest.json.");
  }
  return normalized;
}

function readManifest(releaseDir) {
  let manifest;
  try {
    manifest = JSON.parse(
      fs.readFileSync(path.join(releaseDir, "manifest.json"), "utf8"),
    );
  } catch (error) {
    fail(`Cannot read release manifest: ${error.message}`);
  }

  if (!manifest || !/^[0-9a-f]{40}$/i.test(manifest.commit)) {
    fail("The release manifest must contain a full commit identifier.");
  }
  if (manifest.ref !== "main") {
    fail("Only artifacts built from main can be promoted to PlanetHoster.");
  }
  if (typeof manifest.version !== "string" || !manifest.version) {
    fail("The release manifest must contain a version.");
  }
  return manifest;
}

function assertFile(rootDir, relativePath) {
  const filePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Required release file is missing: ${relativePath}`);
  }
}

function validateReleaseDirectory(releaseDir) {
  const manifest = readManifest(releaseDir);
  for (const relativePath of [
    "apps/customer-portal/dist/index.html",
    "apps/customer-portal/dist/favicon.svg",
    "apps/staff-portal/dist/index.html",
    "apps/staff-portal/dist/favicon.svg",
    "services/auth-service/package.json",
    "services/auth-service/dist/main.js",
    "services/auth-service/dist/cli/bootstrap-super-admin.js",
    "services/auth-service/node_modules/@kgpay/contracts/package.json",
    "services/auth-service/node_modules/@nestjs/core/package.json",
    "services/auth-service/node_modules/@prisma/client/package.json",
    "services/auth-service/prisma/schema.prisma",
    "services/auth-service/prisma/migrations/migration_lock.toml",
  ]) {
    assertFile(releaseDir, relativePath);
  }

  const migrationsDir = path.join(
    releaseDir,
    "services",
    "auth-service",
    "prisma",
    "migrations",
  );
  if (
    !fs.existsSync(migrationsDir) ||
    !fs.statSync(migrationsDir).isDirectory() ||
    !fs.readdirSync(migrationsDir, { withFileTypes: true }).some((entry) => {
      if (!entry.isDirectory()) return false;
      return fs.existsSync(
        path.join(migrationsDir, entry.name, "migration.sql"),
      );
    })
  ) {
    fail("The release must contain at least one auth-service migration.");
  }

  const contractsDir = path.join(releaseDir, "packages", "contracts", "dist");
  if (
    !fs.existsSync(contractsDir) ||
    !fs.statSync(contractsDir).isDirectory()
  ) {
    fail("Required release directory is missing: packages/contracts/dist");
  }
  return manifest;
}

function listReleaseIds(historyDir) {
  return fs
    .readdirSync(historyDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && RELEASE_ID_PATTERN.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
}

function pruneHistory(historyDir) {
  const releaseIds = listReleaseIds(historyDir);
  const removeIds = releaseIds.slice(
    0,
    Math.max(0, releaseIds.length - MAX_RELEASES),
  );
  for (const releaseId of removeIds) {
    fs.rmSync(path.join(historyDir, releaseId), {
      recursive: true,
      force: false,
    });
  }
  return releaseIds.slice(removeIds.length);
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (
      option !== "--archive" &&
      option !== "--deploy-root" &&
      option !== "--commit"
    ) {
      fail(`Unknown option ${option}.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`${option} requires a value.`);
    }
    options[
      option.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    ] = value;
    index += 1;
  }
  if (!options.archive || !options.deployRoot || !options.commit) {
    fail("--archive, --deploy-root, and --commit are required.");
  }
  if (!/^[0-9a-f]{40}$/i.test(options.commit)) {
    fail("--commit must be a full 40-character commit identifier.");
  }
  return options;
}

function applyRelease({
  archive,
  deployRoot,
  expectedCommit,
  now = new Date(),
}) {
  if (
    !path.isAbsolute(archive) ||
    !fs.existsSync(archive) ||
    !fs.statSync(archive).isFile()
  ) {
    fail("The archive must be an existing absolute file path.");
  }
  if (!path.isAbsolute(deployRoot)) {
    fail("--deploy-root must be an absolute path.");
  }

  const rootDir = path.resolve(deployRoot);
  if (rootDir === path.parse(rootDir).root) {
    fail("--deploy-root cannot be a filesystem root.");
  }

  const releaseId = createReleaseId(now);
  const incomingDir = path.join(rootDir, "incoming");
  const historyDir = path.join(rootDir, "local-builds");
  const distDir = path.join(rootDir, "dist");
  const lockDir = path.join(rootDir, ".kgpay-deploy.lock");
  const stagingDir = path.join(incomingDir, `.staging-${releaseId}`);
  const releaseDir = path.join(historyDir, releaseId);
  const nextDistDir = path.join(rootDir, `.dist-next-${releaseId}`);
  const previousDistDir = path.join(rootDir, `.dist-previous-${releaseId}`);
  let lockCreated = false;
  let previousDistMoved = false;

  fs.mkdirSync(rootDir, { recursive: true });
  try {
    fs.mkdirSync(lockDir);
    lockCreated = true;
  } catch (error) {
    if (error.code === "EEXIST") {
      fail("Another PlanetHoster release is already running.");
    }
    throw error;
  }

  try {
    fs.mkdirSync(incomingDir, { recursive: true });
    fs.mkdirSync(historyDir, { recursive: true });
    if (
      fs.existsSync(releaseDir) ||
      fs.existsSync(stagingDir) ||
      fs.existsSync(nextDistDir)
    ) {
      fail(`Release target already exists: ${releaseId}`);
    }

    const entries = execFileSync("tar", ["-tzf", path.resolve(archive)], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    })
      .split(/\r?\n/)
      .filter(Boolean);
    validateArchiveEntries(entries);

    fs.mkdirSync(stagingDir);
    execFileSync("tar", ["-xzf", path.resolve(archive), "-C", stagingDir], {
      stdio: "inherit",
    });
    const manifest = validateReleaseDirectory(stagingDir);
    if (
      !/^[0-9a-f]{40}$/i.test(expectedCommit) ||
      manifest.commit.toLowerCase() !== expectedCommit.toLowerCase()
    ) {
      fail(
        "The archive commit does not match the requested deployment commit.",
      );
    }

    fs.renameSync(stagingDir, releaseDir);
    fs.cpSync(releaseDir, nextDistDir, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });

    if (fs.existsSync(distDir)) {
      if (!fs.statSync(distDir).isDirectory()) {
        fail("The current dist path exists but is not a directory.");
      }
      if (fs.existsSync(previousDistDir)) {
        fail(
          "A previous dist backup already exists; refusing to overwrite it.",
        );
      }
      fs.renameSync(distDir, previousDistDir);
      previousDistMoved = true;
    }

    try {
      fs.renameSync(nextDistDir, distDir);
    } catch (error) {
      if (previousDistMoved) {
        fs.renameSync(previousDistDir, distDir);
        previousDistMoved = false;
      }
      throw error;
    }

    if (previousDistMoved) {
      fs.rmSync(previousDistDir, { recursive: true, force: false });
      previousDistMoved = false;
    }

    const retainedReleaseIds = pruneHistory(historyDir);
    return { releaseId, manifest, retainedReleaseIds };
  } catch (error) {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    if (fs.existsSync(nextDistDir)) {
      fs.rmSync(nextDistDir, { recursive: true, force: true });
    }
    if (
      previousDistMoved &&
      !fs.existsSync(distDir) &&
      fs.existsSync(previousDistDir)
    ) {
      fs.renameSync(previousDistDir, distDir);
    }
    throw error;
  } finally {
    if (lockCreated) {
      fs.rmdirSync(lockDir);
    }
  }
}

function main() {
  const { archive, deployRoot, commit } = parseArguments(process.argv.slice(2));
  const result = applyRelease({ archive, deployRoot, expectedCommit: commit });
  console.log(
    `Installed ${result.releaseId} from ${result.manifest.ref} (${result.manifest.version}); ` +
      `${result.retainedReleaseIds.length} dated releases retained.`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  applyRelease,
  createReleaseId,
  parseArguments,
  pruneHistory,
  validateArchiveEntries,
};
