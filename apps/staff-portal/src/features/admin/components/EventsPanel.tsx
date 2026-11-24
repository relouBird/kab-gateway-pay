import { useTranslation } from "react-i18next";
import { type AdminAccessEvent } from "@kgpay/contracts/transport";
import { formatDate } from "../formatters";

export function EventsPanel({ events }: { events: AdminAccessEvent[] }) {
  const { t } = useTranslation();
  return events.length ? (
    <div
      className="table-scroll"
      role="region"
      aria-label={t("events")}
      tabIndex={0}
    >
      <table>
        <thead>
          <tr>
            <th>{t("date")}</th>
            <th>{t("event")}</th>
            <th>{t("result")}</th>
            <th>{t("identity")}</th>
            <th>{t("correlationId")}</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>{formatDate(event.occurredAt)}</td>
              <td>{event.eventType}</td>
              <td>{event.result}</td>
              <td className="mono">{event.identityId ?? "—"}</td>
              <td className="mono">{event.correlationId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="empty">{t("empty")}</p>
  );
}
