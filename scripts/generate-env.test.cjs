"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { generateEnvironments, parseArguments } = require("./generate-env.cjs");

function createWorkspace(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "kgpay-env-"));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const serviceDir = path.join(rootDir, "services", "auth-service");
  fs.mkdirSync(serviceDir, { recursive: true });
  fs.writeFileSync(
    path.join(serviceDir, "env.schema.json"),
    JSON.stringify({
      properties: {
        NODE_ENV: {
          type: "enum",
          values: ["development", "test", "production"],
        },
        DATABASE_URL: { type: "string", pattern: "^postgresql:" },
        OTP_HASH_KEY: { type: "string", minLength: 32 },
        PORT: { type: "integer", minimum: 1, maximum: 65535 },
      },
      requiredKeys: ["NODE_ENV", "PORT", "DATABASE_URL", "OTP_HASH_KEY"],
      sharedKeys: ["NODE_ENV"],
      targetPrefix: "AUTH_SERVICE",
      forbiddenKeys: [],
      forbiddenKeyPatterns: [],
    }),
  );
  fs.writeFileSync(
    path.join(rootDir, ".env"),
    [
      "GLOBAL__NODE_ENV=development",
      "PORT__AUTH_SERVICE=3000",
      'DATABASE_URL__AUTH_SERVICE="postgresql://kgpay@127.0.0.1:5432/kgpay_auth?schema=public&sslmode=disable"',
      `OTP_HASH_KEY__AUTH_SERVICE=${"a".repeat(64)}`,
      "",
    ].join("\n"),
  );

  return rootDir;
}

test("generates one environment file with all required values", (t) => {
  const rootDir = createWorkspace(t);
  const generated = generateEnvironments({ rootDir });
  const runtimeEnv = fs.readFileSync(generated[0].path, "utf8");
  assert.equal(
    generated[0].path,
    path.join(rootDir, ".generated", "env", "auth-service.env"),
  );
  assert.match(runtimeEnv, /NODE_ENV=development/);
  assert.match(runtimeEnv, /PORT=3000/);
  assert.match(
    runtimeEnv,
    /DATABASE_URL="postgresql:\/\/kgpay@127\.0\.0\.1:5432\/kgpay_auth\?schema=public&sslmode=disable"/,
  );
  assert.match(runtimeEnv, new RegExp(`OTP_HASH_KEY=${"a".repeat(64)}`));
});

test("generation fails when a required value is missing", (t) => {
  const rootDir = createWorkspace(t);
  const envPath = path.join(rootDir, ".env");
  const env = fs
    .readFileSync(envPath, "utf8")
    .replace(`OTP_HASH_KEY__AUTH_SERVICE=${"a".repeat(64)}\n`, "");
  fs.writeFileSync(envPath, env);

  assert.throws(
    () => generateEnvironments({ rootDir }),
    /OTP_HASH_KEY__AUTH_SERVICE is required/,
  );
});

test("generation rejects source keys not declared by any workspace schema", (t) => {
  const rootDir = createWorkspace(t);
  fs.appendFileSync(path.join(rootDir, ".env"), "TYPO__AUTH_SERVICE=value\n");

  assert.throws(
    () => generateEnvironments({ rootDir }),
    /contains an unused key TYPO__AUTH_SERVICE/,
  );
});

test("optional empty values bypass format validation but non-empty values are checked", (t) => {
  const rootDir = createWorkspace(t);
  const schemaPath = path.join(
    rootDir,
    "services",
    "auth-service",
    "env.schema.json",
  );
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  schema.properties.STAFF_PORTAL_URL = {
    type: "string",
    pattern: "^https?://[^\\s]+$",
    allowEmpty: true,
  };
  fs.writeFileSync(schemaPath, JSON.stringify(schema));

  const envPath = path.join(rootDir, ".env");
  fs.appendFileSync(envPath, "STAFF_PORTAL_URL__AUTH_SERVICE=\n");
  const generated = generateEnvironments({ rootDir });
  assert.match(fs.readFileSync(generated[0].path, "utf8"), /STAFF_PORTAL_URL=/);

  const invalidEnv = fs
    .readFileSync(envPath, "utf8")
    .replace(
      "STAFF_PORTAL_URL__AUTH_SERVICE=\n",
      "STAFF_PORTAL_URL__AUTH_SERVICE=invalid\n",
    );
  fs.writeFileSync(envPath, invalidEnv);
  assert.throws(
    () => generateEnvironments({ rootDir }),
    /has an invalid value format for STAFF_PORTAL_URL/,
  );
});

test("an explicit source file takes precedence and writes to the selected directory", (t) => {
  const rootDir = createWorkspace(t);
  const sourceFile = path.join(rootDir, ".env.test");
  const outputDir = path.join(rootDir, "temporary-env");
  const generatedDir = path.join(outputDir, "auth-service.env");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "auth-service.build.env"),
    "OLD_BUILD=value\n",
  );
  fs.writeFileSync(
    path.join(outputDir, "auth-service.runtime.env"),
    "OLD_RUNTIME=value\n",
  );
  const localEnvPath = path.join(rootDir, ".env");
  const localEnv = fs.readFileSync(localEnvPath, "utf8");
  const source = localEnv
    .replace("GLOBAL__NODE_ENV=development", "GLOBAL__NODE_ENV=test")
    .replace("PORT__AUTH_SERVICE=3000", "PORT__AUTH_SERVICE=4000");
  fs.writeFileSync(sourceFile, source);

  const generated = generateEnvironments({
    rootDir,
    sourceFile: ".env.test",
    outputDir: "temporary-env",
    hostEnv: {
      GLOBAL__NODE_ENV: "production",
      PORT__AUTH_SERVICE: "5000",
    },
  });

  assert.equal(generated[0].path, generatedDir);
  const runtimeEnv = fs.readFileSync(generated[0].path, "utf8");
  assert.match(runtimeEnv, /NODE_ENV=test/);
  assert.match(runtimeEnv, /PORT=4000/);
  assert.equal(
    fs.existsSync(path.join(outputDir, "auth-service.build.env")),
    false,
  );
  assert.equal(
    fs.existsSync(path.join(outputDir, "auth-service.runtime.env")),
    false,
  );
  assert.equal(fs.existsSync(path.join(rootDir, ".generated")), false);
  assert.equal(fs.readFileSync(localEnvPath, "utf8"), localEnv);
});

test("an explicitly selected source file must exist", (t) => {
  const rootDir = createWorkspace(t);

  assert.throws(
    () =>
      generateEnvironments({
        rootDir,
        sourceFile: ".env.prod",
      }),
    /Environment source file does not exist/,
  );
});

test("environment CLI options map explicit source and output paths", () => {
  assert.deepEqual(
    parseArguments([
      "--target",
      "auth-service",
      "--source-file",
      ".env.test",
      "--output-dir",
      ".tmp/env",
    ]),
    {
      target: "auth-service",
      sourceFile: ".env.test",
      outputDir: ".tmp/env",
    },
  );
});
