"use strict";

const fs = require("node:fs");
const path = require("node:path");

const workspaceRoots = ["apps", "packages", "services"];
const keyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

function fail(message) {
  throw new Error(message);
}

function parseEnvContent(contents, label) {
  const values = new Map();
  const lines = contents.replace(/^\uFEFF/, "").split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) {
      fail(`${label}:${index + 1} has invalid KEY=value format.`);
    }

    const [, key, rawValue] = match;
    if (values.has(key)) {
      fail(`${label}:${index + 1} repeats key ${key}.`);
    }
    values.set(key, parseValue(rawValue.trim(), label, index + 1));
  }

  return values;
}

function parseValue(rawValue, label, lineNumber) {
  if (!rawValue) return "";

  const quote = rawValue[0];
  if (quote === '"') {
    const match = rawValue.match(/^("(?:\\.|[^"\\])*")(?:\s+#.*)?$/);
    if (!match)
      fail(`${label}:${lineNumber} has an unterminated quoted value.`);
    try {
      return JSON.parse(match[1]);
    } catch {
      fail(`${label}:${lineNumber} has an invalid quoted value.`);
    }
  }

  if (quote === "'" || quote === "`") {
    const escapedQuote = quote === "'" ? "'" : "`";
    const match = rawValue.match(
      new RegExp(
        `^${escapedQuote}([^${escapedQuote}]*)${escapedQuote}(?:\\\\s+#.*)?$`,
      ),
    );
    if (!match)
      fail(`${label}:${lineNumber} has an unterminated quoted value.`);
    return match[1];
  }

  return rawValue.replace(/\s+#.*$/, "").trim();
}

function readSchema(schemaPath, workspaceName) {
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (error) {
    fail(
      `${path.relative(path.dirname(path.dirname(schemaPath)), schemaPath)} is not valid JSON: ${error.message}`,
    );
  }

  const properties = schema.properties;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    fail(`${workspaceName}/env.schema.json must declare properties.`);
  }

  for (const listName of [
    "requiredKeys",
    "sharedKeys",
    "runtimeOnlyKeys",
    "runtimeRequiredKeys",
  ]) {
    if (schema[listName] === undefined && listName.startsWith("runtime")) {
      schema[listName] = [];
    }
    if (!Array.isArray(schema[listName])) {
      fail(
        `${workspaceName}/env.schema.json must declare ${listName} as an array.`,
      );
    }
    for (const key of schema[listName]) {
      if (!Object.hasOwn(properties, key)) {
        fail(
          `${workspaceName}/env.schema.json refers to undeclared key ${key}.`,
        );
      }
    }
  }

  if (
    typeof schema.targetPrefix !== "string" ||
    !keyPattern.test(schema.targetPrefix)
  ) {
    fail(`${workspaceName}/env.schema.json must declare a valid targetPrefix.`);
  }

  const runtimeOnlyKeys = new Set(schema.runtimeOnlyKeys);
  for (const key of schema.runtimeRequiredKeys) {
    if (!runtimeOnlyKeys.has(key)) {
      fail(
        `${workspaceName}/env.schema.json marks ${key} runtime-required but not runtime-only.`,
      );
    }
  }

  for (const key of Object.keys(properties)) {
    if (
      !keyPattern.test(key) ||
      isForbiddenKey(key, schema) ||
      !["string", "integer", "boolean", "enum"].includes(properties[key].type)
    ) {
      fail(
        `${workspaceName}/env.schema.json contains an invalid key definition: ${key}.`,
      );
    }
  }

  return { schema, workspaceName };
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

function discoverTargets(rootDir) {
  const targets = [];

  for (const rootName of workspaceRoots) {
    const directory = path.join(rootDir, rootName);
    if (!fs.existsSync(directory)) continue;

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const schemaPath = path.join(directory, entry.name, "env.schema.json");
      if (fs.existsSync(schemaPath)) {
        targets.push(readSchema(schemaPath, path.join(rootName, entry.name)));
      }
    }
  }

  return targets;
}

function sourceKeyFor(target, key) {
  if (target.schema.sharedKeys.includes(key)) return `GLOBAL__${key}`;
  return `${key}__${target.schema.targetPrefix}`;
}

