import { Icon, type IconName } from "./Icon";

export type BadgeTone =
  "confirmed" | "pending" | "unknown" | "failed" | "action";

const icons: Record<BadgeTone, IconName> = {
  confirmed: "check",
  pending: "clock",
  unknown: "info",
  failed: "alert",
  action: "shield",
};

export function StatusBadge({
  tone,
  label,
}: {
  tone: BadgeTone;
  label: string;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      <Icon name={icons[tone]} size={16} />
      {label}
    </span>
  );
}
