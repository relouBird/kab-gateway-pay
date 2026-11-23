import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionSummary } from "@kgpay/contracts/transport";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Notice } from "../components/ui/Notice";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useSubmit } from "../composables/useSubmit";
import { authService } from "../services/authService";
import { errorMessageKey, toApiError } from "../services/http/apiError";
import { useSessionStore } from "../stores/sessionStore";

type LoadState =
  | { status: "loading" }
  | { status: "error"; key: string; correlationId: string | null }
  | { status: "ready"; sessions: SessionSummary[] };

export function SessionsPage() {
  const { t, i18n } = useTranslation();
  const currentSessionId = useSessionStore((state) => state.sessionId);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [confirming, setConfirming] = useState<string | null>(null);
  const action = useSubmit();

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setState({ status: "loading" });
    try {
      const sessions = await authService.listSessions();
      if (isActive()) setState({ status: "ready", sessions });
    } catch (error) {
      const apiError = toApiError(error);
      if (isActive()) {
        setState({
          status: "error",
          key: errorMessageKey(apiError),
          correlationId: apiError.correlationId,
        });
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const format = (value: string) => formatter.format(new Date(value));

  async function revoke(session: SessionSummary) {
    const ok = await action.run(async () => {
      await authService.revokeSession(session.id);
      return true;
    });
    setConfirming(null);
    if (!ok) return;
    if (session.id === currentSessionId) {
      clearSession();
      return;
    }
    await load();
  }

  async function revokeAll() {
    const ok = await action.run(async () => {
      await authService.logoutAll();
      return true;
    });
    setConfirming(null);
    if (ok) clearSession();
  }

  return (
    <div className="stack stack--lg">
      <PageTitle
        title={t("sessions.title")}
        subtitle={t("sessions.subtitle")}
      />

      {action.error ? (
        <Notice tone="error" correlationId={action.error.correlationId}>
          {t(action.error.key)}
        </Notice>
      ) : null}

      {state.status === "loading" ? (
        <div className="splash" role="status">
          <span className="spinner spinner--lg" aria-hidden="true" />
          <p>{t("common.loading")}</p>
        </div>
      ) : null}

      {state.status === "error" ? (
        <div className="stack">
          <Notice tone="error" correlationId={state.correlationId}>
            {t(state.key)}
          </Notice>
          <div className="actions">
            <Button onClick={() => void load()}>{t("common.retry")}</Button>
          </div>
        </div>
      ) : null}

      {state.status === "ready" ? (
        <>
          <ul className="session-list">
            {state.sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <li key={session.id} className="card card--section session">
                  <div className="session__head">
                    <p className="session__device">
                      <Icon name="device" />
                      <span>
                        {session.userAgent ?? t("sessions.unknownDevice")}
                      </span>
                    </p>
                    {isCurrent ? (
                      <StatusBadge
                        tone="confirmed"
                        label={t("sessions.current")}
                      />
                    ) : null}
                  </div>
                  <dl className="session__meta">
                    <div>
                      <dt>{t("sessions.ip")}</dt>
                      <dd className="mono">{session.ipAddress ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>{t("sessions.createdAt")}</dt>
                      <dd>{format(session.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>{t("sessions.lastActivity")}</dt>
                      <dd>{format(session.lastActivityAt)}</dd>
                    </div>
                    <div>
                      <dt>{t("sessions.expiresAt")}</dt>
                      <dd>{format(session.absoluteExpiresAt)}</dd>
                    </div>
                  </dl>
                  {confirming === session.id ? (
                    <div
                      className="actions"
                      role="group"
                      aria-label={t("sessions.confirmTitle")}
                    >
                      <Button
                        variant="danger"
                        loading={action.pending}
                        loadingLabel={t("common.sending")}
                        onClick={() => void revoke(session)}
                      >
                        {isCurrent
                          ? t("sessions.confirmCurrent")
                          : t("sessions.confirmRevoke")}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="actions">
                      <Button
                        variant="secondary"
                        onClick={() => setConfirming(session.id)}
                      >
                        {isCurrent
                          ? t("sessions.signOutCurrent")
                          : t("sessions.revoke")}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <section
            className="card card--section"
            aria-labelledby="logout-all-title"
          >
            <h2 id="logout-all-title">{t("sessions.logoutAll.title")}</h2>
            <p className="muted">{t("sessions.logoutAll.description")}</p>
            {confirming === "all" ? (
              <div className="actions">
                <Button
                  variant="danger"
                  loading={action.pending}
                  loadingLabel={t("common.sending")}
                  onClick={() => void revokeAll()}
                >
                  {t("sessions.logoutAll.confirm")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  {t("common.cancel")}
                </Button>
              </div>
            ) : (
              <div className="actions">
                <Button
                  variant="secondary"
                  onClick={() => setConfirming("all")}
                >
                  {t("sessions.logoutAll.submit")}
                </Button>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
