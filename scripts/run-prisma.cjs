'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const serviceDir = path.join(rootDir, 'services', 'auth-service');
const generateEnv = spawnSync(
  process.execPath,
  [
    path.join(rootDir, 'scripts', 'generate-env.cjs'),
    '--target',
    'auth-service',
    '--mode',
    'runtime',
  ],
  {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  },
);

if (generateEnv.error) throw generateEnv.error;
if (generateEnv.status !== 0) {
  process.exitCode = generateEnv.status ?? 1;
  process.exit();
}

const runtimeEnv = path.join(
  rootDir,
  '.generated',
  'env',
  'auth-service.runtime.env',
);
if (!fs.existsSync(runtimeEnv)) {
  throw new Error('Generated auth-service runtime environment is missing.');
}
process.loadEnvFile(runtimeEnv);

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(
  pnpmCommand,
  ['--filter', 'auth-service', 'exec', 'prisma', ...process.argv.slice(2)],
  {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
