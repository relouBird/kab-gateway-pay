import { DEFAULT_PASSWORD_MIN_LENGTH } from "@kgpay/contracts/transport";

export interface AppEnv {
  authApiUrl: string;
  passwordMinLength: number;
  otpResendCooldownSeconds: number;
}

const DEFAULT_OTP_RESEND_COOLDOWN_SECONDS = 60;

function readPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Lit uniquement des variables publiques `VITE_*` : aucun secret n'a sa place ici. */
export function readEnv(source: Record<string, unknown>): AppEnv {
  const authApiUrl = source["VITE_AUTH_API_URL"];
  if (typeof authApiUrl !== "string" || authApiUrl.trim() === "") {
    throw new Error("VITE_AUTH_API_URL is required.");
  }
  return {
    authApiUrl: authApiUrl.trim().replace(/\/+$/, ""),
    passwordMinLength: readPositiveInteger(
      source["VITE_PASSWORD_MIN_LENGTH"],
      DEFAULT_PASSWORD_MIN_LENGTH,
    ),
    otpResendCooldownSeconds: readPositiveInteger(
      source["VITE_OTP_RESEND_COOLDOWN_SECONDS"],
      DEFAULT_OTP_RESEND_COOLDOWN_SECONDS,
    ),
  };
}

export const env: AppEnv = readEnv(import.meta.env as Record<string, unknown>);
