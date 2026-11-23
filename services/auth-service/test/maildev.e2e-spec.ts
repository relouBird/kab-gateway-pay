import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthService } from '../src/auth/auth.service';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { correlationMiddleware } from '../src/common/correlation.middleware';

type MaildevResponse = {
  error?: { code: number };
  result?: {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
    serverInfo?: { name?: string };
    tools?: Array<{ name: string }>;
  };
};

const describeMaildev =
  process.env.AUTH_E2E_DATABASE_URL && process.env.AUTH_E2E_MAILDEV === 'true'
    ? describe
    : describe.skip;

describeMaildev('Auth API (real SMTP through Maildev)', () => {
  let app: INestApplication<App> | undefined;
  let maildev: MaildevMcpClient | undefined;

  beforeAll(async () => {
    assertLocalSmtpConfiguration();
    maildev = new MaildevMcpClient(
      process.env.AUTH_E2E_MAILDEV_MCP_URL ?? 'http://127.0.0.1:1080/mcp',
    );
    await maildev.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.use(correlationMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    try {
      if (maildev) {
        for (const recipient of recipients) {
          await maildev.deleteEmailsTo(recipient);
        }
      }
    } finally {
      await app?.close();
    }
  });

  it('delivers contact and login OTP over SMTP and completes CUSTOMER MFA', async () => {
    if (!app || !maildev) {
      throw new Error('The Maildev e2e test did not initialize.');
    }

    const recipient = createRecipient();
    const api = request(app.getHttpServer());
    const password = createTestPassword();
    const registration = await api
      .post('/auth/register')
      .send({
        email: recipient,
        phone: '+237600000007',
        password,
        locale: 'en',
      })
      .expect(202);
    expect(registration.body.challengeId).toBeTruthy();

    const contactCode = await maildev.waitForOtp(
      recipient,
      /verify your email address|vérifier votre adresse e-mail/i,
    );
    await api
      .post('/auth/verify-contact')
      .send({ challengeId: registration.body.challengeId, code: contactCode })
      .expect(200)
      .expect({ status: 'ACTIVE' });

    const login = await api
      .post('/auth/login')
      .set('Accept-Language', 'en')
      .send({ email: recipient, password })
      .expect(202);
    expect(login.body).not.toHaveProperty('accessToken');
    expect(login.body).not.toHaveProperty('sessionId');

    const loginCode = await maildev.waitForOtp(
      recipient,
      /sign in to your account|vous connecter à votre compte/i,
    );
    const authenticated = await api
      .post('/auth/mfa/verify')
      .send({ challengeId: login.body.challengeId, code: loginCode })
      .expect(200);
    expect(authenticated.body).toMatchObject({
      tokenType: 'Bearer',
      subjectType: 'CUSTOMER',
      roles: ['CUSTOMER'],
    });
    expect(authenticated.body.accessToken).toMatch(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    );

    const stepUpChallenge = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${authenticated.body.accessToken}`)
      .send({ action: 'iam.identity.phone-change' })
      .expect(200);
    const stepUpCode = await maildev.waitForOtp(
      recipient,
      /confirm a sensitive action|confirmer une action sensible/i,
    );
    const stepUp = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${authenticated.body.accessToken}`)
      .send({
        action: 'iam.identity.phone-change',
        challengeId: stepUpChallenge.body.challengeId,
        code: stepUpCode,
      })
      .expect(200);
    expect(stepUp.body.proof).toBeTruthy();

    const recovery = await api
      .post('/auth/password/forgot')
      .send({ email: recipient })
      .expect(202);
    const recoveryCode = await maildev.waitForOtp(
      recipient,
      /reset your password|réinitialiser votre mot de passe/i,
    );
    const newPassword = createTestPassword();
    await api
      .post('/auth/password/reset')
      .send({
        challengeId: recovery.body.challengeId,
        code: recoveryCode,
        newPassword,
      })
      .expect(204);
  }, 30_000);

  it('delivers a single-use STAFF invitation and the STAFF login OTP', async () => {
    if (!app || !maildev) {
      throw new Error('The Maildev e2e test did not initialize.');
    }

    const api = request(app.getHttpServer());
    const auth = app.get(AuthService);
    const adminEmail = createRecipient();
    const adminPassword = createTestPassword();
    const bootstrap = await auth.bootstrapSuperAdmin({
      email: adminEmail,
      phone: '+237600000008',
      password: adminPassword,
    });
    const contactCode = await maildev.waitForOtp(
      adminEmail,
      /verify your email address|vérifier votre adresse e-mail/i,
    );
    await api
      .post('/auth/verify-contact')
      .send({ challengeId: bootstrap.challengeId, code: contactCode })
      .expect(200);

    const adminLogin = await api
      .post('/auth/login')
      .set('Accept-Language', 'en')
      .send({ email: adminEmail, password: adminPassword })
      .expect(202);
    const adminLoginCode = await maildev.waitForOtp(
      adminEmail,
      /sign in to your account|vous connecter à votre compte/i,
    );
    const adminAuthentication = await api
      .post('/auth/mfa/verify')
      .send({ challengeId: adminLogin.body.challengeId, code: adminLoginCode })
      .expect(200);
    const adminToken = adminAuthentication.body.accessToken as string;

    const stepUpChallenge = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'iam.identity.create' })
      .expect(200);
    const stepUpCode = await maildev.waitForOtp(
      adminEmail,
      /confirm a sensitive action|confirmer une action sensible/i,
    );
    const stepUp = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'iam.identity.create',
        challengeId: stepUpChallenge.body.challengeId,
        code: stepUpCode,
      })
      .expect(200);

    const staffEmail = createRecipient();
    const staffPassword = createTestPassword();
    await api
      .post('/admin/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Step-Up-Proof', stepUp.body.proof)
      .send({
        email: staffEmail,
        phone: '+237600000009',
        roles: ['OPERATIONS_ADMIN'],
      })
      .expect(202);

    const invitationToken = await maildev.waitForInvitationToken(staffEmail);

    await api
      .post('/auth/invitations/accept')
      .send({ token: invitationToken, password: staffPassword })
      .expect(200);
    await api
      .post('/auth/invitations/accept')
      .send({ token: invitationToken, password: staffPassword })
      .expect(400);

    const staffLogin = await api
      .post('/auth/login')
      .set('Accept-Language', 'en')
      .send({ email: staffEmail, password: staffPassword })
      .expect(202);
    const staffLoginCode = await maildev.waitForOtp(
      staffEmail,
      /sign in to your account|vous connecter à votre compte/i,
    );
    const staffAuthentication = await api
      .post('/auth/mfa/verify')
      .send({ challengeId: staffLogin.body.challengeId, code: staffLoginCode })
      .expect(200);
    expect(staffAuthentication.body).toMatchObject({
      subjectType: 'STAFF',
      roles: ['OPERATIONS_ADMIN'],
    });
  }, 60_000);
});

