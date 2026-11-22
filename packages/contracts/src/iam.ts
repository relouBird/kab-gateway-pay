export const PERMISSION_CATALOG_VERSION = 1;

export const BUILT_IN_ROLES = [
  "CUSTOMER",
  "GLOBAL_SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "CONFIGURATION_ADMIN",
] as const;

export type BuiltInRole = (typeof BUILT_IN_ROLES)[number];

export const PERMISSION_CATALOG = [
  "iam.identity.read",
  "iam.identity.create",
  "iam.identity.suspend",
  "iam.identity.disable",
  "iam.identity.unlock",
  "iam.identity.recover",
  "iam.role.assign",
  "iam.role.manage",
  "iam.session.revoke",
  "iam.access-event.read",
  "iam.access-review.read",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const SUPER_ADMIN_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set(
  PERMISSION_CATALOG,
);

export const ROLE_PERMISSIONS: Readonly<
  Record<BuiltInRole, readonly Permission[]>
> = {
  CUSTOMER: [],
  GLOBAL_SUPER_ADMIN: PERMISSION_CATALOG,
  OPERATIONS_ADMIN: [],
  CONFIGURATION_ADMIN: [],
};

export const SUBJECT_TYPES = ["CUSTOMER", "STAFF"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

export const AUTH_EVENT_NAMES = [
  "IdentityRegistered",
  "IdentityActivated",
  "IdentityInvited",
  "IdentitySuspended",
  "IdentityReactivated",
  "IdentityDisabled",
  "RoleAssigned",
  "RoleRevoked",
  "SessionRevoked",
  "OtpRequested",
  "AccessAuditEvent",
] as const;

export type AuthEventName = (typeof AUTH_EVENT_NAMES)[number];

export interface AuthEventPayloadMap {
  IdentityRegistered: {
    eventId: string;
    identityId: string;
    subjectType: "CUSTOMER";
    occurredAt: string;
  };
  IdentityActivated: {
    eventId: string;
    identityId: string;
    subjectType: SubjectType;
    occurredAt: string;
  };
  IdentityInvited: {
    eventId: string;
    identityId: string;
    invitedBy: string;
    resent?: true;
    occurredAt: string;
  };
  IdentitySuspended: IdentityChangedEventPayload;
  IdentityReactivated: IdentityChangedEventPayload;
  IdentityDisabled: IdentityChangedEventPayload;
  RoleAssigned: {
    eventId: string;
    identityId: string;
    roleCode: string;
    assignedBy: string;
    occurredAt: string;
  };
  RoleRevoked: {
    eventId: string;
    identityId: string;
    roleCode: string;
    revokedBy: string;
    occurredAt: string;
  };
  SessionRevoked: {
    eventId: string;
    identityId: string;
    sessionId?: string;
    exceptSessionId?: string | null;
    reason: string;
    occurredAt: string;
  };
  OtpRequested: {
    eventId: string;
    identityId: string;
    purpose: "CONTACT_VERIFICATION" | "LOGIN" | "PASSWORD_RECOVERY" | "STEP_UP";
    occurredAt: string;
  };
  AccessAuditEvent: {
    eventId: string;
    identityId: string | null;
    eventType: string;
    result: string;
    ipAddress: string | null;
    userAgent: string | null;
    correlationId: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  };
}

export type AuthEventEnvelope<K extends AuthEventName = AuthEventName> = {
  [EventName in K]: {
    eventName: EventName;
    schemaVersion: 1;
    payload: AuthEventPayloadMap[EventName];
  };
}[K];

interface IdentityChangedEventPayload {
  eventId: string;
  identityId: string;
  changedBy?: string;
  reason?: string;
  occurredAt: string;
}
