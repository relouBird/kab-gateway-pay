import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthService } from './auth.service';
import {
  AcceptInvitationDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  ResendOtpDto,
  StepUpDto,
  UpdatePhoneDto,
  VerifyOtpDto,
  NewEmailDto,
  UpdateEmailDto,
} from './auth.dto';
import { AccessTokenGuard, StepUpGuard } from '../common/auth.guards';
import { RequireStepUp } from '../common/decorators';
import type { AuthenticatedRequest } from '../common/auth-context';
import { getRequestMetadata } from '../common/request-context';
import { AUTH_CONFIG, type AuthConfig } from '../config/auth.config';
import { TokenService } from '../security/token.service';

const REFRESH_COOKIE = 'kgpay_refresh';
const CSRF_COOKIE = 'kgpay_csrf';
const CUSTOMER_REFRESH_COOKIE = 'kgpay_customer_refresh';
const CUSTOMER_CSRF_COOKIE = 'kgpay_customer_csrf';
const STAFF_REFRESH_COOKIE = 'kgpay_staff_refresh';
const STAFF_CSRF_COOKIE = 'kgpay_staff_csrf';
const PORTAL_HEADER = 'x-kgpay-portal';

type PortalScope = 'CUSTOMER' | 'STAFF';

function cookiesForPortal(scope?: PortalScope): {
  refresh: string;
  csrf: string;
} {
  if (scope === 'CUSTOMER') {
    return {
      refresh: CUSTOMER_REFRESH_COOKIE,
      csrf: CUSTOMER_CSRF_COOKIE,
    };
  }
  if (scope === 'STAFF') {
    return { refresh: STAFF_REFRESH_COOKIE, csrf: STAFF_CSRF_COOKIE };
  }
  return { refresh: REFRESH_COOKIE, csrf: CSRF_COOKIE };
}

function getPortalScope(request: Request): PortalScope | undefined {
  const value = request.header(PORTAL_HEADER)?.toUpperCase();
  if (!value) return undefined;
  if (value === 'CUSTOMER' || value === 'STAFF') return value;
  throw new BadRequestException('X-KGPay-Portal must be CUSTOMER or STAFF.');
}

