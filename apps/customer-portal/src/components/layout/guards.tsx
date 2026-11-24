import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router";
import { useSessionStore } from "../../stores/sessionStore";
import { resolveReturnPath } from "../../routes/returnPath";

function SessionSplash() {
  const { t } = useTranslation();
  return (
    <div className="splash" role="status">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{t("common.loading")}</p>
    </div>
  );
}

/** Garde d'ergonomie : le backend reste la seule frontière d'autorisation. */
export function RequireAuth() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === "unknown") return <SessionSplash />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function PublicOnly() {
  const status = useSessionStore((state) => state.status);
  const location = useLocation();
  if (status === "unknown") return <SessionSplash />;
  if (status === "authenticated") {
    return <Navigate to={resolveReturnPath(location.state)} replace />;
  }
  return <Outlet />;
}
