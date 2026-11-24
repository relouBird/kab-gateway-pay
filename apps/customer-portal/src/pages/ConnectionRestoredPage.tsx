import { useTranslation } from "react-i18next";
import { StatusPageLayout } from "../components/layout/StatusPageLayout";

export function ConnectionRestoredPage() {
  const { t } = useTranslation();

  return (
    <StatusPageLayout
      state="restored"
      eyebrow={t("connection.restored.eyebrow")}
      title={t("connection.restored.title")}
      message={t("connection.restored.message")}
    >
      <div className="status-page__actions">
        <button
          className="btn btn--primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          {t("connection.restored.action")}
        </button>
      </div>
    </StatusPageLayout>
  );
}
