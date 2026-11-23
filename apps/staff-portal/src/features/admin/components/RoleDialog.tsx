import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createCustomRoleSchema } from "@kgpay/contracts/transport";
import { ErrorNotice } from "../../../components/ui/ErrorNotice";

export function RoleDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (body: {
    code: string;
    name: string;
    permissions: string[];
  }) => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = await createCustomRoleSchema.validate({
        code,
        name,
        permissions: [],
      });
      onSubmit(body);
    } catch {
      setError(t("genericError"));
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="role-title"
        aria-modal="true"
        className="modal card"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="role-title">{t("createRole")}</h2>
          <button
            aria-label={t("close")}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        {error ? <ErrorNotice message={error} /> : null}
        <form className="stack" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>{t("roleCode")}</span>
            <input
              maxLength={40}
              onChange={(e) => setCode(e.target.value)}
              pattern="[a-z][a-z0-9-]{1,39}"
              required
              value={code}
            />
          </label>
          <label className="field">
            <span>{t("roleName")}</span>
            <input
              maxLength={80}
              minLength={2}
              onChange={(e) => setName(e.target.value)}
              required
              value={name}
            />
          </label>
          <p className="notice notice--info">{t("noPermissions")}</p>
          <div className="actions">
            <button className="button button--primary" type="submit">
              {t("createRole")}
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
      </section>
    </div>
  );
}