@ApiTags('Authentication')
@ApiHeader({
  name: PORTAL_HEADER,
  enum: ['CUSTOMER', 'STAFF'],
  required: false,
  description:
    'Selects the browser-specific refresh/CSRF cookie namespace. Omit for legacy API cookie names.',
})
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create a CUSTOMER identity and send an email verification code',
  })
  register(
    @Body() input: RegisterDto,
    @Req() request: Request,
  ): Promise<{ message: string; challengeId: string }> {
    return this.auth.register(
      input,
      getLocale(request),
      getRequestMetadata(request),
    );
  }

  @Post('verify-contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email address with its one-time code' })
  verifyContact(
    @Body() input: VerifyOtpDto,
    @Req() request: Request,
  ): Promise<{ status: string }> {
    return this.auth.verifyContact(input, getRequestMetadata(request));
  }

  @Post('otp/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  resend(
    @Body() input: ResendOtpDto,
    @Req() request: Request,
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    return this.auth.resendOtp(
      input.challengeId,
      input.locale ?? getLocale(request),
      getRequestMetadata(request),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Validate password and send the mandatory email OTP',
  })
  login(
    @Body() input: LoginDto,
    @Req() request: Request,
  ): Promise<{ challengeId: string; expiresAt: Date }> {
    return this.auth.login(
      input,
      getLocale(request),
      getRequestMetadata(request),
      getPortalScope(request),
    );
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login by verifying the email OTP' })
  @ApiResponse({ status: 200, description: 'Access token and refresh cookie' })
  async verifyLogin(
    @Body() input: VerifyOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    subjectType: string;
    roles: string[];
    sessionId: string;
  }> {
    const portalScope = getPortalScope(request);
    const result = await this.auth.verifyLogin(
      input,
      getRequestMetadata(request),
      portalScope,
    );
    setSessionCookies(response, result, this.config, portalScope);
    return {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      subjectType: result.subjectType,
      roles: result.roles,
      sessionId: result.sessionId,
    };
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(
    @Body() input: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<{ message: string; challengeId: string }> {
    return this.auth.forgotPassword(
      input,
      input.locale ?? getLocale(request),
      getRequestMetadata(request),
    );
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body() input: ResetPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.resetPassword(input, getRequestMetadata(request));
    clearSessionCookies(response, this.config, getPortalScope(request));
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  changePassword(
    @Body() input: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.auth
      .changePassword(request.auth, input, getRequestMetadata(request))
      .then(() =>
        clearSessionCookies(response, this.config, getPortalScope(request)),
      );
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Body() input: AcceptInvitationDto,
    @Req() request: Request,
  ): Promise<{ status: string }> {
    return this.auth.acceptInvitation(input, getRequestMetadata(request));
  }

  @Post('step-up')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary:
      'Request an email OTP or exchange its verification for a short proof',
  })
  async stepUp(
    @Body() input: StepUpDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ challengeId: string } | { proof: string; expiresIn: number }> {
    return this.auth.requestStepUp(
      request.auth,
      input.action,
      input.challengeId,
      input.code,
      input.locale ?? getLocale(request),
      getRequestMetadata(request),
    );
  }

  @Post('email/change')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, StepUpGuard)
  @RequireStepUp('iam.identity.email-change')
  requestEmailChange(
    @Body() input: NewEmailDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ challengeId: string }> {
    return this.auth.requestEmailChange(
      request.auth,
      input.newEmail,
      getLocale(request),
      getRequestMetadata(request),
    );
  }

  @Post('email/change/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  verifyEmailChange(
    @Body() input: UpdateEmailDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.verifyEmailChange(
      request.auth,
      input,
      getRequestMetadata(request),
    );
  }

  @Post('contact/phone')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, StepUpGuard)
  @RequireStepUp('iam.identity.phone-change')
  changePhoneContact(
    @Body() input: UpdatePhoneDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.changePhoneContact(
      request.auth,
      input.phone,
      getRequestMetadata(request),
    );
  }

  @Get('csrf')
  @ApiOperation({
    summary: 'Return the CSRF token for Swagger cookie-based calls',
  })
  getCsrfToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): { csrfToken: string } {
    const cookies = cookiesForPortal(getPortalScope(request));
    const existing = request.cookies?.[cookies.csrf] as string | undefined;
    const csrfToken = existing ?? randomBytes(32).toString('base64url');
    response.cookie(cookies.csrf, csrfToken, {
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      httpOnly: false,
      path: '/auth',
    });
    return { csrfToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiSecurity('csrf_token')
  @ApiBody({ type: RefreshDto })
  async refresh(
    @Body() input: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    subjectType: string;
    roles: string[];
    sessionId: string;
  }> {
    const portalScope = getPortalScope(request);
    const cookies = cookiesForPortal(portalScope);
    const cookieToken = request.cookies?.[cookies.refresh] as
      string | undefined;
    if (cookieToken) {
      assertCsrf(request, cookies.csrf);
    }
    const refreshToken = cookieToken ?? input.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('The refresh token is required.');
    }
    const result = await this.auth.refresh(
      refreshToken,
      getRequestMetadata(request),
      portalScope,
    );
    setSessionCookies(response, result, this.config, portalScope);
    return {
      accessToken: result.accessToken,
      tokenType: 'Bearer',
      expiresIn: result.expiresIn,
      subjectType: result.subjectType,
      roles: result.roles,
      sessionId: result.sessionId,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiSecurity('csrf_token')
  async logout(
    @Body() input: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const portalScope = getPortalScope(request);
    const cookies = cookiesForPortal(portalScope);
    const cookieToken = request.cookies?.[cookies.refresh] as
      string | undefined;
    if (cookieToken) {
      assertCsrf(request, cookies.csrf);
    }
    const refreshToken = cookieToken ?? input.refreshToken;
    if (refreshToken) {
      await this.auth.logout(
        refreshToken,
        getRequestMetadata(request),
        portalScope,
      );
    }
    clearSessionCookies(response, this.config, portalScope);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    return this.auth
      .revokeAllSessions(
        request.auth.identityId,
        null,
        getRequestMetadata(request),
      )
      .then(() =>
        clearSessionCookies(response, this.config, getPortalScope(request)),
      );
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  sessions(@Req() request: AuthenticatedRequest): Promise<unknown[]> {
    return this.auth.listSessions(request.auth.identityId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  revokeSession(
    @Param('sessionId', new ParseUUIDPipe())
    sessionId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (sessionId === request.auth.sessionId) {
      clearSessionCookies(response, this.config, getPortalScope(request));
    }
    return this.auth.revokeSession(
      request.auth.identityId,
      sessionId,
      getRequestMetadata(request),
    );
  }
}

@ApiTags('Keys')
@Controller('.well-known')
export class JwksController {
  constructor(private readonly tokens: TokenService) {}

  @Get('jwks.json')
  jwks(): { keys: Record<string, string>[] } {
    return this.tokens.getJwks();
  }
}

function getLocale(request: Request): 'en' | 'fr' {
  return request.header('accept-language')?.toLowerCase().startsWith('fr')
    ? 'fr'
    : 'en';
}

function setSessionCookies(
  response: Response,
  result: {
    refreshToken: string;
    refreshExpiresAt: Date;
    subjectType: PortalScope;
  },
  config: AuthConfig,
  portalScope?: PortalScope,
): void {
  if (portalScope && portalScope !== result.subjectType) {
    throw new UnauthorizedException('The portal does not match the identity.');
  }
  const cookies = cookiesForPortal(portalScope);
  const maxAge = Math.max(0, result.refreshExpiresAt.getTime() - Date.now());
  const csrfToken = randomBytes(32).toString('base64url');
  const baseCookie = {
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/auth',
    maxAge,
  } as const;
  response.cookie(cookies.refresh, result.refreshToken, {
    ...baseCookie,
    httpOnly: true,
  });
  response.cookie(cookies.csrf, csrfToken, {
    ...baseCookie,
    httpOnly: false,
  });
}

function clearSessionCookies(
  response: Response,
  config: AuthConfig,
  portalScope?: PortalScope,
): void {
  const cookies = cookiesForPortal(portalScope);
  const options = {
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/auth',
  } as const;
  response.clearCookie(cookies.refresh, options);
  response.clearCookie(cookies.csrf, options);
}

function assertCsrf(request: Request, csrfCookieName: string): void {
  const csrfToken = request.cookies?.[csrfCookieName] as string | undefined;
  const header = request.header('x-csrf-token');
  if (!csrfToken || !header || !equalStrings(csrfToken, header)) {
    throw new ForbiddenException('The CSRF token is invalid.');
  }
}

function equalStrings(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
