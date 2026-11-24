import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { STEP_UP_ACTIONS, changePhoneSchema } from "@kgpay/contracts/transport";
import { useSubmit } from "../../composables/useSubmit";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";
import { StepUpPanel } from "./StepUpPanel";

const initialValues = { phone: "" };

export function ChangePhoneCard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"form" | "stepUp">("form");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const form = useYupForm({
    formId: "change-phone",
    schema: changePhoneSchema,
    initialValues,
  });
  const { pending, error, run, clearError } = useSubmit();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    setPhone(values.phone);
    setDone(false);
    clearError();
    setStep("stepUp");
  }

  async function handleProof(proof: string) {
    const ok = await run(async () => {
      await authService.changePhone({ phone }, proof);
      return true;
    });
    if (ok) {
      form.reset();
      setDone(true);
    }
    setStep("form");
  }

  return (
    <section
      className="card card--section"
      aria-labelledby="change-phone-title"
    >
      <h2 id="change-phone-title">{t("account.phone.title")}</h2>
      <p className="muted">{t("account.phone.description")}</p>
      {done ? <Notice tone="success">{t("account.phone.done")}</Notice> : null}
      {error ? (
        <Notice tone="error" correlationId={error.correlationId}>
          {t(error.key)}
        </Notice>
      ) : null}

      {step === "form" ? (
        <form
          className="stack"
          onSubmit={(event) => void handleSubmit(event)}
          noValidate
        >
          <TextField
            {...form.field("phone")}
            label={t("fields.phone")}
            hint={t("register.phoneHint")}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
          />
          <div className="actions">
            <Button
              type="submit"
              variant="secondary"
              loading={pending}
              loadingLabel={t("common.sending")}
            >
              {t("account.phone.submit")}
            </Button>
          </div>
        </form>
      ) : (
        <StepUpPanel
          action={STEP_UP_ACTIONS.phoneChange}
          formId="change-phone-stepup"
          onProof={(proof) => void handleProof(proof)}
          onCancel={() => setStep("form")}
        />
      )}
    </section>
  );
}
