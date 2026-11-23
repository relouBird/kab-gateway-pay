import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { otpFormSchema } from "@kgpay/contracts/transport";
import { Button } from "../../components/ui/Button";
import { env } from "../../config/env";
import { PageTitle } from "../../components/ui/PageTitle";
import { TextField } from "../../components/ui/TextField";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { signOut } from "../../services/sessionManager";
import { maskEmail, useOtpFlowStore } from "../../stores/otpFlowStore";
import { useSessionStore } from "../../stores/sessionStore";
import { i18nLanguage } from "../../i18n/language";
import { ErrorNotice } from "../../components/ui/ErrorNotice";
import { correlationId } from "../../services/correlationId";

const initialOtpValues = { code: "" };

export function MfaPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const flow = useOtpFlowStore((state) => state.flow);
  const startFlow = useOtpFlowStore((state) => state.start);
  const clearFlow = useOtpFlowStore((state) => state.clear);
  const setSession = useSessionStore((state) => state.setSession);
  const form = useYupForm({
    formId: "staff-mfa",
    schema: otpFormSchema,
    initialValues: initialOtpValues,
  });
  const [resendRemaining, setResendRemaining] = useState(
    env.otpResendCooldownSeconds,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (resendRemaining <= 0) return;
    const timer = window.setTimeout(
      () => setResendRemaining((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendRemaining]);

  async function resendCode() {
    if (!flow) return;
    setPending(true);
    setError(null);
    try {
      const result = await authService.resendOtp({
        challengeId: flow.challengeId,
        locale: i18nLanguage(),
      });
      startFlow({ challengeId: result.challengeId, email: flow.email });
      setResendRemaining(env.otpResendCooldownSeconds);
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flow) return;
    const values = await form.validate();
    if (!values) return;
    setPending(true);
    setError(null);
    setReference(null);
    try {
      const tokens = await authService.verifyMfa({
        challengeId: flow.challengeId,
        code: values.code,
      });
      clearFlow();
      if (tokens.subjectType !== "STAFF") {
        try {
          await signOut();
        } catch {
          useSessionStore.getState().clearSession();
        }
        setError(t("customerDenied"));
        return;
      }
      setSession(tokens);
      void navigate(
        tokens.roles.includes("GLOBAL_SUPER_ADMIN") ? "/admin" : "/my-sessions",
        { replace: true },
      );
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
      form.clearField("code");
    }
  }

  if (!flow) return <Navigate to="/login" replace />;

  return (
    <div className="stack">
      <PageTitle title={t("otpTitle")} />
      <p className="muted">
        {t("otpDescription", { email: maskEmail(flow.email) })}
      </p>
      {error ? <ErrorNotice message={error} reference={reference} /> : null}
      <form
        className="stack"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <TextField
          {...form.field("code")}
          label={t("otp")}
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={10}
          pattern="[0-9]{6,10}"
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!flow}
          loading={pending}
          loadingLabel={t("loading")}
        >
          {t("verify")}
        </Button>
      </form>
      <Button
        variant="secondary"
        disabled={pending || resendRemaining > 0}
        onClick={() => void resendCode()}
      >
        {resendRemaining > 0
          ? t("resendIn", { seconds: resendRemaining })
          : t("resendCode")}
      </Button>
    </div>
  );
}
