import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { type SessionSummary } from "@kgpay/contracts/transport";
import { authService } from "../services/authService";
import { useSessionStore } from "../stores/sessionStore";
import { ErrorNotice } from "../components/ui/ErrorNotice";
import { LoadingState } from "../components/ui/LoadingState";
import { PageTitle } from "../components/ui/PageTitle";
import { correlationId } from "../services/correlationId";
import { SessionsPanel } from "../features/admin/components/SessionsPanel";

export function StaffSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentSessionId = useSessionStore((state) => state.sessionId);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function loadSessions() {
    setError(null);
    setReference(null);
    try {
      setSessions(await authService.listSessions());
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function revokeSession(sessionId: string) {
    setPending(true);
    setError(null);
    try {
      await authService.revokeSession(sessionId);
      setSessions(await authService.listSessions());
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  async function logoutAll() {
    setPending(true);
    setError(null);
    try {
      await authService.logoutAll();
      useSessionStore.getState().clearSession();
      void navigate("/login", { replace: true });
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <PageTitle title={t("sessions")} subtitle={t("brand")} />
      </div>
      {error ? <ErrorNotice message={error} reference={reference} /> : null}
      {loading ? (
        <LoadingState />
      ) : (
        <SessionsPanel
          currentSessionId={currentSessionId}
          onLogoutAll={() => void logoutAll()}
          onRevoke={(sessionId) => void revokeSession(sessionId)}
          pending={pending}
          sessions={sessions}
        />
      )}
    </section>
  );
}