function validateValue(key, value, definition, location) {
  if (!value) {
    if (definition.allowEmpty) return;
    fail(`${location} has an empty value for ${key}.`);
  }

  if (definition.type === "enum" && !definition.values.includes(value)) {
    fail(`${location} has an unsupported value for ${key}.`);
  }
  if (definition.type === "boolean" && value !== "true" && value !== "false") {
    fail(`${location} requires true or false for ${key}.`);
  }
  if (definition.type === "integer") {
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
  if (
    definition.type === "string" &&
    definition.pattern &&
    !new RegExp(definition.pattern).test(value)
  ) {
    fail(`${location} has an invalid value format for ${key}.`);
  }
  if (
    definition.type === "string" &&
    definition.minLength !== undefined &&
    Buffer.byteLength(value, "utf8") < definition.minLength
  ) {
    fail(`${location} has a value that is too short for ${key}.`);
  }
}

function serializeValue(value) {
  if (!/^[A-Za-z0-9._:/@,+%-]*$/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function generateEnvironments({
  rootDir,
  mode,
  targetName,
  hostEnv = process.env,
  sourceFile,
  outputDir,
}) {
  if (mode !== "build" && mode !== "runtime") {
    fail('Environment mode must be "build" or "runtime".');
  }

  const targets = discoverTargets(rootDir);
  if (!targets.length) fail("No workspace env.schema.json files were found.");

  const selectedTargets = targetName
    ? targets.filter(
        (target) => path.basename(target.workspaceName) === targetName,
      )
    : targets;
  if (!selectedTargets.length) {
    fail(`No workspace declares an env.schema.json for ${targetName}.`);
  }

  const envPath = sourceFile
    ? path.resolve(rootDir, sourceFile)
    : path.join(rootDir, ".env");
  if (sourceFile && !fs.existsSync(envPath)) {
    fail(`Environment source file does not exist: ${envPath}.`);
  }
  const envLabel = path.relative(rootDir, envPath) || path.basename(envPath);
  const fileValues = fs.existsSync(envPath)
    ? parseEnvContent(fs.readFileSync(envPath, "utf8"), envLabel)
    : new Map();
  const generatedDir = outputDir
    ? path.resolve(rootDir, outputDir)
    : path.join(rootDir, ".generated", "env");
  const sourceKeys = new Set(
    targets.flatMap((target) =>
      Object.keys(target.schema.properties).map((key) =>
        sourceKeyFor(target, key),
      ),
    ),
  );

  for (const key of fileValues.keys()) {
    if (!sourceKeys.has(key)) {
      fail(`${envLabel} contains an unused key ${key}.`);
    }
  }

  const generated = selectedTargets.map((target) => {
    const { schema, workspaceName } = target;
    const runtimeOnlyKeys = new Set(schema.runtimeOnlyKeys);
    const requiredKeys = new Set([
      ...schema.requiredKeys,
      ...(mode === "runtime" ? schema.runtimeRequiredKeys : []),
    ]);
    const values = new Map();

    for (const [key, definition] of Object.entries(schema.properties)) {
      const sourceKey = sourceKeyFor(target, key);
      const value =
        sourceFile !== undefined
          ? fileValues.get(sourceKey)
          : hostEnv[sourceKey] !== undefined
            ? hostEnv[sourceKey]
            : fileValues.get(sourceKey);

      if (mode === "build" && runtimeOnlyKeys.has(key)) continue;
      if (value === undefined || (value === "" && !definition.allowEmpty)) {
        if (requiredKeys.has(key)) {
          fail(
            `${sourceKey} is required for ${workspaceName} ${mode} configuration.`,
          );
        }
        continue;
      }

      validateValue(key, value, definition, `${sourceKey} (${workspaceName})`);
      values.set(key, value);
    }

    const output = [...values]
      .map(([key, value]) => `${key}=${serializeValue(value)}`)
      .join("\n");
    const targetId = path.basename(workspaceName);
    return {
      path: path.join(generatedDir, `${targetId}.${mode}.env`),
      workspaceName,
      output: `${output}\n`,
    };
  });

  for (const result of generated) {
    fs.mkdirSync(path.dirname(result.path), { recursive: true });
    fs.writeFileSync(result.path, result.output, {
      encoding: "utf8",
      mode: 0o600,
    });
  }

  return generated.map(({ path: outputPath, workspaceName }) => ({
    path: outputPath,
    workspaceName,
  }));
}

function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (
      option === "--target" ||
      option === "--mode" ||
      option === "--source-file" ||
      option === "--output-dir"
    ) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) fail(`${option} requires a value.`);
      const optionKeys = {
        "--source-file": "sourceFile",
        "--output-dir": "outputDir",
      };
      const key = optionKeys[option] || option.slice(2);
      options[key] = value;
      index += 1;
    } else {
      fail(`Unknown option ${option}.`);
    }
  }
  return options;
}

function main() {
  const rootDir = path.resolve(__dirname, "..");
  const {
    mode,
    target: targetName,
    sourceFile,
    outputDir,
  } = parseArguments(process.argv.slice(2));
  const generated = generateEnvironments({
    rootDir,
    mode: mode || "build",
    targetName,
    sourceFile,
    outputDir,
  });

  for (const target of generated) {
    console.log(`Generated ${path.relative(rootDir, target.path)}.`);
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

module.exports = { generateEnvironments, parseArguments, parseEnvContent };
