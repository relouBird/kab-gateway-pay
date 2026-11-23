export interface AuthConfig {
  issuer: string;
  audience: string;
  accessTokenTtlSeconds: number;
  customerRefreshTtlDays: number;
  staffRefreshTtlSeconds: number;
  staffIdleTtlSeconds: number;
  customerSessionLimit: number;
  staffSessionLimit: number;
  loginFailuresBeforeLock: number;
  loginLockBaseSeconds: number;
  loginLockMaxSeconds: number;
  loginIpMaxAttempts: number;
  loginIpWindowSeconds: number;
  passwordMinLength: number;
  otpLength: number;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  otpHashKey: string;
  otpResendCooldownSeconds: number;
  otpMaxSendsPerHour: number;
  invitationTtlSeconds: number;
  stepUpTtlSeconds: number;
  staffInactivityDays: number;
  cookieSecure: boolean;
  cookieSameSite: 'strict' | 'lax' | 'none';
  corsOrigins: readonly string[];
  staffPortalUrl?: string;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

function readInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  minimum: number,
): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') {
    throw new Error(`${name} is required.`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(
      `${name} must be an integer greater than or equal to ${minimum}.`,
    );
  }
  return value;
}

function readBoolean(env: NodeJS.ProcessEnv, name: string): boolean {
  const value = env[name];
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${name} must be "true" or "false".`);
}

function readOptionalPortalUrl(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const value = env[name]?.trim();
  if (!value) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid portal URL.`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (env.NODE_ENV === 'production' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${name} contains an unsafe portal URL.`);
  }
  return url.toString().replace(/\/+$/, '');
}

export function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const issuer = env.AUTH_ISSUER?.trim();
  const audience = env.AUTH_AUDIENCE?.trim();
  if (!issuer || !audience) {
    throw new Error('AUTH_ISSUER and AUTH_AUDIENCE are required.');
  }
  const otpHashKey = env.OTP_HASH_KEY?.trim();
  if (!otpHashKey || Buffer.byteLength(otpHashKey, 'utf8') < 32) {
    throw new Error('OTP_HASH_KEY must contain at least 32 bytes.');
  }

  const sameSite = env.AUTH_COOKIE_SAME_SITE ?? 'lax';
  if (sameSite !== 'strict' && sameSite !== 'lax' && sameSite !== 'none') {
    throw new Error('AUTH_COOKIE_SAME_SITE must be strict, lax, or none.');
  }
  const cookieSecure = readBoolean(env, 'AUTH_COOKIE_SECURE');
  if (env.NODE_ENV === 'production' && !cookieSecure) {
    throw new Error('AUTH_COOKIE_SECURE must be true in production.');
  }
  if (env.NODE_ENV === 'production' && !env.IP_HASH_KEY) {
    throw new Error('IP_HASH_KEY is required in production.');
  }
  if (sameSite === 'none' && !cookieSecure) {
    throw new Error('AUTH_COOKIE_SECURE must be true when SameSite is none.');
  }

  const otpLength = readInteger(env, 'OTP_LENGTH', 6);
  if (otpLength > 10) {
    throw new Error('OTP_LENGTH must not exceed 10.');
  }

  const corsOrigins = (env.AUTH_CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error('AUTH_CORS_ORIGINS must contain valid origin URLs.');
      }
      if (
        !['http:', 'https:'].includes(parsed.protocol) ||
        parsed.origin !== origin ||
        (env.NODE_ENV === 'production' && parsed.protocol !== 'https:')
      ) {
        throw new Error('AUTH_CORS_ORIGINS contains an unsafe origin.');
      }
      return parsed.origin;
    });

  return {
    issuer,
    audience,
    accessTokenTtlSeconds: readInteger(env, 'AUTH_ACCESS_TTL_SECONDS', 1),
    customerRefreshTtlDays: readInteger(env, 'CUSTOMER_REFRESH_TTL_DAYS', 1),
    staffRefreshTtlSeconds: readInteger(env, 'STAFF_REFRESH_TTL_SECONDS', 1),
    staffIdleTtlSeconds: readInteger(env, 'STAFF_IDLE_TTL_SECONDS', 1),
    customerSessionLimit: readInteger(env, 'CUSTOMER_SESSION_LIMIT', 1),
    staffSessionLimit: readInteger(env, 'STAFF_SESSION_LIMIT', 1),
    loginFailuresBeforeLock: readInteger(env, 'LOGIN_FAILURES_BEFORE_LOCK', 1),
    loginLockBaseSeconds: readInteger(env, 'LOGIN_LOCK_BASE_SECONDS', 1),
    loginLockMaxSeconds: readInteger(env, 'LOGIN_LOCK_MAX_SECONDS', 1),
    loginIpMaxAttempts: readInteger(env, 'LOGIN_IP_MAX_ATTEMPTS', 1),
    loginIpWindowSeconds: readInteger(env, 'LOGIN_IP_WINDOW_SECONDS', 1),
    passwordMinLength: readInteger(env, 'PASSWORD_MIN_LENGTH', 1),
    otpLength,
    otpTtlSeconds: readInteger(env, 'OTP_TTL_SECONDS', 1),
    otpMaxAttempts: readInteger(env, 'OTP_MAX_ATTEMPTS', 1),
    otpHashKey,
    otpResendCooldownSeconds: readInteger(
      env,
      'OTP_RESEND_COOLDOWN_SECONDS',
      0,
    ),
    otpMaxSendsPerHour: readInteger(env, 'OTP_MAX_SENDS_PER_HOUR', 1),
    invitationTtlSeconds: readInteger(env, 'INVITATION_TTL_SECONDS', 1),
    stepUpTtlSeconds: readInteger(env, 'STEP_UP_TTL_SECONDS', 1),
    staffInactivityDays: readInteger(env, 'STAFF_INACTIVITY_DAYS', 1),
    cookieSecure,
    cookieSameSite: sameSite,
    corsOrigins,
    staffPortalUrl: readOptionalPortalUrl(env, 'STAFF_PORTAL_URL'),
  };
}
