import { useTranslation } from "react-i18next";
import { ChangeEmailCard } from "../components/account/ChangeEmailCard";
import { ChangePasswordCard } from "../components/account/ChangePasswordCard";
import { ChangePhoneCard } from "../components/account/ChangePhoneCard";
import { PageTitle } from "../components/ui/PageTitle";

export function AccountPage() {
  const { t } = useTranslation();
  return (
    <div className="stack stack--lg">
      <PageTitle title={t("account.title")} subtitle={t("account.subtitle")} />
      <ChangePasswordCard />
      <ChangeEmailCard />
      <ChangePhoneCard />
    </div>
  );
}
