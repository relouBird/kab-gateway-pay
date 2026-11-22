export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  user?: string;
  password?: string;
  from: string;
}

function readBoolean(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: boolean,
): boolean {
  const value = env[name];
  if (value === undefined) {
    return defaultValue;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${name} must be "true" or "false".`);
}

function readPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.SMTP_PORT ?? '1025';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

export function readSmtpConfig(env: NodeJS.ProcessEnv): SmtpConfig {
  const production = env.NODE_ENV === 'production';
  const host = env.SMTP_HOST ?? (production ? undefined : '127.0.0.1');
  const from =
    env.SMTP_FROM ?? (production ? undefined : 'no-reply@kgpay.local');
  const user = env.SMTP_USER;
  const password = env.SMTP_PASSWORD;
  const secure = readBoolean(env, 'SMTP_SECURE', false);
  const requireTLS = readBoolean(env, 'SMTP_REQUIRE_TLS', false);

  if (!host) {
    throw new Error('SMTP_HOST is required in production.');
  }
  if (!from) {
    throw new Error('SMTP_FROM is required in production.');
  }
  if ((user && !password) || (!user && password)) {
    throw new Error('SMTP_USER and SMTP_PASSWORD must be configured together.');
  }
  if (production && !secure && !requireTLS) {
    throw new Error(
      'Production SMTP must use TLS through SMTP_SECURE or SMTP_REQUIRE_TLS.',
    );
  }

  return {
    host,
    port: readPort(env),
    secure,
    requireTLS,
    user,
    password,
    from,
  };
}
