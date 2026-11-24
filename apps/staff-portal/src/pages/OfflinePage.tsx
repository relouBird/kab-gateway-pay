import { useTranslation } from "react-i18next";
import { StatusPageLayout } from "../components/layout/StatusPageLayout";

export function OfflinePage({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();

  return (
    <StatusPageLayout
      state="offline"
      eyebrow={t("connection.offline.eyebrow")}
      title={t("connection.offline.title")}
      message={t("connection.offline.message")}
    >
      <p className="status-page__waiting" role="status">
        <span aria-hidden="true" />
        {t("connection.waiting")}
      </p>
      <div className="status-page__actions">
        <button className="btn btn--primary" type="button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </div>
    </StatusPageLayout>
  );
}
