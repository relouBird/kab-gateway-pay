import type { AxiosInstance } from "axios";
import { env } from "../../config/env";
import i18n from "../../i18n";
import {
  isAccessTokenExpiring,
  useSessionStore,
} from "../../stores/sessionStore";
import { createHttpClient } from "./createHttpClient";

type RefreshHandler = () => Promise<string | null>;

let refreshHandler: RefreshHandler = () => Promise.resolve(null);

/** Branche la logique de refresh sans import circulaire avec les services d'auth. */
export function registerRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export const authApi: AxiosInstance = createHttpClient({
  baseURL: env.authApiUrl,
  getAccessToken: () => useSessionStore.getState().accessToken,
  isAccessTokenExpiring,
  getLanguage: () => i18n.language,
  refreshAccessToken: () => refreshHandler(),
  defaultHeaders: { "X-KGPay-Portal": "CUSTOMER" },
});
