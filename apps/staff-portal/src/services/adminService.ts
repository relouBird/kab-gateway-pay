import type {
  AdminAccessEvent,
  AdminAccessReviewEntry,
  AdminIdentityListResponse,
  AdminRole,
  CreateCustomRoleRequest,
  CreateStaffInvitationRequest,
  IdentityStatus,
} from "@kgpay/contracts/transport";
import { authApi, authenticated } from "./http";

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const adminService = {
  listIdentities: (options: {
    page: number;
    limit: number;
    search?: string;
    status?: IdentityStatus;
  }) => {
    const params = new URLSearchParams({
      page: String(options.page),
      limit: String(options.limit),
      subjectType: "STAFF",
    });
    if (options.search) params.set("search", options.search);
    if (options.status) params.set("status", options.status);
    return data<AdminIdentityListResponse>(
      authApi.get(`/admin/identities?${params}`, authenticated),
    );
  },
  listRoles: () =>
    data<AdminRole[]>(authApi.get("/admin/roles", authenticated)),
  invite: (body: CreateStaffInvitationRequest, proof: string) =>
    data<{ message: string; invitationId: string }>(
      authApi.post("/admin/identities", body, {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      }),
    ),
  resendInvitation: (identityId: string, proof: string) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/invitation/resend`,
      {},
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  changeStatus: (
    identityId: string,
    action: "suspend" | "reactivate" | "disable",
    proof: string,
  ) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/${action}`,
      {},
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  unlockIdentity: (identityId: string, proof: string) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/unlock`,
      {},
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  assignRole: (identityId: string, roleCode: string, proof: string) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/roles`,
      { roleCode },
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  revokeRole: (identityId: string, roleCode: string, proof: string) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/roles/revoke`,
      { roleCode },
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  createRole: (body: CreateCustomRoleRequest, proof: string) =>
    data<Pick<AdminRole, "code" | "name" | "permissions">>(
      authApi.post("/admin/roles", body, {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      }),
    ),
  requestEmailRecovery: (identityId: string, newEmail: string, proof: string) =>
    data<{ challengeId: string }>(
      authApi.post(
        `/admin/identities/${encodeURIComponent(identityId)}/email-recovery`,
        { newEmail },
        {
          ...authenticated,
          headers: { "X-Step-Up-Proof": proof },
        },
      ),
    ),
  verifyEmailRecovery: (
    identityId: string,
    newEmail: string,
    challengeId: string,
    code: string,
    proof: string,
  ) =>
    authApi.post(
      `/admin/identities/${encodeURIComponent(identityId)}/email-recovery/verify`,
      { newEmail, challengeId, code },
      {
        ...authenticated,
        headers: { "X-Step-Up-Proof": proof },
      },
    ),
  listAccessEvents: () =>
    data<AdminAccessEvent[]>(
      authApi.get("/admin/access-events?page=1&limit=50", authenticated),
    ),
  listAccessReview: () =>
    data<AdminAccessReviewEntry[]>(
      authApi.get("/admin/access-review", authenticated),
    ),
};
