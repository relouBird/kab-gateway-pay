import type {
  AcceptInvitationRequest,
  AuthTokensResponse,
  ChallengeAcceptedResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MfaVerifyRequest,
  OtpChallengeResponse,
  OtpResendRequest,
  SessionSummary,
  StepUpChallengeResponse,
  StepUpProofResponse,
  StepUpRequest,
} from "@kgpay/contracts/transport";
import { authApi, authenticated } from "./http";

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const authService = {
  login: (body: LoginRequest) =>
    data<OtpChallengeResponse>(authApi.post("/auth/login", body)),
  verifyMfa: (body: MfaVerifyRequest) =>
    data<AuthTokensResponse>(authApi.post("/auth/mfa/verify", body)),
  resendOtp: (body: OtpResendRequest) =>
    data<OtpChallengeResponse>(authApi.post("/auth/otp/resend", body)),
  acceptInvitation: async (body: AcceptInvitationRequest) => {
    await authApi.post("/auth/invitations/accept", body);
  },
  forgotPassword: (body: ForgotPasswordRequest) =>
    data<ChallengeAcceptedResponse>(
      authApi.post("/auth/password/forgot", body),
    ),
  resetPassword: async (body: {
    challengeId: string;
    code: string;
    newPassword: string;
  }) => {
    await authApi.post("/auth/password/reset", body);
  },
  listSessions: () =>
    data<SessionSummary[]>(authApi.get("/auth/sessions", authenticated)),
  revokeSession: async (sessionId: string) => {
    await authApi.delete(
      `/auth/sessions/${encodeURIComponent(sessionId)}`,
      authenticated,
    );
  },
  logoutAll: async () => {
    await authApi.post("/auth/logout-all", {}, authenticated);
  },
  stepUp: (body: StepUpRequest) =>
    data<StepUpChallengeResponse | StepUpProofResponse>(
      authApi.post("/auth/step-up", body, authenticated),
    ),
  csrf: async () =>
    (await authApi.get<{ csrfToken: string }>("/auth/csrf")).data,
  refresh: async (csrfToken: string) =>
    (
      await authApi.post<AuthTokensResponse>(
        "/auth/refresh",
        {},
        { headers: { "X-CSRF-Token": csrfToken } },
      )
    ).data,
  logout: async (csrfToken: string) => {
    await authApi.post(
      "/auth/logout",
      {},
      {
        headers: { "X-CSRF-Token": csrfToken },
      },
    );
  },
};
