import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRuntimeEnvironment(): void {
  const runtimeEnv = resolve(
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
      'Generated auth-service runtime environment is missing; start the service with its pnpm script or run pnpm env:runtime.',
    );
  }
  process.loadEnvFile(runtimeEnv);
}
