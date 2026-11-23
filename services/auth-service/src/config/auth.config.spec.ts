import { readAuthConfig } from './auth.config';
import { validAuthEnvironment } from '../../test/helpers/auth-config';

describe('readAuthConfig', () => {
  it('requires a separate runtime key for OTP hashing', () => {
    const env = validAuthEnvironment();
    delete env.OTP_HASH_KEY;

    expect(() => readAuthConfig(env)).toThrow(
      'OTP_HASH_KEY must contain at least 32 bytes.',
    );
  });

  it('rejects insecure production cookies and missing IP hashing keys', () => {
    const env = validAuthEnvironment();
    env.NODE_ENV = 'production';

    expect(() => readAuthConfig(env)).toThrow(
      'AUTH_COOKIE_SECURE must be true in production.',
    );

    env.AUTH_COOKIE_SECURE = 'true';
    expect(() => readAuthConfig(env)).toThrow(
      'IP_HASH_KEY is required in production.',
    );
  });

  it('rejects non-HTTPS production origins', () => {
    const env = validAuthEnvironment();
    env.NODE_ENV = 'production';
    env.AUTH_COOKIE_SECURE = 'true';
    env.IP_HASH_KEY = 'b'.repeat(64);
    env.AUTH_CORS_ORIGINS = 'http://web.example.com';

    expect(() => readAuthConfig(env)).toThrow(
      'AUTH_CORS_ORIGINS contains an unsafe origin.',
    );
  });

  it('allows the staff portal URL to be omitted and validates it when configured', () => {
    const env = validAuthEnvironment();
    expect(readAuthConfig(env).staffPortalUrl).toBeUndefined();

    env.STAFF_PORTAL_URL = 'http://localhost:5174';
    expect(readAuthConfig(env).staffPortalUrl).toBe('http://localhost:5174');

    env.STAFF_PORTAL_URL = 'javascript:alert(1)';
    expect(() => readAuthConfig(env)).toThrow(
      'STAFF_PORTAL_URL contains an unsafe portal URL.',
    );
  });

  it('requires an HTTPS staff portal URL in production', () => {
    const env = validAuthEnvironment();
    env.NODE_ENV = 'production';
    env.AUTH_COOKIE_SECURE = 'true';
    env.IP_HASH_KEY = 'b'.repeat(64);
    env.STAFF_PORTAL_URL = 'http://staff.example.com';

    expect(() => readAuthConfig(env)).toThrow(
      'STAFF_PORTAL_URL contains an unsafe portal URL.',
    );
  });
});
