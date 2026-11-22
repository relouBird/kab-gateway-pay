import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import type { Permission } from '@kgpay/contracts';

export const REQUIRED_PERMISSIONS = 'requiredPermissions';
export const REQUIRED_STEP_UP_ACTION = 'requiredStepUpAction';

export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);

export const RequireStepUp = (action: string) =>
  applyDecorators(
    SetMetadata(REQUIRED_STEP_UP_ACTION, action),
    ApiSecurity('step_up_proof'),
  );
