import * as yup from "yup";

/**
 * Schémas Yup et types de transport des parcours d'authentification (CDC-01, ADR-002 D3).
 * Les messages sont des clés de traduction résolues par l'application ; le backend revalide
 * toujours les données. Aucune règle métier ni entité Prisma ne figure ici.
 */

export const AUTH_LOCALES = ["fr", "en"] as const;
export type AuthLocale = (typeof AUTH_LOCALES)[number];

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MAX_LENGTH = 256;
export const DEFAULT_PASSWORD_MIN_LENGTH = 10;
export const PHONE_MIN_LENGTH = 3;
export const PHONE_MAX_LENGTH = 32;
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

export const emailSchema = yup
  .string()
  .trim()
  .required("validation.email.required")
  .max(EMAIL_MAX_LENGTH, "validation.email.invalid")
  .email("validation.email.invalid");

export const phoneSchema = yup
  .string()
  .trim()
  .required("validation.phone.required")
  .min(PHONE_MIN_LENGTH, "validation.phone.invalid")
  .max(PHONE_MAX_LENGTH, "validation.phone.invalid")
  .matches(/^\+?[0-9 ()./-]+$/, "validation.phone.invalid");

export const otpCodeSchema = yup
  .string()
  .transform((value: unknown) =>
    typeof value === "string" ? value.replace(/\s+/g, "") : value,
  )
  .required("validation.otp.required")
  .matches(/^\d+$/, "validation.otp.invalid")
  .min(OTP_MIN_LENGTH, "validation.otp.invalid")
  .max(OTP_MAX_LENGTH, "validation.otp.invalid");

export function createNewPasswordSchema(
  minLength: number = DEFAULT_PASSWORD_MIN_LENGTH,
) {
  return yup
    .string()
    .required("validation.password.required")
    .min(minLength, "validation.password.tooShort")
    .max(PASSWORD_MAX_LENGTH, "validation.password.tooLong");
}

export const currentPasswordSchema = yup
  .string()
  .required("validation.password.required")
  .max(PASSWORD_MAX_LENGTH, "validation.password.tooLong");

export function createRegisterSchema(minLength?: number) {
  return yup.object({
    email: emailSchema,
    phone: phoneSchema,
    password: createNewPasswordSchema(minLength),
  });
}

export const loginSchema = yup.object({
  email: emailSchema,
  password: currentPasswordSchema,
});

export const otpFormSchema = yup.object({ code: otpCodeSchema });

export const forgotPasswordSchema = yup.object({ email: emailSchema });

export function createResetPasswordSchema(minLength?: number) {
  return yup.object({
    code: otpCodeSchema,
    newPassword: createNewPasswordSchema(minLength),
  });
}

export function createChangePasswordSchema(minLength?: number) {
  return yup.object({
    currentPassword: currentPasswordSchema,
    newPassword: createNewPasswordSchema(minLength).notOneOf(
      [yup.ref("currentPassword")],
      "validation.password.same",
    ),
  });
}

export const changeEmailSchema = yup.object({ newEmail: emailSchema });

export const changePhoneSchema = yup.object({ phone: phoneSchema });

export type RegisterFormValues = yup.InferType<
  ReturnType<typeof createRegisterSchema>
>;
export type LoginFormValues = yup.InferType<typeof loginSchema>;
export type OtpFormValues = yup.InferType<typeof otpFormSchema>;
export type ForgotPasswordFormValues = yup.InferType<
  typeof forgotPasswordSchema
>;
export type ResetPasswordFormValues = yup.InferType<
  ReturnType<typeof createResetPasswordSchema>
>;
export type ChangePasswordFormValues = yup.InferType<
  ReturnType<typeof createChangePasswordSchema>
>;
export type ChangeEmailFormValues = yup.InferType<typeof changeEmailSchema>;
export type ChangePhoneFormValues = yup.InferType<typeof changePhoneSchema>;

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  locale?: AuthLocale;
}

export interface ChallengeAcceptedResponse {
  message: string;
  challengeId: string;
}

export interface VerifyContactRequest {
  challengeId: string;
  code: string;
}

export interface StatusResponse {
  status: string;
}

export interface OtpResendRequest {
  challengeId: string;
  locale?: AuthLocale;
}

export interface OtpChallengeResponse {
  challengeId: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MfaVerifyRequest {
  challengeId: string;
  code: string;
}

export type SubjectType = "CUSTOMER" | "STAFF";

export interface AuthTokensResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  subjectType: SubjectType;
  roles: string[];
  sessionId: string;
}

export interface ForgotPasswordRequest {
  email: string;
  locale?: AuthLocale;
}

export interface ResetPasswordRequest {
  challengeId: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface StepUpRequest {
  action: string;
  challengeId?: string;
  code?: string;
  locale?: AuthLocale;
}

export interface StepUpChallengeResponse {
  challengeId: string;
}

export interface StepUpProofResponse {
  proof: string;
  expiresIn: number;
}

export interface ChangeEmailRequest {
  newEmail: string;
}

export interface ChangeEmailVerifyRequest {
  newEmail: string;
  code: string;
  challengeId: string;
}

export interface ChangePhoneRequest {
  phone: string;
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  absoluteExpiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  correlationId?: string;
}

export const STEP_UP_ACTIONS = {
  emailChange: "iam.identity.email-change",
  phoneChange: "iam.identity.phone-change",
} as const;
