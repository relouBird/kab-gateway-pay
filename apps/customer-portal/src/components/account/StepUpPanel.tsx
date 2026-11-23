import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { otpFormSchema } from "@kgpay/contracts/transport";
import { env } from "../../config/env";
import { useSubmit } from "../../composables/useSubmit";
import { useYupForm } from "../../composables/useYupForm";
import { currentLanguage } from "../../i18n";
import { authService } from "../../services/authService";
import { OtpResend } from "../auth/OtpResend";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Notice } from "../ui/Notice";
import { TextField } from "../ui/TextField";

interface StepUpPanelProps {
  action: string;
  formId: string;
  onProof: (proof: string) => void;
  onCancel: () => void;
}

const initialValues = { code: "" };

/** Confirmation renforcée : un code envoyé à l'e-mail actuel produit une preuve valable quelques minutes. */
export function StepUpPanel({
  action,
  formId,
  onProof,
  onCancel,
}: StepUpPanelProps) {
  const { t } = useTranslation();
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const form = useYupForm({ formId, schema: otpFormSchema, initialValues });
  const request = useSubmit();
  const confirm = useSubmit("code");

  async function sendCode() {
    const result = await request.run(() =>
      authService.requestStepUp(action, currentLanguage()),
    );
    if (!result) return;
    setChallengeId(result.challengeId);
    setResendAvailableAt(Date.now() + env.otpResendCooldownSeconds * 1000);
  }

  async function resend() {
    const result = await authService.requestStepUp(action, currentLanguage());
    setChallengeId(result.challengeId);
    setResendAvailableAt(Date.now() + env.otpResendCooldownSeconds * 1000);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values || !challengeId) return;
    const result = await confirm.run(() =>
      authService.confirmStepUp(action, challengeId, values.code),
    );
    if (result) onProof(result.proof);
  }

  return (
    <div className="stepup stack" role="group" aria-label={t("stepUp.title")}>
      <p className="stepup__title">
        <Icon name="shield" /> {t("stepUp.title")}
      </p>
      {challengeId === null ? (
        <>
          <p>{t("stepUp.intro")}</p>
          {request.error ? (
            <Notice tone="error" correlationId={request.error.correlationId}>
              {t(request.error.key)}
            </Notice>
          ) : null}
          <div className="actions">
            <Button
              variant="primary"
              loading={request.pending}
              loadingLabel={t("common.sending")}
              onClick={() => void sendCode()}
            >
              {t("stepUp.send")}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <form
            className="stack"
            onSubmit={(event) => void handleConfirm(event)}
            noValidate
          >
            {confirm.error ? (
              <Notice tone="error" correlationId={confirm.error.correlationId}>
                {t(confirm.error.key)}
              </Notice>
            ) : null}
            <TextField
              {...form.field("code")}
              label={t("otp.code")}
              hint={t("stepUp.codeHint")}
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              className="field--code"
            />
            <div className="actions">
              <Button
                type="submit"
                variant="primary"
                loading={confirm.pending}
                loadingLabel={t("common.verifying")}
              >
                {t("stepUp.confirm")}
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
          <OtpResend availableAt={resendAvailableAt} onResend={resend} />
        </>
      )}
    </div>
  );
}
