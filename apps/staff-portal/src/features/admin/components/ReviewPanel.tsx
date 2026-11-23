import { useTranslation } from "react-i18next";
import { type AdminAccessReviewEntry } from "@kgpay/contracts/transport";
import { statusLabel, statusClass, formatDate } from "../formatters";

export function ReviewPanel({
  entries,
}: {
  entries: AdminAccessReviewEntry[];
}) {
  const { t } = useTranslation();
  return entries.length ? (
    <div
      className="table-scroll"
      role="region"
      aria-label={t("review")}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            <th>{t("email")}</th>
            <th>{t("status")}</th>
            <th>{t("rolesAssigned")}</th>
            <th>{t("lastLogin")}</th>
            <th>{t("createdAt")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.email}</td>
              <td>
                <span className={`status status--${statusClass(entry.status)}`}>
                  {statusLabel(entry.status)}
                </span>
              </td>
              <td>{entry.roles.join(", ")}</td>
              <td>{formatDate(entry.lastLoginAt)}</td>
              <td>{formatDate(entry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty">{t("empty")}</p>
  );
}
