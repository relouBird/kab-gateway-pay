import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { signOut } from "../services/sessionManager";
import { useSessionStore } from "../stores/sessionStore";
import { Button } from "../components/ui/Button";
import { PageTitle } from "../components/ui/PageTitle";

export function AccessDeniedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      useSessionStore.getState().clearSession();
    }
    void navigate("/login", { replace: true });
  }

  return (
    <section className="stack">
      <PageTitle title={t("forbidden")} />
      <Button variant="primary" onClick={() => void handleSignOut()}>
        {t("logout")}
      </Button>
    </section>
  );
}
