'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateEnvironments, parseArguments } = require('./generate-env.cjs');

function createWorkspace(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kgpay-env-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const serviceDir = path.join(rootDir, 'services', 'auth-service');
  fs.mkdirSync(serviceDir, { recursive: true });
  fs.writeFileSync(
    path.join(serviceDir, 'env.schema.json'),
    JSON.stringify({
      properties: {
        NODE_ENV: {
          type: 'enum',
          values: ['development', 'test', 'production'],
        },
        DATABASE_URL: { type: 'string', pattern: '^postgresql:' },
        OTP_HASH_KEY: { type: 'string', minLength: 32 },
        PORT: { type: 'integer', minimum: 1, maximum: 65535 },
      },
      requiredKeys: ['NODE_ENV', 'PORT'],
      sharedKeys: ['NODE_ENV'],
      targetPrefix: 'AUTH_SERVICE',
      runtimeOnlyKeys: ['DATABASE_URL', 'OTP_HASH_KEY'],
      runtimeRequiredKeys: ['DATABASE_URL', 'OTP_HASH_KEY'],
      forbiddenKeys: [],
      forbiddenKeyPatterns: [],
    }),
  );
  fs.writeFileSync(
    path.join(rootDir, '.env'),
    [
      'GLOBAL__NODE_ENV=development',
      'PORT__AUTH_SERVICE=3000',
      'DATABASE_URL__AUTH_SERVICE="postgresql://kgpay@127.0.0.1:5432/kgpay_auth?schema=public&sslmode=disable"',
      `OTP_HASH_KEY__AUTH_SERVICE=${'a'.repeat(64)}`,
      '',
    ].join('\n'),
  );

  return rootDir;
}

test('build output omits runtime secrets while runtime output maps target values', (t) => {
  const rootDir = createWorkspace(t);
  const build = generateEnvironments({ rootDir, mode: 'build' });
  const buildEnv = fs.readFileSync(build[0].path, 'utf8');

  assert.match(buildEnv, /NODE_ENV=development/);
  assert.match(buildEnv, /PORT=3000/);
  assert.doesNotMatch(buildEnv, /DATABASE_URL|OTP_HASH_KEY/);

  const runtime = generateEnvironments({ rootDir, mode: 'runtime' });
  const runtimeEnv = fs.readFileSync(runtime[0].path, 'utf8');
  assert.match(
    runtimeEnv,
    /DATABASE_URL="postgresql:\/\/kgpay@127\.0\.0\.1:5432\/kgpay_auth\?schema=public&sslmode=disable"/,
  );
  assert.match(runtimeEnv, new RegExp(`OTP_HASH_KEY=${'a'.repeat(64)}`));
});

test('runtime generation fails when a required runtime value is missing', (t) => {
  const rootDir = createWorkspace(t);
  const envPath = path.join(rootDir, '.env');
  const env = fs.readFileSync(envPath, 'utf8').replace(`OTP_HASH_KEY__AUTH_SERVICE=${'a'.repeat(64)}\n`, '');
  fs.writeFileSync(envPath, env);

  assert.throws(() => generateEnvironments({ rootDir, mode: 'runtime' }), /OTP_HASH_KEY__AUTH_SERVICE is required/);
});

test('generation rejects source keys not declared by any workspace schema', (t) => {
  const rootDir = createWorkspace(t);
  fs.appendFileSync(path.join(rootDir, '.env'), 'TYPO__AUTH_SERVICE=value\n');

  assert.throws(() => generateEnvironments({ rootDir, mode: 'build' }), /contains an unused key TYPO__AUTH_SERVICE/);
});

test('an explicit source file takes precedence and writes to the selected directory', (t) => {
  const rootDir = createWorkspace(t);
  const sourceFile = path.join(rootDir, '.env.test');
  const outputDir = path.join(rootDir, 'temporary-env');
  const localEnvPath = path.join(rootDir, '.env');
  const localEnv = fs.readFileSync(localEnvPath, 'utf8');
  const source = localEnv
    .replace('GLOBAL__NODE_ENV=development', 'GLOBAL__NODE_ENV=test')
    .replace('PORT__AUTH_SERVICE=3000', 'PORT__AUTH_SERVICE=4000');
  fs.writeFileSync(sourceFile, source);

  const generated = generateEnvironments({
    rootDir,
    mode: 'runtime',
    sourceFile: '.env.test',
    outputDir: 'temporary-env',
    hostEnv: {
      GLOBAL__NODE_ENV: 'production',
      PORT__AUTH_SERVICE: '5000',
    },
  });

  assert.equal(generated[0].path, path.join(outputDir, 'auth-service.runtime.env'));
  const runtimeEnv = fs.readFileSync(generated[0].path, 'utf8');
  assert.match(runtimeEnv, /NODE_ENV=test/);
  assert.match(runtimeEnv, /PORT=4000/);
  assert.equal(fs.existsSync(path.join(rootDir, '.generated')), false);
  assert.equal(fs.readFileSync(localEnvPath, 'utf8'), localEnv);
});

test('an explicitly selected source file must exist', (t) => {
  const rootDir = createWorkspace(t);

  assert.throws(
    () =>
      generateEnvironments({
        rootDir,
        mode: 'runtime',
        sourceFile: '.env.prod',
      }),
    /Environment source file does not exist/,
  );
});

test('environment CLI options map explicit source and output paths', () => {
  assert.deepEqual(parseArguments(['--mode', 'runtime', '--source-file', '.env.test', '--output-dir', '.tmp/env']), {
    mode: 'runtime',
    sourceFile: '.env.test',
    outputDir: '.tmp/env',
  });
});
