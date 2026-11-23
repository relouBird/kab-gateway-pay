import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { ConvergenceMark } from "../ui/ConvergenceMark";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a className="skip-link" href="#main">
      {t("common.skipToContent")}
    </a>
  );
}

export function AuthLayout() {
  const { t } = useTranslation();
  return (
    <div className="auth-shell">
      <SkipLink />
      <aside className="auth-shell__brand">
        <Logo tone="dark" className="auth-shell__logo" />
        <ConvergenceMark className="auth-shell__mark" />
        <p className="auth-shell__tagline">{t("brandTagline")}</p>
      </aside>
      <main id="main" className="auth-shell__main">
        <div className="auth-shell__top">
          <LanguageSwitcher />
        </div>
        <div className="card auth-shell__card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
