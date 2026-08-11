import type { OperatorNavigationItem } from "../components/admin-shell";
import type { AuthAccess } from "./platform-api";

export function getPlatformAdminNavigation(
  access: AuthAccess,
  currentPath: string,
  hasMultipleAccesses: boolean,
): OperatorNavigationItem[] {
  if (access.scopeType === "business") return [];

  const cityLabel = access.scopeType === "city" ? access.city?.name : null;
  const items: OperatorNavigationItem[] = [
    { href: "/admin", label: "Dashboard", meta: cityLabel ?? "Riepilogo piattaforma" },
    { href: "/admin/cities", label: "Città", meta: cityLabel ?? "Registry e gestione" },
    { href: "/admin/businesses", label: "Attività", meta: "Elenco e pubblicazione" },
    { href: "/admin/access", label: "Accessi", meta: "Ruoli e scope" },
    { href: "/admin/audit", label: "Registro attività", meta: "Azioni e tracciabilità" },
    {
      href: "/",
      label: "Home pubblica",
      meta: "Apri CityCore",
      dividerBefore: true,
    },
  ];

  if (hasMultipleAccesses) {
    items.push({
      href: "/select-access",
      label: "Cambia accesso",
      meta: "Scegli ruolo e ambito",
    });
  }

  return items.map((item) => ({ ...item, current: item.href === currentPath }));
}

export function getBusinessAdminNavigation({
  access,
  businessName,
  businessPath,
  cityPath,
  isPublished,
  hasMultipleAccesses,
}: {
  access: AuthAccess;
  businessName: string;
  businessPath: string;
  cityPath: string;
  isPublished: boolean;
  hasMultipleAccesses: boolean;
}): OperatorNavigationItem[] {
  const items: OperatorNavigationItem[] = [];

  if (access.scopeType !== "business") {
    items.push({
      href: "/admin/businesses",
      label: "Torna alle attività",
      meta: "Elenco amministrativo",
    });
  }

  items.push(
    { href: "#overview", label: "Panoramica", meta: businessName, current: true },
    { href: "#profile", label: "Profilo", meta: "Dati pubblici" },
    { href: "#categories", label: "Categorie", meta: "Classificazione" },
    { href: "#services", label: "Servizi", meta: "Catalogo" },
    { href: "#opening-hours", label: "Orari", meta: "Disponibilità" },
    { href: "#publication", label: "Pubblicazione", meta: "Readiness e visibilità" },
    { href: "#inquiries", label: "Richieste", meta: "Inbox owner" },
    { href: "#modules", label: "Moduli", meta: "Funzioni attive" },
    { href: "#pickup-orders", label: "Ordini ritiro", meta: "Estensione opzionale" },
    { href: cityPath, label: "Directory cittadina", meta: "Pagina pubblica", dividerBefore: true },
  );

  if (isPublished) {
    items.push({ href: businessPath, label: "Scheda pubblica", meta: businessName });
  }

  if (hasMultipleAccesses) {
    items.push({ href: "/select-access", label: "Cambia accesso", meta: "Scegli un altro scope" });
  }

  return items;
}
