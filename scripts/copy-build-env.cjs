'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const serviceDir = path.join(rootDir, 'services', 'auth-service');
const source = path.join(serviceDir, 'build.env');
const destination = path.join(serviceDir, 'dist', 'build.env');

if (!fs.existsSync(source)) {
  throw new Error('services/auth-service/build.env is missing; run pnpm env:build.');
}
if (!fs.existsSync(path.dirname(destination))) {
  throw new Error('The auth-service dist directory does not exist after the build.');
}

fs.copyFileSync(source, destination);
