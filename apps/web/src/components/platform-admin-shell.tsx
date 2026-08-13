import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "../app/admin/actions";
import { adminRoleLabel, adminScopeLabel } from "../lib/admin-labels";
import { getPlatformAdminNavigation } from "../lib/admin-navigation";
import type { WebSession } from "../lib/web-session";
import { AdminShell, type AdminBreadcrumb } from "./admin-shell";
import { AdminSubmitButton } from "./admin-submit-button";

export function PlatformAdminShell({
  session,
  currentPath,
  title,
  description,
  breadcrumbs,
  children,
}: {
  session: WebSession;
  currentPath: string;
  title: string;
  description: string;
  breadcrumbs: readonly AdminBreadcrumb[];
  children: ReactNode;
}) {
  const activeAccess = session.auth.activeAccess;
  const context =
    activeAccess.scopeType === "city"
      ? (activeAccess.city?.name ?? "Città")
      : adminScopeLabel(activeAccess.scopeType);
  const sessionSummary = (
    <dl className="mini-facts compact operator-context-list">
      <div>
        <dt>Account</dt>
        <dd>{session.auth.user.email}</dd>
      </div>
      <div>
        <dt>Ambito</dt>
        <dd>{context}</dd>
      </div>
    </dl>
  );

  return (
    <AdminShell
      asideContent={sessionSummary}
      asideTitle="Sessione attiva"
      brandContext="Amministrazione"
      brandHref="/admin"
      breadcrumbs={breadcrumbs}
      description={description}
      eyebrow="Console CityCore"
      headerActions={
        <>
          {session.auth.accesses.length > 1 ? (
            <Link className="admin-button ghost-button" href="/select-access">
              Cambia accesso
            </Link>
          ) : null}
          <form action={logoutAction} className="operator-session-form">
            <AdminSubmitButton className="ghost-button" pendingLabel="Uscita…">
              Esci
            </AdminSubmitButton>
          </form>
        </>
      }
      navigationItems={getPlatformAdminNavigation(
        activeAccess,
        currentPath,
        session.auth.accesses.length > 1,
      )}
      statusLabel={adminRoleLabel(activeAccess.role)}
      title={title}
    >
      {children}
    </AdminShell>
  );
}
