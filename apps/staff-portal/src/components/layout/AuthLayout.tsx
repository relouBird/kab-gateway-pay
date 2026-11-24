import "./AuthLayout.css";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";
import { useTheme } from "../../theme/ThemeProvider";
import { AuthBackgroundArt } from "./AuthBackgroundArt";
import { AuthBrandMark } from "./AuthBrandMark";

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
  const { theme } = useTheme();
  const [taglineLead, ...taglineRemainder] = t("brandTagline").split(". ");
  return (
    <div className="auth-design">
      <SkipLink />
      <AuthBackgroundArt />
      <aside className="auth-design__hero">
        <div className="auth-design__brand">
          <AuthBrandMark
            lightColor={theme === "dark" ? "#F6F1E7" : "#0B3D2E"}
            accentColor={theme === "dark" ? "#E8B84B" : "#C77E2C"}
          />
          <span>
            <strong>KG</strong> Pay
          </span>
        </div>
        <div>
          <h2 className="auth-design__tagline">
            {taglineLead}. <em>{taglineRemainder.join(". ")}</em>
          </h2>
          <div>
            <div className="auth-design__theme">
              <ThemeSwitcher />
            </div>
            <p className="auth-design__caption">Kab Gateway Payment · CEMAC</p>
          </div>
        </div>
      </aside>
      <main id="main" className="auth-design__main">
        <div className="auth-design__wrap">
          <div className="auth-design__language">
            <LanguageSwitcher />
          </div>
          <div className="auth-design__card card">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
