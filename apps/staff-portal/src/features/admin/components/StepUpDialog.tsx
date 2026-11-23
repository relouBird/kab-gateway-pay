import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorNotice } from "../../../components/ui/ErrorNotice";

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
            onConfirm(code);
          }}
        >
          <label className="field">
            <span>{t("otp")}</span>
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => setCode(e.target.value)}
              pattern="[0-9]{6,10}"
              required
              value={code}
            />
          </label>
          <div className="actions">
            <button
              className="button button--primary"
              disabled={pending}
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
