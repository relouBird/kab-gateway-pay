import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { loginSchema } from "@kgpay/contracts/transport";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { PageTitle } from "../../components/ui/PageTitle";
import { TextField } from "../../components/ui/TextField";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { useOtpFlowStore } from "../../stores/otpFlowStore";
import { ErrorNotice } from "../../components/ui/ErrorNotice";
import { correlationId } from "../../services/correlationId";

const initialLoginValues = { email: "", password: "" };

export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const passwordReset = location.state?.passwordReset === true;
  const startFlow = useOtpFlowStore((state) => state.start);
  const form = useYupForm({
    formId: "staff-login",
    schema: loginSchema,
    initialValues: initialLoginValues,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    setPending(true);
    setError(null);
    setReference(null);
    try {
      const response = await authService.login(values);
      startFlow({ challengeId: response.challengeId, email: values.email });
      void navigate("/mfa");
    } catch (caught) {
      setError(t("otpRequestError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
      form.clearField("password");
    }
  }

  return (
    <div className="stack">
      <PageTitle title={t("loginTitle")} subtitle={t("loginSubtitle")} />
      {passwordReset ? <Notice tone="success">{t("success")}</Notice> : null}
      {error ? <ErrorNotice message={error} reference={reference} /> : null}
      <form
        className="stack"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <TextField
          {...form.field("email")}
          label={t("email")}
          type="email"
          autoComplete="username"
          inputMode="email"
        />
        <TextField
          {...form.field("password")}
          label={t("password")}
          type="password"
          autoComplete="current-password"
          revealable
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("loading")}
        >
          {t("signIn")}
        </Button>
      </form>
      <Link to="/forgot-password">{t("forgotPassword")}</Link>
      <p className="form-footer">
        <Link to="/accept-invitation">{t("acceptInvitation")}</Link>
      </p>
    </div>
  );
}
