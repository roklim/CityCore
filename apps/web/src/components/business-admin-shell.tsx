"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "../app/admin/actions";
import { adminRoleLabel, adminScopeLabel } from "../lib/admin-labels";
import {
  businessAdminBasePath,
  getBusinessAdminNavigation,
  getBusinessAdminSection,
} from "../lib/business-admin-navigation";
import type { AuthAccess, PlatformBusiness } from "../lib/platform-api";
import { AdminShell, type AdminBreadcrumb } from "./admin-shell";
import { AdminSubmitButton } from "./admin-submit-button";

const sectionDescriptions: Record<string, string> = {
  "": "Controlla lo stato dell’attività e continua dal prossimo passaggio utile.",
  profile: "Aggiorna identità, contatti, indirizzo, impostazioni locali e canali social.",
  categories: "Scegli come classificare l’attività nella directory e nelle ricerche.",
  services: "Organizza servizi, prezzi e visibilità del catalogo pubblico.",
  hours: "Configura una settimana di apertura chiara e coerente con la scheda pubblica.",
  publication: "Verifica cosa manca e scegli se mostrare l’attività nella directory.",
  inquiries: "Leggi le richieste ricevute, aggiorna lo stato e aggiungi note per il team.",
  modules: "Controlla le funzioni disponibili e attiva solo quelle utili all’attività.",
  orders: "Gestisci gli ordini di ritiro come estensione opzionale del catalogo.",
};

export function BusinessAdminShell({
  business,
  activeAccess,
  accessCount,
  userEmail,
  children,
}: {
  business: PlatformBusiness;
  activeAccess: AuthAccess;
  accessCount: number;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const section = getBusinessAdminSection(pathname);
  const base = businessAdminBasePath(business.city.slug, business.slug);
  const isPlatformContext = activeAccess.scopeType !== "business";
  const contextBreadcrumbs: AdminBreadcrumb[] = isPlatformContext
    ? [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/businesses", label: "Attività" },
      ]
    : [{ href: `/${business.city.slug}`, label: business.city.name }];
  const breadcrumbs: AdminBreadcrumb[] = section.segment
    ? [...contextBreadcrumbs, { href: base, label: business.name }, { label: section.label }]
    : [...contextBreadcrumbs, { label: business.name }];
  const sessionSummary = (
    <dl className="mini-facts compact operator-context-list">
      <div>
        <dt>Attività</dt>
        <dd>{business.name}</dd>
      </div>
      <div>
        <dt>Città</dt>
        <dd>{business.city.name}</dd>
      </div>
      <div>
        <dt>Account</dt>
        <dd>{userEmail}</dd>
      </div>
      <div>
        <dt>Ambito</dt>
        <dd>{adminScopeLabel(activeAccess.scopeType)}</dd>
      </div>
    </dl>
  );

  return (
    <AdminShell
      asideContent={sessionSummary}
      asideTitle="Sessione attiva"
      brandContext="Gestione attività"
      brandHref={isPlatformContext ? "/admin" : base}
      breadcrumbs={breadcrumbs}
      description={sectionDescriptions[section.segment]}
      eyebrow={`${business.name} · ${business.city.name}`}
      headerActions={
        <>
          {accessCount > 1 ? (
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
      navigationItems={getBusinessAdminNavigation({
        access: activeAccess,
        business,
        currentPath: pathname,
        hasMultipleAccesses: accessCount > 1,
      })}
      statusLabel={adminRoleLabel(activeAccess.role)}
      title={section.label}
    >
      {children}
    </AdminShell>
  );
}