function createRecipient(): string {
  const recipient = `auth-maildev-${randomUUID()}@example.test`;
  recipients.push(recipient);
  return recipient;
}

function createTestPassword(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}

class MaildevMcpClient {
  private readonly endpoint: URL;
  private readonly inspectedMessageIds = new Set<string>();
  private sessionId: string | undefined;
  private nextRequestId = 1;

  constructor(endpoint: string) {
    this.endpoint = new URL(endpoint);
    if (
      this.endpoint.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(this.endpoint.hostname) ||
      this.endpoint.pathname !== '/mcp'
    ) {
      throw new Error(
        'Maildev MCP tests require a local HTTP endpoint ending in /mcp.',
      );
    }
  }

  async initialize(): Promise<void> {
    const response = await this.post(
      {
        jsonrpc: '2.0',
        id: this.nextRequestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'kgpay-auth-e2e', version: '1.0.0' },
        },
      },
      false,
    );
    this.sessionId = response.headers.get('mcp-session-id') ?? undefined;
    if (
      !this.sessionId ||
      response.envelope.result?.serverInfo?.name !== 'maildev'
    ) {
      throw new Error('The local endpoint is not a Maildev MCP server.');
    }

    const headers = this.headers();
    const initialized = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!initialized.ok) {
      throw new Error('Maildev MCP initialization notification failed.');
    }

    const tools = await this.request('tools/list', {});
    const names = new Set(tools.tools?.map(({ name }) => name));
    if (
      !names.has('maildev_search_emails') ||
      !names.has('maildev_get_email') ||
      !names.has('maildev_delete_email')
    ) {
      throw new Error('Maildev MCP is missing the required inbox tools.');
    }
  }

  async waitForOtp(to: string, purpose: RegExp): Promise<string> {
    const email = await this.waitForMessage(to, purpose);
    const readableEmail = this.toReadableEmailText(email);

    const code =
      readableEmail.match(
        /(?:Use this code to|Utilisez ce code pour)[\s\S]{0,500}?(?:^|\n)\s*(\d{4,12})\s*(?=\n|$)/im,
      )?.[1] ??
      readableEmail.match(/(?:Use code|Utilisez le code)\s+(\d{4,12})\b/i)?.[1];

    if (!code) {
      throw new Error('The matching Maildev message did not contain an OTP.');
    }

    return code;
  }

  async waitForInvitationToken(to: string): Promise<string> {
    const email = await this.waitForMessage(
      to,
      /One-time token|Jeton à usage unique|Jeton\s*:/i,
    );

    const readableEmail = this.toReadableEmailText(email);

    const lines = readableEmail
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    // Format texte : Jeton: abc123
    for (const line of lines) {
      const inlineMatch = line.match(
        /^(?:One-time token|Jeton à usage unique|Jeton)\s*:\s*([A-Za-z0-9._~-]+)$/i,
      );

      if (inlineMatch) {
        return inlineMatch[1];
      }
    }

    // Format HTML : libellé sur une ligne, jeton sur la suivante.
    for (let i = 0; i < lines.length; i++) {
      if (
        /^(?:One-time token|Jeton à usage unique|Jeton)\s*:?\s*$/i.test(
          lines[i],
        )
      ) {
        const candidate = lines[i + 1];

        if (candidate && /^[A-Za-z0-9._~-]+$/.test(candidate)) {
          return candidate;
        }
      }
    }

    throw new Error(
      'The Maildev invitation message did not contain a valid token.',
    );
  }

  private async waitForMessage(to: string, purpose: RegExp): Promise<string> {
    const deadline = Date.now() + 10_000;
    let inspectedCount = 0;

    while (Date.now() < deadline) {
      const search = await this.callTool('maildev_search_emails', {
        to,
        limit: 10,
      });

      const ids = [...search.matchAll(/^ID:\s*(\S+)/gm)].map(([, id]) => id);

      for (const id of ids) {
        if (this.inspectedMessageIds.has(id)) continue;

        this.inspectedMessageIds.add(id);
        inspectedCount += 1;

        const email = await this.callTool('maildev_get_email', { id });

        if (purpose.test(email)) {
          return email;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(
      `No matching Maildev message arrived after inspecting ${inspectedCount} messages.`,
    );
  }

  private toReadableEmailText(email: string): string {
    return email
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|tr|td|th|li|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async deleteEmailsTo(to: string): Promise<void> {
    const search = await this.callTool('maildev_search_emails', {
      to,
      limit: 10,
    });
    const ids = [...search.matchAll(/^ID:\s*(\S+)/gm)].map(([, id]) => id);
    for (const id of ids) {
      await this.callTool('maildev_delete_email', { id });
    }
  }

  private async request(
    method: string,
    params: Record<string, unknown>,
  ): Promise<NonNullable<MaildevResponse['result']>> {
    const response = await this.post(
      { jsonrpc: '2.0', id: this.nextRequestId++, method, params },
      true,
    );
    const result = response.envelope.result;
    if (!result || result.isError) {
      throw new Error(`Maildev MCP request failed: ${method}.`);
    }
    return result;
  }

  private async callTool(
    name: string,
    arguments_: Record<string, unknown>,
  ): Promise<string> {
    const result = await this.request('tools/call', {
      name,
      arguments: arguments_,
    });
    const text = result.content?.find(({ type }) => type === 'text')?.text;
    if (!text) throw new Error(`Maildev MCP tool returned no text: ${name}.`);
    return text;
  }

  private async post(
    body: Record<string, unknown>,
    includeSession: boolean,
  ): Promise<{ envelope: MaildevResponse; headers: Headers }> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers(includeSession),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Maildev MCP returned HTTP ${response.status}.`);
    }

    const raw = await response.text();
    const dataLine = raw
      .split(/\r?\n/)
      .find((line) => line.startsWith('data: '));
    if (!dataLine) throw new Error('Maildev MCP returned no JSON-RPC event.');
    const envelope = JSON.parse(dataLine.slice(6)) as MaildevResponse;
    if (envelope.error) {
      throw new Error(
        `Maildev MCP returned JSON-RPC error ${envelope.error.code}.`,
      );
    }
    return { envelope, headers: response.headers };
  }

  private headers(includeSession = true): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-03-26',
    };
    if (includeSession && this.sessionId) {
      headers['MCP-Session-Id'] = this.sessionId;
    }
    return headers;
  }
}

const recipients: string[] = [];

function assertLocalSmtpConfiguration(): void {
  const host = process.env.SMTP_HOST?.toLowerCase();
  if (!host || !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(
      'Maildev e2e refused to send mail because SMTP_HOST is not loopback.',
    );
  }
}
