import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { jest as jestApi } from '@jest/globals';
import { loadEnvironment, resolveEnvironmentFile } from './environment';

describe('loadEnvironment', () => {
  it('loads the configured service environment file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kgpay-service-env-'));
    const environmentFile = join(directory, 'auth-service.env');
    const previousPath = process.env.KG_PAY_ENV_FILE;

    writeFileSync(environmentFile, 'KG_PAY_SERVICE_ENV_TEST_VALUE=loaded\n');
    process.env.KG_PAY_ENV_FILE = environmentFile;
    const loadEnvFile = jestApi
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => undefined);

    try {
      loadEnvironment();
      expect(loadEnvFile).toHaveBeenCalledWith(environmentFile);
    } finally {
      loadEnvFile.mockRestore();
      if (previousPath === undefined) {
        delete process.env.KG_PAY_ENV_FILE;
      } else {
        process.env.KG_PAY_ENV_FILE = previousPath;
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('finds the service environment beside the packaged runtime', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kgpay-packaged-service-'));
    const moduleDirectory = join(
      directory,
      'auth-service',
      'runtime',
      'dist',
      'config',
    );
    const environmentFile = join(
      directory,
      'auth-service',
      '.generated',
      'env',
      'auth-service.env',
    );

    mkdirSync(dirname(environmentFile), { recursive: true });
    writeFileSync(environmentFile, 'NODE_ENV=production\n');

    try {
      expect(resolveEnvironmentFile(undefined, moduleDirectory)).toBe(
        environmentFile,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
