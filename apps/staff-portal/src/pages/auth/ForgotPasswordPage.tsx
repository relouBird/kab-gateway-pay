import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import {
  createResetPasswordSchema,
  forgotPasswordSchema,
} from "@kgpay/contracts/transport";
import { Button } from "../../components/ui/Button";
import { env } from "../../config/env";
import { Notice } from "../../components/ui/Notice";
import { PageTitle } from "../../components/ui/PageTitle";
import { TextField } from "../../components/ui/TextField";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { maskEmail } from "../../stores/otpFlowStore";
import { i18nLanguage } from "../../i18n/language";
import { ErrorNotice } from "../../components/ui/ErrorNotice";

const initialForgotValues = { email: "" };

const initialResetValues = { code: "", newPassword: "" };

const resetPasswordSchema = createResetPasswordSchema(env.passwordMinLength);

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const emailForm = useYupForm({
    formId: "staff-forgot",
    schema: forgotPasswordSchema,
    initialValues: initialForgotValues,
  });
  const resetForm = useYupForm({
    formId: "staff-reset-password",
    schema: resetPasswordSchema,
    initialValues: initialResetValues,
  });
  const [challengeId, setChallengeId] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    const values = await emailForm.validate();
    if (!values) return;
    setPending(true);
    setError(null);
    try {
      const result = await authService.forgotPassword({
        email: values.email,
        locale: i18nLanguage(),
      });
      setChallengeId(result.challengeId);
      setMessage(t("otpDescription", { email: maskEmail(values.email) }));
    } catch {
      setMessage(t("otpRequestError"));
    } finally {
      setPending(false);
    }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await resetForm.validate();
    if (!values) return;
    setPending(true);
    setError(null);
    try {
      await authService.resetPassword({
        challengeId,
        code: values.code,
        newPassword: values.newPassword,
      });
      setMessage(t("success"));
      setChallengeId("");
      resetForm.reset();
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <PageTitle title={t("forgotPassword")} />
      {message ? <Notice tone="info">{message}</Notice> : null}
      {error ? <ErrorNotice message={error} /> : null}
      {!challengeId ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void sendCode();
          }}
          noValidate
        >
          <TextField
            {...emailForm.field("email")}
            label={t("email")}
            type="email"
            autoComplete="username"
            inputMode="email"
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={pending}
            loadingLabel={t("loading")}
          >
            {t("sendCode")}
          </Button>
        </form>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => void reset(event)}
          noValidate
        >
          <TextField
            {...resetForm.field("code")}
            label={t("otp")}
            autoComplete="one-time-code"
            inputMode="numeric"
          />
          <TextField
            {...resetForm.field("newPassword")}
            label={t("newPassword")}
            autoComplete="new-password"
            type="password"
            minLength={env.passwordMinLength}
            revealable
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={pending}
            loadingLabel={t("loading")}
          >
            {t("resetPassword")}
          </Button>
        </form>
      )}
      <Link to="/login">{t("login")}</Link>
    </div>
  );
}
