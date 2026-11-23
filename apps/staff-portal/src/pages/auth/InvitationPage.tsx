import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { acceptInvitationSchema } from "@kgpay/contracts/transport";
import { Button } from "../../components/ui/Button";
import { env } from "../../config/env";
import { Notice } from "../../components/ui/Notice";
import { PageTitle } from "../../components/ui/PageTitle";
import { TextField } from "../../components/ui/TextField";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { ErrorNotice } from "../../components/ui/ErrorNotice";

export function InvitationPage() {
  const { t } = useTranslation();
  const [initialToken] = useState(() => {
    const url = new URL(location.href);
    const invitationToken = url.searchParams.get("token") ?? "";
    if (invitationToken) {
      url.searchParams.delete("token");
      history.replaceState(null, "", url);
    }
    return invitationToken;
  });
  const form = useYupForm({
    formId: "staff-invitation",
    schema: acceptInvitationSchema,
    initialValues: { token: initialToken, password: "" },
  });
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const values = await form.validate();
    if (!values) return;
    if (values.password !== confirmation) {
      setError(t("genericError"));
      return;
    }
    if (values.password.length < env.passwordMinLength) {
      setError(t("passwordTooShort"));
      return;
    }
    try {
      setPending(true);
      await authService.acceptInvitation(values);
      setMessage(t("success"));
      form.reset();
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error ? t("genericError") : t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <PageTitle title={t("invitationTitle")} />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <ErrorNotice message={error} /> : null}
      <form
        className="stack"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <TextField
          {...form.field("token")}
          label={t("invitationToken")}
          autoComplete="one-time-code"
        />
        <TextField
          {...form.field("password")}
          label={t("newPassword")}
          type="password"
          autoComplete="new-password"
          minLength={env.passwordMinLength}
          revealable
        />
        <TextField
          id="staff-invitation-confirmation"
          label={`${t("newPassword")} — ${t("confirm")}`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          revealable
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("loading")}
        >
          {t("acceptInvitation")}
        </Button>
      </form>
      <Link to="/login">{t("login")}</Link>
    </div>
  );
}
