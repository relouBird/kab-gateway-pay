import { useTranslation } from "react-i18next";
import { type SessionSummary } from "@kgpay/contracts/transport";
import { formatDate } from "../formatters";

export function SessionsPanel({
  sessions,
  currentSessionId,
  pending,
  onRevoke,
  onLogoutAll,
}: {
  sessions: SessionSummary[];
  currentSessionId: string | null;
  pending: boolean;
  onRevoke: (id: string) => void;
  onLogoutAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="stack">
      <div className="actions">
        <button
          className="button button--danger"
          disabled={pending}
          onClick={onLogoutAll}
          type="button"
        >
          {t("logoutAll")}
        </button>
      </div>
      {sessions.length ? (
        <div className="tiles">
          {sessions.map((session) => {
            const current = session.id === currentSessionId;
            return (
              <article className="card session-card" key={session.id}>
                <div className="modal-heading">
                  <h2>{current ? t("currentSession") : t("sessions")}</h2>
                  <span className="status status--active">
                    {t("activeSession")}
                  </span>
                </div>
                <dl className="session-meta">
                  <dt>{t("sessionCreated")}</dt>
                  <dd>{formatDate(session.createdAt)}</dd>
                  <dt>{t("sessionActivity")}</dt>
                  <dd>{formatDate(session.lastActivityAt)}</dd>
                  <dt>{t("sessionExpiry")}</dt>
                  <dd>{formatDate(session.absoluteExpiresAt)}</dd>
                  <dt>{t("sessionDevice")}</dt>
                  <dd>{session.userAgent ?? "—"}</dd>
                  <dt>{t("sessionIp")}</dt>
                  <dd>{session.ipAddress ?? "—"}</dd>
                </dl>
                {!current ? (
                  <button
                    className="button button--secondary"
                    disabled={pending}
                    onClick={() => onRevoke(session.id)}
                    type="button"
                  >
                    {t("revokeSession")}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty">{t("empty")}</p>
      )}
    </section>
  );
}
