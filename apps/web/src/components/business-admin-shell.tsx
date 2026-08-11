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
  "": "Controlla lo stato dell’attività e raggiungi rapidamente ogni area di gestione.",
  profile: "Aggiorna identità, contatti, indirizzo, impostazioni locali e canali social.",
  categories: "Scegli le categorie attive che descrivono correttamente l’attività.",
  services: "Crea e aggiorna il catalogo senza perdere di vista stato, prezzo e ordine.",
  hours: "Configura una settimana di apertura chiara e coerente con la scheda pubblica.",
  publication: "Controlla i requisiti reali e gestisci la visibilità nella directory cittadina.",
  inquiries: "Leggi le richieste ricevute, aggiorna lo stato e conserva le note interne.",
  modules: "Mantieni attivo il modulo principale e configura soltanto le estensioni utili.",
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
  const breadcrumbs: AdminBreadcrumb[] = isPlatformContext
    ? [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/businesses", label: "Attività" },
        { href: base, label: business.name },
        { label: section.label },
      ]
    : [{ label: "Attività" }, { href: base, label: business.name }, { label: section.label }];

  return (
    <AdminShell
      asideText={`Utente: ${userEmail}. Ambito operativo: ${adminScopeLabel(activeAccess.scopeType)}.`}
      asideTitle="Sessione attiva"
      brandHref={isPlatformContext ? "/admin" : base}
      breadcrumbs={breadcrumbs}
      description={sectionDescriptions[section.segment]}
      eyebrow="Gestione attività"
      headerActions={
        <>
          {accessCount > 1 ? (
            <Link className="ghost-button" href="/select-access">
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
      title={`${section.label} · ${business.name}`}
    >
      {children}
    </AdminShell>
  );
}
