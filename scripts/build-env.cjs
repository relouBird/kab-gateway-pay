'use strict';

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const serviceDir = path.join(rootDir, 'services', 'auth-service');
const schemaPath = path.join(serviceDir, 'env.schema.json');
const globalEnvPath = path.join(rootDir, 'env', 'global.env');
const serviceEnvPath = path.join(serviceDir, 'service.env');
const outputPath = path.join(serviceDir, 'build.env');
const keyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const valuePattern = /^[A-Za-z0-9._:/@,+%-]*$/;

function fail(message) {
  throw new Error(message);
}

function loadSchema() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const propertyKeys = Object.keys(schema.properties || {});
  const propertySet = new Set(propertyKeys);

  if (!Array.isArray(schema.sharedKeys) || !Array.isArray(schema.requiredKeys)) {
    fail('env.schema.json must declare sharedKeys and requiredKeys arrays.');
  }

  for (const key of [...schema.sharedKeys, ...schema.requiredKeys]) {
    if (!propertySet.has(key)) {
      fail(`env.schema.json refers to undeclared key ${key}.`);
    }
  }

  for (const key of propertyKeys) {
    if (!keyPattern.test(key) || isForbiddenKey(key, schema)) {
      fail(`env.schema.json contains a forbidden or invalid key: ${key}.`);
    }
  }

  return { schema, propertySet };
}

function isForbiddenKey(key, schema) {
  const normalizedKey = key.toUpperCase();
  return (
    (schema.forbiddenKeys || []).some(
      (forbiddenKey) => normalizedKey === forbiddenKey.toUpperCase(),
    ) ||
    (schema.forbiddenKeyPatterns || []).some((pattern) =>
      normalizedKey.includes(pattern.toUpperCase()),
    )
  );
}

function readEnvFile(filePath, { schema, allowedKeys, ignoreUnknown }) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const values = new Map();

  for (const [index, rawLine] of contents.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) {
      fail(`${path.relative(rootDir, filePath)}:${index + 1} has invalid KEY=value format.`);
    }

    const key = line.slice(0, separatorIndex);
    if (!keyPattern.test(key)) {
      fail(`${path.relative(rootDir, filePath)}:${index + 1} has an invalid key.`);
    }
    if (isForbiddenKey(key, schema)) {
      fail(`${path.relative(rootDir, filePath)}:${index + 1} uses forbidden key ${key}.`);
    }
    if (!allowedKeys.has(key)) {
      if (ignoreUnknown) continue;
      fail(`${path.relative(rootDir, filePath)}:${index + 1} uses undeclared key ${key}.`);
    }
    if (values.has(key)) {
      fail(`${path.relative(rootDir, filePath)}:${index + 1} repeats key ${key}.`);
    }

    const value = line.slice(separatorIndex + 1);
    validateValue(key, value, schema.properties[key], filePath, index + 1);
    values.set(key, value);
  }

  return values;
}

function validateValue(key, value, definition, filePath, lineNumber) {
  const location = `${path.relative(rootDir, filePath)}:${lineNumber}`;
  if ((!value && !definition.allowEmpty) || !valuePattern.test(value)) {
    fail(`${location} has an invalid value format for ${key}.`);
  }

  if (definition.type === 'enum' && !definition.values.includes(value)) {
    fail(`${location} has an unsupported value for ${key}.`);
  }
  if (definition.type === 'boolean' && value !== 'true' && value !== 'false') {
    fail(`${location} requires true or false for ${key}.`);
  }
  if (definition.type === 'integer') {
    if (!/^\d+$/.test(value)) {
      fail(`${location} requires an integer for ${key}.`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number)) {
      fail(`${location} requires a safe integer for ${key}.`);
    }
    if (
      (definition.minimum !== undefined && number < definition.minimum) ||
      (definition.maximum !== undefined && number > definition.maximum)
    ) {
      fail(`${location} has an out-of-range value for ${key}.`);
    }
  }
  if (definition.type === 'string' && !new RegExp(definition.pattern).test(value)) {
    fail(`${location} has an invalid value format for ${key}.`);
  }
}

function main() {
  const { schema, propertySet } = loadSchema();
  const sharedKeys = new Set(schema.sharedKeys);
  const globalValues = readEnvFile(globalEnvPath, {
    schema,
    allowedKeys: sharedKeys,
    ignoreUnknown: true,
  });
  const serviceValues = readEnvFile(serviceEnvPath, {
    schema,
    allowedKeys: propertySet,
    ignoreUnknown: false,
  });
  const mergedValues = new Map(globalValues);

  for (const [key, value] of serviceValues) {
    mergedValues.set(key, value);
  }

  for (const key of schema.requiredKeys) {
    if (!mergedValues.has(key)) {
      fail(`Required non-secret key ${key} is missing from global.env and service.env.`);
    }
  }

  const output = Object.keys(schema.properties)
    .filter((key) => mergedValues.has(key))
    .map((key) => `${key}=${mergedValues.get(key)}`)
    .join('\n');

  fs.writeFileSync(outputPath, `${output}\n`, 'utf8');
  console.log('Generated services/auth-service/build.env from non-secret configuration.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
