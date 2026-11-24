import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { StatusPageLayout } from "../components/layout/StatusPageLayout";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <StatusPageLayout
      state="not-found"
      eyebrow={t("connection.not-found.eyebrow")}
      title={t("connection.not-found.title")}
      message={t("connection.not-found.message")}
    >
      <div className="status-page__actions">
        <Link className="btn btn--primary" to="/login">
          {t("connection.not-found.action")}
        </Link>
      </div>
    </StatusPageLayout>
  );
}
