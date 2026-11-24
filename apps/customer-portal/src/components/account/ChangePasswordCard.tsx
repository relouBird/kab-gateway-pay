import { useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createChangePasswordSchema } from "@kgpay/contracts/transport";
import { env } from "../../config/env";
import { useSubmit } from "../../composables/useSubmit";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { useFlashStore } from "../../stores/flashStore";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";

const initialValues = { currentPassword: "", newPassword: "" };

export function ChangePasswordCard() {
  const { t } = useTranslation();
  const setNotice = useFlashStore((state) => state.setNotice);
  const clearSession = useSessionStore((state) => state.clearSession);
  const schema = useMemo(
    () => createChangePasswordSchema(env.passwordMinLength),
    [],
  );
  const form = useYupForm({ formId: "change-password", schema, initialValues });
  const { pending, error, run } = useSubmit("currentPassword");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    const done = await run(async () => {
      await authService.changePassword(values);
      return true;
    });
    if (!done) return;
    // Le serveur révoque toutes les sessions, y compris celle-ci : reconnexion nécessaire.
    setNotice("passwordChanged");
    clearSession();
  }

  return (
    <section
      className="card card--section"
      aria-labelledby="change-password-title"
    >
      <h2 id="change-password-title">{t("account.password.title")}</h2>
      <p className="muted">{t("account.password.description")}</p>
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
          {...form.field("currentPassword")}
          label={t("fields.currentPassword")}
          type="password"
          autoComplete="current-password"
          revealable
        />
        <TextField
          {...form.field("newPassword")}
          label={t("fields.newPassword")}
          hint={t("register.passwordHint", { min: env.passwordMinLength })}
          type="password"
          autoComplete="new-password"
          revealable
        />
        <Notice tone="info">{t("account.password.warning")}</Notice>
        <div className="actions">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            loadingLabel={t("common.sending")}
          >
            {t("account.password.submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
