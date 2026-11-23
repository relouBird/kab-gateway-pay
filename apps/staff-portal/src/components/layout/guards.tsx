import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router";
import { useSessionStore } from "../../stores/sessionStore";

function SessionSplash() {
  const { t } = useTranslation();
  return (
    <div className="splash" role="status">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{t("common.loading")}</p>
    </div>
  );
}

export function PublicOnly() {
  const status = useSessionStore((state) => state.status);
  const subjectType = useSessionStore((state) => state.subjectType);
  const roles = useSessionStore((state) => state.roles);
  if (status === "unknown") return <SessionSplash />;
  if (status === "authenticated") {
    if (subjectType !== "STAFF") {
      return <Navigate to="/access-denied" replace />;
    }
    return (
      <Navigate
        to={roles.includes("GLOBAL_SUPER_ADMIN") ? "/admin" : "/my-sessions"}
        replace
      />
    );
  }
  return <Outlet />;
}

export function RequireStaff() {
  const status = useSessionStore((state) => state.status);
  const subjectType = useSessionStore((state) => state.subjectType);
  if (status === "unknown") return <SessionSplash />;
  if (status !== "authenticated" || subjectType !== "STAFF") {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const status = useSessionStore((state) => state.status);
  const roles = useSessionStore((state) => state.roles);
  if (status === "unknown") return <SessionSplash />;
  if (status !== "authenticated") return <Navigate to="/login" replace />;
  if (!roles.includes("GLOBAL_SUPER_ADMIN")) {
    return <Navigate to="/my-sessions" replace />;
  }
  return <Outlet />;
}
