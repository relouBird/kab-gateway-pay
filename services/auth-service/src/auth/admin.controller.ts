import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AssignRoleDto,
  CreateCustomRoleDto,
  CreateStaffInvitationDto,
  IdentityListQueryDto,
  ServiceIntrospectionDto,
  PaginationQueryDto,
  RequestEmailRecoveryDto,
  UpdateEmailDto,
} from './auth.dto';
import {
  AccessTokenGuard,
  PermissionGuard,
  StepUpGuard,
} from '../common/auth.guards';
import { RequirePermission, RequireStepUp } from '../common/decorators';
import type { AuthenticatedRequest } from '../common/auth-context';
import { getRequestMetadata } from '../common/request-context';
import { UnauthorizedException } from '@nestjs/common';

@ApiTags('Administration')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard, PermissionGuard, StepUpGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly auth: AuthService) {}

  @Get('identities')
  @RequirePermission('iam.identity.read')
  listIdentities(@Query() query: IdentityListQueryDto) {
    return this.auth.listIdentities(query);
  }

  @Post('identities')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('iam.identity.create')
  @RequireStepUp('iam.identity.create')
  @ApiOperation({
    summary: 'Invite a STAFF identity; CUSTOMER self-registration is separate',
  })
  createIdentity(
    @Body() input: CreateStaffInvitationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.createStaffInvitation(
      request.auth.identityId,
      input,
      getRequestMetadata(request),
      request.header('accept-language')?.toLowerCase().startsWith('fr')
        ? 'fr'
        : 'en',
    );
  }

  @Post('identities/:identityId/invitation/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('iam.identity.create')
  @RequireStepUp('iam.identity.create')
  resendInvitation(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.resendStaffInvitation(
      request.auth.identityId,
      identityId,
      getRequestMetadata(request),
      request.header('accept-language')?.toLowerCase().startsWith('fr')
        ? 'fr'
        : 'en',
    );
  }

  @Post('identities/:identityId/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('iam.identity.suspend')
  @RequireStepUp('iam.identity.suspend')
  suspend(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.changeIdentityStatus(
      request.auth.identityId,
      identityId,
      'suspend',
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('iam.identity.suspend')
  @RequireStepUp('iam.identity.reactivate')
  reactivate(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.changeIdentityStatus(
      request.auth.identityId,
      identityId,
      'reactivate',
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('iam.identity.disable')
  @RequireStepUp('iam.identity.disable')
  disable(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.changeIdentityStatus(
      request.auth.identityId,
      identityId,
      'disable',
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('iam.identity.unlock')
  @RequireStepUp('iam.identity.unlock')
  unlock(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.changeIdentityStatus(
      request.auth.identityId,
      identityId,
      'unlock',
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('iam.role.assign')
  @RequireStepUp('iam.role.assign')
  assignRole(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Body() input: AssignRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.assignRole(
      request.auth.identityId,
      identityId,
      input,
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/roles/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('iam.role.assign')
  @RequireStepUp('iam.role.revoke')
  revokeRole(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Body() input: AssignRoleDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.revokeRole(
      request.auth.identityId,
      identityId,
      input.roleCode,
      getRequestMetadata(request),
    );
  }

  @Get('roles')
  @RequirePermission('iam.role.manage')
  listRoles() {
    return this.auth.listRoles();
  }

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('iam.role.manage')
  @RequireStepUp('iam.role.assign')
  createRole(
    @Body() input: CreateCustomRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.createCustomRole(
      request.auth.identityId,
      input,
      getRequestMetadata(request),
    );
  }

  @Get('access-events')
  @RequirePermission('iam.access-event.read')
  listAccessEvents(@Query() query: PaginationQueryDto) {
    return this.auth.listAccessEvents({
      page: query.page,
      limit: query.limit,
      identityId: query.identityId,
    });
  }

  @Get('access-review')
  @RequirePermission('iam.access-review.read')
  accessReview() {
    return this.auth.accessReview();
  }

  @Post('identities/:identityId/sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('iam.session.revoke')
  @RequireStepUp('iam.session.revoke')
  revokeSession(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.revokeSessionByAdmin(
      request.auth.identityId,
      identityId,
      sessionId,
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/email-recovery')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission('iam.identity.recover')
  @RequireStepUp('iam.identity.email-recovery')
  recoverStaffEmail(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Body() input: RequestEmailRecoveryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.auth.issueStaffEmailRecovery(
      request.auth.identityId,
      identityId,
      input.newEmail,
      request.header('accept-language')?.toLowerCase().startsWith('fr')
        ? 'fr'
        : 'en',
      getRequestMetadata(request),
    );
  }

  @Post('identities/:identityId/email-recovery/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('iam.identity.recover')
  @RequireStepUp('iam.identity.email-recovery')
  verifyStaffEmailRecovery(
    @Param('identityId', ParseUUIDPipe) identityId: string,
    @Body() input: UpdateEmailDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    return this.auth.markStaffEmailChange(
      identityId,
      request.auth.identityId,
      input.newEmail,
      input.challengeId,
      input.code,
      getRequestMetadata(request),
    );
  }
}

@ApiTags('Internal')
@Controller('internal')
export class InternalController {
  constructor(private readonly auth: AuthService) {}

  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('service_client')
  @ApiSecurity('service_secret')
  @ApiOperation({
    summary: 'Introspect current session state for an authorized service',
  })
  async introspect(
    @Body() input: ServiceIntrospectionDto,
    @Headers('x-service-client') clientId: string | undefined,
    @Headers('x-service-secret') secret: string | undefined,
  ) {
    if (
      !clientId ||
      !secret ||
      !(await this.auth.verifyServiceClient(clientId, secret))
    ) {
      throw new UnauthorizedException('Unauthorized service client.');
    }
    return this.auth.introspect(input.sessionId);
  }
}
