import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadRuntimeEnvironment(): void {
  const localSecrets = resolve(process.cwd(), '.env.local');
  if (existsSync(localSecrets)) {
    process.loadEnvFile(localSecrets);
  }

  const buildEnvCandidates = [
    resolve(__dirname, 'build.env'),
    resolve(__dirname, '..', 'build.env'),
    resolve(__dirname, '..', '..', 'build.env'),
    resolve(process.cwd(), 'build.env'),
  ];
  const buildEnv = buildEnvCandidates.find((candidate) =>
    existsSync(candidate),
  );
  if (buildEnv) {
    process.loadEnvFile(buildEnv);
  }
}
