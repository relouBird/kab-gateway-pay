import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorNotice } from "../../../components/ui/ErrorNotice";
import { OtpInput } from "../../../components/ui/OtpInput";

export function StepUpDialog({
  pending,
  error,
  reference,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  error: string | null;
  reference: string | null;
  onCancel: () => void;
  onConfirm: (code: string) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="stepup-title"
        aria-modal="true"
        className="modal card"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="stepup-title">{t("stepUpTitle")}</h2>
          <button
            aria-label={t("close")}
            className="icon-button"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>
        <p>{t("stepUpDescription")}</p>
        {error ? <ErrorNotice message={error} reference={reference} /> : null}
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length !== 6) return;
            onConfirm(code);
          }}
        >
          <OtpInput
            id="step-up-code"
            label={t("otp")}
            value={code}
            onChange={setCode}
            hint={t("otpHint")}
            disabled={pending}
          />
          <div className="actions">
            <button
              className="button button--primary"
              disabled={pending || code.length !== 6}
              type="submit"
            >
              {pending ? t("loading") : t("confirm")}
            </button>
            <button
              className="button button--secondary"
              onClick={onCancel}
              type="button"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
