import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut } from "../../services/sessionManager";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";
import { SkipLink } from "./AuthLayout";

/** Gabarit de l'espace connecté. */
export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <SkipLink />
      <header className="app-shell__header">
        <Logo tone="light" className="app-shell__logo" />
        <nav className="app-shell__nav" aria-label={t("nav.label")}>
          <NavLink to="/" end>
            {t("nav.home")}
          </NavLink>
          <NavLink to="/account">{t("nav.account")}</NavLink>
          <NavLink to="/sessions">{t("nav.sessions")}</NavLink>
        </nav>
        <div className="app-shell__tools">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            icon={<Icon name="logout" />}
            onClick={() => void handleSignOut()}
          >
            {t("nav.logout")}
          </Button>
        </div>
      </header>
      <main id="main" className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}
