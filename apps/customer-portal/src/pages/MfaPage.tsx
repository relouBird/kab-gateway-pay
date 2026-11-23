import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { OtpChallengeView } from "../components/auth/OtpChallengeView";
import { PageTitle } from "../components/ui/PageTitle";
import { useOtpFlow } from "../composables/useOtpFlow";
import { authService } from "../services/authService";
import { maskEmail } from "../stores/otpFlowStore";
import { useSessionStore } from "../stores/sessionStore";

export function MfaPage() {
  const { t } = useTranslation();
  const setSession = useSessionStore((state) => state.setSession);
  const { flow, completed, complete, resend } = useOtpFlow("login");

  if (!flow) return completed ? null : <Navigate to="/login" replace />;

  async function verify(code: string) {
    if (!flow) return;
    const tokens = await authService.verifyMfa({
      challengeId: flow.challengeId,
      code,
    });
    complete();
    // Le garde des routes publiques redirige ensuite vers la destination demandée.
    setSession(tokens);
  }

  return (
    <div className="stack">
      <PageTitle
        title={t("mfa.title")}
        subtitle={t("mfa.subtitle", { email: maskEmail(flow.email) })}
      />
      <OtpChallengeView
        formId="mfa"
        resendAvailableAt={flow.resendAvailableAt}
        onResend={resend}
        onVerify={verify}
        submitLabel={t("mfa.submit")}
        backTo="/login"
        backLabel={t("mfa.back")}
      />
    </div>
  );
}
