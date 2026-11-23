import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  type AdminIdentity,
  type AdminRole,
  type IdentityStatus,
} from "@kgpay/contracts/transport";
import { adminService } from "../../../services/adminService";
import { statusLabel, statusClass } from "../formatters";

export function IdentityPanel(props: {
  identities: AdminIdentity[];
  roles: AdminRole[];
  search: string;
  status: IdentityStatus | "";
  total: number;
  page: number;
  pending: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: IdentityStatus | "") => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onPage: (page: number) => void;
  onSensitive: (
    action: string,
    callback: (proof: string) => Promise<void>,
  ) => void;
  onRoleChanged: () => Promise<void>;
  onRecover: (identityId: string) => void;
}) {
  const { t } = useTranslation();
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const assignableRoles = props.roles.filter(
    (role) => role.code !== "CUSTOMER",
  );
  return (
    <section className="stack">
      <form className="filters" onSubmit={props.onSearch}>
        <label className="field">
          <span>{t("search")}</span>
          <input
            onChange={(e) => props.onSearchChange(e.target.value)}
            value={props.search}
          />
        </label>
        <label className="field">
          <span>{t("status")}</span>
          <select
            onChange={(e) =>
              props.onStatusChange(e.target.value as IdentityStatus | "")
            }
            value={props.status}
          >
            <option value="">{t("allStatuses")}</option>
            {[
              "PENDING_INVITATION",
              "PENDING_VERIFICATION",
              "ACTIVE",
              "SUSPENDED",
              "DISABLED",
            ].map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button--secondary" type="submit">
          {t("search")}
        </button>
      </form>
      <p className="muted">{t("total", { count: props.total })}</p>
      {props.identities.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label={t("identities")}
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>{t("email")}</th>
                <th>{t("status")}</th>
                <th>{t("rolesAssigned")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {props.identities.map((identity) => (
                <tr key={identity.id}>
                  <td>
                    <strong>{identity.email}</strong>
                    <small className="mono">{identity.id}</small>
                  </td>
                  <td>
                    <span
                      className={`status status--${statusClass(identity.status)}`}
                    >
                      {statusLabel(identity.status)}
                    </span>
                  </td>
                  <td>
                    <div className="role-tags">
                      {identity.roles.map((role) => (
                        <span className="role-tag" key={role}>
                          {role}
                          <button
                            aria-label={`${t("revokeRole")} ${role}`}
                            disabled={props.pending}
                            onClick={() =>
                              props.onSensitive(
                                "iam.role.revoke",
                                async (proof) => {
                                  await adminService.revokeRole(
                                    identity.id,
                                    role,
                                    proof,
                                  );
                                  await props.onRoleChanged();
                                },
                              )
                            }
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="inline-form">
                      <select
                        aria-label={`${t("assignRole")} ${identity.email}`}
                        onChange={(e) =>
                          setRoleDrafts((value) => ({
                            ...value,
                            [identity.id]: e.target.value,
                          }))
                        }
                        value={roleDrafts[identity.id] ?? ""}
                      >
                        <option value="">{t("chooseRole")}</option>
                        {assignableRoles.map((role) => (
                          <option key={role.code} value={role.code}>
                            {role.name} ({role.code})
                          </option>
                        ))}
                      </select>
                      <button
                        className="button button--small"
                        disabled={!roleDrafts[identity.id] || props.pending}
                        onClick={() => {
                          const roleCode = roleDrafts[identity.id];
                          if (!roleCode) return;
                          props.onSensitive(
                            "iam.role.assign",
                            async (proof) => {
                              await adminService.assignRole(
                                identity.id,
                                roleCode,
                                proof,
                              );
                              setRoleDrafts((value) => ({
                                ...value,
                                [identity.id]: "",
                              }));
                              await props.onRoleChanged();
                            },
                          );
                        }}
                        type="button"
                      >
                        {t("assignRole")}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="actions">
                      {identity.status === "PENDING_INVITATION" ? (
                        <button
                          className="button button--small"
                          disabled={props.pending}
                          onClick={() =>
                            props.onSensitive("iam.identity.create", (proof) =>
                              adminService
                                .resendInvitation(identity.id, proof)
                                .then(() => undefined),
                            )
                          }
                          type="button"
                        >
                          {t("resend")}
                        </button>
                      ) : null}
                      {identity.status === "ACTIVE" ||
                      identity.status === "SUSPENDED" ? (
                        <button
                          className="button button--small"
                          disabled={props.pending}
                          onClick={() =>
                            props.onSensitive("iam.identity.unlock", (proof) =>
                              adminService
                                .unlockIdentity(identity.id, proof)
                                .then(() => undefined),
                            )
                          }
                          type="button"
                        >
                          {t("unlock")}
                        </button>
                      ) : null}
                      {identity.status !== "DISABLED" ? (
                        <button
                          className="button button--small"
                          disabled={props.pending}
                          onClick={() => props.onRecover(identity.id)}
                          type="button"
                        >
                          {t("recoverEmail")}
                        </button>
                      ) : null}
                      {identity.status === "ACTIVE" ? (
                        <button
                          className="button button--small"
                          disabled={props.pending}
                          onClick={() =>
                            props.onSensitive("iam.identity.suspend", (proof) =>
                              adminService
                                .changeStatus(identity.id, "suspend", proof)
                                .then(() => undefined),
                            )
                          }
                          type="button"
                        >
                          {t("suspend")}
                        </button>
                      ) : null}
                      {identity.status === "SUSPENDED" ? (
                        <button
                          className="button button--small"
                          disabled={props.pending}
                          onClick={() =>
                            props.onSensitive(
                              "iam.identity.reactivate",
                              (proof) =>
                                adminService
                                  .changeStatus(
                                    identity.id,
                                    "reactivate",
                                    proof,
                                  )
                                  .then(() => undefined),
                            )
                          }
                          type="button"
                        >
                          {t("reactivate")}
                        </button>
                      ) : null}
                      {identity.status !== "DISABLED" ? (
                        <button
                          className="button button--small button--danger"
                          disabled={props.pending}
                          onClick={() =>
                            props.onSensitive("iam.identity.disable", (proof) =>
                              adminService
                                .changeStatus(identity.id, "disable", proof)
                                .then(() => undefined),
                            )
                          }
                          type="button"
                        >
                          {t("disable")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{t("empty")}</p>
      )}
      <div className="pagination">
        <button
          className="button button--secondary"
          disabled={props.page <= 1}
          onClick={() => props.onPage(props.page - 1)}
          type="button"
        >
          {t("previous")}
        </button>
        <span>{props.page}</span>
        <button
          className="button button--secondary"
          disabled={props.page * 50 >= props.total}
          onClick={() => props.onPage(props.page + 1)}
          type="button"
        >
          {t("next")}
        </button>
      </div>
    </section>
  );
}
