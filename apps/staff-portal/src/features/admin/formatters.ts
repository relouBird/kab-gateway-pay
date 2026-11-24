import { i18nLanguage } from "../../i18n/language";

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_VERIFICATION: "En attente de vérification",
    PENDING_INVITATION: "Invitation en attente",
    ACTIVE: "Active",
    SUSPENDED: "Suspendue",
    DISABLED: "Désactivée",
  };
  const english: Record<string, string> = {
    PENDING_VERIFICATION: "Pending verification",
    PENDING_INVITATION: "Invitation pending",
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    DISABLED: "Disabled",
  };
  return i18nLanguage() === "en"
    ? (english[status] ?? status)
    : (labels[status] ?? status);
}

export function statusClass(status: string): string {
  if (status === "ACTIVE") return "active";
  if (status === "DISABLED") return "disabled";
  return "pending";
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(i18nLanguage(), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}
