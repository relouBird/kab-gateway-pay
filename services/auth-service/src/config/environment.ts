import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function resolveEnvironmentFile(
  configuredEnvironmentFile?: string,
  moduleDirectory?: string,
): string {
  const configuredPath = configuredEnvironmentFile?.trim();
  if (configuredPath) {
    const environmentFile = resolve(configuredPath);
    if (existsSync(environmentFile)) {
      return environmentFile;
    }

    throw new Error(
      'Auth-service environment file is missing; set KG_PAY_ENV_FILE or generate it with pnpm env:generate.',
    );
  }

  if (!moduleDirectory) {
    throw new Error(
      'Auth-service environment file is missing; set KG_PAY_ENV_FILE or generate it with pnpm env:generate.',
    );
  }

  const environmentFile = [
    resolve(
      moduleDirectory,
      '..',
      '..',
      '..',
      '.generated',
      'env',
      'auth-service.env',
    ),
    resolve(
      moduleDirectory,
      '..',
      '..',
      '..',
      '..',
      '.generated',
      'env',
      'auth-service.env',
    ),
  ].find(existsSync);

  if (!environmentFile) {
    throw new Error(
      'Auth-service environment file is missing; set KG_PAY_ENV_FILE or generate it with pnpm env:generate.',
    );
  }

  return environmentFile;
}

export function loadEnvironment(): void {
  const configuredEnvironmentFile = process.env.KG_PAY_ENV_FILE?.trim();
  const environmentFile = configuredEnvironmentFile
    ? resolveEnvironmentFile(configuredEnvironmentFile)
    : resolveEnvironmentFile(undefined, __dirname);
  process.loadEnvFile(environmentFile);
}
