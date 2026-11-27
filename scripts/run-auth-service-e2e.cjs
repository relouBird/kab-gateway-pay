"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, randomUUID } = require("node:crypto");
const { createRequire } = require("node:module");
const { spawnSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const serviceDir = path.join(rootDir, "services", "auth-service");
const maildevMode = process.argv.includes("--maildev");
const serviceEnv = path.join(rootDir, ".generated", "env", "auth-service.env");

class RunnerError extends Error {}

async function main() {
  const generated = spawnSync(
    process.execPath,
    [
      path.join(rootDir, "scripts", "generate-env.cjs"),
      "--target",
      "auth-service",
    ],
    { cwd: rootDir, stdio: "inherit" },
  );
  if (generated.error) throw generated.error;
  if (generated.status !== 0) {
    throw new RunnerError(
      `Generating the auth-service environment failed with exit code ${generated.status}.`,
    );
  }
  if (!fs.existsSync(serviceEnv)) {
    throw new RunnerError("The generated auth-service environment is missing.");
  }
  process.loadEnvFile(serviceEnv);

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
  const { Pool } = requireFromService("pg");
  const pool = new Pool({
    connectionString: adminUrl.toString(),
    connectionTimeoutMillis: 5_000,
  });

  let schemaCreated = false;
  let testExitCode = 1;
  try {
    await pool.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    process.stdout.write(`Created isolated e2e schema ${schema}.\n`);

    const env = {
      ...process.env,
      AUTH_E2E_MAILDEV: maildevMode ? "true" : "false",
      AUTH_E2E_DATABASE_URL: testUrl.toString(),
      DATABASE_URL: testUrl.toString(),
      JWT_SIGNING_SECRET: randomBytes(48).toString("base64url"),
      KG_PAY_ENV_FILE: serviceEnv,
    };
    const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const migration = spawnSync(
      pnpmCommand,
      [
        "--filter",
        "auth-service",
        "exec",
        "prisma",
        "migrate",
        "deploy",
        "--config=prisma.config.ts",
      ],
      {
        cwd: rootDir,
        env,
        stdio: "inherit",
        shell: process.platform === "win32",
      },
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
        "--forceExit",
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
        await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
        process.stdout.write(`Dropped isolated e2e schema ${schema}.\n`);
      }
    } finally {
      await pool.end();
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
