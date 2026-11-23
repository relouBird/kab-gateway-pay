import { create } from "zustand";

interface OtpFlow {
  challengeId: string;
  email: string;
}

interface OtpFlowState {
  flow: OtpFlow | null;
  start: (flow: OtpFlow) => void;
  clear: () => void;
}

export const useOtpFlowStore = create<OtpFlowState>((set) => ({
  flow: null,
  start: (flow) => set({ flow }),
  clear: () => set({ flow: null }),
}));

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 1)}${"•".repeat(Math.min(Math.max(name.length - 1, 2), 6))}@${domain}`;
}
