import axios, { type AxiosInstance } from "axios";
import { toApiError } from "./apiError";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Authentification explicite : jamais déduite de l'URL. Par défaut, aucune. */
    authentication?: "access-token" | "none";
    /** Mettre à `false` quand un 401 signifie une erreur métier (ex. mot de passe actuel erroné). */
    retryOnUnauthorized?: boolean;
    retried?: boolean;
  }
}

export interface HttpClientOptions {
  baseURL: string;
  getAccessToken: () => string | null;
  isAccessTokenExpiring: () => boolean;
  getLanguage: () => string;
  refreshAccessToken: () => Promise<string | null>;
  timeoutMs?: number;
}

export function createCorrelationId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (typeof cryptoApi?.randomUUID === "function")
    return cryptoApi.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** Fabrique d'instance Axios réutilisable : une instance par service, jamais une par requête. */
export function createHttpClient(options: HttpClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    withCredentials: true,
    timeout: options.timeoutMs ?? 15_000,
    headers: { Accept: "application/json" },
  });

  client.interceptors.request.use(async (config) => {
    config.headers.set("X-Correlation-Id", createCorrelationId());
    config.headers.set("Accept-Language", options.getLanguage());
    if (config.authentication === "access-token") {
      if (options.isAccessTokenExpiring()) await options.refreshAccessToken();
      const token = options.getAccessToken();
      if (token) config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  client.interceptors.response.use(undefined, async (error: unknown) => {
    const apiError = toApiError(error);
    if (axios.isAxiosError(error)) {
      const config = error.config;
      if (
        apiError.status === 401 &&
        config?.authentication === "access-token" &&
        config.retryOnUnauthorized !== false &&
        !config.retried
      ) {
        const token = await options.refreshAccessToken();
        if (token) {
          config.retried = true;
          return client.request(config);
        }
      }
    }
    throw apiError;
  });

  return client;
}
