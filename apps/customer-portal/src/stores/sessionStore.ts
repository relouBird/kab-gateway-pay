import { create } from "zustand";
import type {
  AuthTokensResponse,
  SubjectType,
} from "@kgpay/contracts/transport";

export type SessionStatus = "unknown" | "authenticated" | "anonymous";

interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  subjectType: SubjectType | null;
  roles: string[];
  sessionId: string | null;
  setSession: (tokens: AuthTokensResponse) => void;
  clearSession: () => void;
}

const anonymous = {
  status: "anonymous" as const,
  accessToken: null,
  accessTokenExpiresAt: null,
  subjectType: null,
  roles: [] as string[],
  sessionId: null,
};

/** Session uniquement en mémoire : aucun `persist`, le refresh repose sur le cookie HttpOnly. */
export const useSessionStore = create<SessionState>((set) => ({
  ...anonymous,
  status: "unknown",
  setSession: (tokens) =>
    set({
      status: "authenticated",
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: Date.now() + tokens.expiresIn * 1000,
      subjectType: tokens.subjectType,
      roles: tokens.roles,
      sessionId: tokens.sessionId,
    }),
  clearSession: () => set({ ...anonymous }),
}));

const EXPIRY_SKEW_MS = 30_000;

export function isAccessTokenExpiring(): boolean {
  const { accessToken, accessTokenExpiresAt } = useSessionStore.getState();
  return (
    accessToken !== null &&
    accessTokenExpiresAt !== null &&
    accessTokenExpiresAt - Date.now() < EXPIRY_SKEW_MS
  );
}
