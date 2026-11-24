import { authService } from "./authService";
import { registerRefreshHandler } from "./http/authApi";
import { toApiError } from "./http/apiError";
import { useSessionStore } from "../stores/sessionStore";

let inflight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    // Le jeton CSRF du portail est limité au chemin /auth et renouvelé avant chaque refresh.
    const { csrfToken } = await authService.getCsrf();
    const tokens = await authService.refresh(csrfToken);
    if (tokens.subjectType !== "CUSTOMER") {
      useSessionStore.getState().clearSession();
      return null;
    }
    useSessionStore.getState().setSession(tokens);
    return tokens.accessToken;
  } catch (error) {
    // Une erreur réseau n'invalide pas la session : seul un refus serveur la termine.
    if (toApiError(error).kind === "http")
      useSessionStore.getState().clearSession();
    return null;
  }
}

function runExclusive(
  task: () => Promise<string | null>,
): Promise<string | null> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  return locks ? locks.request("kgpay-session-refresh", task) : task();
}

/**
 * Le refresh est rotatif : sa réutilisation révoque la famille de sessions.
 * Les appels simultanés (StrictMode, requêtes parallèles, onglets) sont donc sérialisés.
 */
export function refreshSession(): Promise<string | null> {
  inflight ??= runExclusive(performRefresh).finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function restoreSession(): Promise<void> {
  if (useSessionStore.getState().status !== "unknown") return;
  await refreshSession();
  if (useSessionStore.getState().status === "unknown") {
    useSessionStore.getState().clearSession();
  }
}

export async function signOut(): Promise<void> {
  try {
    const { csrfToken } = await authService.getCsrf();
    await authService.logout(csrfToken);
  } catch {
    // La session locale est terminée même si le serveur est injoignable.
  } finally {
    useSessionStore.getState().clearSession();
  }
}

registerRefreshHandler(refreshSession);
