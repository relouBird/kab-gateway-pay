import { create } from "zustand";

export type OtpPurpose = "register" | "login" | "reset";

export interface OtpFlow {
  purpose: OtpPurpose;
  challengeId: string;
  email: string;
  /** Début de la fenêtre avant renvoi possible, en ms epoch. */
  resendAvailableAt: number;
}

interface OtpFlowState {
  flow: OtpFlow | null;
  startFlow: (
    flow: Omit<OtpFlow, "resendAvailableAt">,
    cooldownSeconds: number,
  ) => void;
  replaceChallenge: (challengeId: string, cooldownSeconds: number) => void;
  clearFlow: () => void;
}

/** Flux OTP en mémoire uniquement : un rechargement de page oblige à recommencer. */
export const useOtpFlowStore = create<OtpFlowState>((set) => ({
  flow: null,
  startFlow: (flow, cooldownSeconds) =>
    set({
      flow: { ...flow, resendAvailableAt: Date.now() + cooldownSeconds * 1000 },
    }),
  replaceChallenge: (challengeId, cooldownSeconds) =>
    set((state) =>
      state.flow
        ? {
            flow: {
              ...state.flow,
              challengeId,
              resendAvailableAt: Date.now() + cooldownSeconds * 1000,
            },
          }
        : state,
    ),
  clearFlow: () => set({ flow: null }),
}));

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}
