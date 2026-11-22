'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { generateEnvironments } = require('./generate-env.cjs');

function createWorkspace(t) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kgpay-env-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const serviceDir = path.join(rootDir, 'services', 'auth-service');
  fs.mkdirSync(serviceDir, { recursive: true });
  fs.writeFileSync(
    path.join(serviceDir, 'env.schema.json'),
    JSON.stringify({
      properties: {
        NODE_ENV: { type: 'enum', values: ['development', 'production'] },
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
  const env = fs
    .readFileSync(envPath, 'utf8')
    .replace(`OTP_HASH_KEY__AUTH_SERVICE=${'a'.repeat(64)}\n`, '');
  fs.writeFileSync(envPath, env);

  assert.throws(
    () => generateEnvironments({ rootDir, mode: 'runtime' }),
    /OTP_HASH_KEY__AUTH_SERVICE is required/,
  );
});

test('generation rejects source keys not declared by any workspace schema', (t) => {
  const rootDir = createWorkspace(t);
  fs.appendFileSync(path.join(rootDir, '.env'), 'TYPO__AUTH_SERVICE=value\n');

  assert.throws(
    () => generateEnvironments({ rootDir, mode: 'build' }),
    /contains an unused key TYPO__AUTH_SERVICE/,
  );
});
