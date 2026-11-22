'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArguments(args) {
  const options = {};
  const separator = args.indexOf('--');
  if (separator < 0 || separator === args.length - 1) {
    throw new Error('Provide --target, --mode, and a command after --.');
  }

  for (let index = 0; index < separator; index += 1) {
    const option = args[index];
    if (option !== '--target' && option !== '--mode') {
      throw new Error(`Unknown option ${option}.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} requires a value.`);
    }
    options[option.slice(2)] = value;
    index += 1;
  }

  if (!options.target || !['build', 'runtime'].includes(options.mode)) {
    throw new Error('A valid --target and --mode are required.');
  }
  return { ...options, command: args[separator + 1], commandArgs: args.slice(separator + 2) };
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const { target, mode, command, commandArgs } = parseArguments(
    process.argv.slice(2),
  );
  const envFile = path.join(
    rootDir,
    '.generated',
    'env',
    `${target}.${mode}.env`,
  );
  if (!fs.existsSync(envFile)) {
    throw new Error(
      `${path.relative(rootDir, envFile)} is missing; generate it with pnpm env:${mode}.`,
    );
  }

  process.loadEnvFile(envFile);
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
