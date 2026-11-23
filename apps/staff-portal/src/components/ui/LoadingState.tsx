import { useTranslation } from "react-i18next";

export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="splash" role="status">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{t("common.loading")}</p>
    </div>
  );
}
