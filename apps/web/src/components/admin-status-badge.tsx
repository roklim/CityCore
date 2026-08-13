import { adminStatusLabel, adminStatusTone } from "../lib/admin-labels";

export function AdminStatusBadge({ status }: { status: string }) {
  const label = adminStatusLabel(status);
  const tone = adminStatusTone(status);

  return (
    <span
      aria-label={`Stato: ${label}`}
      className={`admin-status-badge is-${tone}`}
      data-status={status}
      data-tone={tone}
    >
      {label}
    </span>
  );
}
