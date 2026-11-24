import { useState } from "react";
import { useTranslation } from "react-i18next";
import { maskEmail } from "../../../stores/otpFlowStore";
import { OtpInput } from "../../../components/ui/OtpInput";

export function RecoveryDialog({
  challengeId,
  email,
  onClose,
  onRequest,
  onVerify,
}: {
  challengeId?: string;
  email?: string;
  onClose: () => void;
  onRequest: (email: string) => void;
  onVerify: (code: string) => void;
}) {
  const { t } = useTranslation();
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [code, setCode] = useState("");
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="recovery-title"
        aria-modal="true"
        className="modal card"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="recovery-title">{t("recoverEmail")}</h2>
          <button
            aria-label={t("close")}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {!challengeId ? (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              onRequest(newEmail);
            }}
          >
            <label className="field">
              <span>{t("newEmail")}</span>
              <input
                autoComplete="email"
                onChange={(e) => setNewEmail(e.target.value)}
                required
                type="email"
                value={newEmail}
              />
            </label>
            <div className="actions">
              <button className="button button--primary" type="submit">
                {t("sendCode")}
              </button>
              <button
                className="button button--secondary"
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        ) : (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.length !== 6) return;
              onVerify(code);
            }}
          >
            <p>{t("otpDescription", { email: maskEmail(email ?? "") })}</p>
            <OtpInput
              id="recovery-code"
              label={t("otp")}
              value={code}
              onChange={setCode}
              hint={t("otpHint")}
            />
            <div className="actions">
              <button
                className="button button--primary"
                disabled={code.length !== 6}
                type="submit"
              >
                {t("verify")}
              </button>
              <button
                className="button button--secondary"
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
