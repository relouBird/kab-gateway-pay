import { useCallback, useRef } from "react";
import { env } from "../config/env";
import { currentLanguage } from "../i18n";
import { authService } from "../services/authService";
import { useOtpFlowStore, type OtpPurpose } from "../stores/otpFlowStore";

/** Accès au flux OTP en cours ; `completed` évite une redirection parasite pendant la fin d'un parcours. */
export function useOtpFlow(purpose: OtpPurpose) {
  const stored = useOtpFlowStore((state) => state.flow);
  const clearFlow = useOtpFlowStore((state) => state.clearFlow);
  const replaceChallenge = useOtpFlowStore((state) => state.replaceChallenge);
  const completedRef = useRef(false);
  const flow = stored && stored.purpose === purpose ? stored : null;

  const complete = useCallback(() => {
    completedRef.current = true;
    clearFlow();
  }, [clearFlow]);

  const resend = useCallback(async () => {
    if (!flow) return;
    const result = await authService.resendOtp({
      challengeId: flow.challengeId,
      locale: currentLanguage(),
    });
    replaceChallenge(result.challengeId, env.otpResendCooldownSeconds);
  }, [flow, replaceChallenge]);

  return { flow, completed: completedRef.current, complete, resend };
}
