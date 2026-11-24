import {
  createChangePasswordSchema,
  createRegisterSchema,
  loginSchema,
  otpFormSchema,
} from "@kgpay/contracts/transport";

describe("schémas de transport partagés", () => {
  it("normalise un OTP saisi avec des espaces", async () => {
    await expect(otpFormSchema.validate({ code: "123 456" })).resolves.toEqual({
      code: "123456",
    });
  });

  it("rejette un OTP non numérique", async () => {
    await expect(otpFormSchema.validate({ code: "12ab56" })).rejects.toThrow(
      "validation.otp.invalid",
    );
  });

  it("applique la longueur minimale de mot de passe configurée", async () => {
    const schema = createRegisterSchema(12);
    const base = { email: "a@b.co", phone: "+237600000000" };
    await expect(
      schema.validate({ ...base, password: "short-pass1" }),
    ).rejects.toThrow("validation.password.tooShort");
    await expect(
      schema.validate({ ...base, password: "long-enough-12" }),
    ).resolves.toBeDefined();
  });

  it("refuse un nouveau mot de passe identique à l'actuel", async () => {
    await expect(
      createChangePasswordSchema().validate({
        currentPassword: "same-password-1",
        newPassword: "same-password-1",
      }),
    ).rejects.toThrow("validation.password.same");
  });

  it("exige e-mail valide et mot de passe au login", async () => {
    await expect(
      loginSchema.validate(
        { email: "nope", password: "" },
        { abortEarly: false },
      ),
    ).rejects.toMatchObject({
      errors: expect.arrayContaining([
        "validation.email.invalid",
        "validation.password.required",
      ]) as string[],
    });
  });
});
