import { useTranslation } from "react-i18next";
import { ConvergenceMark } from "../components/ui/ConvergenceMark";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { Logo } from "../components/ui/Logo";
import { ThemeSwitcher } from "../components/ui/ThemeSwitcher";

export type ConnectionPageState = "not-found" | "offline" | "restored";

export function ConnectionPage({
  state,
  onRetry,
}: {
  state: ConnectionPageState;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <main className={`status-page status-page--${state}`} aria-live="polite">
      <header className="status-page__header">
        <a className="status-page__brand" href="/login" aria-label="KG Pay">
          <Logo tone="light" />
        </a>
        <div className="status-page__tools">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <div className="status-page__content">
        <div className="status-page__art" aria-hidden="true">
          <ConvergenceMark className="status-page__mark" />
          {state === "offline" ? <span className="status-page__pulse" /> : null}
        </div>
        <section className="status-page__message">
          <p className="status-page__eyebrow">
            {t(`connection.${state}.eyebrow`)}
          </p>
          <h1>{t(`connection.${state}.title`)}</h1>
          <p className="status-page__lead">
            {t(`connection.${state}.message`)}
          </p>
          {state === "offline" ? (
            <>
              <p className="status-page__note">
                <strong>{t("connection.paymentTitle")}</strong>
                {t("connection.paymentNote")}
              </p>
              <p className="status-page__waiting" role="status">
                <span aria-hidden="true" />
                {t("connection.waiting")}
              </p>
            </>
          ) : null}
          <div className="status-page__actions">
            {state === "not-found" ? (
              <a className="btn btn--primary" href="/login">
                {t("connection.not-found.action")}
              </a>
            ) : null}
            {state === "offline" ? (
              <button
                className="btn btn--primary"
                type="button"
                onClick={onRetry}
              >
                {t("common.retry")}
              </button>
            ) : null}
            {state === "restored" ? (
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                {t("connection.restored.action")}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
