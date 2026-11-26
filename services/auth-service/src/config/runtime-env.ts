import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function resolveRuntimeEnvironmentFile(
  configuredRuntimeEnv?: string,
  moduleDirectory?: string,
): string {
  const configuredPath = configuredRuntimeEnv?.trim();
  if (configuredPath) {
    const runtimeEnv = resolve(configuredPath);
    if (existsSync(runtimeEnv)) {
      return runtimeEnv;
    }

    throw new Error(
      'Generated auth-service runtime environment is missing; set RUNTIME_ENV_FILE or start the service with its pnpm script.',
    );
  }

  if (!moduleDirectory) {
    throw new Error(
      'Generated auth-service runtime environment is missing; set RUNTIME_ENV_FILE or start the service with its pnpm script.',
    );
  }

  const runtimeEnv = [
    resolve(
      moduleDirectory,
      '..',
      '..',
      '..',
      '.generated',
      'env',
      'auth-service.runtime.env',
    ),
    resolve(
      moduleDirectory,
      '..',
      '..',
      '..',
      '..',
      '.generated',
      'env',
      'auth-service.runtime.env',
    ),
  ].find(existsSync);

  if (!runtimeEnv) {
    throw new Error(
      'Generated auth-service runtime environment is missing; set RUNTIME_ENV_FILE or start the service with its pnpm script.',
    );
  }

  return runtimeEnv;
}

export function loadRuntimeEnvironment(): void {
  const configuredRuntimeEnv = process.env.RUNTIME_ENV_FILE?.trim();
  const runtimeEnv = configuredRuntimeEnv
    ? resolveRuntimeEnvironmentFile(configuredRuntimeEnv)
    : resolveRuntimeEnvironmentFile(undefined, __dirname);
  process.loadEnvFile(runtimeEnv);
}
