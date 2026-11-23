import { useTranslation } from "react-i18next";
import { type AdminRole } from "@kgpay/contracts/transport";

export function RolePanel({ roles }: { roles: AdminRole[] }) {
  const { t } = useTranslation();
  return (
    <div className="tiles">
      {roles.map((role) => (
        <article className="card role-card" key={role.code}>
          <div>
            <p className="eyebrow">{role.builtIn ? "BUILT-IN" : "CUSTOM"}</p>
            <h2>{role.name}</h2>
            <p className="mono">{role.code}</p>
          </div>
          <div>
            <h3>{t("permissions")}</h3>
            {role.permissions.length ? (
              <ul>
                {role.permissions.map((permission) => (
                  <li className="mono" key={permission}>
                    {permission}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t("noPermissions")}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
