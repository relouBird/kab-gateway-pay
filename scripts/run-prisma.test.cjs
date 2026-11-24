'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { parseArguments } = require('./run-prisma.cjs');

const rootDir = path.resolve(__dirname, '..');

test('Prisma wrapper selects an explicit profile without changing Prisma arguments', () => {
  assert.deepEqual(parseArguments(['migrate', 'deploy', '--env-file', '.env.test']), {
    sourceFile: path.join(rootDir, '.env.test'),
    prismaArgs: ['migrate', 'deploy'],
  });
});

test('Prisma wrapper rejects missing and repeated environment paths', () => {
  assert.throws(() => parseArguments(['migrate', 'deploy', '--env-file']), /requires a path/);
  assert.throws(
    () => parseArguments(['migrate', 'deploy', '--env-file', '.env.test', '--env-file', '.env.prod']),
    /only once/,
  );
});
