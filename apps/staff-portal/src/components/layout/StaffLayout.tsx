import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut } from "../../services/sessionManager";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";
import { SkipLink } from "./AuthLayout";

export function StaffLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isGlobalAdmin = useSessionStore((state) =>
    state.roles.includes("GLOBAL_SUPER_ADMIN"),
  );

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      useSessionStore.getState().clearSession();
    }
    void navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <SkipLink />
      <header className="app-shell__header">
        <Logo tone="light" className="app-shell__logo" />
        <nav className="app-shell__nav" aria-label={t("dashboard")}>
          {isGlobalAdmin ? <NavLink to="/admin">{t("admin")}</NavLink> : null}
          <NavLink to="/my-sessions">{t("sessions")}</NavLink>
        </nav>
        <div className="app-shell__tools">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            icon={<Icon name="logout" />}
            onClick={() => void handleSignOut()}
          >
            {t("logout")}
          </Button>
        </div>
      </header>
      <main id="main" className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
