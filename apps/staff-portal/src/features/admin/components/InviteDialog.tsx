import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  createStaffInvitationSchema,
  type AdminRole,
} from "@kgpay/contracts/transport";
import { ErrorNotice } from "../../../components/ui/ErrorNotice";

export function InviteDialog({
  roles,
  onClose,
  onSubmit,
}: {
  roles: AdminRole[];
  onClose: () => void;
  onSubmit: (body: { email: string; phone: string; roles: string[] }) => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const assignable = roles.filter((role) => role.code !== "CUSTOMER");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = await createStaffInvitationSchema.validate(
        { email, phone, roles: selected },
        { abortEarly: false },
      );
      onSubmit(body);
    } catch {
      setError(t("genericError"));
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="invite-title"
        aria-modal="true"
        className="modal card"
        role="dialog"
      >
        <div className="modal-heading">
          <h2 id="invite-title">{t("inviteDialog")}</h2>
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
            <span>{t("email")}</span>
            <input
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>{t("phone")}</span>
            <input
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
              required
              type="tel"
              value={phone}
            />
          </label>
          <fieldset>
            <legend>{t("rolesAssigned")}</legend>
            {assignable.map((role) => (
              <label className="check-option" key={role.code}>
                <input
                  checked={selected.includes(role.code)}
                  onChange={(event) =>
                    setSelected((value) =>
                      event.target.checked
                        ? [...value, role.code]
                        : value.filter((item) => item !== role.code),
                    )
                  }
                  type="checkbox"
                />
                {role.name} <span className="mono">({role.code})</span>
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button className="button button--primary" type="submit">
              {t("invite")}
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
