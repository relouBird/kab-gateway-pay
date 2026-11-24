import { maskEmail } from "../stores/otpFlowStore";
import { resolveReturnPath } from "./returnPath";

describe("resolveReturnPath", () => {
  it("accepte uniquement un chemin interne", () => {
    expect(resolveReturnPath({ from: "/account" })).toBe("/account");
    expect(resolveReturnPath({ from: "//evil.test" })).toBe("/");
    expect(resolveReturnPath({ from: "https://evil.test" })).toBe("/");
    expect(resolveReturnPath(null)).toBe("/");
  });
});

describe("maskEmail", () => {
  it("masque la partie locale", () => {
    expect(maskEmail("alice@example.com")).toBe("a***@example.com");
    expect(maskEmail("invalid")).toBe("***");
  });
});
