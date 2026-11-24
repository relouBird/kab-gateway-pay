import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest as jestApi } from '@jest/globals';
import { loadRuntimeEnvironment } from './runtime-env';

describe('loadRuntimeEnvironment', () => {
  it('loads the configured runtime environment file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'kgpay-runtime-env-'));
    const runtimeEnvFile = join(directory, 'auth-service.runtime.env');
    const previousPath = process.env.KG_PAY_RUNTIME_ENV_FILE;

    writeFileSync(runtimeEnvFile, 'KG_PAY_RUNTIME_ENV_TEST_VALUE=loaded\n');
    process.env.KG_PAY_RUNTIME_ENV_FILE = runtimeEnvFile;
    const loadEnvFile = jestApi
      .spyOn(process, 'loadEnvFile')
      .mockImplementation(() => undefined);

    try {
      loadRuntimeEnvironment();
      expect(loadEnvFile).toHaveBeenCalledWith(runtimeEnvFile);
    } finally {
      loadEnvFile.mockRestore();
      if (previousPath === undefined) {
        delete process.env.KG_PAY_RUNTIME_ENV_FILE;
      } else {
        process.env.KG_PAY_RUNTIME_ENV_FILE = previousPath;
      }
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
