import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut } from "../../services/sessionManager";
import { Button } from "../ui/Button";
import { ConnectedThemeSwitcher } from "../ui/ConnectedThemeSwitcher";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/Icon";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";
import { SkipLink } from "./AuthLayout";
import "./ConnectedLayout.css";

/** Gabarit de l'espace connecté. */
export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const date = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const navigationItems: {
    to: string;
    label: string;
    icon: IconName;
    end?: boolean;
  }[] = [
    { to: "/", label: t("nav.home"), icon: "home", end: true },
    { to: "/account", label: t("nav.account"), icon: "key" },
    { to: "/sessions", label: t("nav.sessions"), icon: "device" },
  ];

  async function handleSignOut() {
    await signOut();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell app-shell--connected">
      <SkipLink />
      <aside className="app-shell__sidebar">
        <Logo tone="dark" className="app-shell__logo" />
        <nav className="app-shell__nav" aria-label={t("nav.label")}>
          {navigationItems.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="app-shell__profile">
          <span className="app-shell__profile-mark" aria-hidden="true">
            KG
          </span>
          <span className="app-shell__profile-copy">
            <strong>{t("connected.customerLabel")}</strong>
            <span>{t("connected.accountDescription")}</span>
          </span>
        </div>
      </aside>
      <div className="app-shell__content">
        <header className="app-shell__header">
          <div className="app-shell__intro">
            <p className="app-shell__date">{date}</p>
            <p className="app-shell__greeting">{t("connected.greeting")}</p>
          </div>
          <div className="app-shell__tools">
            <LanguageSwitcher />
            <ConnectedThemeSwitcher />
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
        <nav className="app-shell__mobile-nav" aria-label={t("nav.label")}>
          {navigationItems.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
