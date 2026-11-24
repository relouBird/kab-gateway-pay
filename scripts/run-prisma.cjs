'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseEnvContent } = require('./generate-env.cjs');

const rootDir = path.resolve(__dirname, '..');
const runtimeEnvName = 'auth-service.runtime.env';

function parseArguments(args, cwd = rootDir) {
  let sourceFile;
  const prismaArgs = [];

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--env-file') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--env-file requires a path.');
      }
      if (sourceFile) throw new Error('--env-file may be provided only once.');
      sourceFile = path.resolve(cwd, value);
      index += 1;
    } else {
      prismaArgs.push(args[index]);
    }
  }

  if (!prismaArgs.length) throw new Error('A Prisma command is required.');
  return { sourceFile, prismaArgs };
}

function main() {
  const { sourceFile, prismaArgs } = parseArguments(process.argv.slice(2));
  const temporaryDirectory = sourceFile ? fs.mkdtempSync(path.join(os.tmpdir(), 'kgpay-auth-prisma-')) : undefined;
  const generateArgs = [
    path.join(rootDir, 'scripts', 'generate-env.cjs'),
    '--target',
    'auth-service',
    '--mode',
    'runtime',
  ];
  if (sourceFile) {
    generateArgs.push('--source-file', sourceFile, '--output-dir', temporaryDirectory);
  }

  try {
    const generateEnv = spawnSync(process.execPath, generateArgs, {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
    });

    if (generateEnv.error) throw generateEnv.error;
    if (generateEnv.status !== 0) {
      process.exitCode = generateEnv.status ?? 1;
      return;
    }

    const runtimeEnv = path.join(temporaryDirectory || path.join(rootDir, '.generated', 'env'), runtimeEnvName);
    if (!fs.existsSync(runtimeEnv)) {
      throw new Error('Generated auth-service runtime environment is missing.');
    }

    if (sourceFile) {
      const generatedValues = parseEnvContent(
        fs.readFileSync(runtimeEnv, 'utf8'),
        'Generated auth-service environment',
      );
      for (const key of generatedValues.keys()) delete process.env[key];
    }
    process.loadEnvFile(runtimeEnv);

    const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const result = spawnSync(pnpmCommand, ['--filter', 'auth-service', 'exec', 'prisma', ...prismaArgs], {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    if (temporaryDirectory) {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { parseArguments };
