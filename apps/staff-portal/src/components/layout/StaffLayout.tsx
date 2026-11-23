import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router";
import { signOut } from "../../services/sessionManager";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { ConnectedThemeSwitcher } from "../ui/ConnectedThemeSwitcher";
import { Icon } from "../ui/Icon";
import type { IconName } from "../ui/Icon";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";
import { SkipLink } from "./AuthLayout";
import "./ConnectedLayout.css";

export function StaffLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isGlobalAdmin = useSessionStore((state) =>
    state.roles.includes("GLOBAL_SUPER_ADMIN"),
  );
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
  }[] = [];
  if (isGlobalAdmin) {
    navigationItems.push({ to: "/admin", label: t("admin"), icon: "shield" });
  }
  navigationItems.push({
    to: "/my-sessions",
    label: t("sessions"),
    icon: "device",
  });

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      useSessionStore.getState().clearSession();
    }
    void navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell app-shell--connected">
      <SkipLink />
      <aside className="app-shell__sidebar">
        <Logo tone="dark" className="app-shell__logo" />
        <nav
          className="app-shell__nav"
          aria-label={t("common.primaryNavigation")}
        >
          {navigationItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to}>
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
            <strong>{t("connected.staffLabel")}</strong>
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
              {t("logout")}
            </Button>
          </div>
        </header>
        <main id="main" className="app-shell__main">
          <Outlet />
        </main>
        <nav
          className="app-shell__mobile-nav"
          aria-label={t("common.primaryNavigation")}
        >
          {navigationItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to}>
              <Icon name={icon} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
