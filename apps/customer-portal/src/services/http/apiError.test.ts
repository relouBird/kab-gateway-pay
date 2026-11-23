import { AxiosError, type AxiosResponse } from "axios";
import { ApiError, errorMessageKey, toApiError } from "./apiError";

function httpError(status: number, data: unknown): AxiosError {
  const response = { status, data } as AxiosResponse;
  return new AxiosError("failed", undefined, undefined, undefined, response);
}

describe("toApiError", () => {
  it("normalise une erreur réseau sans réponse", () => {
    const error = toApiError(new AxiosError("Network Error"));
    expect(error.kind).toBe("network");
  });

  it("conserve statut et correlationId sans le message serveur", () => {
    const error = toApiError(
      httpError(400, {
        statusCode: 400,
        message: ["email must be an email"],
        correlationId: "abc",
      }),
    );
    expect(error).toMatchObject({
      kind: "http",
      status: 400,
      correlationId: "abc",
      isValidation: true,
    });
    expect(error.message).toBe("HTTP 400");
  });
});

describe("errorMessageKey", () => {
  const http = (status: number) => new ApiError({ kind: "http", status });

  it("distingue un 401 selon le contexte", () => {
    expect(errorMessageKey(http(401), "login")).toBe(
      "errors.invalidCredentials",
    );
    expect(errorMessageKey(http(401), "currentPassword")).toBe(
      "errors.currentPasswordIncorrect",
    );
    expect(errorMessageKey(http(401))).toBe("errors.sessionExpired");
  });

  it("traduit les autres statuts attendus", () => {
    expect(errorMessageKey(http(400), "reset")).toBe("errors.resetFailed");
    expect(errorMessageKey(http(409), "code")).toBe("errors.sessionLimit");
    expect(errorMessageKey(http(429))).toBe("errors.tooManyRequests");
    expect(errorMessageKey(http(503))).toBe("errors.emailNotSent");
    expect(errorMessageKey(http(500))).toBe("errors.server");
    expect(errorMessageKey(new ApiError({ kind: "network" }))).toBe(
      "errors.network",
    );
  });
});
