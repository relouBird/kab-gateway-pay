import type { Permission, SubjectType } from '@kgpay/contracts';
import type { Request } from 'express';

export interface AuthContext {
  identityId: string;
  sessionId: string;
  subjectType: SubjectType;
  roles: string[];
  permissions: Permission[];
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
