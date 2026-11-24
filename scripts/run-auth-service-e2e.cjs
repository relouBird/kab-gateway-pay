"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const serviceDir = path.join(rootDir, "services", "auth-service");
const maildevMode = process.argv.includes("--maildev");
const runtimeEnv = path.join(
  rootDir,
  ".generated",
  "env",
  "auth-service.runtime.env",
);

class RunnerError extends Error {}

async function main() {
  if (!fs.existsSync(runtimeEnv)) {
    throw new RunnerError(
      "Generate the runtime environment before running e2e.",
    );
  }
  process.loadEnvFile(runtimeEnv);

  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) throw new RunnerError("DATABASE_URL is required.");

  const baseUrl = new URL(configuredUrl);
  if (
    !["postgres:", "postgresql:"].includes(baseUrl.protocol) ||
    !["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname)
  ) {
    throw new RunnerError(
      "The isolated e2e runner only accepts local PostgreSQL.",
    );
  }

  const schema = `kgpay_e2e_${randomUUID().replace(/-/g, "")}`;
  const adminUrl = new URL(baseUrl);
  adminUrl.searchParams.set("schema", "public");
  const testUrl = new URL(baseUrl);
  testUrl.searchParams.set("schema", schema);
  const requireFromService = createRequire(
    path.join(serviceDir, "package.json"),
  );
  const { PrismaClient } = requireFromService("@prisma/client");
  const prisma = new PrismaClient({
    datasources: { db: { url: adminUrl.toString() } },
  });

  let schemaCreated = false;
  let testExitCode = 1;
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    process.stdout.write(`Created isolated e2e schema ${schema}.\n`);

    const env = {
      ...process.env,
      AUTH_E2E_MAILDEV: maildevMode ? "true" : "false",
      AUTH_E2E_DATABASE_URL: testUrl.toString(),
      DATABASE_URL: testUrl.toString(),
    };
    const migration = spawnSync(
      process.execPath,
      [path.join(rootDir, "scripts", "run-prisma.cjs"), "migrate", "deploy"],
      { cwd: rootDir, env, stdio: "inherit" },
    );
    if (migration.error) throw migration.error;
    if (migration.status !== 0) {
      throw new RunnerError(
        `Applying migrations to the isolated schema failed with exit code ${migration.status}.`,
      );
    }

    const jestCli = path.join(
      serviceDir,
      "node_modules",
      "jest",
      "bin",
      "jest.js",
    );
    const tests = spawnSync(
      process.execPath,
      [
        "--experimental-vm-modules",
        jestCli,
        "--config",
        "./test/jest-e2e.json",
        "--runInBand",
        "--runTestsByPath",
        maildevMode ? "./test/maildev.e2e-spec.ts" : "./test/auth.e2e-spec.ts",
      ],
      { cwd: serviceDir, env, stdio: "inherit" },
    );
    if (tests.error) throw tests.error;
    testExitCode = tests.status ?? 1;
  } finally {
    try {
      if (schemaCreated) {
        await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
        process.stdout.write(`Dropped isolated e2e schema ${schema}.\n`);
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  process.exitCode = testExitCode;
}

main().catch((error) => {
  if (error instanceof RunnerError) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  const errorCode =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? `, code ${error.code}`
      : "";
  const errorType = error instanceof Error ? error.name : "UnknownError";
  process.stderr.write(`Auth e2e failed (${errorType}${errorCode}).\n`);
  process.exitCode = 1;
});
