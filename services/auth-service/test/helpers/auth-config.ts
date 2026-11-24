import { readAuthConfig } from '../../src/config/auth.config';

export function validAuthEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    AUTH_ISSUER: 'https://auth.example.test',
    AUTH_AUDIENCE: 'kgpay-services',
    OTP_HASH_KEY: 'a'.repeat(64),
    AUTH_COOKIE_SECURE: 'false',
    AUTH_COOKIE_SAME_SITE: 'lax',
    AUTH_CORS_ORIGINS: '',
    AUTH_ACCESS_TTL_SECONDS: '600',
    CUSTOMER_REFRESH_TTL_DAYS: '30',
    STAFF_REFRESH_TTL_SECONDS: '28800',
    STAFF_IDLE_TTL_SECONDS: '1800',
    CUSTOMER_SESSION_LIMIT: '5',
    STAFF_SESSION_LIMIT: '3',
    LOGIN_FAILURES_BEFORE_LOCK: '5',
    LOGIN_LOCK_BASE_SECONDS: '900',
    LOGIN_LOCK_MAX_SECONDS: '86400',
    LOGIN_IP_MAX_ATTEMPTS: '10',
    LOGIN_IP_WINDOW_SECONDS: '60',
    PASSWORD_MIN_LENGTH: '10',
    OTP_LENGTH: '6',
    OTP_TTL_SECONDS: '300',
    OTP_MAX_ATTEMPTS: '5',
    OTP_RESEND_COOLDOWN_SECONDS: '60',
    OTP_MAX_SENDS_PER_HOUR: '5',
    INVITATION_TTL_SECONDS: '172800',
    STEP_UP_TTL_SECONDS: '300',
    STAFF_INACTIVITY_DAYS: '90',
  };
}

export function validAuthConfig() {
  return readAuthConfig(validAuthEnvironment());
}
