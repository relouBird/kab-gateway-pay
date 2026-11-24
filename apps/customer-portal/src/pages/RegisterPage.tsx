import { useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { createRegisterSchema } from "@kgpay/contracts/transport";
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

const initialValues = { email: "", phone: "", password: "" };

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const startFlow = useOtpFlowStore((state) => state.startFlow);
  const schema = useMemo(() => createRegisterSchema(env.passwordMinLength), []);
  const form = useYupForm({ formId: "register", schema, initialValues });
  const { pending, error, run } = useSubmit();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    const result = await run(() =>
      authService.register({ ...values, locale: currentLanguage() }),
    );
    if (!result) return;
    startFlow(
      {
        purpose: "register",
        challengeId: result.challengeId,
        email: values.email,
      },
      env.otpResendCooldownSeconds,
    );
    void navigate("/verify-contact");
  }

  return (
    <div className="stack">
      <PageTitle
        title={t("register.title")}
        subtitle={t("register.subtitle")}
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
        <TextField
          {...form.field("email")}
          label={t("fields.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
        />
        <TextField
          {...form.field("phone")}
          label={t("fields.phone")}
          hint={t("register.phoneHint")}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
        />
        <TextField
          {...form.field("password")}
          label={t("fields.password")}
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
          {t("register.submit")}
        </Button>
      </form>
      <p className="form-footer">
        {t("register.haveAccount")}{" "}
        <Link to="/login">{t("register.login")}</Link>
      </p>
    </div>
  );
}
