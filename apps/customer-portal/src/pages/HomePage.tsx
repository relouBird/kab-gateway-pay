import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Icon } from "../components/ui/Icon";
import { Notice } from "../components/ui/Notice";
import { PageTitle } from "../components/ui/PageTitle";
import { StatusBadge } from "../components/ui/StatusBadge";

export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="stack stack--lg">
      <PageTitle title={t("home.title")} subtitle={t("home.subtitle")} />
      <section className="card card--section" aria-labelledby="identity-title">
        <h2 id="identity-title">{t("home.identity.title")}</h2>
        <StatusBadge tone="confirmed" label={t("home.identity.active")} />
        <p className="muted">{t("home.identity.description")}</p>
        <Notice tone="info">{t("home.customerFile")}</Notice>
      </section>
      <div className="tiles">
        <Link className="tile" to="/account">
          <Icon name="key" size={24} />
          <span className="tile__title">{t("home.tiles.account.title")}</span>
          <span className="muted">{t("home.tiles.account.description")}</span>
        </Link>
        <Link className="tile" to="/sessions">
          <Icon name="device" size={24} />
          <span className="tile__title">{t("home.tiles.sessions.title")}</span>
          <span className="muted">{t("home.tiles.sessions.description")}</span>
        </Link>
      </div>
    </div>
  );
}
