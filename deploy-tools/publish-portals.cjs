"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const PORTALS = [
  { source: "customer-portal/dist", target: "customer-app" },
  { source: "staff-portal/dist", target: "staff-app" },
];
const PRESERVED_ENTRIES = [".htaccess", ".well-known", "cgi-bin", "error_log"];

function fail(message) {
  throw new Error(message);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function normalizePermissions(directory) {
  const entry = fs.lstatSync(directory);
  if (entry.isSymbolicLink()) {
    fail(`Portal builds must not contain symbolic links: ${directory}`);
  }
  if (entry.isDirectory()) {
    for (const child of fs.readdirSync(directory)) {
      normalizePermissions(path.join(directory, child));
    }
    fs.chmodSync(directory, 0o755);
    return;
  }
  if (entry.isFile()) {
    fs.chmodSync(directory, 0o644);
    return;
  }
  fail(`Unsupported portal build entry: ${directory}`);
}

function validateSource(source) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    fail(`Portal build directory is missing: ${source}`);
  }
  const indexFile = path.join(source, "index.html");
  if (!fs.existsSync(indexFile) || !fs.statSync(indexFile).isFile()) {
    fail(`Portal build is missing index.html: ${source}`);
  }
}

function validateTarget(target) {
  if (!fs.existsSync(target)) return;
  const entry = fs.lstatSync(target);
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    fail(`Portal destination must be a real directory: ${target}`);
  }
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option !== "--source-root" && option !== "--target-root") {
      fail(`Unknown option ${option}.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`${option} requires a value.`);
    }
    const key = option
      .slice(2)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (options[key]) fail(`${option} was provided more than once.`);
    options[key] = value;
    index += 1;
  }
  if (!options.sourceRoot || !options.targetRoot) {
    fail("--source-root and --target-root are required.");
  }
  if (
    !path.isAbsolute(options.sourceRoot) ||
    !path.isAbsolute(options.targetRoot)
  ) {
    fail("Source and target paths must be absolute.");
  }
  return options;
}

function publishPortals({ sourceRoot, targetRoot }) {
  if (
    typeof sourceRoot !== "string" ||
    typeof targetRoot !== "string" ||
    !path.isAbsolute(sourceRoot) ||
    !path.isAbsolute(targetRoot)
  ) {
    fail("Source and target paths must be absolute.");
  }

  const sourceDirectory = path.resolve(sourceRoot);
  const targetDirectory = path.resolve(targetRoot);
  if (
    sourceDirectory === targetDirectory ||
    isWithin(sourceDirectory, targetDirectory) ||
    isWithin(targetDirectory, sourceDirectory)
  ) {
    fail("Portal source and target paths must be separate.");
  }
  if (targetDirectory === path.parse(targetDirectory).root) {
    fail("The portal target root cannot be a filesystem root.");
  }

  const id = randomUUID();
  const portals = PORTALS.map(({ source, target }) => {
    const sourcePath = path.join(sourceDirectory, source);
    const targetPath = path.join(targetDirectory, target);
    validateSource(sourcePath);
    validateTarget(targetPath);
    return {
      sourcePath,
      targetPath,
      stagePath: path.join(targetDirectory, `.${target}-next-${id}`),
      previousPath: path.join(targetDirectory, `.${target}-previous-${id}`),
      staged: false,
      previousMoved: false,
      promoted: false,
    };
  });

  fs.mkdirSync(targetDirectory, { recursive: true, mode: 0o755 });
  if (fs.lstatSync(targetDirectory).isSymbolicLink()) {
    fail(`Portal target root must not be a symbolic link: ${targetDirectory}`);
  }
  fs.chmodSync(targetDirectory, 0o755);

  try {
    for (const portal of portals) {
      portal.staged = true;
      fs.cpSync(portal.sourcePath, portal.stagePath, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
      normalizePermissions(portal.stagePath);

      for (const entry of PRESERVED_ENTRIES) {
        const existingEntry = path.join(portal.targetPath, entry);
        const stagedEntry = path.join(portal.stagePath, entry);
        if (fs.existsSync(existingEntry) && !fs.existsSync(stagedEntry)) {
          fs.cpSync(existingEntry, stagedEntry, {
            recursive: true,
            errorOnExist: true,
            force: false,
          });
        }
      }
    }

    for (const portal of portals) {
      if (fs.existsSync(portal.targetPath)) {
        fs.renameSync(portal.targetPath, portal.previousPath);
        portal.previousMoved = true;
      }
      fs.renameSync(portal.stagePath, portal.targetPath);
      portal.staged = false;
      portal.promoted = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const portal of [...portals].reverse()) {
      try {
        if (portal.promoted && fs.existsSync(portal.targetPath)) {
          fs.rmSync(portal.targetPath, { recursive: true, force: false });
        }
        if (portal.previousMoved && fs.existsSync(portal.previousPath)) {
          fs.renameSync(portal.previousPath, portal.targetPath);
        }
        if (portal.staged && fs.existsSync(portal.stagePath)) {
          fs.rmSync(portal.stagePath, { recursive: true, force: false });
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError.message);
      }
    }
    if (rollbackErrors.length > 0) {
      fail(
        `${error.message}; portal rollback also failed: ${rollbackErrors.join("; ")}`,
      );
    }
    throw error;
  }

  for (const portal of portals) {
    if (portal.previousMoved) {
      fs.rmSync(portal.previousPath, { recursive: true, force: false });
    }
  }
  return portals.map((portal) => portal.targetPath);
}

if (require.main === module) {
  try {
    const options = parseArguments(process.argv.slice(2));
    publishPortals(options);
    console.log(
      "Published customer-app and staff-app with web-readable permissions.",
    );
  } catch (error) {
    console.error(`Portal publishing failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseArguments, publishPortals };
