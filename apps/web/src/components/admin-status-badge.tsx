import { adminStatusLabel, adminStatusTone } from "../lib/admin-labels";

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span className={`admin-status-badge is-${adminStatusTone(status)}`}>
      {adminStatusLabel(status)}
    </span>
  );
}
