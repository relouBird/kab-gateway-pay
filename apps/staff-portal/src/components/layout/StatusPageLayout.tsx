import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { Logo } from "../ui/Logo";
import { StatusRosette } from "../ui/StatusRosette";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

export type StatusPageState = "not-found" | "offline" | "restored";

interface StatusPageLayoutProps {
  state: StatusPageState;
  eyebrow: string;
  title: string;
  message: string;
  children: ReactNode;
}

export function StatusPageLayout({
  state,
  eyebrow,
  title,
  message,
  children,
}: StatusPageLayoutProps) {
  useEffect(() => {
    document.title = `KG Pay — ${eyebrow}`;
  }, [eyebrow]);

  return (
    <main
      className={`status-page status-page--${state}`}
      aria-labelledby="status-title"
      aria-live="polite"
    >
      <header className="status-page__header">
        {state === "not-found" ? (
          <Link className="status-page__brand" to="/login" aria-label="KG Pay">
            <Logo tone="light" />
          </Link>
        ) : (
          <div className="status-page__brand" aria-label="KG Pay">
            <Logo tone="light" />
          </div>
        )}
        <div className="status-page__tools">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      <div className="status-page__content">
        <div className="status-page__art" aria-hidden="true">
          <StatusRosette mode={state} />
        </div>
        <section className="status-page__message">
          <p className="status-page__eyebrow">{eyebrow}</p>
          <h1 id="status-title">{title}</h1>
          <p className="status-page__lead">{message}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
