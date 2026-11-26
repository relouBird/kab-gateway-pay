import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { jest as jestApi } from '@jest/globals';
import {
  loadRuntimeEnvironment,
  resolveRuntimeEnvironmentFile,
} from './runtime-env';

describe('loadRuntimeEnvironment', () => {
  it('loads the configured runtime environment file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kgpay-runtime-env-'));
    const runtimeEnvFile = join(directory, 'auth-service.runtime.env');
    const previousPath = process.env.RUNTIME_ENV_FILE;

    writeFileSync(runtimeEnvFile, 'KG_PAY_RUNTIME_ENV_TEST_VALUE=loaded\n');
    process.env.RUNTIME_ENV_FILE = runtimeEnvFile;
    const loadEnvFile = jestApi
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => undefined);

    try {
      loadRuntimeEnvironment();
      expect(loadEnvFile).toHaveBeenCalledWith(runtimeEnvFile);
    } finally {
      loadEnvFile.mockRestore();
      if (previousPath === undefined) {
        delete process.env.RUNTIME_ENV_FILE;
      } else {
        process.env.RUNTIME_ENV_FILE = previousPath;
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('finds the runtime environment beside a packaged service runtime', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kgpay-packaged-runtime-'));
    const moduleDirectory = join(
      directory,
      'auth-service',
      'runtime',
      'dist',
      'config',
    );
    const runtimeEnvFile = join(
      directory,
      'auth-service',
      '.generated',
      'env',
      'auth-service.runtime.env',
    );

    mkdirSync(dirname(runtimeEnvFile), { recursive: true });
    writeFileSync(runtimeEnvFile, 'NODE_ENV=production\n');

    try {
      expect(resolveRuntimeEnvironmentFile(undefined, moduleDirectory)).toBe(
        runtimeEnvFile,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
