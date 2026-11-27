import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { EmailOtpService } from '../src/email-otp/email-otp.service';
import type { SendOtpEmailInput } from '../src/email-otp/email-otp.types';
import { InvitationEmailService } from '../src/email-otp/invitation-email.service';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { correlationMiddleware } from '../src/common/correlation.middleware';
import { PrismaService } from '../src/database/prisma.service';

const describeIntegration = process.env.AUTH_E2E_DATABASE_URL
  ? describe
  : describe.skip;

describeIntegration('Auth API (isolated integration e2e)', () => {
  let app: INestApplication<App> | undefined;
  const sentEmails: SendOtpEmailInput[] = [];
  const sentInvitations: Array<{ to: string; token: string }> = [];
  let customerRefreshCookie = '';
  let customerCsrfCookie = '';

  beforeAll(async () => {
    const emailService = {
      send: async (input: SendOtpEmailInput) => {
        sentEmails.push(input);
      },
    };
    const invitationEmailService = {
      send: async (to: string, token: string) => {
        sentInvitations.push({ to, token });
      },
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailOtpService)
      .useValue(emailService)
      .overrideProvider(InvitationEmailService)
      .useValue(invitationEmailService)
      .compile();

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

    const e2eDatabaseUrl = process.env.AUTH_E2E_DATABASE_URL;
    if (!e2eDatabaseUrl) {
      throw new Error('The isolated e2e database URL is required.');
    }
    const expectedSchema = new URL(e2eDatabaseUrl).searchParams.get('schema');
    if (!expectedSchema || !/^kgpay_e2e_[0-9a-f]{32}$/.test(expectedSchema)) {
      throw new Error('A valid isolated e2e database schema is required.');
    }
    const prisma = app.get(PrismaService);
    const isolationKey = `PRISMA_SCHEMA_CHECK_${randomUUID()}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${expectedSchema}"."SystemSetting" ("key", "value", "updatedAt") VALUES ($1, $2, NOW())`,
      isolationKey,
      'isolated',
    );
    const isolationSetting = await prisma.systemSetting.findUnique({
      where: { key: isolationKey },
      select: { value: true },
    });
    expect(isolationSetting?.value).toBe('isolated');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers, verifies, authenticates with OTP, uses step-up, rotates and revokes a session', async () => {
    if (!app) throw new Error('The e2e application did not initialize.');

    const api = request(app.getHttpServer());
    const email = `auth-e2e-${randomUUID()}@example.test`;
    const password = 'Test-Only-Auth-Password-2026!';

    await api.get('/health').expect(200).expect({ status: 'ok' });

    const registration = await api
      .post('/auth/register')
      .send({ email, phone: '+237600000001', password, locale: 'en' })
      .expect(202);
    expect(registration.body.challengeId).toBeTruthy();
    expect(latestEmail('contact_verification').to).toBe(email);

    await api
      .post('/auth/login')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .send({ email, password })
      .expect(401);
    expect(
      sentEmails.filter(({ purpose }) => purpose === 'login'),
    ).toHaveLength(0);

    await api
      .post('/auth/verify-contact')
      .send({
        challengeId: registration.body.challengeId,
        code: latestEmail('contact_verification').code,
      })
      .expect(200)
      .expect({ status: 'ACTIVE' });

    await api
      .post('/auth/login')
      .set('X-KGPay-Portal', 'STAFF')
      .send({ email, password })
      .expect(401);
    expect(
      sentEmails.filter(({ purpose }) => purpose === 'login'),
    ).toHaveLength(0);

    const login = await api
      .post('/auth/login')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .send({ email, password })
      .expect(202);
    expect(login.body).not.toHaveProperty('accessToken');
    expect(login.body).not.toHaveProperty('sessionId');

    const authenticated = await api
      .post('/auth/mfa/verify')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .send({
        challengeId: login.body.challengeId,
        code: latestEmail('login').code,
      })
      .expect(200);
    expect(authenticated.body).toMatchObject({
      tokenType: 'Bearer',
      subjectType: 'CUSTOMER',
      roles: ['CUSTOMER'],
    });
    expect(authenticated.body.accessToken).toMatch(
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    );

    const accessToken = authenticated.body.accessToken as string;
    const sessions = await api
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(sessions.body).toHaveLength(1);

    const stepUpChallenge = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ action: 'iam.identity.phone-change' })
      .expect(200);
    const stepUp = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        action: 'iam.identity.phone-change',
        challengeId: stepUpChallenge.body.challengeId,
        code: latestEmail('step_up').code,
      })
      .expect(200);
    expect(stepUp.body.proof).toBeTruthy();

    await api
      .post('/auth/contact/phone')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Step-Up-Proof', stepUp.body.proof)
      .send({ phone: '+237600000002' })
      .expect(204);

    const refreshCookie = cookiePair(
      authenticated.headers['set-cookie'],
      'kgpay_customer_refresh',
    );
    const csrfCookie = cookiePair(
      authenticated.headers['set-cookie'],
      'kgpay_customer_csrf',
    );
    customerRefreshCookie = refreshCookie;
    customerCsrfCookie = csrfCookie;
    const cookies = `${refreshCookie}; ${csrfCookie}`;
    const csrfToken = csrfCookie.slice('kgpay_customer_csrf='.length);

    await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .set('Cookie', cookies)
      .send({})
      .expect(403);

    const refreshed = await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    const rotatedRefreshCookie = cookiePair(
      refreshed.headers['set-cookie'],
      'kgpay_customer_refresh',
    );
    const rotatedCsrfCookie = cookiePair(
      refreshed.headers['set-cookie'],
      'kgpay_customer_csrf',
    );
    customerRefreshCookie = rotatedRefreshCookie;
    customerCsrfCookie = rotatedCsrfCookie;

    await api.get('/admin/roles').expect(401);
  });

  it('recovers a password without account enumeration and revokes existing sessions', async () => {
    if (!app) throw new Error('The e2e application did not initialize.');

    const api = request(app.getHttpServer());
    const email = `auth-recovery-${randomUUID()}@example.test`;
    const password = 'Test-Only-Auth-Password-2026!';
    const newPassword = 'Reset-Only-Auth-Password-2026!';

    const registration = await api
      .post('/auth/register')
      .send({ email, phone: '+237600000003', password })
      .expect(202);
    await api
      .post('/auth/verify-contact')
      .send({
        challengeId: registration.body.challengeId,
        code: latestEmail('contact_verification').code,
      })
      .expect(200);

    const login = await api
      .post('/auth/login')
      .send({ email, password })
      .expect(202);
    const authenticated = await api
      .post('/auth/mfa/verify')
      .send({
        challengeId: login.body.challengeId,
        code: latestEmail('login').code,
      })
      .expect(200);

    const unknownAccount = await api
      .post('/auth/password/forgot')
      .send({ email: `unknown-${randomUUID()}@example.test` })
      .expect(202);
    const knownAccount = await api
      .post('/auth/password/forgot')
      .send({ email })
      .expect(202);
    expect(knownAccount.body.message).toBe(unknownAccount.body.message);

    await api
      .post('/auth/password/reset')
      .send({
        challengeId: knownAccount.body.challengeId,
        code: latestEmail('password_recovery').code,
        newPassword,
      })
      .expect(204);

    const refreshCookie = cookiePair(
      authenticated.headers['set-cookie'],
      'kgpay_refresh',
    );
    const csrfCookie = cookiePair(
      authenticated.headers['set-cookie'],
      'kgpay_csrf',
    );
    await api
      .post('/auth/refresh')
      .set('Cookie', `${refreshCookie}; ${csrfCookie}`)
      .set('X-CSRF-Token', csrfCookie.slice('kgpay_csrf='.length))
      .send({})
      .expect(401);

    const newEmail = `auth-recovery-login-${randomUUID()}@example.test`;
    const newRegistration = await api
      .post('/auth/register')
      .send({ email: newEmail, phone: '+237600000006', password })
      .expect(202);
    await api
      .post('/auth/verify-contact')
      .send({
        challengeId: newRegistration.body.challengeId,
        code: latestEmail('contact_verification').code,
      })
      .expect(200);
    const newRecovery = await api
      .post('/auth/password/forgot')
      .send({ email: newEmail })
      .expect(202);
    await api
      .post('/auth/password/reset')
      .send({
        challengeId: newRecovery.body.challengeId,
        code: latestEmail('password_recovery').code,
        newPassword,
      })
      .expect(204);

    const newLogin = await api
      .post('/auth/login')
      .send({ email: newEmail, password: newPassword })
      .expect(202);
    const newAuthentication = await api
      .post('/auth/mfa/verify')
      .send({
        challengeId: newLogin.body.challengeId,
        code: latestEmail('login').code,
      })
      .expect(200);
    expect(newAuthentication.body.subjectType).toBe('CUSTOMER');
  });

  it('bootstraps a super-admin, invites STAFF and enforces STAFF MFA and role permissions', async () => {
    if (!app) throw new Error('The e2e application did not initialize.');

    const api = request(app.getHttpServer());
    const auth = app.get(AuthService);
    const adminEmail = `auth-admin-${randomUUID()}@example.test`;
    const adminPassword = 'Test-Only-Admin-Password-2026!';
    const bootstrap = await auth.bootstrapSuperAdmin({
      email: adminEmail,
      phone: '+237600000004',
      password: adminPassword,
    });

    await api
      .post('/auth/verify-contact')
      .send({
        challengeId: bootstrap.challengeId,
        code: latestEmail('contact_verification').code,
      })
      .expect(200);
    const adminLogin = await api
      .post('/auth/login')
      .set('X-KGPay-Portal', 'STAFF')
      .send({ email: adminEmail, password: adminPassword })
      .expect(202);
    const adminAuthentication = await api
      .post('/auth/mfa/verify')
      .set('X-KGPay-Portal', 'STAFF')
      .send({
        challengeId: adminLogin.body.challengeId,
        code: latestEmail('login').code,
      })
      .expect(200);
    const adminToken = adminAuthentication.body.accessToken as string;
    await api
      .get('/admin/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const staffEmail = `auth-staff-${randomUUID()}@example.test`;
    const staffPassword = 'Test-Only-Staff-Password-2026!';
    await api
      .post('/admin/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: staffEmail,
        phone: '+237600000005',
        roles: ['OPERATIONS_ADMIN'],
      })
      .expect(403);

    const stepUpChallenge = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'iam.identity.create' })
      .expect(200);
    const stepUp = await api
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'iam.identity.create',
        challengeId: stepUpChallenge.body.challengeId,
        code: latestEmail('step_up').code,
      })
      .expect(200);

    const invitation = await api
      .post('/admin/identities')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Step-Up-Proof', stepUp.body.proof)
      .send({
        email: staffEmail,
        phone: '+237600000005',
        roles: ['OPERATIONS_ADMIN'],
      })
      .expect(202);
    expect(invitation.body.invitationId).toBeTruthy();
    const invitationMessage = sentInvitations.find(
      (message) => message.to === staffEmail,
    );
    expect(invitationMessage).toBeDefined();
    if (!invitationMessage) {
      throw new Error('The staff invitation email was not captured.');
    }

    const accepted = await api
      .post('/auth/invitations/accept')
      .send({
        token: invitationMessage.token,
        password: staffPassword,
      })
      .expect(200);
    expect(accepted.body.status).toBe('ACTIVE');
    await api
      .post('/auth/invitations/accept')
      .send({
        token: invitationMessage.token,
        password: staffPassword,
      })
      .expect(400);

    const staffLogin = await api
      .post('/auth/login')
      .set('X-KGPay-Portal', 'STAFF')
      .send({ email: staffEmail, password: staffPassword })
      .expect(202);
    expect(staffLogin.body).not.toHaveProperty('accessToken');
    const staffAuthentication = await api
      .post('/auth/mfa/verify')
      .set('X-KGPay-Portal', 'STAFF')
      .send({
        challengeId: staffLogin.body.challengeId,
        code: latestEmail('login').code,
      })
      .expect(200);
    expect(staffAuthentication.body).toMatchObject({
      subjectType: 'STAFF',
      roles: ['OPERATIONS_ADMIN'],
    });
    let staffRefreshCookie = cookiePair(
      staffAuthentication.headers['set-cookie'],
      'kgpay_staff_refresh',
    );
    let staffCsrfCookie = cookiePair(
      staffAuthentication.headers['set-cookie'],
      'kgpay_staff_csrf',
    );
    await api
      .get('/admin/roles')
      .set('Authorization', `Bearer ${staffAuthentication.body.accessToken}`)
      .expect(403);

    await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .send({
        refreshToken: staffRefreshCookie.slice('kgpay_staff_refresh='.length),
      })
      .expect(401);
    await api
      .post('/auth/logout')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .send({
        refreshToken: staffRefreshCookie.slice('kgpay_staff_refresh='.length),
      })
      .expect(204);

    const refreshedStaff = await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'STAFF')
      .set('Cookie', `${staffRefreshCookie}; ${staffCsrfCookie}`)
      .set('X-CSRF-Token', staffCsrfCookie.slice('kgpay_staff_csrf='.length))
      .send({})
      .expect(200);
    staffRefreshCookie = cookiePair(
      refreshedStaff.headers['set-cookie'],
      'kgpay_staff_refresh',
    );
    staffCsrfCookie = cookiePair(
      refreshedStaff.headers['set-cookie'],
      'kgpay_staff_csrf',
    );

    const staffLogout = await api
      .post('/auth/logout')
      .set('X-KGPay-Portal', 'STAFF')
      .set(
        'Cookie',
        `${customerRefreshCookie}; ${customerCsrfCookie}; ${staffRefreshCookie}; ${staffCsrfCookie}`,
      )
      .set('X-CSRF-Token', staffCsrfCookie.slice('kgpay_staff_csrf='.length))
      .send({})
      .expect(204);
    const staffClearedCookies = cookieHeaders(
      staffLogout.headers['set-cookie'],
    );
    expect(
      staffClearedCookies.some((cookie) =>
        cookie.startsWith('kgpay_staff_refresh=;'),
      ),
    ).toBe(true);
    expect(
      staffClearedCookies.some((cookie) =>
        cookie.startsWith('kgpay_staff_csrf=;'),
      ),
    ).toBe(true);
    expect(
      staffClearedCookies.some((cookie) =>
        cookie.startsWith('kgpay_customer_refresh='),
      ),
    ).toBe(false);

    const customerRefresh = await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .set('Cookie', `${customerRefreshCookie}; ${customerCsrfCookie}`)
      .set(
        'X-CSRF-Token',
        customerCsrfCookie.slice('kgpay_customer_csrf='.length),
      )
      .send({})
      .expect(200);
    customerRefreshCookie = cookiePair(
      customerRefresh.headers['set-cookie'],
      'kgpay_customer_refresh',
    );
    customerCsrfCookie = cookiePair(
      customerRefresh.headers['set-cookie'],
      'kgpay_customer_csrf',
    );

    const customerLogout = await api
      .post('/auth/logout')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .set('Cookie', `${customerRefreshCookie}; ${customerCsrfCookie}`)
      .set(
        'X-CSRF-Token',
        customerCsrfCookie.slice('kgpay_customer_csrf='.length),
      )
      .send({})
      .expect(204);
    expect(
      cookieHeaders(customerLogout.headers['set-cookie']).some((cookie) =>
        cookie.startsWith('kgpay_customer_refresh=;'),
      ),
    ).toBe(true);
    await api
      .post('/auth/refresh')
      .set('X-KGPay-Portal', 'CUSTOMER')
      .set('Cookie', `${customerRefreshCookie}; ${customerCsrfCookie}`)
      .set(
        'X-CSRF-Token',
        customerCsrfCookie.slice('kgpay_customer_csrf='.length),
      )
      .send({})
      .expect(401);
  });

  function latestEmail(
    purpose: SendOtpEmailInput['purpose'],
  ): SendOtpEmailInput {
    const email = [...sentEmails]
      .reverse()
      .find((message) => message.purpose === purpose);
    if (!email) throw new Error(`No test email was captured for ${purpose}.`);
    return email;
  }

  function cookiePair(
    setCookie: string | string[] | undefined,
    name: string,
  ): string {
    const cookies = cookieHeaders(setCookie);
    const cookie = cookies.find((value) => value.startsWith(`${name}=`));
    if (!cookie) throw new Error(`The ${name} cookie was not set.`);
    return cookie.split(';', 1)[0];
  }

  function cookieHeaders(setCookie: string | string[] | undefined): string[] {
    return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  }
});
