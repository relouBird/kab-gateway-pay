import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "./Icon";

export type NoticeTone = "success" | "error" | "info" | "warning";

const icons: Record<NoticeTone, IconName> = {
  success: "check",
  error: "alert",
  info: "info",
  warning: "clock",
};

interface NoticeProps {
  tone: NoticeTone;
  title?: string;
  children?: ReactNode;
  correlationId?: string | null;
}

/** Annonce d'état : icône + texte, jamais la couleur seule. Les erreurs sont annoncées immédiatement. */
export function Notice({ tone, title, children, correlationId }: NoticeProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon name={icons[tone]} className="notice__icon" />
      <div className="notice__body">
        {title ? <p className="notice__title">{title}</p> : null}
        {children ? <p className="notice__text">{children}</p> : null}
        {correlationId ? (
          <p className="notice__ref">
            {t("common.reference")}{" "}
            <span className="mono">{correlationId}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
