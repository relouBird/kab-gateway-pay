import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "../config/env";
import i18n from "../i18n";
import { isAccessTokenExpiring, useSessionStore } from "../stores/sessionStore";

declare module "axios" {
  interface AxiosRequestConfig {
    authentication?: "access-token" | "none";
    retryOnUnauthorized?: boolean;
    retried?: boolean;
  }
}

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler = () => Promise.resolve(null);

export function registerRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export function createAuthClient(): AxiosInstance {
  const client = axios.create({
    baseURL: env.authApiUrl,
    withCredentials: true,
    timeout: 15_000,
    headers: {
      Accept: "application/json",
      "X-KGPay-Portal": "STAFF",
    },
  });
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const cryptoApi = globalThis.crypto as Crypto | undefined;
      const correlationId =
        typeof cryptoApi?.randomUUID === "function"
          ? cryptoApi.randomUUID()
          : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      config.headers.set("X-Correlation-Id", correlationId);
      config.headers.set("Accept-Language", i18n.language);
      if (config.authentication === "access-token") {
        if (isAccessTokenExpiring()) await refreshHandler();
        const token = useSessionStore.getState().accessToken;
        if (token) config.headers.set("Authorization", `Bearer ${token}`);
      }
      return config;
    },
  );
  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;
    const config = error.config as
      (InternalAxiosRequestConfig & AxiosRequestConfig) | undefined;
    if (
      error.response?.status === 401 &&
      config?.authentication === "access-token" &&
      config.retryOnUnauthorized !== false &&
      !config.retried
    ) {
      const token = await refreshHandler();
      if (token) {
        config.retried = true;
        return client.request(config);
      }
    }
    throw error;
  });
  return client;
}

export const authApi = createAuthClient();
export const authenticated = {
  authentication: "access-token",
} satisfies AxiosRequestConfig;
