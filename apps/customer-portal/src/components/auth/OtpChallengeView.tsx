import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { otpFormSchema } from "@kgpay/contracts/transport";
import { useSubmit } from "../../composables/useSubmit";
import { useYupForm } from "../../composables/useYupForm";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";
import { OtpInput } from "../ui/OtpInput";
import { OtpResend } from "./OtpResend";

interface OtpChallengeViewProps {
  formId: string;
  resendAvailableAt: number;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<void>;
  submitLabel: string;
  backTo: string;
  backLabel: string;
}

const initialValues = { code: "" };

/** Saisie d'un code à usage unique (OTP e-mail) avec renvoi. */
export function OtpChallengeView({
  formId,
  resendAvailableAt,
  onResend,
  onVerify,
  submitLabel,
  backTo,
  backLabel,
}: OtpChallengeViewProps) {
  const { t } = useTranslation();
  const form = useYupForm({ formId, schema: otpFormSchema, initialValues });
  const codeField = form.field("code");
  const { pending, error, run } = useSubmit("code");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = await form.validate();
    if (!values) return;
    await run(() => onVerify(values.code));
  }

  return (
    <div className="stack">
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
        <OtpInput
          id={codeField.id}
          label={t("otp.code")}
          value={codeField.value}
          onChange={(value) => form.setFieldValue("code", value)}
          hint={t("otp.codeHint")}
          error={codeField.error}
          disabled={pending}
        />
        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={pending}
          loadingLabel={t("common.verifying")}
        >
          {submitLabel}
        </Button>
      </form>
      <OtpResend availableAt={resendAvailableAt} onResend={onResend} />
      <p className="form-footer">
        <Link to={backTo}>{backLabel}</Link>
      </p>
    </div>
  );
}
