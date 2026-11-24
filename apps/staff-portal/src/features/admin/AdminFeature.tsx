import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  type AdminAccessEvent,
  type AdminAccessReviewEntry,
  type AdminIdentity,
  type AdminRole,
  type IdentityStatus,
  type SessionSummary,
} from "@kgpay/contracts/transport";
import { adminService } from "../../services/adminService";
import { authService } from "../../services/authService";
import { useSessionStore } from "../../stores/sessionStore";
import { ErrorNotice } from "../../components/ui/ErrorNotice";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageTitle } from "../../components/ui/PageTitle";
import { correlationId } from "../../services/correlationId";
import { i18nLanguage } from "../../i18n/language";
import { IdentityPanel } from "./components/IdentityPanel";
import { RolePanel } from "./components/RolePanel";
import { EventsPanel } from "./components/EventsPanel";
import { ReviewPanel } from "./components/ReviewPanel";
import { SessionsPanel } from "./components/SessionsPanel";
import { InviteDialog } from "./components/InviteDialog";
import { RoleDialog } from "./components/RoleDialog";
import { StepUpDialog } from "./components/StepUpDialog";
import { RecoveryDialog } from "./components/RecoveryDialog";

export function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rolesFromSession = useSessionStore((state) => state.roles);
  const [tab, setTab] = useState<
    "identities" | "roles" | "events" | "review" | "sessions"
  >("identities");
  const [identities, setIdentities] = useState<AdminIdentity[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [events, setEvents] = useState<AdminAccessEvent[]>([]);
  const [review, setReview] = useState<AdminAccessReviewEntry[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<IdentityStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"invite" | "role" | null>(null);
  const [sensitive, setSensitive] = useState<SensitiveAction | null>(null);
  const [recovery, setRecovery] = useState<{
    identityId: string;
    email?: string;
    challengeId?: string;
  } | null>(null);

  const globalAdmin = rolesFromSession.includes("GLOBAL_SUPER_ADMIN");
  const currentSessionId = useSessionStore((state) => state.sessionId);

  async function loadIdentityList(
    currentPage = page,
    term = search,
    status = filterStatus,
  ) {
    const response = await adminService.listIdentities({
      page: currentPage,
      limit: 50,
      search: term.trim() || undefined,
      status: status || undefined,
    });
    setIdentities(response.items);
    setPage(response.page);
    setTotal(response.total);
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [
        identityResult,
        roleResult,
        eventResult,
        reviewResult,
        sessionResult,
      ] = await Promise.all([
        adminService.listIdentities({ page: 1, limit: 50 }),
        adminService.listRoles(),
        adminService.listAccessEvents(),
        adminService.listAccessReview(),
        authService.listSessions(),
      ]);
      setIdentities(identityResult.items);
      setTotal(identityResult.total);
      setRoles(roleResult);
      setEvents(eventResult);
      setReview(reviewResult);
      setSessions(sessionResult);
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function runSensitive(
    action: string,
    complete: (proof: string) => Promise<void>,
  ) {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await authService.stepUp({
        action,
        locale: i18nLanguage(),
      });
      if (!("challengeId" in result))
        throw new Error("Invalid step-up response.");
      setSensitive({ action, challengeId: result.challengeId, complete });
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  async function confirmSensitive(code: string) {
    if (!sensitive) return;
    setPending(true);
    setError(null);
    try {
      const requested = await authService.stepUp({
        action: sensitive.action,
        challengeId: sensitive.challengeId,
        code,
        locale: i18nLanguage(),
      });
      if (!("proof" in requested)) throw new Error("Invalid step-up proof.");
      await sensitive.complete(requested.proof);
      setSensitive(null);
      setNotice(t("success"));
      await loadData();
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  async function submitIdentitySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loadIdentityList(1);
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setLoading(false);
    }
  }

  async function changePage(next: number) {
    setLoading(true);
    try {
      await loadIdentityList(next);
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setLoading(false);
    }
  }

  async function revokeOwnSession(sessionId: string) {
    setPending(true);
    setError(null);
    try {
      await authService.revokeSession(sessionId);
      setNotice(t("success"));
      setSessions(await authService.listSessions());
    } catch (caught) {
      setError(t("genericError"));
      setReference(correlationId(caught));
    } finally {
      setPending(false);
    }
  }

  async function handleLogoutAll() {
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

  if (!globalAdmin) {
    return (
      <section className="page">
        <ErrorNotice message={t("forbidden")} />
      </section>
    );
  }

  return (
    <div className="admin-page">
      <nav className="admin-tabs" aria-label={t("dashboard")}>
        {(["identities", "roles", "events", "review", "sessions"] as const).map(
          (item) => (
            <button
              aria-current={tab === item ? "page" : undefined}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {t(item)}
            </button>
          ),
        )}
      </nav>
      <section className="page">
        <div className="page-heading">
          <PageTitle title={t(tab)} subtitle={t("brand")} />
          {tab === "identities" ? (
            <button
              className="button button--primary"
              onClick={() => setDialog("invite")}
              type="button"
            >
              {t("inviteStaff")}
            </button>
          ) : null}
          {tab === "roles" ? (
            <button
              className="button button--primary"
              onClick={() => setDialog("role")}
              type="button"
            >
              {t("createRole")}
            </button>
          ) : null}
        </div>
        <p className="muted">{t("permissionNotice")}</p>
        {error ? <ErrorNotice message={error} reference={reference} /> : null}
        {notice ? (
          <p className="notice notice--success" role="status">
            {notice}
          </p>
        ) : null}
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {tab === "identities" ? (
              <IdentityPanel
                identities={identities}
                roles={roles}
                search={search}
                status={filterStatus}
                total={total}
                onSearchChange={setSearch}
                onStatusChange={(value) => {
                  setFilterStatus(value);
                }}
                onSearch={submitIdentitySearch}
                onPage={changePage}
                page={page}
                onSensitive={runSensitive}
                onRoleChanged={loadData}
                pending={pending}
                onRecover={(identityId) => setRecovery({ identityId })}
              />
            ) : null}
            {tab === "roles" ? <RolePanel roles={roles} /> : null}
            {tab === "events" ? <EventsPanel events={events} /> : null}
            {tab === "review" ? <ReviewPanel entries={review} /> : null}
            {tab === "sessions" ? (
              <SessionsPanel
                currentSessionId={currentSessionId}
                onLogoutAll={() => void handleLogoutAll()}
                onRevoke={(sessionId) => void revokeOwnSession(sessionId)}
                pending={pending}
                sessions={sessions}
              />
            ) : null}
          </>
        )}
      </section>
      {dialog === "invite" ? (
        <InviteDialog
          roles={roles}
          onClose={() => setDialog(null)}
          onSubmit={(body) => {
            setDialog(null);
            void runSensitive("iam.identity.create", (proof) =>
              adminService.invite(body, proof).then(() => undefined),
            );
          }}
        />
      ) : null}
      {dialog === "role" ? (
        <RoleDialog
          onClose={() => setDialog(null)}
          onSubmit={(body) => {
            setDialog(null);
            void runSensitive("iam.role.assign", (proof) =>
              adminService.createRole(body, proof).then(() => undefined),
            );
          }}
        />
      ) : null}
      {recovery ? (
        <RecoveryDialog
          challengeId={recovery.challengeId}
          email={recovery.email}
          onClose={() => setRecovery(null)}
          onRequest={(email) => {
            setRecovery({ identityId: recovery.identityId, email });
            void runSensitive("iam.identity.email-recovery", async (proof) => {
              const result = await adminService.requestEmailRecovery(
                recovery.identityId,
                email,
                proof,
              );
              setRecovery({
                identityId: recovery.identityId,
                email,
                challengeId: result.challengeId,
              });
            });
          }}
          onVerify={(code) => {
            const email = recovery.email;
            const challengeId = recovery.challengeId;
            const identityId = recovery.identityId;
            if (!email || !challengeId) return;
            void runSensitive("iam.identity.email-recovery", async (proof) => {
              await adminService.verifyEmailRecovery(
                identityId,
                email,
                challengeId,
                code,
                proof,
              );
              setRecovery(null);
            });
          }}
        />
      ) : null}
      {sensitive ? (
        <StepUpDialog
          error={error}
          pending={pending}
          reference={reference}
          onCancel={() => setSensitive(null)}
          onConfirm={confirmSensitive}
        />
      ) : null}
    </div>
  );
}

interface SensitiveAction {
  action: string;
  challengeId: string;
  complete: (proof: string) => Promise<void>;
}
