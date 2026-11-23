import { DEFAULT_PASSWORD_MIN_LENGTH } from "@kgpay/contracts/transport";

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const apiUrl = import.meta.env.VITE_AUTH_API_URL;
if (typeof apiUrl !== "string" || apiUrl.trim() === "") {
  throw new Error("VITE_AUTH_API_URL is required.");
}

export const env = {
  authApiUrl: apiUrl.trim().replace(/\/+$/, ""),
  passwordMinLength: positiveInteger(
    import.meta.env.VITE_PASSWORD_MIN_LENGTH,
    DEFAULT_PASSWORD_MIN_LENGTH,
  ),
  otpResendCooldownSeconds: positiveInteger(
    import.meta.env.VITE_OTP_RESEND_COOLDOWN_SECONDS,
    60,
  ),
};
