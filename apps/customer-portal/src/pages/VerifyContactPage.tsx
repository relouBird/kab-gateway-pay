import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { OtpChallengeView } from "../components/auth/OtpChallengeView";
import { PageTitle } from "../components/ui/PageTitle";
import { useOtpFlow } from "../composables/useOtpFlow";
import { authService } from "../services/authService";
import { useFlashStore } from "../stores/flashStore";
import { maskEmail } from "../stores/otpFlowStore";

export function VerifyContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setNotice = useFlashStore((state) => state.setNotice);
  const { flow, completed, complete, resend } = useOtpFlow("register");

  if (!flow) return completed ? null : <Navigate to="/register" replace />;

  async function verify(code: string) {
    if (!flow) return;
    await authService.verifyContact({ challengeId: flow.challengeId, code });
    complete();
    setNotice("registered");
    void navigate("/login", { replace: true });
  }

  return (
    <div className="stack">
      <PageTitle
        title={t("verifyContact.title")}
        subtitle={t("verifyContact.subtitle", { email: maskEmail(flow.email) })}
      />
      <OtpChallengeView
        formId="verify-contact"
        resendAvailableAt={flow.resendAvailableAt}
        onResend={resend}
        onVerify={verify}
        submitLabel={t("verifyContact.submit")}
        backTo="/register"
        backLabel={t("verifyContact.back")}
      />
    </div>
  );
}
