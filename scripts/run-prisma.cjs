'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const serviceDir = path.join(rootDir, 'services', 'auth-service');

for (const filePath of [
  path.join(serviceDir, '.env.local'),
  path.join(serviceDir, 'build.env'),
]) {
  if (fs.existsSync(filePath)) {
    process.loadEnvFile(filePath);
  }
}

const command = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const result = spawnSync(command, process.argv.slice(2), {
  cwd: serviceDir,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
