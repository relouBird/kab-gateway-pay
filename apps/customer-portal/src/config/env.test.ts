import { readEnv } from "./env";

describe("readEnv", () => {
  it("exige VITE_AUTH_API_URL", () => {
    expect(() => readEnv({})).toThrow("VITE_AUTH_API_URL");
    expect(() => readEnv({ VITE_AUTH_API_URL: "  " })).toThrow(
      "VITE_AUTH_API_URL",
    );
  });

  it("retire les slashs finaux et applique les valeurs par défaut", () => {
    expect(readEnv({ VITE_AUTH_API_URL: "http://api.test///" })).toEqual({
      authApiUrl: "http://api.test",
      passwordMinLength: 10,
      otpResendCooldownSeconds: 60,
    });
  });

  it("ignore les entiers invalides", () => {
    const env = readEnv({
      VITE_AUTH_API_URL: "http://api.test",
      VITE_PASSWORD_MIN_LENGTH: "12",
      VITE_OTP_RESEND_COOLDOWN_SECONDS: "abc",
    });
    expect(env.passwordMinLength).toBe(12);
    expect(env.otpResendCooldownSeconds).toBe(60);
  });
});
