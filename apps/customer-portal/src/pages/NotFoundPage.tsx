import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PageTitle } from "../components/ui/PageTitle";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="stack">
      <PageTitle
        title={t("notFound.title")}
        subtitle={t("notFound.subtitle")}
      />
      <p className="form-footer">
        <Link to="/">{t("notFound.back")}</Link>
      </p>
    </div>
  );
}
