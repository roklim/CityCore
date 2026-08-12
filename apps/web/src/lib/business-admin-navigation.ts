import type { OperatorNavigationItem } from "../components/admin-shell";
import { isBusinessPublic } from "./business-visibility";
import type { AuthAccess, PlatformBusiness } from "./platform-api";

export const businessAdminSections = [
  { segment: "", label: "Panoramica", meta: "Stato e azioni rapide" },
  { segment: "profile", label: "Profilo", meta: "Identità e contatti" },
  { segment: "categories", label: "Categorie", meta: "Classificazione" },
  { segment: "services", label: "Servizi", meta: "Catalogo" },
  { segment: "hours", label: "Orari", meta: "Settimana di apertura" },
  { segment: "publication", label: "Pubblicazione", meta: "Readiness e visibilità" },
  { segment: "inquiries", label: "Richieste", meta: "Inbox owner" },
  { segment: "modules", label: "Moduli", meta: "Funzioni attive" },
  { segment: "orders", label: "Ordini ritiro", meta: "Estensione opzionale" },
] as const;

export type BusinessAdminSegment = (typeof businessAdminSections)[number]["segment"];

export function businessAdminBasePath(citySlug: string, businessSlug: string) {
  return `/${encodeURIComponent(citySlug)}/${encodeURIComponent(businessSlug)}/admin`;
}

export function businessAdminSectionPath(
  citySlug: string,
  businessSlug: string,
  segment: BusinessAdminSegment,
) {
  const base = businessAdminBasePath(citySlug, businessSlug);
  return segment ? `${base}/${segment}` : base;
}

export function getBusinessAdminSection(pathname: string) {
  return (
    businessAdminSections.find(({ segment }) =>
      segment ? pathname.endsWith(`/admin/${segment}`) : pathname.endsWith("/admin"),
    ) ?? businessAdminSections[0]
  );
}

export function getBusinessAdminNavigation({
  access,
  business,
  currentPath,
  hasMultipleAccesses,
}: {
  access: AuthAccess;
  business: PlatformBusiness;
  currentPath: string;
  hasMultipleAccesses: boolean;
}): OperatorNavigationItem[] {
  const permissions = new Set(access.permissions);
  const base = businessAdminBasePath(business.city.slug, business.slug);
  const hasCatalog = business.modules.some(
    (module) => module.moduleCode === "catalog" && module.active,
  );
  const items: OperatorNavigationItem[] = businessAdminSections
    .filter(
      ({ segment }) =>
        (segment !== "orders" || hasCatalog) &&
        (!["inquiries", "orders"].includes(segment) || permissions.has("businesses.manage")),
    )
    .map(({ segment, label, meta }) => {
      const href = segment ? `${base}/${segment}` : base;
      const requiredManagePermission =
        segment === "services"
          ? "catalog.manage"
          : segment === "hours"
            ? "settings.manage"
            : segment === "modules"
              ? "modules.manage"
              : ["profile", "categories", "publication", "inquiries", "orders"].includes(segment)
                ? "businesses.manage"
                : null;
      return {
        href,
        label,
        meta:
          requiredManagePermission && !permissions.has(requiredManagePermission)
            ? `${meta} · sola lettura`
            : meta,
        current: href === currentPath,
      };
    });

  if (isBusinessPublic(business)) {
    items.push({
      href: `/${encodeURIComponent(business.city.slug)}/${encodeURIComponent(business.slug)}`,
      label: "Scheda pubblica",
      meta: business.name,
      dividerBefore: true,
      current: false,
    });
  }

  if (access.scopeType !== "business") {
    items.push({
      href: "/admin/businesses",
      label: "Torna alle attività",
      meta: "Elenco amministrativo",
      dividerBefore: !isBusinessPublic(business),
      current: false,
    });
  } else {
    items.push({
      href: `/${encodeURIComponent(business.city.slug)}`,
      label: "Directory cittadina",
      meta: business.city.name,
      dividerBefore: !isBusinessPublic(business),
      current: false,
    });
  }

  if (hasMultipleAccesses) {
    items.push({
      href: "/select-access",
      label: "Cambia accesso",
      meta: "Scegli un altro ambito",
      current: false,
    });
  }

  return items;
}
