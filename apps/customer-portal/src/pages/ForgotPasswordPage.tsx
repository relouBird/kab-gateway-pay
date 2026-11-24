import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { forgotPasswordSchema } from "@kgpay/contracts/transport";
import { Button } from "../components/ui/Button";
import { Notice } from "../components/ui/Notice";
import { PageTitle } from "../components/ui/PageTitle";
import { TextField } from "../components/ui/TextField";
import { env } from "../config/env";
import { useSubmit } from "../composables/useSubmit";
import { useYupForm } from "../composables/useYupForm";
import { currentLanguage } from "../i18n";
import { authService } from "../services/authService";
import { useOtpFlowStore } from "../stores/otpFlowStore";

const initialValues = { email: "" };

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startFlow = useOtpFlowStore((state) => state.startFlow);
  const form = useYupForm({
    formId: "forgot",
    schema: forgotPasswordSchema,
    initialValues,
  });
  const { pending, error, run } = useSubmit();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    const result = await run(() =>
      authService.forgotPassword({
        email: values.email,
        locale: currentLanguage(),
      }),
    );
    if (!result) return;
    startFlow(
      {
        purpose: "reset",
        challengeId: result.challengeId,
        email: values.email,
      },
      env.otpResendCooldownSeconds,
    );
    void navigate("/reset-password");
  }

  return (
    <div className="stack">
      <PageTitle title={t("forgot.title")} subtitle={t("forgot.subtitle")} />
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
        <TextField
          {...form.field("email")}
          label={t("fields.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("common.sending")}
        >
          {t("forgot.submit")}
        </Button>
      </form>
      <p className="form-footer">
        <Link to="/login">{t("forgot.back")}</Link>
      </p>
      <Notice tone="info">{t("forgot.lostEmail")}</Notice>
    </div>
  );
}
