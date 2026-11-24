'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

function parseArguments(args, cwd = process.cwd()) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option !== '--env-file' && option !== '--schema') {
      throw new Error(`Unknown option ${option}.`);
    }

    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a path.`);
    const key = option.slice(2);
    if (options[key]) throw new Error(`${option} may be provided only once.`);
    options[key] = path.resolve(cwd, value);
    index += 1;
  }

  for (const key of ['env-file', 'schema']) {
    if (!options[key]) throw new Error(`--${key} is required.`);
  }

  return { envFile: options['env-file'], schema: options.schema };
}

function readDatabaseUrl(envFile) {
  let contents;
  try {
    contents = fs.readFileSync(envFile);
  } catch {
    throw new Error(`Cannot read the selected environment file: ${envFile}.`);
  }

  const value = dotenv.parse(contents).DATABASE_URL__AUTH_SERVICE;
  if (!value || !/^postgres(?:ql)?:\/\//.test(value)) {
    throw new Error('DATABASE_URL__AUTH_SERVICE is missing or invalid in the selected environment file.');
  }
  return value;
}

function createPrismaArguments(schema) {
  return ['migrate', 'deploy', '--schema', schema];
}

function main() {
  const { envFile, schema } = parseArguments(process.argv.slice(2));
  if (!fs.existsSync(schema) || !fs.statSync(schema).isFile()) {
    throw new Error(`Prisma schema does not exist: ${schema}.`);
  }

  const databaseUrl = readDatabaseUrl(envFile);
  const prismaCli = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(prismaCli)) {
    throw new Error('Prisma CLI is not installed. Run npm ci in the migrator directory.');
  }

  const result = spawnSync(process.execPath, [prismaCli, ...createPrismaArguments(schema)], {
    cwd: path.dirname(schema),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createPrismaArguments, parseArguments, readDatabaseUrl };
