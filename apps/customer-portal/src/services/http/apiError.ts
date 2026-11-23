import axios, { type AxiosError } from "axios";
import type { ApiErrorBody } from "@kgpay/contracts/transport";

/** Erreur normalisée : ne conserve ni corps de requête, ni jeton, ni objet Axios complet. */
export class ApiError extends Error {
  readonly kind: "network" | "http";
  readonly status: number | null;
  readonly correlationId: string | null;
  readonly isValidation: boolean;

  constructor(init: {
    kind: "network" | "http";
    status?: number | null;
    correlationId?: string | null;
    isValidation?: boolean;
  }) {
    super(
      init.kind === "network" ? "Network error" : `HTTP ${init.status ?? "?"}`,
    );
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.correlationId = init.correlationId ?? null;
    this.isValidation = init.isValidation ?? false;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiErrorBody>>;
    if (!axiosError.response) return new ApiError({ kind: "network" });
    const body = axiosError.response.data;
    return new ApiError({
      kind: "http",
      status: axiosError.response.status,
      correlationId:
        typeof body?.correlationId === "string" ? body.correlationId : null,
      isValidation: Array.isArray(body?.message),
    });
  }
  return new ApiError({ kind: "network" });
}

export type ErrorContext =
  | "login"
  | "code"
  | "currentPassword"
  | "emailChange"
  | "emailChangeCode"
  | "reset"
  | "generic";

/** Traduit une erreur en clé i18n selon le statut et le contexte ; le message serveur n'est jamais affiché. */
export function errorMessageKey(
  error: ApiError,
  context: ErrorContext = "generic",
): string {
  if (error.kind === "network") return "errors.network";
  switch (error.status) {
    case 400:
      if (context === "reset") return "errors.resetFailed";
      if (context === "code" || context === "emailChangeCode")
        return "errors.codeInvalid";
      return error.isValidation ? "errors.validation" : "errors.badRequest";
    case 401:
      if (context === "login") return "errors.invalidCredentials";
      if (context === "currentPassword")
        return "errors.currentPasswordIncorrect";
      if (context === "code") return "errors.codeInvalid";
      return "errors.sessionExpired";
    case 403:
      return "errors.forbidden";
    case 409:
      if (context === "code") return "errors.sessionLimit";
      if (context === "emailChange" || context === "emailChangeCode")
        return "errors.emailUnavailable";
      return "errors.conflict";
    case 429:
      return "errors.tooManyRequests";
    case 503:
      return "errors.emailNotSent";
    default:
      return "errors.server";
  }
}
