'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createPrismaArguments, parseArguments, readDatabaseUrl } = require('./migrate.cjs');

test('migration accepts explicit environment and schema files only', () => {
  const cwd = path.resolve('kgpay');
  assert.deepEqual(parseArguments(['--env-file', '.env.prod', '--schema', 'schema.prisma'], cwd), {
    envFile: path.resolve(cwd, '.env.prod'),
    schema: path.resolve(cwd, 'schema.prisma'),
  });
  assert.throws(() => parseArguments(['migrate', 'reset']), /Unknown option/);
  assert.throws(() => parseArguments(['--env-file', '.env.test']), /--schema is required/);
});

test('migration reads only the auth-service URL from the selected profile', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kgpay-migrator-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envFile = path.join(directory, '.env.prod');
  fs.writeFileSync(
    envFile,
    [
      'GLOBAL__NODE_ENV=production',
      'DATABASE_URL__AUTH_SERVICE="postgresql://kgpay:secret@db.example.test:5432/kgpay?schema=public"',
      'OTP_HASH_KEY__AUTH_SERVICE=not-used-by-migration',
      '',
    ].join('\n'),
  );

  assert.equal(readDatabaseUrl(envFile), 'postgresql://kgpay:secret@db.example.test:5432/kgpay?schema=public');
});

test('migration fails if the selected profile has no auth-service database URL', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kgpay-migrator-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envFile = path.join(directory, '.env.test');
  fs.writeFileSync(envFile, 'GLOBAL__NODE_ENV=test\n');

  assert.throws(() => readDatabaseUrl(envFile), /DATABASE_URL__AUTH_SERVICE is missing or invalid/);
});

test('the utility can invoke only Prisma deploy migrations', () => {
  assert.deepEqual(createPrismaArguments('/release/schema.prisma'), [
    'migrate',
    'deploy',
    '--schema',
    '/release/schema.prisma',
  ]);
});
