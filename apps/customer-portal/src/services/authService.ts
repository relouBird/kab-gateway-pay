import type { AxiosRequestConfig } from "axios";
import type {
  AuthTokensResponse,
  ChallengeAcceptedResponse,
  ChangeEmailRequest,
  ChangeEmailVerifyRequest,
  ChangePasswordRequest,
  ChangePhoneRequest,
  CsrfResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MfaVerifyRequest,
  OtpChallengeResponse,
  OtpResendRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SessionSummary,
  StatusResponse,
  StepUpChallengeResponse,
  StepUpProofResponse,
  StepUpRequest,
  VerifyContactRequest,
} from "@kgpay/contracts/transport";
import { authApi } from "./http/authApi";

const withAccessToken: AxiosRequestConfig = { authentication: "access-token" };

async function data<T>(request: Promise<{ data: T }>): Promise<T> {
  return (await request).data;
}

export const authService = {
  register: (body: RegisterRequest) =>
    data<ChallengeAcceptedResponse>(authApi.post("/auth/register", body)),

  verifyContact: (body: VerifyContactRequest) =>
    data<StatusResponse>(authApi.post("/auth/verify-contact", body)),

  resendOtp: (body: OtpResendRequest) =>
    data<OtpChallengeResponse>(authApi.post("/auth/otp/resend", body)),

  login: (body: LoginRequest) =>
    data<OtpChallengeResponse>(authApi.post("/auth/login", body)),

  verifyMfa: (body: MfaVerifyRequest) =>
    data<AuthTokensResponse>(authApi.post("/auth/mfa/verify", body)),

  forgotPassword: (body: ForgotPasswordRequest) =>
    data<ChallengeAcceptedResponse>(
      authApi.post("/auth/password/forgot", body),
    ),

  resetPassword: async (body: ResetPasswordRequest) => {
    await authApi.post("/auth/password/reset", body);
  },

  /** Un 401 signifie ici « mot de passe actuel incorrect » : pas de refresh automatique. */
  changePassword: async (body: ChangePasswordRequest) => {
    await authApi.post("/auth/password/change", body, {
      ...withAccessToken,
      retryOnUnauthorized: false,
    });
  },

  requestStepUp: (action: string, locale: StepUpRequest["locale"]) =>
    data<StepUpChallengeResponse>(
      authApi.post(
        "/auth/step-up",
        { action, locale } satisfies StepUpRequest,
        withAccessToken,
      ),
    ),

  confirmStepUp: (action: string, challengeId: string, code: string) =>
    data<StepUpProofResponse>(
      authApi.post(
        "/auth/step-up",
        { action, challengeId, code } satisfies StepUpRequest,
        withAccessToken,
      ),
    ),

  requestEmailChange: (body: ChangeEmailRequest, proof: string) =>
    data<StepUpChallengeResponse>(
      authApi.post("/auth/email/change", body, {
        ...withAccessToken,
        headers: { "X-Step-Up-Proof": proof },
      }),
    ),

  verifyEmailChange: async (body: ChangeEmailVerifyRequest) => {
    await authApi.post("/auth/email/change/verify", body, withAccessToken);
  },

  changePhone: async (body: ChangePhoneRequest, proof: string) => {
    await authApi.post("/auth/contact/phone", body, {
      ...withAccessToken,
      headers: { "X-Step-Up-Proof": proof },
    });
  },

  getCsrf: () => data<CsrfResponse>(authApi.get("/auth/csrf")),

  refresh: (csrfToken: string) =>
    data<AuthTokensResponse>(
      authApi.post(
        "/auth/refresh",
        {},
        { headers: { "X-CSRF-Token": csrfToken } },
      ),
    ),

  logout: async (csrfToken: string) => {
    await authApi.post(
      "/auth/logout",
      {},
      { headers: { "X-CSRF-Token": csrfToken } },
    );
  },

  logoutAll: async () => {
    await authApi.post("/auth/logout-all", {}, withAccessToken);
  },

  listSessions: () =>
    data<SessionSummary[]>(authApi.get("/auth/sessions", withAccessToken)),

  revokeSession: async (sessionId: string) => {
    await authApi.delete(
      `/auth/sessions/${encodeURIComponent(sessionId)}`,
      withAccessToken,
    );
  },
};
