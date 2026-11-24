import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  STEP_UP_ACTIONS,
  changeEmailSchema,
  otpFormSchema,
} from "@kgpay/contracts/transport";
import { useSubmit } from "../../composables/useSubmit";
import { useYupForm } from "../../composables/useYupForm";
import { authService } from "../../services/authService";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { OtpInput } from "../ui/OtpInput";
import { TextField } from "../ui/TextField";
import { StepUpPanel } from "./StepUpPanel";

type Step = "form" | "stepUp" | "verify";

const emailValues = { newEmail: "" };
const codeValues = { code: "" };

export function ChangeEmailCard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("form");
  const [newEmail, setNewEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [done, setDone] = useState(false);
  const emailForm = useYupForm({
    formId: "change-email",
    schema: changeEmailSchema,
    initialValues: emailValues,
  });
  const codeForm = useYupForm({
    formId: "change-email-code",
    schema: otpFormSchema,
    initialValues: codeValues,
  });
  const codeField = codeForm.field("code");
  const request = useSubmit("emailChange");
  const verify = useSubmit("emailChangeCode");

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await emailForm.validate();
    if (!values) return;
    setNewEmail(values.newEmail);
    setDone(false);
    request.clearError();
    setStep("stepUp");
  }

  async function handleProof(proof: string) {
    const result = await request.run(() =>
      authService.requestEmailChange({ newEmail }, proof),
    );
    if (!result) {
      setStep("form");
      return;
    }
    setChallengeId(result.challengeId);
    setStep("verify");
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await codeForm.validate();
    if (!values) return;
    const ok = await verify.run(async () => {
      await authService.verifyEmailChange({
        newEmail,
        code: values.code,
        challengeId,
      });
      return true;
    });
    if (!ok) return;
    emailForm.reset();
    codeForm.reset();
    setDone(true);
    setStep("form");
  }

  function restart() {
    codeForm.reset();
    verify.clearError();
    setStep("form");
  }

  return (
    <section
      className="card card--section"
      aria-labelledby="change-email-title"
    >
      <h2 id="change-email-title">{t("account.email.title")}</h2>
      <p className="muted">{t("account.email.description")}</p>
      {done ? <Notice tone="success">{t("account.email.done")}</Notice> : null}
      {request.error ? (
        <Notice tone="error" correlationId={request.error.correlationId}>
          {t(request.error.key)}
        </Notice>
      ) : null}

      {step === "form" ? (
        <form
          className="stack"
          onSubmit={(event) => void handleEmail(event)}
          noValidate
        >
          <TextField
            {...emailForm.field("newEmail")}
            label={t("fields.newEmail")}
            type="email"
            autoComplete="email"
            inputMode="email"
          />
          <div className="actions">
            <Button type="submit" variant="secondary">
              {t("account.email.submit")}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "stepUp" ? (
        <StepUpPanel
          action={STEP_UP_ACTIONS.emailChange}
          formId="change-email-stepup"
          onProof={(proof) => void handleProof(proof)}
          onCancel={restart}
        />
      ) : null}

      {step === "verify" ? (
        <form
          className="stack"
          onSubmit={(event) => void handleVerify(event)}
          noValidate
        >
          <Notice tone="info">
            {t("account.email.codeSent", { email: newEmail })}
          </Notice>
          {verify.error ? (
            <Notice tone="error" correlationId={verify.error.correlationId}>
              {t(verify.error.key)}
            </Notice>
          ) : null}
          <OtpInput
            id={codeField.id}
            label={t("otp.code")}
            value={codeField.value}
            onChange={(value) => codeForm.setFieldValue("code", value)}
            hint={t("otp.codeHint")}
            error={codeField.error}
            disabled={verify.pending}
          />
          <div className="actions">
            <Button
              type="submit"
              variant="secondary"
              loading={verify.pending}
              loadingLabel={t("common.verifying")}
            >
              {t("account.email.confirm")}
            </Button>
            <Button variant="ghost" onClick={restart}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
