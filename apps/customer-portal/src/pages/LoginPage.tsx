import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { loginSchema } from "@kgpay/contracts/transport";
import { Button } from "../components/ui/Button";
import { Notice } from "../components/ui/Notice";
import { PageTitle } from "../components/ui/PageTitle";
import { TextField } from "../components/ui/TextField";
import { env } from "../config/env";
import { useSubmit } from "../composables/useSubmit";
import { useYupForm } from "../composables/useYupForm";
import { authService } from "../services/authService";
import { useFlashStore } from "../stores/flashStore";
import { useOtpFlowStore } from "../stores/otpFlowStore";

const initialValues = { email: "", password: "" };

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const startFlow = useOtpFlowStore((state) => state.startFlow);
  const flashNotice = useFlashStore((state) => state.notice);
  const setNotice = useFlashStore((state) => state.setNotice);
  const form = useYupForm({
    formId: "login",
    schema: loginSchema,
    initialValues,
  });
  const { pending, error, run } = useSubmit("login");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    const result = await run(() => authService.login(values));
    if (!result) return;
    setNotice(null);
    startFlow(
      {
        purpose: "login",
        challengeId: result.challengeId,
        email: values.email,
      },
      env.otpResendCooldownSeconds,
    );
    void navigate("/mfa", { state: location.state });
  }

  return (
    <div className="stack">
      <PageTitle title={t("login.title")} subtitle={t("login.subtitle")} />
      {flashNotice ? (
        <Notice tone="success">{t(`flash.${flashNotice}`)}</Notice>
      ) : null}
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
          autoComplete="username"
          inputMode="email"
        />
        <TextField
          {...form.field("password")}
          label={t("fields.password")}
          type="password"
          autoComplete="current-password"
          revealable
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("common.sending")}
        >
          {t("login.submit")}
        </Button>
      </form>
      <p className="form-footer">
        <Link to="/forgot-password">{t("login.forgot")}</Link>
      </p>
      <p className="form-footer">
        {t("login.noAccount")} <Link to="/register">{t("login.register")}</Link>
      </p>
    </div>
  );
}
