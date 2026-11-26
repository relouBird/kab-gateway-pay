import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRuntimeEnvironment(): void {
  const configuredRuntimeEnv = process.env.RUNTIME_ENV_FILE?.trim();
  const runtimeEnv = configuredRuntimeEnv
    ? resolve(configuredRuntimeEnv)
    : resolve(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        '.generated',
        'env',
        'auth-service.runtime.env',
      );
  if (!existsSync(runtimeEnv)) {
    throw new Error(
      'Generated auth-service runtime environment is missing; set RUNTIME_ENV_FILE or start the service with its pnpm script.',
    );
  }
  process.loadEnvFile(runtimeEnv);
}
