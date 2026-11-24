import { useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router";
import { createResetPasswordSchema } from "@kgpay/contracts/transport";
import { OtpResend } from "../components/auth/OtpResend";
import { Button } from "../components/ui/Button";
import { Notice } from "../components/ui/Notice";
import { OtpInput } from "../components/ui/OtpInput";
import { PageTitle } from "../components/ui/PageTitle";
import { TextField } from "../components/ui/TextField";
import { env } from "../config/env";
import { useOtpFlow } from "../composables/useOtpFlow";
import { useSubmit } from "../composables/useSubmit";
import { useYupForm } from "../composables/useYupForm";
import { authService } from "../services/authService";
import { useFlashStore } from "../stores/flashStore";
import { maskEmail } from "../stores/otpFlowStore";

const initialValues = { code: "", newPassword: "" };

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setNotice = useFlashStore((state) => state.setNotice);
  const { flow, completed, complete, resend } = useOtpFlow("reset");
  const schema = useMemo(
    () => createResetPasswordSchema(env.passwordMinLength),
    [],
  );
  const form = useYupForm({ formId: "reset", schema, initialValues });
  const codeField = form.field("code");
  const { pending, error, run } = useSubmit("reset");

  if (!flow)
    return completed ? null : <Navigate to="/forgot-password" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values || !flow) return;
    const done = await run(async () => {
      await authService.resetPassword({
        challengeId: flow.challengeId,
        ...values,
      });
      return true;
    });
    if (!done) return;
    complete();
    setNotice("passwordReset");
    void navigate("/login", { replace: true });
  }

  return (
    <div className="stack">
      <PageTitle
        title={t("reset.title")}
        subtitle={t("reset.subtitle", { email: maskEmail(flow.email) })}
      />
      <form
        className="stack"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        {error ? (
          <Notice tone="error" correlationId={error.correlationId}>
            {t(error.key)}
          </Notice>
        ) : null}
        <OtpInput
          id={codeField.id}
          label={t("otp.code")}
          value={codeField.value}
          onChange={(value) => form.setFieldValue("code", value)}
          hint={t("otp.codeHint")}
          error={codeField.error}
          disabled={pending}
        />
        <TextField
          {...form.field("newPassword")}
          label={t("fields.newPassword")}
          hint={t("register.passwordHint", { min: env.passwordMinLength })}
          type="password"
          autoComplete="new-password"
          revealable
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("common.sending")}
        >
          {t("reset.submit")}
        </Button>
      </form>
      <OtpResend availableAt={flow.resendAvailableAt} onResend={resend} />
      <p className="form-footer">
        <Link to="/forgot-password">{t("reset.back")}</Link>
      </p>
    </div>
  );
}
