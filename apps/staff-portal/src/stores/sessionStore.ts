import { create } from "zustand";
import type {
  AuthTokensResponse,
  SubjectType,
} from "@kgpay/contracts/transport";

interface SessionState {
  status: "unknown" | "authenticated" | "anonymous";
  accessToken: string | null;
  expiresAt: number | null;
  subjectType: SubjectType | null;
  roles: string[];
  sessionId: string | null;
  setSession: (tokens: AuthTokensResponse) => void;
  clearSession: () => void;
}

const emptySession = {
  status: "anonymous" as const,
  accessToken: null,
  expiresAt: null,
  subjectType: null,
  roles: [] as string[],
  sessionId: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...emptySession,
  status: "unknown",
  setSession: (tokens) =>
    set({
      status: "authenticated",
      accessToken: tokens.accessToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
      subjectType: tokens.subjectType,
      roles: tokens.roles,
      sessionId: tokens.sessionId,
    }),
  clearSession: () => set(emptySession),
}));

export function isAccessTokenExpiring(): boolean {
  const { accessToken, expiresAt } = useSessionStore.getState();
  return (
    accessToken !== null &&
    expiresAt !== null &&
    expiresAt - Date.now() < 30_000
  );
}
