import axios from "axios";
import { authService } from "./authService";
import { registerRefreshHandler } from "./http";
import { useSessionStore } from "../stores/sessionStore";

let inflight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const { csrfToken } = await authService.csrf();
    const tokens = await authService.refresh(csrfToken);
    if (tokens.subjectType !== "STAFF") {
      useSessionStore.getState().clearSession();
      const { csrfToken: logoutCsrfToken } = await authService.csrf();
      await authService.logout(logoutCsrfToken);
      return null;
    }
    useSessionStore.getState().setSession(tokens);
    return tokens.accessToken;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      useSessionStore.getState().clearSession();
    }
    return null;
  }
}

function lockedRefresh(): Promise<string | null> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("kgpay-session-refresh", performRefresh);
  }
  return performRefresh();
}

export function refreshSession(): Promise<string | null> {
  inflight ??= lockedRefresh().finally(() => {
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
    const { csrfToken } = await authService.csrf();
    await authService.logout(csrfToken);
  } finally {
    useSessionStore.getState().clearSession();
  }
}

registerRefreshHandler(refreshSession);
